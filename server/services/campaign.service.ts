/**
 * Campaign Service
 *
 * Facade for campaign-related operations.
 * Delegates to specialized services:
 * - CampaignLifecycleService: creation, updates, status transitions, deletion
 * - CampaignKeywordService: keyword management operations
 * - CampaignSchedulingService: scheduling execution and cron handling
 *
 * Maintains backward compatibility with existing API.
 */

import {
  type ICampaign,
  type IKeyword,
  type ICampaignWithStats,
  type ICreateCampaignInput,
  type IUpdateCampaignInput,
  type ICampaignArticleStats,
  type ICampaignCreditStats,
  CampaignNotFoundError,
  CampaignAlreadyActiveError,
  InsufficientCreditsError,
  NoPendingKeywordsError,
} from '@shared/types/campaign.types';
import { serverEnv } from '@shared/config/env';
import { calculateArticleCreditCost } from '@shared/constants';
import { campaignLifecycleService, testModeCampaigns } from './campaign-lifecycle.service';
import { campaignKeywordService } from './campaign-keyword.service';
import { campaignSchedulingService } from './campaign-scheduling.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// =============================================================================
// Re-export test mode campaigns for backward compatibility
// =============================================================================

// Re-export for any code that imports directly from campaign.service
export { testModeCampaigns } from './campaign-lifecycle.service';

// =============================================================================
// Campaign Service Class (Facade)
// =============================================================================

export class CampaignService {
  // ===========================================================================
  // Lifecycle Methods - Delegate to CampaignLifecycleService
  // ===========================================================================

  /**
   * List all campaigns for a project with aggregated stats
   */
  async listByProject(userId: string, projectId: string): Promise<ICampaignWithStats[]> {
    return campaignLifecycleService.listByProject(userId, projectId);
  }

  /**
   * Get a single campaign by ID, enforcing ownership
   */
  async getById(campaignId: string, userId: string): Promise<ICampaign | null> {
    return campaignLifecycleService.getById(campaignId, userId);
  }

  /**
   * Get campaign detail with keywords, article stats, and credit stats
   */
  async getDetail(
    campaignId: string,
    userId: string
  ): Promise<{
    campaign: ICampaign;
    keywords: IKeyword[];
    articleStats: ICampaignArticleStats;
    creditStats: ICampaignCreditStats;
  } | null> {
    const campaign = await this.getById(campaignId, userId);
    if (!campaign) {
      return null;
    }

    // Get keywords via keyword service
    const keywords = await this.getKeywords(campaignId, userId);

    return campaignLifecycleService.getDetail(campaignId, userId, keywords);
  }

  /**
   * Create a new campaign with keywords
   */
  async create(userId: string, input: ICreateCampaignInput): Promise<ICampaign> {
    return campaignLifecycleService.create(userId, input);
  }

  /**
   * Update an existing campaign, enforcing ownership
   */
  async update(
    campaignId: string,
    userId: string,
    input: IUpdateCampaignInput
  ): Promise<ICampaign> {
    return campaignLifecycleService.update(campaignId, userId, input);
  }

  /**
   * Delete a campaign, enforcing ownership
   * Keywords and articles cascade delete via FK
   */
  async delete(campaignId: string, userId: string): Promise<void> {
    return campaignLifecycleService.delete(campaignId, userId);
  }

  // ===========================================================================
  // Keyword Methods - Delegate to CampaignKeywordService
  // ===========================================================================

  /**
   * Add keywords to an existing campaign
   */
  async addKeywords(
    campaignId: string,
    userId: string,
    keywords: string[]
  ): Promise<{
    added: number;
    duplicates: number;
  }> {
    return campaignKeywordService.addKeywords(campaignId, userId, keywords);
  }

  /**
   * Remove a single keyword with ownership check through campaign
   */
  async removeKeyword(keywordId: string, userId: string): Promise<void> {
    return campaignKeywordService.removeKeyword(keywordId, userId);
  }

