/**
 * Cron Article Recovery Service
 *
 * Handles stale article recovery from stuck generation jobs.
 * Extracted from CronController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { createSyncRun, completeSyncRun } from './subscription-sync.service';

// =============================================================================
// Types
// =============================================================================

export interface IArticleRecoveryResult {
  processed: number;
  recovered: number;
  failed: number;
  syncRunId?: string;
  staleCount?: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum retry attempts for stale article recovery
 */
const MAX_ARTICLE_RETRIES = 3;

/**
 * Stale threshold in minutes - articles stuck longer than this are recovered
 */
const STALE_THRESHOLD_MINUTES = 30;

/**
 * Alert threshold for stale articles - emit alert when count exceeds this
 */
const STALE_ALERT_THRESHOLD = 10;

/**
 * Batch size for article recovery
 */
const ARTICLE_RECOVERY_BATCH_SIZE = 50;

// =============================================================================
// Cron Article Recovery Service Class
// =============================================================================

export class CronArticleRecoveryService {
  /**
   * Recover articles stuck in queued or generating status for too long.
   * POST /api/cron/recover-stale-articles
   */
  async recoverStaleArticles(): Promise<IArticleRecoveryResult> {
    console.log('[CRON] Starting stale article recovery...');

    let syncRunId: string | null = null;
    let processed = 0;
    let recovered = 0;
    let failed = 0;
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    try {
      // Create sync run record
      syncRunId = await createSyncRun('stale_article_recovery');

      // Find stale articles in queued or generating status
      const { data: staleArticles, error: fetchError } = await supabaseAdmin
        .from('articles')
        .select('id, user_id, status, attempt_count, credits_used, created_at, primary_keyword')
        .in('status', ['queued', 'generating'])
        .lt('created_at', staleThreshold.toISOString())
        .order('created_at', { ascending: true })
        .limit(ARTICLE_RECOVERY_BATCH_SIZE);

      if (fetchError) {
        throw new Error(`Failed to fetch stale articles: ${fetchError.message}`);
      }

      if (!staleArticles || staleArticles.length === 0) {
        console.log('[CRON] No stale articles found');
        await completeSyncRun(syncRunId, {
          status: 'completed',
          recordsProcessed: 0,
          recordsFixed: 0,
        });
        return { processed: 0, recovered: 0, failed: 0 };
      }

      console.log(`[CRON] Found ${staleArticles.length} stale articles to recover`);

      // Emit alert if stale count crosses threshold
      if (staleArticles.length >= STALE_ALERT_THRESHOLD) {
        console.error(
          `[CRON] ALERT: ${staleArticles.length} stale articles found (threshold: ${STALE_ALERT_THRESHOLD})`
        );
      }

      // Import articleGenerationService dynamically to avoid circular dependencies
      // eslint-disable-next-line no-restricted-syntax
      const { articleGenerationService } = await import('./article-generation.service');

      // Process each stale article
      for (const article of staleArticles) {
        processed++;
        const newAttemptCount = article.attempt_count + 1;

        try {
          console.log(
            `[CRON] Recovering article ${article.id} (attempt ${newAttemptCount}/${MAX_ARTICLE_RETRIES}) - ${article.primary_keyword}`
          );

          if (newAttemptCount > MAX_ARTICLE_RETRIES) {
            // Max retries exceeded - mark as failed_timeout
            console.log(
              `[CRON] Article ${article.id} exceeded max retries - marking as failed_timeout`
            );

            await supabaseAdmin
              .from('articles')
              .update({
                status: 'failed_timeout',
                last_attempt_at: new Date().toISOString(),
                attempt_count: newAttemptCount,
                generation_error: `Article generation timed out after ${MAX_ARTICLE_RETRIES} retry attempts. The generation process did not complete within ${STALE_THRESHOLD_MINUTES} minutes.`,
              })
              .eq('id', article.id);

            // Refund credits for failed_timeout articles
            await supabaseAdmin.rpc('add_purchased_credits', {
              p_user_id: article.user_id,
              p_amount: article.credits_used,
              p_reference_id: article.id,
              p_description: `Refund: article generation timed out after ${newAttemptCount} attempts`,
            });

            failed++;
          } else {
            // Retry the generation
            // Update attempt tracking first
            await supabaseAdmin
              .from('articles')
              .update({
                last_attempt_at: new Date().toISOString(),
                attempt_count: newAttemptCount,
                status: 'generating',
              })
              .eq('id', article.id);

            // Re-trigger generation
            // We need to fetch the original generation parameters
            const { data: articleDetails } = await supabaseAdmin
              .from('articles')
              .select('campaign_id, project_id')
              .eq('id', article.id)
              .single();

            if (articleDetails) {
              // Use minimal input for retry - just the keyword and IDs
              const retryInput = {
                keyword: article.primary_keyword,
                projectId: articleDetails.project_id || '',
                campaignId: articleDetails.campaign_id || '',
              };

              // Fire and forget the regeneration
              // Note: We don't charge additional credits for retries
              await articleGenerationService.generateArticle(
                article.id,
                article.user_id,
                retryInput
              );

              recovered++;
              console.log(`[CRON] Successfully initiated recovery for article ${article.id}`);
            } else {
              console.error(`[CRON] Could not fetch details for article ${article.id}`);
              failed++;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[CRON] Error recovering article ${article.id}:`, errorMessage);

          // Update attempt count even on failure
          await supabaseAdmin
            .from('articles')
            .update({
              last_attempt_at: new Date().toISOString(),
              attempt_count: newAttemptCount,
            })
            .eq('id', article.id);

          failed++;
        }
      }

      // Complete sync run
      await completeSyncRun(syncRunId, {
        status: 'completed',
        recordsProcessed: processed,
        recordsFixed: recovered,
        metadata: { failed, staleCount: staleArticles.length },
      });

      console.log(
        `[CRON] Stale article recovery complete: ${processed} processed, ${recovered} recovered, ${failed} failed/terminal`
      );

      return {
        processed,
        recovered,
        failed,
        syncRunId,
        staleCount: staleArticles.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CRON] Stale article recovery failed:', errorMessage);

      if (syncRunId) {
        try {
          await completeSyncRun(syncRunId, {
            status: 'failed',
            recordsProcessed: processed,
            recordsFixed: recovered,
            errorMessage,
            metadata: { failed },
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
export const cronArticleRecoveryService = new CronArticleRecoveryService();
