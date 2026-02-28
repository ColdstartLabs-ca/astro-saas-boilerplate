/**
 * Cron Subscription Sync Service
 *
 * Handles subscription synchronization cron jobs:
 * - Check expirations
 * - Full reconciliation
 *
 * Extracted from CronController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { stripe } from '@server/stripe/config';
import {
  createSyncRun,
  completeSyncRun,
  syncSubscriptionFromStripe,
  markSubscriptionCanceled,
  updateSubscriptionPeriod,
  getUserIdFromCustomerId,
  isStripeNotFoundError,
  sleep,
} from './subscription-sync.service';
import type Stripe from 'stripe';

// =============================================================================
// Types
// =============================================================================

export interface IExpirationCheckResult {
  processed: number;
  fixed: number;
  syncRunId?: string;
}

export interface IReconcileIssue {
  subId: string;
  userId: string;
  issue: string;
  action: string;
}

export interface IReconcileResult {
  processed: number;
  discrepancies: number;
  fixed: number;
  issues: IReconcileIssue[];
  syncRunId?: string;
  hasMore: boolean;
  totalSubscriptions: number;
  batchSize: number;
  message?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Rate limiting: 100ms between Stripe API calls
 */
const RATE_LIMIT_DELAY_MS = 100;

/**
 * Cloudflare Workers free plan: 50 subrequests max
 * Process max 40 subscriptions per run
 */
const BATCH_SIZE = 40;

// =============================================================================
// Cron Subscription Sync Service Class
// =============================================================================

export class CronSubscriptionSyncService {
  /**
   * Check subscriptions past their billing period and sync with Stripe.
   * POST /api/cron/check-expirations
   */
  async checkExpirations(): Promise<IExpirationCheckResult> {
    console.log('[CRON] Starting expiration check...');

    let syncRunId: string | null = null;
    let processed = 0;
    let fixed = 0;

    try {
      // Create sync run record
      syncRunId = await createSyncRun('expiration_check');

      // Find subscriptions that are active but past their current_period_end
      // BUG M21 FIX: Apply BATCH_SIZE limit so we don't fetch unbounded rows in one
      // query (same cap as reconcile()). Re-run the cron to process remaining items.
      const { data: expiredSubs, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, status, current_period_end')
        .eq('status', 'active')
        .lt('current_period_end', new Date().toISOString())
        .limit(BATCH_SIZE);

      if (fetchError) {
        throw new Error(`Failed to fetch expired subscriptions: ${fetchError.message}`);
      }

      if (!expiredSubs || expiredSubs.length === 0) {
        console.log('[CRON] No expired subscriptions found');
        await completeSyncRun(syncRunId, {
          status: 'completed',
          recordsProcessed: 0,
          recordsFixed: 0,
        });
        return { processed: 0, fixed: 0 };
      }

      console.log(`[CRON] Found ${expiredSubs.length} potentially expired subscriptions`);

      // Process each expired subscription
      for (const sub of expiredSubs) {
        processed++;

        try {
          // Fetch current subscription state from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(sub.id);

          if (stripeSub.status !== 'active') {
            // Stripe says subscription is no longer active - sync to DB
            console.log(
              `[CRON] Subscription ${sub.id} is ${stripeSub.status} in Stripe (was active in DB)`
            );

            const userId = await getUserIdFromCustomerId(stripeSub.customer as string);
            if (userId) {
              await syncSubscriptionFromStripe(userId, stripeSub);
              fixed++;
            }
          } else {
            // Stripe says it's still active - update period
            console.log(
              `[CRON] Subscription ${sub.id} is still active in Stripe - updating period`
            );
            await updateSubscriptionPeriod(sub.id, stripeSub);
            fixed++;
          }
        } catch (error: unknown) {
          if (isStripeNotFoundError(error)) {
            // Subscription deleted in Stripe but still in our DB
            console.log(`[CRON] Subscription ${sub.id} not found in Stripe - marking as canceled`);
            await markSubscriptionCanceled(sub.user_id, sub.id);
            fixed++;
          } else {
            console.error(`[CRON] Error checking subscription ${sub.id}:`, error);
          }
        }
      }

      // Complete sync run
      await completeSyncRun(syncRunId, {
        status: 'completed',
        recordsProcessed: processed,
        recordsFixed: fixed,
      });

      console.log(`[CRON] Expiration check complete: ${processed} processed, ${fixed} fixed`);

      return { processed, fixed, syncRunId };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CRON] Expiration check failed:', errorMessage);

      if (syncRunId) {
        try {
          await completeSyncRun(syncRunId, {
            status: 'failed',
            recordsProcessed: processed,
            recordsFixed: fixed,
            errorMessage,
          });
        } catch (completeError) {
          console.error('[CRON] Failed to mark sync run as failed:', completeError);
        }
      }

      throw error;
    }
  }

