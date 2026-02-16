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
  NoPendingKeywordsError,
  ScheduleValidationError,
} from '@shared/types/campaign.types';
import { calculateArticleCreditCost } from '@shared/constants';
import { serverEnv } from '@shared/config/env';
import { articleGenerationService } from './article-generation.service';
import {
  calculateNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  DEFAULT_SCHEDULE_HOUR,
} from '@shared/config/scheduling.config';
import { testModeCampaigns } from './campaign-lifecycle.service';

// =============================================================================
// Campaign Scheduling Service Class
// =============================================================================

export class CampaignSchedulingService {
  /**
   * Start a scheduled campaign for drip-feed article generation.
   * Validates campaign has schedule config and pending keywords, then sets status to 'scheduled'.
   *
   * @param campaignId - The campaign ID to start scheduling
   * @param userId - The user ID making the request
   * @returns Object with nextRunAt timestamp and pendingKeywords count
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign lacks schedule config, has no pending keywords, or invalid state
   */
  async startSchedule(
    campaignId: string,
    userId: string,
    campaign: ICampaign | null,
    pendingKeywordCount: number
  ): Promise<{ nextRunAt: string; pendingKeywords: number }> {
    // Get campaign with ownership check
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Validate campaign has schedule configuration
    if (!campaign.schedule_frequency) {
      throw new ScheduleValidationError(
        'Cannot start schedule: campaign has no schedule configuration. Please set a schedule frequency first.'
      );
    }

    // Validate campaign is in a state that can start scheduling (draft or paused)
    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new ScheduleValidationError(
        `Cannot start schedule: campaign status is '${campaign.status}'. Only draft or paused campaigns can be scheduled.`
      );
    }

    // Validate campaign has pending keywords
    if (pendingKeywordCount === 0) {
      throw new NoPendingKeywordsError();
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
      return { nextRunAt, pendingKeywords: pendingKeywordCount };
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
      throw new Error(`Failed to start schedule: ${error.message}`);
    }

    return { nextRunAt, pendingKeywords: pendingKeywordCount };
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

    // Validate campaign is in a state that can be paused (scheduled or active)
    if (campaign.status !== 'scheduled' && campaign.status !== 'active') {
      throw new ScheduleValidationError(
        `Cannot pause schedule: campaign status is '${campaign.status}'. Only scheduled or active campaigns can be paused.`
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
    // Atomically claim the campaign (prevents race conditions with concurrent cron runs).
    // Only transitions from 'scheduled' to 'active' - if another run already claimed it,
    // the WHERE clause won't match and we'll get no rows back.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)
      .eq('status', 'scheduled')
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
      // On error, set back to scheduled
      await supabaseAdmin.from('campaigns').update({ status: 'scheduled' }).eq('id', campaignId);
      throw new Error(`Failed to get pending keywords: ${keywordsError.message}`);
    }

    // If no pending keywords, mark campaign as completed
    if (!keywords || keywords.length === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'completed', next_run_at: null })
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

      // Process articles sequentially (awaited - NOT fire-and-forget).
      // Each article generation is mostly network I/O (AI API calls) so CPU time stays low.
      // If any article fails, it stays in 'queued' and recover-stale-articles cron will retry.
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

          console.log(`[ScheduledBatch] Generated article for keyword: ${keyword.keyword}`);
        } catch (error) {
          console.error(
            `[ScheduledBatch] Failed to generate article for keyword ${keyword.id}:`,
            error
          );
          // Update keyword status to 'failed' on error
          await supabaseAdmin.from('keywords').update({ status: 'failed' }).eq('id', keyword.id);
        }
      }

      // Calculate next run time
      const nextRunAt = calculateNextRunAt(
        campaign.schedule_frequency as ScheduleFrequency,
        campaign.schedule_timezone || DEFAULT_SCHEDULE_TIMEZONE,
        campaign.schedule_hour ?? DEFAULT_SCHEDULE_HOUR
      );

      // Check if campaign was paused during batch processing (user pause request)
      // Only set back to scheduled if still active (no user pause intervened)
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (currentCampaign?.status === 'paused') {
        console.log(
          `[ScheduledBatch] Campaign ${campaignId} was paused during processing, not resetting to scheduled`
        );
        // Update last_run_at but respect the paused status
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

      // Update campaign back to scheduled with new next_run_at
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'scheduled',
          next_run_at: nextRunAt,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return {
        articlesQueued: keywords.length,
        nextRunAt,
      };
    } catch (error: unknown) {
      // On error, check if campaign was paused before resetting to scheduled
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      // Only reset to scheduled if not paused (user pause takes priority)
      if (currentCampaign?.status !== 'paused') {
        await supabaseAdmin.from('campaigns').update({ status: 'scheduled' }).eq('id', campaignId);
      }

      throw error;
    }
  }
}

// Export singleton instance
export const campaignSchedulingService = new CampaignSchedulingService();
