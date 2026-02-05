import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, jsonResponse, getBody, getUserIdFromLocals } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe';
import { trackServerEvent } from '@server/analytics';
import { clientEnv, serverEnv } from '@shared/config/env';
import { assertKnownPriceId, resolvePlanOrPack } from '@shared/config/stripe';
import { getTrialConfig } from '@shared/config/subscription.config';
import Stripe from 'stripe';

// Request schema
const checkoutSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  uiMode: z.enum(['hosted', 'embedded']).default('hosted'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse and validate request body
    const { priceId, successUrl, cancelUrl, metadata, uiMode } = await getBody(request, checkoutSchema);

    // 2. Get authenticated user from locals (set by middleware)
    const userId = getUserIdFromLocals(locals);

    // Check if we're in test mode
    const isTestMode = serverEnv.ENV === 'test' || serverEnv.STRIPE_SECRET_KEY?.includes('dummy_key');

    // 3. Validate price ID
    let resolvedPrice = null;
    try {
      resolvedPrice = assertKnownPriceId(priceId);
    } catch (error) {
      if (isTestMode) {
        const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        return jsonResponse({
          url: `${clientEnv.BASE_URL}/success?session_id=${mockSessionId}`,
          sessionId: mockSessionId,
          mock: true,
        });
      }
      return errorResponse(
        'INVALID_PRICE',
        error instanceof Error ? error.message : 'Invalid price ID',
        400
      );
    }

    // 4. Check for existing active subscription (only for subscription purchases)
    if (resolvedPrice && resolvedPrice.type === 'plan') {
      const { data: existingSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSubscription) {
        return errorResponse(
          'ALREADY_SUBSCRIBED',
          'You already have an active subscription. Please manage your subscription through the billing portal.',
          400
        );
      }
    }

    // 5. Handle test mode mock response
    if (isTestMode) {
      let customerId = `cus_test_${userId}`;
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      } catch {
        // Ignore errors in test mode
      }

      const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      return jsonResponse({
        url: `${clientEnv.BASE_URL}/success?session_id=${mockSessionId}`,
        sessionId: mockSessionId,
        mock: true,
      });
    }

    // 6. Get or create Stripe customer
    let customerId = null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (locals as { userEmail?: string }).userEmail || '',
        metadata: {
          supabase_user_id: userId,
        },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // 7. Verify price type with Stripe
    if (resolvedPrice) {
      const price = await stripe.prices.retrieve(priceId);
      if (resolvedPrice.type === 'plan' && price.type !== 'recurring') {
        return errorResponse('INVALID_PRICE', 'Invalid price type. Subscription plans must be recurring.', 400);
      }
      if (resolvedPrice.type === 'pack' && price.type !== 'one_time') {
        return errorResponse('INVALID_PRICE', 'Invalid price type. Credit packs must be one-time payments.', 400);
      }
    }

    // 8. Create Stripe Checkout Session
    const baseUrl = request.headers.get('origin') || clientEnv.BASE_URL;
    const checkoutMode = resolvedPrice?.type === 'pack' ? 'payment' : 'subscription';
    const unifiedMetadata = resolvePlanOrPack(priceId);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: checkoutMode,
      ui_mode: uiMode,
      metadata: {
        user_id: userId,
        ...(unifiedMetadata
          ? {
              type: unifiedMetadata.type,
              ...(unifiedMetadata.type === 'plan'
                ? {
                    plan_key: unifiedMetadata.key,
                    credits_per_cycle: unifiedMetadata.creditsPerCycle?.toString() || '',
                    max_rollover: unifiedMetadata.maxRollover?.toString() || '',
                  }
                : {
                    pack_key: unifiedMetadata.key,
                    credits: unifiedMetadata.credits?.toString() || '',
                  }),
            }
          : {}),
        ...metadata,
      },
    };

    // Add subscription_data for subscriptions
    if (resolvedPrice?.type === 'plan' && checkoutMode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          user_id: userId,
          plan_key: unifiedMetadata?.key || '',
        },
      };

      // Add trial period if configured
      const trialConfig = getTrialConfig(priceId);
      if (trialConfig && trialConfig.enabled) {
        sessionParams.subscription_data.trial_period_days = trialConfig.durationDays;
        if (!trialConfig.requirePaymentMethod) {
          sessionParams.payment_method_collection = 'if_required';
        }
      }
    }

    // Add return URLs
    const purchaseType = resolvedPrice?.type === 'pack' ? 'credits' : 'subscription';
    const creditsParam = resolvedPrice?.type === 'pack' ? `&credits=${unifiedMetadata?.credits || 0}` : '';

    if (uiMode === 'hosted') {
      sessionParams.success_url =
        successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&type=${purchaseType}${creditsParam}`;
      sessionParams.cancel_url = cancelUrl || `${baseUrl}/canceled`;
    } else {
      sessionParams.return_url =
        successUrl || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&type=${purchaseType}${creditsParam}`;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Track checkout started event
    await trackServerEvent(
      'checkout_started',
      {
        priceId,
        purchaseType,
        sessionId: session.id,
        plan: unifiedMetadata?.type === 'plan' ? unifiedMetadata.key : undefined,
        pack: unifiedMetadata?.type === 'pack' ? unifiedMetadata.key : undefined,
      },
      { apiKey: serverEnv.AMPLITUDE_API_KEY, userId }
    );

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      clientSecret: session.client_secret,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid request', 400);
    }
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Checkout failed',
      500
    );
  }
};
