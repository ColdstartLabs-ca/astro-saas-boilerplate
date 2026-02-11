/**
 * Campaign Service
 * Server-side business logic for campaign CRUD and bulk article generation
 *
 * Handles:
 * - Campaign creation with keyword batch insertion
 * - Campaign retrieval with ownership enforcement
 * - Campaign updates and deletion
 * - Keyword management (add, remove, list)
 * - Bulk article generation orchestration
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type ICampaign,
  type IKeyword,
  type ICampaignWithStats,
  type ICreateCampaignInput,
  type IUpdateCampaignInput,
  type ICampaignArticleStats,
  type ICampaignCreditStats,
  CampaignNotFoundError,
  InsufficientCreditsError,
  NoPendingKeywordsError,
} from '@shared/types/campaign.types';
import { isAvailableImagePreset } from '@shared/config/image-models.config';
import { isAvailableWriterPreset } from '@shared/config/ai-models.config';
import { calculateArticleCreditCost } from '@shared/constants';
import { serverEnv } from '@shared/config/env';
import { AppError } from '@shared/utils/errors';
import {
  createCampaignSchema,
  updateCampaignSchema,
  addKeywordsWithCampaignSchema,
} from '@shared/validation/campaign.schema';

// =============================================================================
// Campaign Service Class
// ============================================================================

export class CampaignService {
  /**
   * List all campaigns for a project with aggregated stats
   */
  async listByProject(userId: string, projectId: string): Promise<ICampaignWithStats[]> {
    await this.verifyProjectOwnership(projectId, userId);

    // Get campaigns with keyword and article counts
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(
        `
        *,
        keywords(count),
        articles(count)
      `
      )
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }

    // Get campaign IDs
    const campaignIds = (data as ICampaign[]).map(c => c.id);

    // Fetch completed keyword counts for all campaigns in one query
    let completedCounts: Record<string, number> = {};
    if (campaignIds.length > 0) {
      const { data: completedKeywords } = await supabaseAdmin
        .from('keywords')
        .select('campaign_id')
        .eq('status', 'generated')
        .in('campaign_id', campaignIds);

      if (completedKeywords) {
        // Count generated keywords per campaign
        completedCounts = completedKeywords.reduce(
          (acc, kw) => {
            acc[kw.campaign_id] = (acc[kw.campaign_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      }
    }

    // Transform data to include stats
    return (
      data as Array<
        {
          keywords: { count: number }[] | null;
          articles: { count: number }[] | null;
        } & ICampaign
      >
    ).map(campaign => ({
      ...campaign,
      keyword_count: campaign.keywords?.[0]?.count ?? 0,
      article_count: campaign.articles?.[0]?.count ?? 0,
      completed_count: completedCounts[campaign.id] ?? 0,
    })) as ICampaignWithStats[];
  }

  /**
   * Get a single campaign by ID, enforcing ownership
   */
  async getById(campaignId: string, userId: string): Promise<ICampaign | null> {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get campaign: ${error.message}`);
    }

    return data as ICampaign;
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

    // Get keywords
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (keywordsError) {
      throw new Error(`Failed to get keywords: ${keywordsError.message}`);
    }

    // Get article stats
    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('articles')
      .select('status, credits_used')
      .eq('campaign_id', campaignId);

    if (articlesError) {
      throw new Error(`Failed to get article stats: ${articlesError.message}`);
    }

    // Compute article stats
    const stats: ICampaignArticleStats = {
      queued: 0,
      generating: 0,
      draft: 0,
      published: 0,
      total: articles?.length ?? 0,
    };

    // Compute credit stats
    const creditStats: ICampaignCreditStats = {
      creditsUsed: 0,
      creditsRefunded: 0,
      successfulCount: 0,
      failedCount: 0,
      costPerArticle: calculateArticleCreditCost(campaign.ai_model, campaign.image_preset),
      estimatedCreditsRemaining: 0,
      totalCreditsRequired: 0,
    };

    for (const article of articles ?? []) {
      switch (article.status) {
        // Intermediate statuses - credits pre-charged, article not yet complete
        case 'queued':
          stats.queued++;
          break;
        case 'generating':
        case 'qa_checking':
          stats.generating++;
          creditStats.creditsUsed += article.credits_used ?? 0;
          break;

        // Success statuses - generation completed, credits stay charged
        case 'draft':
        case 'reviewed':
        case 'qa_passed':
        case 'approved':
        case 'published':
          stats.draft++;
          if (article.status === 'published') {
            stats.published++;
          }
          creditStats.creditsUsed += article.credits_used ?? 0;
          creditStats.successfulCount++;
          break;

        // Failure statuses - credits refunded
        case 'failed':
        case 'failed_quality':
        case 'failed_timeout':
        case 'qa_failed':
        case 'rejected':
          creditStats.creditsRefunded += article.credits_used ?? 0;
          creditStats.failedCount++;
          break;
      }
    }

    // Count pending keywords for remaining credits estimate
    const pendingCount =
      keywords?.filter(k => k.status === 'pending' || k.status === 'queued').length ?? 0;
    creditStats.estimatedCreditsRemaining = pendingCount * creditStats.costPerArticle;
    creditStats.totalCreditsRequired =
      creditStats.creditsUsed + creditStats.estimatedCreditsRemaining;

    return {
      campaign,
      keywords: keywords as IKeyword[],
      articleStats: stats,
      creditStats,
    };
  }

  /**
   * Create a new campaign with keywords
   */
  async create(userId: string, input: ICreateCampaignInput): Promise<ICampaign> {
    // Validate input
    const validated = createCampaignSchema.parse(input);

    // Server-side validation: check if model is available
    if (
      validated.model &&
      !isAvailableWriterPreset(validated.model, serverEnv.AVAILABLE_WRITER_PRESETS)
    ) {
      throw new AppError('MODEL_NOT_AVAILABLE', 'Selected writer model is not available', 400);
    }

    // Server-side validation: check if image preset is available
    if (
      validated.imagePreset &&
      !isAvailableImagePreset(validated.imagePreset, serverEnv.AVAILABLE_IMAGE_PRESETS)
    ) {
      throw new AppError('MODEL_NOT_AVAILABLE', 'Selected image preset is not available', 400);
    }

    await this.verifyProjectOwnership(validated.projectId, userId);

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'draft',
        ai_model: validated.model || 'pro',
        tone: validated.tone || 'professional',
        target_word_count: validated.targetWordCount || 1500,
        settings: {},
        image_preset: validated.imagePreset || null,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Failed to create campaign: ${campaignError?.message ?? 'Unknown error'}`);
    }

    // Batch insert keywords (skip duplicates via ON CONFLICT)
    const keywordRows = this.buildKeywordRows(
      campaign.id,
      validated.keywords.map(k => k.trim())
    );

    const { error: keywordsError } = await supabaseAdmin.from('keywords').insert(keywordRows);

    // Ignore duplicate key errors (ON CONFLICT DO NOTHING equivalent)
    if (keywordsError && keywordsError.code !== '23505') {
      throw new Error(`Failed to add keywords: ${keywordsError.message}`);
    }

    return campaign as ICampaign;
  }

  /**
   * Update an existing campaign, enforcing ownership
   */
  async update(
    campaignId: string,
    userId: string,
    input: IUpdateCampaignInput
  ): Promise<ICampaign> {
    // Validate input
    const validated = updateCampaignSchema.parse(input);

    // Server-side validation: check if model is available
    if (
      validated.model &&
      !isAvailableWriterPreset(validated.model, serverEnv.AVAILABLE_WRITER_PRESETS)
    ) {
      throw new AppError('MODEL_NOT_AVAILABLE', 'Selected writer model is not available', 400);
    }

    // Server-side validation: check if image preset is available
    if (
      validated.imagePreset &&
      !isAvailableImagePreset(validated.imagePreset, serverEnv.AVAILABLE_IMAGE_PRESETS)
    ) {
      throw new AppError('MODEL_NOT_AVAILABLE', 'Selected image preset is not available', 400);
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.status !== undefined) updates.status = validated.status;
    if (validated.model !== undefined) updates.ai_model = validated.model;
    if (validated.tone !== undefined) updates.tone = validated.tone;
    if (validated.targetWordCount !== undefined)
      updates.target_word_count = validated.targetWordCount;
    if (validated.imagePreset !== undefined) updates.image_preset = validated.imagePreset;

    // Update campaign with ownership check
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new CampaignNotFoundError(campaignId);
      }
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    return data as ICampaign;
  }

  /**
   * Delete a campaign, enforcing ownership
   * Keywords and articles cascade delete via FK
   */
  async delete(campaignId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

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
    // Validate
    addKeywordsWithCampaignSchema.parse({ campaignId, keywords });

    // Verify campaign ownership
    const campaign = await this.getById(campaignId, userId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Get existing normalized keywords to count duplicates
    const { data: existingKeywords } = await supabaseAdmin
      .from('keywords')
      .select('keyword_normalized')
      .eq('campaign_id', campaignId);

    const existingSet = new Set(existingKeywords?.map(k => k.keyword_normalized) ?? []);
    const newKeywords = keywords.map(k => k.trim()).filter(k => k.length > 0);

    // Normalize using the same logic as the DB constraint
    const normalizeKeyword = (kw: string) => kw.trim().toLowerCase().replace(/\s+/g, ' ');

    const uniqueNew: string[] = [];
    const duplicates: string[] = [];

    for (const kw of newKeywords) {
      const normalized = normalizeKeyword(kw);
      if (existingSet.has(normalized)) {
        duplicates.push(kw);
      } else {
        uniqueNew.push(kw);
        existingSet.add(normalized); // Track within batch to avoid duplicates in same request
      }
    }

    // Batch insert unique keywords
    const keywordRows = this.buildKeywordRows(campaignId, uniqueNew);

    if (keywordRows.length > 0) {
      const { error } = await supabaseAdmin.from('keywords').insert(keywordRows);

      if (error && error.code !== '23505') {
        throw new Error(`Failed to add keywords: ${error.message}`);
      }
    }

    return {
      added: uniqueNew.length,
      duplicates: duplicates.length,
    };
  }

  /**
   * Remove a single keyword with ownership check through campaign
   */
  async removeKeyword(keywordId: string, userId: string): Promise<void> {
    // First verify ownership by getting the keyword's campaign
    const { data: keyword } = await supabaseAdmin
      .from('keywords')
      .select('campaign_id')
      .eq('id', keywordId)
      .single();

    if (!keyword) {
      throw new Error('Keyword not found');
    }

    // Verify campaign ownership
    const campaign = await this.getById(keyword.campaign_id, userId);
    if (!campaign) {
      throw new CampaignNotFoundError(keyword.campaign_id);
    }

    // Delete keyword
    const { error } = await supabaseAdmin.from('keywords').delete().eq('id', keywordId);

    if (error) {
      throw new Error(`Failed to remove keyword: ${error.message}`);
    }
  }

  /**
   * List keywords for a campaign
   */
  async getKeywords(campaignId: string, userId: string): Promise<IKeyword[]> {
    // Verify campaign ownership
    const campaign = await this.getById(campaignId, userId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const { data, error } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get keywords: ${error.message}`);
    }

    return data as IKeyword[];
  }

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

      // Clear the generation_run_id from campaign (allows restart)
      await CampaignIdempotencyService.clearCampaignRunId(campaignId);

      return {
        ...result,
        generationRunId: claimResult.generationRunId,
      };
    } catch (error) {
      // Mark the generation run as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await CampaignIdempotencyService.markFailed(claimResult.generationRunId, errorMessage);

      // Clear the generation_run_id from campaign on failure too
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

    // Get pending keywords for initial start
    const { data: pendingKeywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (keywordsError) {
      throw new Error(`Failed to get pending keywords: ${keywordsError.message}`);
    }

    // If we have pending keywords, this is an initial start - queue them and deduct credits atomically
    if (pendingKeywords && pendingKeywords.length > 0) {
      const keywordCount = pendingKeywords.length;

      // Calculate credits per keyword using centralized pricing model
      const creditsPerKeyword = calculateArticleCreditCost(campaign.ai_model, campaign.image_preset);
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

      const _result = batchResult[0];

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
  // Private Helpers
  // ===========================================================================

  /**
   * Build keyword row objects for batch insertion
   */
  private buildKeywordRows(campaignId: string, keywords: string[]) {
    return keywords.map(keyword => ({
      campaign_id: campaignId,
      keyword,
      status: 'pending' as const,
      difficulty: 'unknown' as const,
      priority: 0,
    }));
  }

  /**
   * Verify the user owns the given project
   * @throws Error if project not found or user doesn't own it
   */
  private async verifyProjectOwnership(projectId: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('Project not found or access denied');
    }
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
