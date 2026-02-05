import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, jsonResponse, getUserIdFromLocals, getBody } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe';
import { clientEnv, serverEnv } from '@shared/config/env';

// Request schema
const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get authenticated user from locals (set by middleware)
    const userId = getUserIdFromLocals(locals);

    // 2. Parse and validate request body
    const body = await getBody(request, portalSchema);

    // 3. Validate return URL if provided
    let returnUrl: string;
    if (body.returnUrl) {
      const url = new URL(body.returnUrl);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return errorResponse('INVALID_RETURN_URL', 'Invalid return URL protocol', 400);
      }

      // Domain allowlist to prevent open redirect
      const baseUrlHostname = new URL(clientEnv.BASE_URL).hostname;
      const allowedDomains = [baseUrlHostname, 'localhost', '127.0.1'];

      const isAllowedDomain = allowedDomains.some(domain => {
        return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
      });

      if (!isAllowedDomain) {
        return errorResponse('INVALID_RETURN_URL', 'Return URL domain not allowed', 400);
      }

      // XSS prevention
      const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i,
        /onload=/i,
        /onerror=/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(body.returnUrl)) {
          return errorResponse('INVALID_RETURN_URL', 'Invalid return URL format', 400);
        }
      }

      returnUrl = body.returnUrl;
    } else {
      // Default return URL
      const baseUrl = request.headers.get('origin') || clientEnv.BASE_URL;
      returnUrl = `${baseUrl}/dashboard/billing`;
    }

    // 4. Get Stripe Customer ID from profile
    let stripeCustomerId: string | null = null;

    if (serverEnv.ENV === 'test' && userId.startsWith('mock_user_')) {
      stripeCustomerId = `cus_test_${userId}`;
    } else {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.stripe_customer_id) {
        return errorResponse('STRIPE_CUSTOMER_NOT_FOUND', 'Activate a subscription to manage billing.', 400);
      }

      stripeCustomerId = profile.stripe_customer_id;
    }

    // 5. Handle test mode
    if (serverEnv.STRIPE_SECRET_KEY?.includes('dummy_key') || serverEnv.ENV === 'test') {
      return jsonResponse({
        url: `${returnUrl}?mock=true`,
        mock: true,
      });
    }

    // 6. Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId!,
      return_url: returnUrl,
    });

    return jsonResponse({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Portal error:', error);
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid request', 400);
    }
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Portal creation failed',
      500
    );
  }
};