  /**
   * Full subscription reconciliation with Stripe.
   * POST /api/cron/reconcile
   */
  async reconcile(): Promise<IReconcileResult> {
    console.log('[CRON] Starting full subscription reconciliation...');

    let syncRunId: string | null = null;
    let processed = 0;
    let discrepancies = 0;
    let fixed = 0;
    const issues: IReconcileIssue[] = [];

    try {
      // Create sync run record
      syncRunId = await createSyncRun('full_reconciliation');

      // Get all active/trialing/past_due subscriptions from database
      const { data: dbSubs, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, status, price_id, current_period_end')
        .in('status', ['active', 'trialing', 'past_due']);

      if (fetchError) {
        throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
      }

      if (!dbSubs || dbSubs.length === 0) {
        console.log('[CRON] No active subscriptions to reconcile');
        await completeSyncRun(syncRunId, {
          status: 'completed',
          recordsProcessed: 0,
          recordsFixed: 0,
          discrepanciesFound: 0,
        });
        return {
          processed: 0,
          discrepancies: 0,
          fixed: 0,
          issues: [],
          hasMore: false,
          totalSubscriptions: 0,
          batchSize: BATCH_SIZE,
        };
      }

      // Limit batch size
      const batch = dbSubs.slice(0, BATCH_SIZE);
      const hasMore = dbSubs.length > BATCH_SIZE;

      console.log(
        `[CRON] Reconciling ${batch.length} subscriptions with Stripe (${dbSubs.length} total, batch processing ${hasMore ? 'enabled' : 'not needed'})...`
      );

      // Process each subscription
      for (const dbSub of batch) {
        processed++;

        try {
          // Fetch subscription from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(dbSub.id);

          // Check for status discrepancies
          if (stripeSub.status !== dbSub.status) {
            discrepancies++;
            const issue: IReconcileIssue = {
              subId: dbSub.id,
              userId: dbSub.user_id,
              issue: `Status mismatch: DB=${dbSub.status}, Stripe=${stripeSub.status}`,
              action: 'auto-fixed',
            };
            issues.push(issue);

            console.log(`[CRON] ${issue.issue} - syncing from Stripe`);

            const userId = await getUserIdFromCustomerId(stripeSub.customer as string);
            if (userId) {
              await syncSubscriptionFromStripe(userId, stripeSub);
              fixed++;
            }
          }

          // Check for price ID discrepancies
          const stripePriceId = stripeSub.items.data[0]?.price.id;
          if (stripePriceId && stripePriceId !== dbSub.price_id) {
            discrepancies++;
            const issue: IReconcileIssue = {
              subId: dbSub.id,
              userId: dbSub.user_id,
              issue: `Price mismatch: DB=${dbSub.price_id}, Stripe=${stripePriceId}`,
              action: 'auto-fixed',
            };
            issues.push(issue);

            console.log(`[CRON] ${issue.issue} - syncing from Stripe`);

            const userId = await getUserIdFromCustomerId(stripeSub.customer as string);
            if (userId) {
              await syncSubscriptionFromStripe(userId, stripeSub);
              fixed++;
            }
          }

          // Check for period end discrepancies
          const subscriptionWithPeriod = stripeSub as unknown as Stripe.Subscription & {
            current_period_start: number;
            current_period_end: number;
          };
          const stripeCurrentPeriodEnd = subscriptionWithPeriod.current_period_end;
          const stripePeriodEndDate = new Date(stripeCurrentPeriodEnd * 1000);
          const dbPeriodEndDate = new Date(dbSub.current_period_end);
          const timeDiffMs = Math.abs(stripePeriodEndDate.getTime() - dbPeriodEndDate.getTime());
          const hoursDiff = timeDiffMs / (1000 * 60 * 60);

          if (hoursDiff > 1) {
            discrepancies++;
            const issue: IReconcileIssue = {
              subId: dbSub.id,
              userId: dbSub.user_id,
              issue: `Period end drift: DB=${dbSub.current_period_end}, Stripe=${stripePeriodEndDate.toISOString()} (${hoursDiff.toFixed(1)}h difference)`,
              action: 'auto-fixed',
            };
            issues.push(issue);

            console.log(`[CRON] ${issue.issue} - syncing from Stripe`);

            const userId = await getUserIdFromCustomerId(stripeSub.customer as string);
            if (userId) {
              await syncSubscriptionFromStripe(userId, stripeSub);
              fixed++;
            }
          }

          // Rate limiting delay
          await sleep(RATE_LIMIT_DELAY_MS);
        } catch (error: unknown) {
          if (isStripeNotFoundError(error)) {
            // Subscription exists in DB but not in Stripe
            discrepancies++;
            const issue: IReconcileIssue = {
              subId: dbSub.id,
              userId: dbSub.user_id,
              issue: 'Subscription exists in DB but not in Stripe',
              action: 'marked-canceled',
            };
            issues.push(issue);

            console.log(`[CRON] ${issue.issue} - marking as canceled`);
            await markSubscriptionCanceled(dbSub.user_id, dbSub.id);
            fixed++;
          } else {
            console.error(`[CRON] Error reconciling subscription ${dbSub.id}:`, error);
            const issue: IReconcileIssue = {
              subId: dbSub.id,
              userId: dbSub.user_id,
              issue: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              action: 'failed',
            };
            issues.push(issue);
          }

          // Rate limiting delay even on error
          await sleep(RATE_LIMIT_DELAY_MS);
        }
      }

      // Complete sync run
      await completeSyncRun(syncRunId, {
        status: 'completed',
        recordsProcessed: processed,
        recordsFixed: fixed,
        discrepanciesFound: discrepancies,
        metadata: { issues },
      });

      console.log(
        `[CRON] Reconciliation complete: ${processed} processed, ${discrepancies} discrepancies found, ${fixed} fixed`
      );

      if (issues.length > 0) {
        console.log('[CRON] Issues found:');
        issues.forEach((issue, idx) => {
          console.log(`  ${idx + 1}. [${issue.subId}] ${issue.issue} -> ${issue.action}`);
        });
      }

      return {
        processed,
        discrepancies,
        fixed,
        issues,
        syncRunId,
        hasMore,
        totalSubscriptions: dbSubs.length,
        batchSize: BATCH_SIZE,
        message: hasMore
          ? `Processed batch of ${BATCH_SIZE}. Re-run to process remaining ${dbSubs.length - BATCH_SIZE} subscriptions.`
          : 'All subscriptions processed',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CRON] Reconciliation failed:', errorMessage);

      if (syncRunId) {
        try {
          await completeSyncRun(syncRunId, {
            status: 'failed',
            recordsProcessed: processed,
            recordsFixed: fixed,
            discrepanciesFound: discrepancies,
            errorMessage,
            metadata: { issues },
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
export const cronSubscriptionSyncService = new CronSubscriptionSyncService();
