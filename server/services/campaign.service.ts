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
  type IAddKeywordsResponse,
} from '@shared/types/campaign.types';
import { campaignLifecycleService } from './campaign-lifecycle.service';
import { campaignKeywordService } from './campaign-keyword.service';
import { campaignSchedulingService } from './campaign-scheduling.service';

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
  ): Promise<IAddKeywordsResponse> {
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
