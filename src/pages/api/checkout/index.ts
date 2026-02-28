import { z } from 'zod';
import { withAuthAndBody, jsonResponse, errorResponse } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe';
import { trackServerEvent } from '@server/analytics';
import { clientEnv, serverEnv } from '@shared/config/env';
import { assertKnownPriceId, resolvePlanOrPack } from '@shared/config/stripe';
import { getTrialConfig } from '@shared/config/subscription.config';
import Stripe from 'stripe';

// Request schema
// BUG M19 FIX: `metadata` field removed — clients must not supply Stripe session metadata.
// All metadata is server-generated to prevent injection of sensitive keys (e.g. `credits`).
const checkoutSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  uiMode: z.enum(['hosted', 'embedded']).default('hosted'),
});

/** POST /api/checkout — create a Stripe Checkout session */
export const POST = withAuthAndBody(checkoutSchema, async (userId, body, { request, locals }) => {
  const { priceId, successUrl, cancelUrl, uiMode } = body;

  // Check if we're in test mode
  const isTestMode = serverEnv.ENV === 'test' || serverEnv.STRIPE_SECRET_KEY?.includes('dummy_key');

  // First, validate basic Stripe price ID format (must start with 'price_')
  // This validation happens even in test mode to catch invalid formats early
  if (!priceId.startsWith('price_')) {
    return errorResponse(
      'INVALID_PRICE',
      'Invalid price ID format. Price IDs must start with "price_"',
      400
    );
  }

  // Validate price ID is known/configured
  let resolvedPrice = null;
  try {
    resolvedPrice = assertKnownPriceId(priceId);
  } catch (error) {
    // In test mode with valid format but unknown price ID, continue without resolvedPrice
    // This allows testing mock checkout with unknown price IDs while still running validations
    if (!isTestMode) {
      return errorResponse(
        'INVALID_PRICE',
        error instanceof Error ? error.message : 'Invalid price ID',
        400
      );
    }
    // In test mode, continue with resolvedPrice = null to allow mock response
  }

  // Helper to check if mock user has active subscription (for test mode)
  // Mock user tokens follow format: test_token_mock_user_{userId}_sub_{status}_{tier}
  const hasMockActiveSubscription = (): boolean => {
    if (!isTestMode) return false;
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    // Token format: test_token_mock_user_{id}_sub_{status}_{tier}
    // `{id}` may contain underscores (e.g., mock_user_<uuid>), so match by suffix.
    return /_sub_(active|trialing)(?:_|$)/.test(token);
  };

  // Check for existing active subscription (only for subscription purchases)
  if (resolvedPrice && resolvedPrice.type === 'plan') {
    // In test mode, check mock user token for subscription status
    if (hasMockActiveSubscription()) {
      return errorResponse(
        'ALREADY_SUBSCRIBED',
        'You already have an active subscription. Please manage your subscription through the billing portal.',
        400
      );
    }

    // In production mode or for non-mock users, check database
    if (!isTestMode) {
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
  }

  // Handle test mode mock response
  if (isTestMode) {
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: `cus_test_${userId}` })
        .eq('id', userId);
    } catch {
      // Ignore errors in test mode
    }

    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return jsonResponse({
      url: `${request.headers.get('origin') || clientEnv.BASE_URL}/success?session_id=${mockSessionId}`,
      sessionId: mockSessionId,
      mock: true,
    });
  }

  // Get or create Stripe customer
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

  // Verify price type with Stripe
  if (resolvedPrice) {
    const price = await stripe.prices.retrieve(priceId);
    if (resolvedPrice.type === 'plan' && price.type !== 'recurring') {
      return errorResponse('INVALID_PRICE', 'Invalid price type. Subscription plans must be recurring.', 400);
    }
    if (resolvedPrice.type === 'pack' && price.type !== 'one_time') {
      return errorResponse('INVALID_PRICE', 'Invalid price type. Credit packs must be one-time payments.', 400);
    }
  }

  // Create Stripe Checkout Session
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

  // BUG H17 FIX: Only include clientSecret for embedded checkout (uiMode === 'embedded').
  // For hosted checkout the client_secret is unnecessary and leaking it is a security concern.
  return jsonResponse({
    url: session.url,
    sessionId: session.id,
    ...(uiMode === 'embedded' ? { clientSecret: session.client_secret } : {}),
  });
});
