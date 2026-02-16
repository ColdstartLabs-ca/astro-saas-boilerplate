/**
 * Cron Webhook Recovery Service
 *
 * Handles failed webhook event recovery.
 * Extracted from CronController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe/config';
import {
  createSyncRun,
  completeSyncRun,
  isStripeNotFoundError,
  processStripeEvent,
} from './subscription-sync.service';

// =============================================================================
// Types
// =============================================================================

export interface IWebhookRecoveryResult {
  processed: number;
  recovered: number;
  unrecoverable: number;
  syncRunId?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum retries for webhook recovery
 */
const MAX_RETRIES = 3;

/**
 * Batch size for webhook recovery
 */
const WEBHOOK_BATCH_SIZE = 50;

// =============================================================================
// Cron Webhook Recovery Service Class
// =============================================================================

export class CronWebhookRecoveryService {
  /**
   * Retry processing failed webhook events.
   * POST /api/cron/recover-webhooks
   */
  async recoverWebhooks(): Promise<IWebhookRecoveryResult> {
    console.log('[CRON] Starting webhook recovery...');

    let syncRunId: string | null = null;
    let processed = 0;
    let recovered = 0;
    let unrecoverable = 0;

    try {
      // Create sync run record
      syncRunId = await createSyncRun('webhook_recovery');

      // Find failed events that are retryable
      const { data: failedEvents, error: fetchError } = await supabaseAdmin
        .from('webhook_events')
        .select('*')
        .eq('status', 'failed')
        .eq('recoverable', true)
        .lt('retry_count', MAX_RETRIES)
        .order('created_at', { ascending: true })
        .limit(WEBHOOK_BATCH_SIZE);

      if (fetchError) {
        throw new Error(`Failed to fetch failed webhook events: ${fetchError.message}`);
      }

      if (!failedEvents || failedEvents.length === 0) {
        console.log('[CRON] No failed webhook events to retry');
        await completeSyncRun(syncRunId, {
          status: 'completed',
          recordsProcessed: 0,
          recordsFixed: 0,
        });
        return { processed: 0, recovered: 0, unrecoverable: 0 };
      }

      console.log(`[CRON] Found ${failedEvents.length} failed webhook events to retry`);

      // Process each failed event
      for (const event of failedEvents) {
        processed++;

        try {
          // Fetch fresh event data from Stripe
          console.log(
            `[CRON] Retrying webhook event ${event.event_id} (attempt ${event.retry_count + 1}/${MAX_RETRIES})`
          );

          const stripeEvent = await stripe.events.retrieve(event.event_id);

          // Re-process the event
          await processStripeEvent(stripeEvent);

          // Mark event as completed
          await supabaseAdmin
            .from('webhook_events')
            .update({
              status: 'completed',
              retry_count: event.retry_count + 1,
              last_retry_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq('id', event.id);

          console.log(`[CRON] Successfully recovered webhook event ${event.event_id}`);
          recovered++;
        } catch (error: unknown) {
          if (isStripeNotFoundError(error)) {
            // Event not found in Stripe
            console.log(
              `[CRON] Webhook event ${event.event_id} not found in Stripe - marking as unrecoverable`
            );

            await supabaseAdmin
              .from('webhook_events')
              .update({
                status: 'unrecoverable',
                recoverable: false,
                error_message: 'Event not found in Stripe (expired or invalid)',
                last_retry_at: new Date().toISOString(),
              })
              .eq('id', event.id);

            unrecoverable++;
          } else {
            // Other error - increment retry count
            const newRetryCount = event.retry_count + 1;
            const shouldMarkUnrecoverable = newRetryCount >= MAX_RETRIES;

            console.error(
              `[CRON] Error recovering webhook event ${event.event_id} (attempt ${newRetryCount}/${MAX_RETRIES}):`,
              error
            );

            await supabaseAdmin
              .from('webhook_events')
              .update({
                retry_count: newRetryCount,
                last_retry_at: new Date().toISOString(),
                error_message: error instanceof Error ? error.message : 'Unknown error',
                ...(shouldMarkUnrecoverable && {
                  status: 'unrecoverable',
                  recoverable: false,
                }),
              })
              .eq('id', event.id);

            if (shouldMarkUnrecoverable) {
              unrecoverable++;
            }
          }
        }
      }

      // Complete sync run
      await completeSyncRun(syncRunId, {
        status: 'completed',
        recordsProcessed: processed,
        recordsFixed: recovered,
        metadata: { recovered, unrecoverable },
      });

      console.log(
        `[CRON] Webhook recovery complete: ${processed} processed, ${recovered} recovered, ${unrecoverable} unrecoverable`
      );

      return { processed, recovered, unrecoverable, syncRunId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CRON] Webhook recovery failed:', errorMessage);

      if (syncRunId) {
        try {
          await completeSyncRun(syncRunId, {
            status: 'failed',
            recordsProcessed: processed,
            recordsFixed: recovered,
            errorMessage,
          });
        } catch (completeError) {
          console.error('[CRON] Failed to mark sync run as failed:', completeError);
        }
      }

      throw error;
    }
  }
}

// Export singleton instance
export const cronWebhookRecoveryService = new CronWebhookRecoveryService();
