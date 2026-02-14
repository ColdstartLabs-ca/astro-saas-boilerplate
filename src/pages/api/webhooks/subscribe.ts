/**
 * Webhook Subscriptions API Routes
 * GET /api/webhooks/subscribe - List user's webhook subscriptions
 * POST /api/webhooks/subscribe - Subscribe to a webhook event
 * DELETE /api/webhooks/subscribe - Unsubscribe from a webhook event
 * PATCH /api/webhooks/subscribe - Toggle subscription active status
 *
 * This endpoint is used by Zapier/Make to subscribe to AutopilotRank events.
 */

import { z } from 'zod';
import { webhookEventService } from '@server/services/webhook-event.service';
import { withAuth, withAuthAndBody, jsonResponse, handleApiError } from '@pages/api/_utils';
import type {
  IListWebhookSubscriptionsResponse,
  ISubscribeWebhookResponse,
  WebhookEventType,
} from '@shared/types/webhook-event.types';
import { WEBHOOK_EVENT_TYPES } from '@shared/types/webhook-event.types';

/**
 * Validation schema for subscribing to a webhook
 */
const subscribeSchema = z.object({
  eventType: z.enum(WEBHOOK_EVENT_TYPES as [WebhookEventType, ...WebhookEventType[]], {
    errorMap: () => ({ message: `Event type must be one of: ${WEBHOOK_EVENT_TYPES.join(', ')}` }),
  }),
  targetUrl: z.string().url('Target URL must be a valid URL'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
});

/**
 * Validation schema for unsubscribing
 */
const unsubscribeSchema = z.object({
  subscriptionId: z.string().uuid('Subscription ID must be a valid UUID'),
});

/**
 * Validation schema for toggling subscription
 */
const toggleSchema = z.object({
  subscriptionId: z.string().uuid('Subscription ID must be a valid UUID'),
  active: z.boolean(),
});

/**
 * GET /api/webhooks/subscribe
 * List all webhook subscriptions for the authenticated user
 */
export const GET = withAuth(async userId => {
  const subscriptions = await webhookEventService.list(userId);

  const response: IListWebhookSubscriptionsResponse = { subscriptions };
  return jsonResponse(response);
});

/**
 * POST /api/webhooks/subscribe
 * Subscribe to a webhook event
 *
 * Creates a new subscription for the specified event type.
 * Returns the subscription with the secret (only shown once).
 */
export const POST = withAuthAndBody(subscribeSchema, async (userId, input) => {
  const subscription = await webhookEventService.subscribe(userId, input);

  const response: ISubscribeWebhookResponse = { subscription };
  return jsonResponse(response, 201);
});

/**
 * DELETE /api/webhooks/subscribe
 * Unsubscribe from a webhook event
 *
 * Requires subscriptionId in the request body.
 */
export const DELETE = withAuthAndBody(unsubscribeSchema, async (userId, input) => {
  await webhookEventService.unsubscribe(userId, input.subscriptionId);
  return jsonResponse({ success: true });
});

/**
 * PATCH /api/webhooks/subscribe
 * Toggle subscription active status
 *
 * Used to temporarily pause webhook deliveries without deleting the subscription.
 */
export const PATCH = withAuthAndBody(toggleSchema, async (userId, input) => {
  const subscription = await webhookEventService.toggleActive(
    userId,
    input.subscriptionId,
    input.active
  );
  return jsonResponse({ subscription });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