  /**
   * List keywords for a campaign
   */
  async getKeywords(campaignId: string, userId: string): Promise<IKeyword[]> {
    return campaignKeywordService.getKeywords(campaignId, userId);
  }

  // ===========================================================================
  // Generation Methods - Keep in facade for now (complex orchestration)
  // ===========================================================================

  /**
   * Start bulk article generation for a campaign with idempotency support
   * Queues articles, updates campaign status, uses credits
   *
   * This method should be used for all new campaign start requests as it includes:
   * - Database-level locking via SELECT FOR UPDATE
   * - Idempotency key tracking
   * - Cached response retrieval for retries
   *
   * Handles two scenarios:
   * 1. Initial start: keywords with status 'pending' are queued and credits deducted
   * 2. Resume after pause: keywords with status 'queued' continue processing (no new credits needed)
   *
   * @param campaignId - The campaign ID to start
   * @param userId - The user ID making the request
   * @param idempotencyKey - Unique key for idempotency (optional but recommended)
   * @returns Generation result with queued count and credits used
   */
  async startGenerationWithIdempotency(
    campaignId: string,
    userId: string,
    idempotencyKey?: string
  ): Promise<{
    queued: number;
    creditsRequired: number;
    generationRunId?: string;
  }> {
    /* eslint-disable no-restricted-syntax -- Lazy import to avoid circular dependency */
    const { CampaignIdempotencyService } =
      await import('@server/services/campaign-idempotency.service');
    /* eslint-enable no-restricted-syntax */

    // Generate idempotency key if not provided
    const key = idempotencyKey || CampaignIdempotencyService.generateIdempotencyKey();

    // Claim the generation with idempotency (uses DB locking internally)
    const claimResult = await CampaignIdempotencyService.claimGeneration(campaignId, key, userId);

    // If this is a cached result, return it
    if (!claimResult.isNew && claimResult.cachedResponse) {
      console.log(`[Campaign] Returning cached result for idempotency key: ${key}`);
      return {
        queued: claimResult.cachedResponse.queued,
        creditsRequired: claimResult.cachedResponse.creditsRequired,
      };
    }

    // If campaign is already running, throw error
    if (!claimResult.isNew && claimResult.existingStatus === 'already_running') {
      throw new Error(
        'Campaign is already running. Please wait for the current generation to complete.'
      );
    }

    // If we got here, this is a new request - proceed with generation
    if (!claimResult.isNew || !claimResult.generationRunId) {
      throw new Error('Failed to claim campaign generation');
    }

    try {
      // Perform the actual generation using the internal method
      const result = await this.startGenerationInternal(campaignId, userId);

      // Mark the generation run as completed with response data
      await CampaignIdempotencyService.markCompleted(
        claimResult.generationRunId,
        result,
        result.queued,
        result.creditsRequired
      );

      // BUG C6: Do NOT clearCampaignRunId here — articles are queued but not yet generated.
      // The background worker (fireAndForget in start.ts) clears the run ID when processing
      // completes. Clearing here allows a concurrent /start call to race with the background
      // worker and start a second generation batch while the first is still running.
      // clearCampaignRunId is called at the END of processSequentially in start.ts instead.

      return {
        ...result,
        generationRunId: claimResult.generationRunId,
      };
    } catch (error) {
      // Mark the generation run as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await CampaignIdempotencyService.markFailed(claimResult.generationRunId, errorMessage);

      // Clear the generation_run_id from campaign on failure (generation never started)
      await CampaignIdempotencyService.clearCampaignRunId(campaignId);

      throw error;
    }
  }

