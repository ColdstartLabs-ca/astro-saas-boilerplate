/**
 * Campaign Scheduling Service
 *
 * Handles campaign scheduling execution and cron handling.
 * Extracted from CampaignService for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type ICampaign,
  type ScheduleFrequency,
  CampaignNotFoundError,
  ScheduleValidationError,
} from '@shared/types/campaign.types';
import { calculateArticleCreditCost } from '@shared/constants';
import { serverEnv } from '@shared/config/env';
import { articleGenerationService } from './article-generation.service';
import {
  calculateNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  DEFAULT_SCHEDULE_HOUR,
  SCHEDULE_FREQUENCIES,
} from '@shared/config/scheduling.config';
import { testModeCampaigns } from './campaign-lifecycle.service';

// =============================================================================
// Campaign Scheduling Service Class
// =============================================================================

export class CampaignSchedulingService {
  /**
   * Resume a paused campaign by setting status to 'scheduled' with recalculated next_run_at.
   * Used by the resume-schedule endpoint.
   * (startSchedule is now an alias for resumeSchedule since campaigns auto-activate on creation)
   *
   * @param campaignId - The campaign ID to resume
   * @param userId - The user ID making the request
   * @param campaign - The campaign to resume (must be fetched with ownership check)
   * @param pendingKeywordCount - Number of pending keywords (unused, kept for compat)
   * @returns Object with nextRunAt timestamp and pendingKeywords count
   */
  async startSchedule(
    campaignId: string,
    userId: string,
    campaign: ICampaign | null,
    pendingKeywordCount: number
  ): Promise<{ nextRunAt: string; pendingKeywords: number }> {
    // This is now equivalent to resumeSchedule
    const result = await this.resumeSchedule(campaignId, userId, campaign);
    return { nextRunAt: result.nextRunAt, pendingKeywords: pendingKeywordCount };
  }

  /**
   * Pause a scheduled campaign.
   * Sets status to 'paused' and clears next_run_at.
   *
   * @param campaignId - The campaign ID to pause
   * @param userId - The user ID making the request
   * @param campaign - The campaign to pause (must be fetched with ownership check)
   * @returns Object confirming pause
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign is not in a pausable state
   */
  async pauseSchedule(
    campaignId: string,
    userId: string,
    campaign: ICampaign | null
  ): Promise<{ paused: true }> {
    // Get campaign with ownership check
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Validate campaign is in a state that can be paused (only scheduled)
    if (campaign.status !== 'scheduled') {
      throw new ScheduleValidationError(
        `Cannot pause schedule: campaign status is '${campaign.status}'. Only scheduled campaigns can be paused.`
      );
    }

    // In test mode with mock users, update in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignData = testModeCampaigns.get(campaignId);
      if (campaignData) {
        campaignData.status = 'paused';
        campaignData.next_run_at = null;
        testModeCampaigns.set(campaignId, campaignData);
      }
      return { paused: true };
    }

    // Update campaign status and clear next_run_at
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'paused',
        next_run_at: null,
      })
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to pause schedule: ${error.message}`);
    }

    return { paused: true };
  }

  /**
   * Resume a paused scheduled campaign.
   * Recalculates next_run_at from schedule config and sets status to 'scheduled'.
   *
   * @param campaignId - The campaign ID to resume
   * @param userId - The user ID making the request
   * @param campaign - The campaign to resume (must be fetched with ownership check)
   * @returns Object with recalculated nextRunAt timestamp
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign is not paused or lacks schedule config
   */
  async resumeSchedule(
    campaignId: string,
    userId: string,
    campaign: ICampaign | null
  ): Promise<{ nextRunAt: string }> {
    // Get campaign with ownership check
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Validate campaign is paused
    if (campaign.status !== 'paused') {
      throw new ScheduleValidationError(
        `Cannot resume schedule: campaign status is '${campaign.status}'. Only paused campaigns can be resumed.`
      );
    }

    // Validate campaign has schedule configuration
    if (!campaign.schedule_frequency) {
      throw new ScheduleValidationError(
        'Cannot resume schedule: campaign has no schedule configuration. Please set a schedule frequency first.'
      );
    }

    // Calculate next run time using schedule config
    const nextRunAt = calculateNextRunAt(
      campaign.schedule_frequency as ScheduleFrequency,
      campaign.schedule_timezone || DEFAULT_SCHEDULE_TIMEZONE,
      campaign.schedule_hour ?? DEFAULT_SCHEDULE_HOUR
    );

    // In test mode with mock users, update in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignData = testModeCampaigns.get(campaignId);
      if (campaignData) {
        campaignData.status = 'scheduled';
        campaignData.next_run_at = nextRunAt;
        testModeCampaigns.set(campaignId, campaignData);
      }
      return { nextRunAt };
    }

    // Update campaign status and next_run_at
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'scheduled',
        next_run_at: nextRunAt,
      })
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to resume schedule: ${error.message}`);
    }

    return { nextRunAt };
  }

  /**
   * Get campaigns that are due for scheduled processing.
   * Returns campaigns where status='scheduled' AND next_run_at <= NOW().
   *
   * @param limit - Maximum number of campaigns to return (default from config)
   * @returns Array of campaigns due for processing
   */
  async getScheduledCampaignsDue(limit: number): Promise<ICampaign[]> {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get scheduled campaigns: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Process a scheduled batch for a campaign.
   * - Queues the next batch_size keywords
   * - Deducts credits
   * - Starts generation via fireAndForget
   * - Updates next_run_at
   * - Handles completion and insufficient credits
   *
   * @param campaignId - Campaign ID to process
   * @returns Processing result with status
   */
  async processScheduledBatch(campaignId: string): Promise<{
    completed?: boolean;
    paused?: boolean;
    pauseReason?: string;
    articlesQueued?: number;
    nextRunAt?: string;
  }> {
    // Atomically claim the campaign using generation_run_id lock (prevents race conditions).
    // Only updates when generation_run_id IS NULL and status='scheduled'.
    // If another cron run already claimed it, the WHERE clause won't match and we skip.
    const runId = crypto.randomUUID();
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('campaigns')
      .update({ generation_run_id: runId })
      .eq('id', campaignId)
      .eq('status', 'scheduled')
      .is('generation_run_id', null)
      .select('*')
      .single();

    if (claimError || !claimed) {
      console.log(
        `[ScheduledBatch] Campaign ${campaignId} already claimed or status changed, skipping`
      );
      return {};
    }

    const campaign = claimed;

    // Get pending keywords (limit by batch_size)
    const batchSize = campaign.schedule_batch_size || 1;
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(batchSize);

    if (keywordsError) {
      // On error, clear generation_run_id lock to allow future processing
      await supabaseAdmin
        .from('campaigns')
        .update({ generation_run_id: null })
        .eq('id', campaignId);
      throw new Error(`Failed to get pending keywords: ${keywordsError.message}`);
    }

    // If no pending keywords, mark campaign as completed and clear lock
    if (!keywords || keywords.length === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'completed', next_run_at: null, generation_run_id: null })
        .eq('id', campaignId);

      return { completed: true };
    }

    // Try to deduct credits and queue articles
    try {
      // Calculate credits per article using centralized pricing model
      const creditsPerArticle = calculateArticleCreditCost(
        campaign.ai_model,
        campaign.image_preset
      );
      const keywordTexts = keywords.map(k => k.keyword);

      // Call create_articles_with_credits RPC with correct parameters
      const { error: rpcError } = await supabaseAdmin.rpc('create_articles_with_credits', {
        p_user_id: campaign.user_id,
        p_campaign_id: campaignId,
        p_project_id: campaign.project_id,
        p_keywords: keywordTexts,
        p_credits_per_article: creditsPerArticle,
        p_status: 'queued',
        p_image_preset: campaign.image_preset,
      });

      if (rpcError) {
        // Check if error is due to insufficient credits
        if (rpcError.message?.includes('Insufficient credits')) {
          // Pause campaign with reason
          const settings = {
            ...(campaign.settings as object),
            pause_reason: 'insufficient_credits',
            paused_at: new Date().toISOString(),
          };

          await supabaseAdmin
            .from('campaigns')
            .update({
              status: 'paused',
              next_run_at: null,
              generation_run_id: null,
              settings,
            })
            .eq('id', campaignId);

          return {
            paused: true,
            pauseReason: 'insufficient_credits',
          };
        }

        throw rpcError;
      }

      // Update keywords to 'queued' status (after successful article creation and credit deduction)
      const keywordIds = keywords.map(k => k.id);
      await supabaseAdmin.from('keywords').update({ status: 'queued' }).in('id', keywordIds);

      // Assign scheduled_publish_at dates to newly queued articles
      try {
        const frequency = campaign.schedule_frequency as ScheduleFrequency;
        const frequencyConfig = SCHEDULE_FREQUENCIES[frequency];
        const intervalMs = frequencyConfig
          ? frequencyConfig.intervalHours * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

        const { data: newArticles } = await supabaseAdmin
          .from('articles')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('status', 'queued')
          .in('primary_keyword', keywordTexts)
          .order('created_at', { ascending: true });

        if (newArticles && newArticles.length > 0) {
          const baseDate = new Date();
          for (let i = 0; i < newArticles.length; i++) {
            const scheduledAt = new Date(baseDate.getTime() + i * intervalMs);
            await supabaseAdmin
              .from('articles')
              .update({ scheduled_publish_at: scheduledAt.toISOString() })
              .eq('id', newArticles[i].id);
          }
        }
      } catch (err) {
        console.warn('[ScheduledBatch] Failed to assign scheduled_publish_at:', err);
        // Non-fatal — articles will still be created, just without scheduled dates
      }

      // BUG M24: Sequential processing risks exceeding Cloudflare's 10ms CPU limit for large batches.
      // Each iteration is predominantly network I/O (AI API calls, DB queries) so CPU time stays low.
      // TODO: If batch sizes exceed ~5 articles, consider offloading to a queue or cron sub-job.
      // Track success/failure counts to implement BUG H7 fix below.
      let batchSuccessCount = 0;
      let batchFailureCount = 0;

      for (const keyword of keywords) {
        try {
          // Update keyword status to 'generating'
          await supabaseAdmin
            .from('keywords')
            .update({ status: 'generating' })
            .eq('id', keyword.id);

          // Find the article for this keyword
          const { data: article } = await supabaseAdmin
            .from('articles')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('primary_keyword', keyword.keyword)
            .eq('status', 'queued')
            .single();

          if (!article) {
            throw new Error(`Article not found for keyword: ${keyword.keyword}`);
          }

          // Generate article
          await articleGenerationService.generateArticle(article.id, campaign.user_id, {
            keyword: keyword.keyword,
            projectId: campaign.project_id ?? '',
            campaignId,
            model: campaign.ai_model,
            tone: campaign.tone,
            targetWordCount: campaign.target_word_count,
            imagePreset: campaign.image_preset ?? undefined,
          });

          // Update keyword status to 'generated' on success
          await supabaseAdmin.from('keywords').update({ status: 'generated' }).eq('id', keyword.id);

          batchSuccessCount++;
          console.log(`[ScheduledBatch] Generated article for keyword: ${keyword.keyword}`);
        } catch (error) {
          console.error(
            `[ScheduledBatch] Failed to generate article for keyword ${keyword.id}:`,
            error
          );
          // Update keyword status to 'failed' on error
          await supabaseAdmin.from('keywords').update({ status: 'failed' }).eq('id', keyword.id);
          batchFailureCount++;
        }
      }

      // BUG H7: If every article in the batch failed, pause the campaign instead of rescheduling.
      // Rescheduling on total failure would loop indefinitely wasting credits on retries.
      // The recover-stale-articles cron will reset failed keywords to 'queued' for future retries.
      if (batchSuccessCount === 0 && batchFailureCount > 0) {
        const settings = {
          ...(campaign.settings as object),
          pause_reason: 'batch_generation_failed',
          paused_at: new Date().toISOString(),
        };
        await supabaseAdmin
          .from('campaigns')
          .update({
            status: 'paused',
            next_run_at: null,
            last_run_at: new Date().toISOString(),
            generation_run_id: null,
            settings,
          })
          .eq('id', campaignId);

        console.warn(
          `[ScheduledBatch] Campaign ${campaignId} paused: all ${batchFailureCount} article(s) in batch failed.`
        );
        return {
          articlesQueued: keywords.length,
          paused: true,
          pauseReason: 'batch_generation_failed',
        };
      }

      // Calculate next run time
      const nextRunAt = calculateNextRunAt(
        campaign.schedule_frequency as ScheduleFrequency,
        campaign.schedule_timezone || DEFAULT_SCHEDULE_TIMEZONE,
        campaign.schedule_hour ?? DEFAULT_SCHEDULE_HOUR
      );

      // Check if campaign was paused during batch processing (user pause request via pause-schedule endpoint)
      // The pause endpoint sets generation_run_id=NULL and status='paused', so we check the DB.
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (currentCampaign?.status === 'paused') {
        console.log(
          `[ScheduledBatch] Campaign ${campaignId} was paused during processing, not resetting generation_run_id`
        );
        // Update last_run_at but respect the paused status (don't clear generation_run_id, already cleared by pause)
        await supabaseAdmin
          .from('campaigns')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', campaignId);

        return {
          articlesQueued: keywords.length,
          paused: true,
          pauseReason: 'user_requested',
        };
      }

      // Clear generation_run_id lock and update next_run_at
      // Campaign stays in 'scheduled' status throughout processing
      await supabaseAdmin
        .from('campaigns')
        .update({
          next_run_at: nextRunAt,
          last_run_at: new Date().toISOString(),
          generation_run_id: null,
        })
        .eq('id', campaignId);

      return {
        articlesQueued: keywords.length,
        nextRunAt,
      };
    } catch (error: unknown) {
      // On error, clear generation_run_id lock to allow future processing
      await supabaseAdmin
        .from('campaigns')
        .update({ generation_run_id: null })
        .eq('id', campaignId);

      throw error;
    }
  }
}

// Export singleton instance
export const campaignSchedulingService = new CampaignSchedulingService();
