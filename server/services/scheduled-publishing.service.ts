/**
 * Scheduled Publishing Service
 *
 * Finds articles whose scheduled_publish_at has arrived and publishes them
 * to connected integrations via DeliveryService.
 */
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { deliveryService } from './delivery.service';
import { MAX_PUBLISH_PER_RUN, MAX_PUBLISH_RETRIES } from '@shared/config/scheduling.config';

export interface IPublishingResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
}

interface IDueArticle {
  id: string;
  status: string;
  attempt_count: number | null;
}

export class ScheduledPublishingService {
  /**
   * Process articles scheduled to publish now.
   * Queries articles where scheduled_publish_at <= NOW() and status is ready to publish.
   * Limits to MAX_PUBLISH_PER_RUN per invocation.
   */
  async processScheduledPublications(): Promise<IPublishingResult> {
    const result: IPublishingResult = { processed: 0, published: 0, failed: 0, skipped: 0 };

    // Find articles due for publishing
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('id, status, attempt_count')
      .lte('scheduled_publish_at', new Date().toISOString())
      .in('status', ['draft', 'reviewed', 'approved', 'qa_passed'])
      .is('published_at', null)
      .order('scheduled_publish_at', { ascending: true })
      .limit(MAX_PUBLISH_PER_RUN);

    if (error) {
      throw new Error(`Failed to fetch scheduled articles: ${error.message}`);
    }

    if (!articles || articles.length === 0) {
      return result;
    }

    result.processed = articles.length;

    for (const article of articles as IDueArticle[]) {
      // Skip articles that have exceeded retry limit
      if ((article.attempt_count ?? 0) >= MAX_PUBLISH_RETRIES) {
        result.skipped++;
        console.warn(
          `[ScheduledPublishing] Skipping article ${article.id}: exceeded max retries (${article.attempt_count})`
        );
        continue;
      }

      // Atomically claim the article before delivery to prevent duplicate publishes
      // when concurrent cron runs overlap.
      const claimed = await this.claimArticleForPublishing(article);
      if (!claimed) {
        result.skipped++;
        continue;
      }

      try {
        const deliveryResult = await deliveryService.deliverArticle(article.id);

        if (deliveryResult.successful === 0 && deliveryResult.failed > 0) {
          // All deliveries failed — do NOT mark as published.
          // Retry attempt_count was already incremented by claimArticleForPublishing().
          result.failed++;
          console.error(
            `[ScheduledPublishing] All deliveries failed for article ${article.id}, will retry`
          );
        } else if (deliveryResult.successful > 0) {
          // At least one delivery succeeded — mark as published
          await supabaseAdmin
            .from('articles')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('id', article.id);
          result.published++;
          console.log(
            `[ScheduledPublishing] Published article ${article.id}: ${deliveryResult.successful}/${deliveryResult.total} integrations`
          );
        } else {
          // No integrations to deliver to (total === 0) — skip
          result.skipped++;
          console.log(
            `[ScheduledPublishing] No integrations for article ${article.id}, skipping`
          );
        }
      } catch (err) {
        result.failed++;
        console.error(`[ScheduledPublishing] Failed to publish article ${article.id}:`, err);
        // Retry attempt_count was already incremented by claimArticleForPublishing().
      }
    }

    return result;
  }

  /**
   * Claim a due article for publishing using optimistic concurrency control.
   * Exactly one worker can claim each attempt_count value.
   */
  private async claimArticleForPublishing(article: IDueArticle): Promise<boolean> {
    const now = new Date().toISOString();
    const nextAttempt = (article.attempt_count ?? 0) + 1;

    let claimQuery = supabaseAdmin
      .from('articles')
      .update({
        attempt_count: nextAttempt,
        last_attempt_at: now,
      })
      .eq('id', article.id)
      .is('published_at', null)
      .in('status', ['draft', 'reviewed', 'approved', 'qa_passed']);

    if (article.attempt_count === null) {
      claimQuery = claimQuery.is('attempt_count', null);
    } else {
      claimQuery = claimQuery.eq('attempt_count', article.attempt_count);
    }

    const { data, error } = await claimQuery.select('id');
    if (error) {
      throw new Error(`Failed to claim article ${article.id} for publishing: ${error.message}`);
    }

    const claimedRows = Array.isArray(data) ? data : [];
    if (claimedRows.length === 0) {
      console.log(
        `[ScheduledPublishing] Article ${article.id} already claimed by another worker, skipping`
      );
      return false;
    }

    return true;
  }
}

export const scheduledPublishingService = new ScheduledPublishingService();