  /**
   * Start bulk article generation for a campaign
   * Queues articles, updates campaign status, uses credits
   *
   * Handles two scenarios:
   * 1. Initial start: keywords with status 'pending' are queued and credits deducted
   * 2. Resume after pause: keywords with status 'queued' continue processing (no new credits needed)
   *
   * NOTE: This method does NOT include idempotency or locking.
   * Use startGenerationWithIdempotency() for new code.
   */
  async startGeneration(
    campaignId: string,
    userId: string
  ): Promise<{
    queued: number;
    creditsRequired: number;
  }> {
    return this.startGenerationInternal(campaignId, userId);
  }

  /**
   * Internal method that performs the actual generation work.
   * Separated so it can be called by both startGeneration and startGenerationWithIdempotency.
   *
   * E7: Uses atomic RPC to prevent orphaned articles and partial credit states
   */
  private async startGenerationInternal(
    campaignId: string,
    userId: string
  ): Promise<{
    queued: number;
    creditsRequired: number;
  }> {
    // Get campaign with ownership check
    const campaign = await this.getById(campaignId, userId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // BUG C5: Guard against invalid status transitions.
    // Only 'draft' and 'paused' campaigns may be started; any other status means
    // the campaign is already running, completed, or scheduled.
    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new CampaignAlreadyActiveError(campaign.status);
    }

    // In test mode with mock users, use in-memory keywords
    let pendingKeywords: Array<{ id: string; keyword: string }> = [];
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignWithKeywords = testModeCampaigns.get(campaignId);
      const allKeywords = campaignWithKeywords?.keywords ?? [];
      pendingKeywords = allKeywords;

      // For initial start, look for pending keywords
      // For resume, look for queued keywords (no pending keywords to process)
      const keywordsToProcess = allKeywords.filter(
        k => k.status === 'pending' || k.status === 'queued'
      );

      if (keywordsToProcess.length === 0) {
        // No keywords to process in test mode
        throw new NoPendingKeywordsError();
      }

      pendingKeywords = keywordsToProcess.map(k => ({
        id: k.id,
        keyword: k.keyword,
      }));

      // Update keyword statuses in memory
      if (keywordsToProcess.length > 0) {
        for (const kw of allKeywords) {
          if (kw.status === 'pending') {
            kw.status = 'queued';
          }
        }
        // Update campaign status
        campaign.status = 'active';
        testModeCampaigns.set(campaignId, campaign);
      }

      const creditsPerKeyword = calculateArticleCreditCost(
        campaign.ai_model,
        campaign.image_preset
      );
      const totalCreditsNeeded = keywordsToProcess.length * creditsPerKeyword;

      return {
        queued: keywordsToProcess.length,
        creditsRequired: totalCreditsNeeded,
      };
    }

    // Non-test mode or real users - use database
    // Get pending keywords for initial start
    const { data: dbPendingKeywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (keywordsError) {
      throw new Error(`Failed to get pending keywords: ${keywordsError.message}`);
    }

    pendingKeywords = dbPendingKeywords as Array<{ id: string; keyword: string }>;

    // If we have pending keywords, this is an initial start - queue them and deduct credits atomically
    if (pendingKeywords && pendingKeywords.length > 0) {
      const keywordCount = pendingKeywords.length;

      // Calculate credits per keyword using centralized pricing model
      const creditsPerKeyword = calculateArticleCreditCost(
        campaign.ai_model,
        campaign.image_preset
      );
      const totalCreditsNeeded = keywordCount * creditsPerKeyword;

      // Extract keywords array
      const keywords = pendingKeywords.map(k => k.keyword);

      // E7: Use atomic RPC to create articles and deduct credits in a single transaction
      const { data: batchResult, error: batchError } = await supabaseAdmin.rpc(
        'create_articles_with_credits',
        {
          p_user_id: userId,
          p_campaign_id: campaignId,
          p_project_id: campaign.project_id,
          p_keywords: keywords,
          p_credits_per_article: creditsPerKeyword,
          p_status: 'queued',
          p_image_preset: campaign.image_preset,
        }
      );

      if (batchError) {
        // Check if it's a credit insufficiency error
        if (batchError.message?.includes('Insufficient credits')) {
          throw new InsufficientCreditsError(totalCreditsNeeded, 0);
        }
        throw new Error(`Failed to create articles and deduct credits: ${batchError.message}`);
      }

      if (!batchResult || batchResult.length === 0) {
        throw new Error('Failed to create article records - no data returned from RPC');
      }

      // Update keywords to queued status (after successful article creation and credit deduction)
      const keywordIds = pendingKeywords.map(k => k.id);
      await supabaseAdmin.from('keywords').update({ status: 'queued' }).in('id', keywordIds);

      // Update campaign status to active
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId)
        .eq('user_id', userId);

      return {
        queued: keywordCount,
        creditsRequired: totalCreditsNeeded,
      };
    }

