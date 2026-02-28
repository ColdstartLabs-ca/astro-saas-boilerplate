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

    for (const article of articles) {
      // Skip articles that have exceeded retry limit
      if ((article.attempt_count ?? 0) >= MAX_PUBLISH_RETRIES) {
        result.skipped++;
        console.warn(
          `[ScheduledPublishing] Skipping article ${article.id}: exceeded max retries (${article.attempt_count})`
        );
        continue;
      }

      try {
        const deliveryResult = await deliveryService.deliverArticle(article.id);

        // Mark as published
        await supabaseAdmin
          .from('articles')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', article.id);

        if (deliveryResult.failed > 0 && deliveryResult.successful === 0) {
          result.failed++;
          console.error(
            `[ScheduledPublishing] All deliveries failed for article ${article.id}`
          );
        } else {
          result.published++;
          console.log(
            `[ScheduledPublishing] Published article ${article.id}: ${deliveryResult.successful}/${deliveryResult.total} integrations`
          );
        }
      } catch (err) {
        result.failed++;
        console.error(`[ScheduledPublishing] Failed to publish article ${article.id}:`, err);
        // Increment attempt count for retry limiting
        await supabaseAdmin
          .from('articles')
          .update({
            attempt_count: (article.attempt_count ?? 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', article.id);
      }
    }

    return result;
  }
}

export const scheduledPublishingService = new ScheduledPublishingService();
