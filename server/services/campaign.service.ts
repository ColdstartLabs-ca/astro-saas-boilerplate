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
  type ScheduleFrequency,
  CampaignNotFoundError,
  InsufficientCreditsError,
  NoPendingKeywordsError,
  ScheduleValidationError,
} from '@shared/types/campaign.types';
import { isAvailableImagePreset } from '@shared/config/image-models.config';
import { isAvailableWriterPreset } from '@shared/config/ai-models.config';
import { calculateArticleCreditCost } from '@shared/constants';
import { serverEnv } from '@shared/config/env';
import { articleGenerationService } from './article-generation.service';
import { AppError } from '@shared/utils/errors';
import {
  createCampaignSchema,
  updateCampaignSchema,
  addKeywordsWithCampaignSchema,
} from '@shared/validation/campaign.schema';
import {
  calculateNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  DEFAULT_SCHEDULE_HOUR,
} from '@shared/config/scheduling.config';

// =============================================================================
// Campaign Service Class
// ============================================================================

// In-memory test mode keyword (partial IKeyword for test mocking)
interface ITestModeKeyword {
  id: string;
  campaign_id: string;
  keyword: string;
  status: 'pending' | 'queued' | 'generating' | 'generated' | 'failed';
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  priority: number;
}

// In-memory test data store for test mode
// This avoids database operations when using mock users
const testModeCampaigns = new Map<string, ICampaign & { keywords?: ITestModeKeyword[] }>();

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
    // In test mode with mock users, check the in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaign = testModeCampaigns.get(campaignId);
      if (campaign && campaign.user_id === userId) {
        return campaign;
      }
      return null;
    }

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

    // In test mode, get keywords from in-memory store
    let keywords: IKeyword[] = [];
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignWithKeywords = testModeCampaigns.get(campaignId);
      // Cast test mode keywords to IKeyword (partial implementation for testing)
      keywords = (campaignWithKeywords?.keywords ?? []) as unknown as IKeyword[];
    } else {
      // Get keywords from database
      const { data: keywordsData, error: keywordsError } = await supabaseAdmin
        .from('keywords')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (keywordsError) {
        throw new Error(`Failed to get keywords: ${keywordsError.message}`);
      }
      keywords = keywordsData as IKeyword[];
    }

    // Get article stats (empty in test mode)
    let articles: Array<{ status: string; credits_used?: number }> = [];
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      // In test mode, articles are always empty (no real generation happens)
      articles = [];
    } else {
      // Get article stats from database
      const { data: articlesData, error: articlesError } = await supabaseAdmin
        .from('articles')
        .select('status, credits_used')
        .eq('campaign_id', campaignId);

      if (articlesError) {
        throw new Error(`Failed to get article stats: ${articlesError.message}`);
      }
      articles = articlesData as Array<{ status: string; credits_used?: number }>;
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

    // In test mode with mock users, store in memory instead of database
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignId = crypto.randomUUID();
      const keywordRows = this.buildKeywordRows(campaignId, validated.keywords);
      // Add ids to keywords for test mode
      const keywords: ITestModeKeyword[] = keywordRows.map(kw => ({
        ...kw,
        id: crypto.randomUUID(),
      }));
      const campaign: ICampaign & { keywords?: ITestModeKeyword[] } = {
        id: campaignId,
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'draft',
        ai_model: validated.model || 'pro',
        tone: validated.tone || 'professional',
        target_word_count: validated.targetWordCount || 1500,
        settings: {},
        image_preset: validated.imagePreset || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        generation_run_id: null,
        // Schedule fields
        schedule_frequency: validated.scheduleFrequency || null,
        schedule_batch_size: validated.scheduleBatchSize || 1,
        next_run_at: null,
        last_run_at: null,
        schedule_timezone: validated.scheduleTimezone || DEFAULT_SCHEDULE_TIMEZONE,
        schedule_hour: validated.scheduleHour ?? DEFAULT_SCHEDULE_HOUR,
        // Test mode keywords
        keywords,
      };
      testModeCampaigns.set(campaignId, campaign);
      return campaign;
    }

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
        schedule_frequency: validated.scheduleFrequency || null,
        schedule_batch_size: validated.scheduleBatchSize || 1,
        schedule_timezone: validated.scheduleTimezone || DEFAULT_SCHEDULE_TIMEZONE,
        schedule_hour: validated.scheduleHour ?? DEFAULT_SCHEDULE_HOUR,
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

    // In test mode with mock users, update in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaign = testModeCampaigns.get(campaignId);
      if (!campaign || campaign.user_id !== userId) {
        throw new CampaignNotFoundError(campaignId);
      }

      // Update fields
      if (validated.name !== undefined) campaign.name = validated.name;
      if (validated.model !== undefined) campaign.ai_model = validated.model;
      if (validated.tone !== undefined) campaign.tone = validated.tone;
      if (validated.targetWordCount !== undefined)
        campaign.target_word_count = validated.targetWordCount;
      if (validated.imagePreset !== undefined) campaign.image_preset = validated.imagePreset;
      // Status for pause/resume (non-scheduled campaigns)
      if (validated.status !== undefined) campaign.status = validated.status;
      // Schedule fields
      if (validated.scheduleFrequency !== undefined)
        campaign.schedule_frequency = validated.scheduleFrequency;
      if (validated.scheduleBatchSize !== undefined)
        campaign.schedule_batch_size = validated.scheduleBatchSize;
      if (validated.scheduleTimezone !== undefined)
        campaign.schedule_timezone = validated.scheduleTimezone;
      if (validated.scheduleHour !== undefined) campaign.schedule_hour = validated.scheduleHour;

      campaign.updated_at = new Date().toISOString();
      testModeCampaigns.set(campaignId, campaign);
      return campaign;
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.model !== undefined) updates.ai_model = validated.model;
    if (validated.tone !== undefined) updates.tone = validated.tone;
    if (validated.targetWordCount !== undefined)
      updates.target_word_count = validated.targetWordCount;
    if (validated.imagePreset !== undefined) updates.image_preset = validated.imagePreset;
    // Status for pause/resume (non-scheduled campaigns)
    if (validated.status !== undefined) updates.status = validated.status;
    // Schedule fields
    if (validated.scheduleFrequency !== undefined)
      updates.schedule_frequency = validated.scheduleFrequency;
    if (validated.scheduleBatchSize !== undefined)
      updates.schedule_batch_size = validated.scheduleBatchSize;
    if (validated.scheduleTimezone !== undefined)
      updates.schedule_timezone = validated.scheduleTimezone;
    if (validated.scheduleHour !== undefined) updates.schedule_hour = validated.scheduleHour;

    // If schedule config changed on a scheduled campaign, recalculate next_run_at
    const scheduleFieldsChanged =
      validated.scheduleFrequency !== undefined ||
      validated.scheduleTimezone !== undefined ||
      validated.scheduleHour !== undefined;

    if (scheduleFieldsChanged) {
      // Get current campaign to check if it's scheduled
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('status, schedule_frequency, schedule_timezone, schedule_hour')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (currentCampaign && currentCampaign.status === 'scheduled') {
        // Recalculate next_run_at using the updated values (or current values if not updated)
        const frequency = (validated.scheduleFrequency ??
          currentCampaign.schedule_frequency) as ScheduleFrequency;
        const timezone = validated.scheduleTimezone ?? currentCampaign.schedule_timezone;
        const hour = validated.scheduleHour ?? currentCampaign.schedule_hour;

        if (frequency) {
          const newNextRunAt = calculateNextRunAt(
            frequency,
            timezone || DEFAULT_SCHEDULE_TIMEZONE,
            hour ?? DEFAULT_SCHEDULE_HOUR
          );
          updates.next_run_at = newNextRunAt;
        }
      }
    }

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
  // Schedule Management Methods
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
    // Get campaign with ownership check
    const campaign = await this.getById(campaignId, userId);
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

    // Get pending keywords count
    const pendingKeywords = await this.getPendingKeywordCount(campaignId);

    // Validate campaign has pending keywords
    if (pendingKeywords === 0) {
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
      return { nextRunAt, pendingKeywords };
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

    return { nextRunAt, pendingKeywords };
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
    // Get campaign with ownership check
    const campaign = await this.getById(campaignId, userId);
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
   * @returns Object with recalculated nextRunAt timestamp
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   * @throws Error if campaign is not paused or lacks schedule config
   */
  async resumeSchedule(campaignId: string, userId: string): Promise<{ nextRunAt: string }> {
    // Get campaign with ownership check
    const campaign = await this.getById(campaignId, userId);
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
    // Only transitions from 'scheduled' to 'active' — if another run already claimed it,
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

      // Process articles sequentially (awaited — NOT fire-and-forget).
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

  /**
   * Get the count of pending keywords for a campaign.
   *
   * @param campaignId - The campaign ID
   * @returns Number of pending keywords
   */
  private async getPendingKeywordCount(campaignId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to get pending keywords count: ${error.message}`);
    }

    return count ?? 0;
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
    // In test mode, skip database verification for mock users/projects
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      return;
    }

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
