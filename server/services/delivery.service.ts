/**
 * Delivery Service
 *
 * Orchestrates article delivery to integrations (WordPress, webhooks).
 * Creates delivery records, dispatches to adapters, and tracks results.
 * Fires webhook events for Zapier/Make integration on successful delivery.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { integrationService } from './integration.service';
import { webhookEventService } from './webhook-event.service';
import { getAdapter } from '@server/integrations';
import type {
  IIntegrationDelivery,
  IIntegrationDeliveryWithDetails,
  IIntegration,
  DeliveryStatus,
} from '@shared/types/integration.types';
import type { IArticle } from '@shared/types/article.types';
import type { ICampaign } from '@shared/types/campaign.types';
import type { IProject } from '@shared/types/project.types';

/**
 * Simple serviceLogger for service-level logging
 */
const serviceLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`[DeliveryService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[DeliveryService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: Error | unknown) => {
    console.error(`[DeliveryService] ${message}`, error);
  },
};

/**
 * Campaign settings structure (from settings JSONB)
 */
interface ICampaignSettings {
  auto_publish?: boolean;
}

/**
 * Result of a delivery operation
 */
interface IDeliveryOperationResult {
  total: number;
  successful: number;
  failed: number;
  deliveries: IIntegrationDelivery[];
}

/**
 * Delivery Service class
 */
export class DeliveryService {
  /**
   * Deliver an article to all enabled integrations for its campaign
   *
   * @param articleId - Article ID to deliver
   * @param retryFailed - If true, only retry failed deliveries
   * @returns Delivery operation result
   */
  async deliverArticle(articleId: string, retryFailed = false): Promise<IDeliveryOperationResult> {
    // Get article with campaign info and images (needed for webhook payloads)
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select(
        'id, title, content, slug, meta_description, primary_keyword, word_count, seo_score, campaign_id, user_id, project_id, article_images(position, image_url, status)'
      )
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      serviceLogger.error('[DeliveryService] Article not found', {
        articleId,
        error: articleError,
      });
      throw new Error('Article not found');
    }

    // Get campaign with project info
    // Supabase returns a single object for many-to-one FK joins (project_id → projects)
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, settings, project_id, projects(id, name, domain)')
      .eq('id', article.campaign_id)
      .single();

    // Supabase FK joins return a single object for many-to-one relationships,
    // but may return an array for ambiguous relationships. Handle both.
    type ProjectInfo = { id: string; name: string; domain: string };
    const rawProjects = campaign?.projects as unknown;
    let project: ProjectInfo | null = null;
    if (Array.isArray(rawProjects) && rawProjects.length > 0) {
      project = rawProjects[0] as ProjectInfo;
    } else if (rawProjects && typeof rawProjects === 'object' && !Array.isArray(rawProjects)) {
      project = rawProjects as ProjectInfo;
    }

    // Get integrations to deliver to
    let integrationIds: string[];

    if (retryFailed) {
      // Get failed delivery integration IDs
      const { data: failedDeliveries } = await supabaseAdmin
        .from('integration_deliveries')
        .select('integration_id')
        .eq('article_id', articleId)
        .eq('status', 'failed');

      integrationIds = failedDeliveries?.map(d => d.integration_id) || [];
    } else {
      // Get enabled campaign integrations
      const { data: campaignIntegrations } = await supabaseAdmin
        .from('campaign_integrations')
        .select('integration_id')
        .eq('campaign_id', article.campaign_id)
        .eq('enabled', true);

      integrationIds = campaignIntegrations?.map(ci => ci.integration_id) || [];
    }

    const uniqueIntegrationIds = [...new Set(integrationIds)];

    if (uniqueIntegrationIds.length === 0) {
      serviceLogger.info('[DeliveryService] No integrations to deliver to', { articleId });
      return {
        total: 0,
        successful: 0,
        failed: 0,
        deliveries: [],
      };
    }

    // Fetch integrations
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('status', 'active')
      .in('id', uniqueIntegrationIds);

    if (!integrations || integrations.length === 0) {
      serviceLogger.warn('[DeliveryService] No valid integrations found', {
        integrationIds: uniqueIntegrationIds,
      });
      return {
        total: 0,
        successful: 0,
        failed: 0,
        deliveries: [],
      };
    }

    // Create/update delivery records and dispatch
    const results: IDeliveryOperationResult = {
      total: (integrations as unknown as IIntegration[]).length,
      successful: 0,
      failed: 0,
      deliveries: [],
    };

    for (const integration of integrations as IIntegration[]) {
      let deliveryId: string | null = null;

      try {
        let nextAttemptCount = 1;

        if (retryFailed) {
          // Retry only the most recent failed delivery record for this integration.
          const { data: existingFailed } = await supabaseAdmin
            .from('integration_deliveries')
            .select('id, attempt_count')
            .eq('article_id', articleId)
            .eq('integration_id', integration.id)
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingFailed) {
            deliveryId = existingFailed.id;
            nextAttemptCount = (existingFailed.attempt_count || 0) + 1;
          }
        }

        if (!deliveryId) {
          const { data: newDelivery, error: insertError } = await supabaseAdmin
            .from('integration_deliveries')
            .insert({
              article_id: articleId,
              integration_id: integration.id,
              campaign_id: article.campaign_id,
              status: 'pending',
              attempt_count: 0,
            })
            .select('id')
            .single();

          if (insertError || !newDelivery) {
            throw new Error(
              `Failed to create delivery record: ${insertError?.message ?? 'Unknown error'}`
            );
          }

          deliveryId = newDelivery.id;
          nextAttemptCount = 1;
        }

        // Mark as delivering and increment attempt count deterministically.
        await supabaseAdmin
          .from('integration_deliveries')
          .update({
            status: 'delivering',
            attempt_count: nextAttemptCount,
            error: null,
          })
          .eq('id', deliveryId);

        // Get credentials and deliver
        const { integration: fullIntegration, credentials } =
          await integrationService.getWithCredentials(integration.id, integration.user_id);

        const adapter = getAdapter(fullIntegration.type);

        const publishResult = await adapter.publish(
          {
            article: article as unknown as IArticle,
            campaign: campaign as unknown as ICampaign | null,
            project: project as unknown as IProject | null,
          },
          fullIntegration.config,
          credentials
        );

        // Update delivery record based on result
        if (publishResult.success) {
          const updateData: {
            status: DeliveryStatus;
            external_id?: string | null;
            external_url?: string | null;
            error?: string | null;
            delivered_at?: string;
          } = {
            status: 'delivered',
            external_id: publishResult.externalId || null,
            external_url: publishResult.externalUrl || null,
            error: null,
            delivered_at: new Date().toISOString(),
          };

          await supabaseAdmin
            .from('integration_deliveries')
            .update(updateData)
            .eq('id', deliveryId);

          // Update article published URL if WordPress returned an external URL.
          if (publishResult.externalUrl && fullIntegration.type === 'wordpress') {
            const publishedAt = new Date().toISOString();
            await supabaseAdmin
              .from('articles')
              .update({
                published_url: publishResult.externalUrl,
                published_at: publishedAt,
              })
              .eq('id', articleId);

            // Update local article reference for downstream webhook payload.
            (article as Record<string, unknown>).published_url = publishResult.externalUrl;
            (article as Record<string, unknown>).published_at = publishedAt;
          }

          results.successful++;
        } else {
          await supabaseAdmin
            .from('integration_deliveries')
            .update({
              status: 'failed',
              error: publishResult.error || 'Unknown error',
            })
            .eq('id', deliveryId);

          results.failed++;
        }

        // Fetch updated delivery record
        const { data: updatedDelivery } = await supabaseAdmin
          .from('integration_deliveries')
          .select('*')
          .eq('id', deliveryId)
          .single();

        if (updatedDelivery) {
          results.deliveries.push(updatedDelivery as IIntegrationDelivery);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        serviceLogger.error('[DeliveryService] Delivery error', {
          articleId,
          integrationId: integration.id,
          error: errorMessage,
        });

        if (deliveryId) {
          await supabaseAdmin
            .from('integration_deliveries')
            .update({
              status: 'failed',
              error: errorMessage,
            })
            .eq('id', deliveryId);

          const { data: failedDelivery } = await supabaseAdmin
            .from('integration_deliveries')
            .select('*')
            .eq('id', deliveryId)
            .single();

          if (failedDelivery) {
            results.deliveries.push(failedDelivery as IIntegrationDelivery);
          }
        }

        results.failed++;
      }
    }

    // Fire article.published webhook once per delivery operation (not per integration).
    if (results.successful > 0) {
      this.fireArticlePublishedEvent(
        article as unknown as IArticle & { published_url?: string },
        campaign as unknown as ICampaign | null,
        project as unknown as IProject | null
      ).catch(err => {
        serviceLogger.error('[DeliveryService] Failed to fire webhook event', err);
      });
    }

    serviceLogger.info('[DeliveryService] Delivery completed', {
      articleId,
      total: results.total,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Get delivery records for an article with integration details
   */
  async getArticleDeliveries(
    articleId: string,
    userId: string
  ): Promise<IIntegrationDeliveryWithDetails[]> {
    // Verify article ownership first.
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('id', articleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!article) {
      throw new Error('Article not found or access denied');
    }

    const { data, error } = await supabaseAdmin
      .from('integration_deliveries')
      .select(
        `
        id,
        article_id,
        integration_id,
        campaign_id,
        status,
        external_id,
        external_url,
        error,
        attempt_count,
        delivered_at,
        created_at,
        integration:integrations (
          id,
          name,
          type,
          status
        )
        `
      )
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });

    if (error) {
      serviceLogger.error('[DeliveryService] Failed to get deliveries', { articleId, error });
      throw new Error('Failed to get delivery records');
    }

    return (data || []) as unknown as IIntegrationDeliveryWithDetails[];
  }

  /**
   * Check if a campaign has auto_publish enabled
   */
  async shouldAutoDeliver(campaignId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('campaigns')
      .select('settings')
      .eq('id', campaignId)
      .single();

    if (!data) {
      return false;
    }

    const settings = (data.settings as ICampaignSettings) || {};
    return settings.auto_publish === true;
  }

  /**
   * Fire article.published webhook event for Zapier/Make integration
   * Uses fire-and-forget pattern - errors are logged but don't block delivery.
   *
   * @param article - Article that was published
   * @param campaign - Campaign the article belongs to
   * @param project - Project the campaign belongs to
   */
  private async fireArticlePublishedEvent(
    article: IArticle & { published_url?: string },
    campaign: ICampaign | null,
    project: IProject | null
  ): Promise<void> {
    try {
      const articleData = webhookEventService.buildArticleEventData(
        {
          id: article.id,
          title: article.title,
          slug: article.slug,
          primary_keyword: article.primary_keyword,
          word_count: article.word_count,
          seo_score: article.seo_score,
          published_url: article.published_url || null,
          campaign_id: article.campaign_id,
          project_id: article.project_id,
        },
        campaign ? { id: campaign.id, name: campaign.name } : null,
        project ? { id: project.id, name: project.name } : null
      );

      await webhookEventService.dispatch(article.user_id, 'article.published', articleData);
    } catch (error) {
      // Log but don't throw - webhook delivery should not block the main operation
      serviceLogger.error('[DeliveryService] Error firing article.published event', error);
    }
  }
}

/**
 * Singleton instance
 */
export const deliveryService = new DeliveryService();