    // No pending keywords - check if this is a resume (has queued keywords)
    const { data: queuedKeywords, error: queuedError } = await supabaseAdmin
      .from('keywords')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('status', 'queued');

    if (queuedError) {
      throw new Error(`Failed to get queued keywords: ${queuedError.message}`);
    }

    // If we have queued keywords, this is a resume - just activate the campaign
    // No credits needed since they were already deducted when originally queued
    if (queuedKeywords && queuedKeywords.length > 0) {
      // Update campaign status to active
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId)
        .eq('user_id', userId);

      return {
        queued: queuedKeywords.length,
        creditsRequired: 0, // Credits already deducted
      };
    }

    // No keywords to process
    throw new NoPendingKeywordsError();
  }

  // ===========================================================================
  // Schedule Management Methods - Delegate to CampaignSchedulingService
  // ===========================================================================

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
    userId: string
  ): Promise<{ nextRunAt: string; pendingKeywords: number }> {
    const campaign = await this.getById(campaignId, userId);
    const pendingKeywordCount = await campaignKeywordService.getPendingKeywordCount(campaignId);
    return campaignSchedulingService.startSchedule(
      campaignId,
      userId,
      campaign,
      pendingKeywordCount
    );
  }

  /**
   * Pause a scheduled campaign.
   * Sets status to 'paused' and clears next_run_at.
   *
   * @param campaignId - The campaign ID to pause
   * @param userId - The user ID making the request
   * @returns Object confirming pause
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign is not in a pausable state
   */
  async pauseSchedule(campaignId: string, userId: string): Promise<{ paused: true }> {
    const campaign = await this.getById(campaignId, userId);
    return campaignSchedulingService.pauseSchedule(campaignId, userId, campaign);
  }

  /**
   * Resume a paused scheduled campaign.
   * Recalculates next_run_at from schedule config and sets status to 'scheduled'.
   *
   * @param campaignId - The campaign ID to resume
   * @param userId - The user ID making the request
   * @returns Object with recalculated nextRunAt timestamp
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign is not paused or lacks schedule config
   */
  async resumeSchedule(campaignId: string, userId: string): Promise<{ nextRunAt: string }> {
    const campaign = await this.getById(campaignId, userId);
    return campaignSchedulingService.resumeSchedule(campaignId, userId, campaign);
  }

  /**
   * Get campaigns that are due for scheduled processing.
   * Returns campaigns where status='scheduled' AND next_run_at <= NOW().
   *
   * @param limit - Maximum number of campaigns to return (default from config)
   * @returns Array of campaigns due for processing
   */
  async getScheduledCampaignsDue(limit: number): Promise<ICampaign[]> {
    return campaignSchedulingService.getScheduledCampaignsDue(limit);
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
    return campaignSchedulingService.processScheduledBatch(campaignId);
  }

  // ===========================================================================
  // Private Helpers - Kept for internal use
  // ===========================================================================

  /**
   * Get the count of pending keywords for a campaign.
   *
   * @param campaignId - The campaign ID
   * @returns Number of pending keywords
   */
  private async getPendingKeywordCount(campaignId: string): Promise<number> {
    return campaignKeywordService.getPendingKeywordCount(campaignId);
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
