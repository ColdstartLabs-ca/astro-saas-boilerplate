import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { WebhookVerificationService } from '@server/webhooks/stripe/services/webhook-verification.service';
import { IdempotencyService } from '@server/webhooks/stripe/services/idempotency.service';
import { PaymentHandler } from '@server/webhooks/stripe/handlers/payment.handler';
import { SubscriptionHandler } from '@server/webhooks/stripe/handlers/subscription.handler';
import { InvoiceHandler } from '@server/webhooks/stripe/handlers/invoice.handler';
import { DisputeHandler } from '@server/webhooks/stripe/handlers/dispute.handler';

// BUG H12 FIX: 'invoice.payment_succeeded' removed from this union.
// Stripe fires BOTH 'invoice.payment_succeeded' AND 'invoice.paid' for the same payment
// with different event IDs. Handling both would double-allocate credits even with
// event-ID-based idempotency. Only 'invoice.paid' is handled going forward.
type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.created'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice_payment.paid'
  | 'invoice.payment_failed'
  | 'invoice_payment.failed'
  | 'charge.refunded'
  | 'charge.dispute.created'
  | 'charge.dispute.updated'
  | 'charge.dispute.closed'
  | 'invoice.payment_refunded'
  | 'subscription_schedule.completed';

function extractPreviousPriceId(
  previousAttributes: Record<string, unknown> | null | undefined
): string | null {
  if (!previousAttributes || typeof previousAttributes !== 'object') {
    return null;
  }

  interface IPreviousAttributesItems {
    data?: Array<{
      price?: { id?: string } | string;
      plan?: { id?: string } | string;
    }>;
  }

  interface IPreviousAttributesDirect {
    items?:
      | IPreviousAttributesItems
      | Array<{
          price?: { id?: string } | string;
          plan?: { id?: string } | string;
        }>;
    price?: { id?: string } | string;
    plan?: { id?: string } | string;
  }

  const prevUnknown = previousAttributes as IPreviousAttributesDirect;
  const items = prevUnknown.items;
  const candidates: Array<{
    price?: { id?: string } | string;
    plan?: { id?: string } | string;
  }>[] = [];

  if (Array.isArray(items)) {
    candidates.push(items);
  } else if (items && Array.isArray(items.data)) {
    candidates.push(items.data);
  }

  for (const list of candidates) {
    const firstItem = list?.[0];
    const priceId =
      (typeof firstItem?.price === 'object' ? firstItem.price.id : firstItem?.price) ??
      (typeof firstItem?.plan === 'object' ? firstItem.plan.id : firstItem?.plan);

    if (typeof priceId === 'string') {
      return priceId;
    }
  }

  const directPrice =
    (typeof prevUnknown.price === 'object' ? prevUnknown.price?.id : prevUnknown.price) ??
    (typeof prevUnknown.plan === 'object' ? prevUnknown.plan?.id : prevUnknown.plan);

  return typeof directPrice === 'string' ? directPrice : null;
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  console.log('[WEBHOOK_POST_HANDLER_CALLED]', { timestamp: new Date().toISOString() });

  try {
    // 1. Verify webhook signature and construct event
    const { event } = await WebhookVerificationService.verifyWebhook(request);

    // 2. Idempotency check - prevent duplicate processing
    // BUG M18 FIX: If idempotency service is unavailable, return 500 immediately so
    // Stripe will retry when the DB recovers. Previously this fell through with
    // idempotencyEnabled=false, which risked double-processing events.
    let idempotencyResult = null;

    try {
      idempotencyResult = await IdempotencyService.checkAndClaimEvent(event.id, event.type, event);
    } catch (idempotencyError) {
      console.error(
        'Webhook idempotency table unavailable - returning 500 so Stripe will retry:',
        idempotencyError
      );
      return new Response(
        JSON.stringify({ error: 'Idempotency service unavailable - please retry' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (idempotencyResult && !idempotencyResult.isNew) {
      console.log('[WEBHOOK_DUPLICATE_SKIPPED]', {
        eventId: event.id,
        eventType: event.type,
        existingStatus: idempotencyResult.existingStatus,
      });
      return new Response(
        JSON.stringify({
          received: true,
          skipped: true,
          reason: `Event already ${idempotencyResult.existingStatus}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Handle the event
    console.log('[WEBHOOK_EVENT_RECEIVED]', {
      eventId: event.id,
      eventType: event.type,
      timestamp: new Date().toISOString(),
      previousAttributes: event.data.previous_attributes,
      extractedPreviousPriceId: extractPreviousPriceId(event.data.previous_attributes),
    });

    try {
      switch (event.type as StripeWebhookEventType) {
        case 'checkout.session.completed':
          await PaymentHandler.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case 'customer.created':
          await SubscriptionHandler.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await SubscriptionHandler.handleSubscriptionUpdate(
            event.data.object as Stripe.Subscription,
            {
              previousPriceId: extractPreviousPriceId(event.data.previous_attributes),
            }
          );
          break;

        case 'customer.subscription.deleted':
          await SubscriptionHandler.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.trial_will_end':
          await SubscriptionHandler.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        // BUG H12 FIX: 'invoice.payment_succeeded' removed - only 'invoice.paid' handles credits.
        // Both events fire for the same payment but with different event IDs, so event-ID
        // idempotency cannot prevent double credit allocation. Stripe recommends using
        // 'invoice.paid' as the authoritative event for credit allocation.
        case 'invoice.paid':
        case 'invoice_payment.paid':
          await InvoiceHandler.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
        case 'invoice_payment.failed':
          await InvoiceHandler.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'charge.refunded':
          await PaymentHandler.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          await DisputeHandler.handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        case 'charge.dispute.updated':
          await DisputeHandler.handleChargeDisputeUpdated(event.data.object as Stripe.Dispute);
          break;

        case 'charge.dispute.closed':
          await DisputeHandler.handleChargeDisputeClosed(event.data.object as Stripe.Dispute);
          break;

        case 'invoice.payment_refunded':
          await PaymentHandler.handleInvoicePaymentRefunded(event.data.object as Stripe.Invoice);
          break;

        case 'subscription_schedule.completed':
          await SubscriptionHandler.handleSubscriptionScheduleCompleted(
            event.data.object as Stripe.SubscriptionSchedule
          );
          break;

        default:
          console.warn(`UNHANDLED WEBHOOK TYPE: ${event.type} - this may require code update`);
          await IdempotencyService.markEventUnrecoverable(event.id, event.type);

          return new Response(
            JSON.stringify({
              received: true,
              warning: `Unhandled event type: ${event.type}`,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
      }

      // Mark event as completed after successful processing
      await IdempotencyService.markEventCompleted(event.id);

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (processingError) {
      // Mark event as failed and re-throw
      const errorMessage =
        processingError instanceof Error ? processingError.message : 'Unknown error';
      await IdempotencyService.markEventFailed(event.id, errorMessage);
      throw processingError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed';
    console.error('Webhook error:', error);

    // Client errors (signature/body issues) return 400 - don't retry
    // Server errors return 500 - Stripe will retry
    const lowerMessage = message.toLowerCase();
    const isClientError =
      lowerMessage.includes('signature') ||
      lowerMessage.includes('invalid webhook body') ||
      lowerMessage.includes('missing stripe-signature');
    const status = isClientError ? 400 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
