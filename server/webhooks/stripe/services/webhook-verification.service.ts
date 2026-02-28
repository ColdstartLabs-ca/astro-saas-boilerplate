import { stripe, STRIPE_WEBHOOK_SECRET } from '@server/stripe';
import Stripe from 'stripe';

export interface IWebhookVerificationResult {
  event: Stripe.Event;
  isTestMode: boolean;
}

export class WebhookVerificationService {
  /**
   * Verify and construct the Stripe webhook event from the request.
   *
   * BUG C2 FIX: Signature verification is now always enforced regardless of ENV.
   * The previous bypass for ENV=test allowed anyone on a staging/preview deployment
   * to forge arbitrary Stripe events. If STRIPE_WEBHOOK_SECRET is the placeholder
   * value, we throw a clear configuration error rather than silently skipping
   * verification.
   */
  static async verifyWebhook(request: Request): Promise<IWebhookVerificationResult> {
    // Guard: reject placeholder / missing webhook secret at all times
    if (!STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET === 'whsec_test_secret') {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is missing or set to the placeholder value.');
      throw new Error(
        'Webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET to a real secret.'
      );
    }

    // Get the raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log('[WEBHOOK_SIGNATURE_CHECK]', {
      hasSignature: !!signature,
      bodyLength: body.length,
    });

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', message);
      throw new Error(`Webhook signature verification failed: ${message}`);
    }

    // Determine whether this event originated from Stripe's test mode
    const isTestMode = !event.livemode;

    return { event, isTestMode };
  }
}
