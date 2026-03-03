/**
 * Campaign Lifecycle Service
 *
 * Handles campaign creation, updates, status transitions, and deletion.
 * Extracted from CampaignService for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type ICampaign,
  type ICampaignWithStats,
  type ICreateCampaignInput,
  type IUpdateCampaignInput,
  type ICampaignArticleStats,
  type ICampaignCreditStats,
  type IKeyword,
  type ScheduleFrequency,
  CampaignNotFoundError,
} from '@shared/types/campaign.types';
import { isAvailableImagePreset } from '@shared/config/image-models.config';
import { isAvailableWriterPreset, DEFAULT_WRITER_PRESET } from '@shared/config/ai-models.config';
import { calculateArticleCreditCost } from '@shared/constants';
import { serverEnv } from '@shared/config/env';
import { AppError } from '@shared/utils/errors';
import { normalizeKeyword } from '@shared/utils/keyword';
import { updateCampaignSchema } from '@shared/validation/campaign.schema';
import {
  calculateNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  DEFAULT_SCHEDULE_HOUR,
} from '@shared/config/scheduling.config';

const CAMPAIGN_ARTICLE_STYLES = new Set<NonNullable<ICreateCampaignInput['articleStyle']>>([
  'informative',
  'how-to',
  'listicle',
  'opinion',
  'tutorial',
]);

const CAMPAIGN_IMAGE_STYLES = new Set<NonNullable<ICreateCampaignInput['imageStyle']>>([
  'brand_text',
  'watercolor',
  'cinematic',
  'illustration',
  'sketch',
]);

const PROJECT_TO_CAMPAIGN_IMAGE_STYLE_MAP: Record<
  string,
  NonNullable<ICreateCampaignInput['imageStyle']>
> = {
  'brand-text': 'brand_text',
};

function normalizeProjectArticleStyle(value: unknown): ICreateCampaignInput['articleStyle'] {
  if (typeof value !== 'string') {
    return null;
  }

  return CAMPAIGN_ARTICLE_STYLES.has(value as NonNullable<ICreateCampaignInput['articleStyle']>)
    ? (value as NonNullable<ICreateCampaignInput['articleStyle']>)
    : null;
}

function normalizeProjectImageStyle(value: unknown): ICreateCampaignInput['imageStyle'] {
  if (typeof value !== 'string') {
    return null;
  }

  const mapped =
    PROJECT_TO_CAMPAIGN_IMAGE_STYLE_MAP[value] ||
    (value as NonNullable<ICreateCampaignInput['imageStyle']>);
  return CAMPAIGN_IMAGE_STYLES.has(mapped) ? mapped : null;
}

function normalizeProjectInternalLinksCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 0;
  }
  if (value < 0 || value > 20) {
    return 0;
  }
  return value;
}

// =============================================================================
// Types
// =============================================================================

/** In-memory test mode keyword (partial IKeyword for test mocking) */
interface ITestModeKeyword {
  id: string;
  campaign_id: string;
  keyword: string;
  status: 'pending' | 'queued' | 'generating' | 'generated' | 'failed';
  difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  priority: number;
}

/** Campaign with optional keywords for test mode */
type ITestModeCampaign = ICampaign & { keywords?: ITestModeKeyword[] };

// =============================================================================
// Test Mode Store (shared across campaign services)
// =============================================================================

/**
 * Global test mode campaigns store.
 * Using a global object to ensure the same Map is shared across all module instances.
 * This is important during hot module replacement in development.
 */
const globalForTestMode = globalThis as unknown as {
  __testModeCampaigns?: Map<string, ITestModeCampaign>;
};

/**
 * In-memory test data store for test mode.
 * This avoids database operations when using mock users.
 * Exported for use by other campaign services.
 */
export const testModeCampaigns: Map<string, ITestModeCampaign> =
  globalForTestMode.__testModeCampaigns || new Map<string, ITestModeCampaign>();

// Store in global to survive HMR
if (!globalForTestMode.__testModeCampaigns) {
  globalForTestMode.__testModeCampaigns = testModeCampaigns;
}

// =============================================================================
// Campaign Lifecycle Service Class
// =============================================================================

export class CampaignLifecycleService {
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

    // Fetch generated article counts for all campaigns in one query.
    // We count articles (not keywords) so that calendar-generated and manually-triggered
    // articles are included, not just those from the batch campaign start flow.
    // "Generated" means the article reached draft or beyond (excluding planning/in-progress/hard-failure states).
    const GENERATED_ARTICLE_STATUSES = [
      'draft',
      'qa_checking',
      'qa_failed',
      'qa_passed',
      'reviewed',
      'approved',
      'rejected',
      'published',
      'failed_quality',
    ] as const;
    let completedCounts: Record<string, number> = {};
    if (campaignIds.length > 0) {
      const { data: completedArticles } = await supabaseAdmin
        .from('articles')
        .select('campaign_id')
        .in('status', GENERATED_ARTICLE_STATUSES as unknown as string[])
        .in('campaign_id', campaignIds);

      if (completedArticles) {
        // Count generated articles per campaign
        completedCounts = completedArticles.reduce(
          (acc, article) => {
            if (article.campaign_id) {
              acc[article.campaign_id] = (acc[article.campaign_id] || 0) + 1;
            }
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
    userId: string,
    keywords: IKeyword[]
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
    // Note: input is already validated by the API route via createCampaignSchema.
    // Do not re-parse here — the transform (undefined keywords → []) would produce
    // an empty array that fails .min(1) on a second parse.
    const validated = input;

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

    // Fetch project content_preferences to use as defaults for outrank fields.
    // In test mode, project ownership checks are skipped for mock users, but defaults
    // should still be loaded when a project fixture exists.
    let projectDefaults: Record<string, unknown> = {};
    const { data: projectData } = await supabaseAdmin
      .from('projects')
      .select('content_preferences')
      .eq('id', validated.projectId)
      .maybeSingle();
    projectDefaults = (projectData?.content_preferences as Record<string, unknown>) ?? {};

    const projectDefaultArticleStyle = normalizeProjectArticleStyle(projectDefaults.articleStyle);
    const projectDefaultInternalLinksCount = normalizeProjectInternalLinksCount(
      projectDefaults.internalLinksCount
    );
    const projectDefaultGlobalInstructions =
      typeof projectDefaults.globalInstructions === 'string'
        ? projectDefaults.globalInstructions
        : null;
    const projectDefaultImageStyle = normalizeProjectImageStyle(projectDefaults.imageStyle);

    // Apply project defaults for outrank fields not explicitly set by the user
    const resolvedArticleStyle =
      validated.articleStyle !== undefined ? validated.articleStyle : projectDefaultArticleStyle;
    const resolvedInternalLinksCount =
      validated.internalLinksCount !== undefined
        ? validated.internalLinksCount
        : projectDefaultInternalLinksCount;
    const resolvedGlobalInstructions =
      validated.globalInstructions !== undefined
        ? validated.globalInstructions
        : projectDefaultGlobalInstructions;
    const resolvedImageStyle =
      validated.imageStyle !== undefined ? validated.imageStyle : projectDefaultImageStyle;

    // In test mode with mock users, store in memory instead of database
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignId = crypto.randomUUID();
      const keywordRows = this.buildKeywordRows(campaignId, validated.keywords);
      // Add ids to keywords for test mode
      const keywords: ITestModeKeyword[] = keywordRows.map(kw => ({
        ...kw,
        id: crypto.randomUUID(),
      }));

      // Auto-activate: calculate next_run_at from schedule config
      const scheduleFrequency = (validated.scheduleFrequency || 'daily') as ScheduleFrequency;
      const scheduleTimezone = validated.scheduleTimezone || DEFAULT_SCHEDULE_TIMEZONE;
      const scheduleHour = validated.scheduleHour ?? DEFAULT_SCHEDULE_HOUR;
      const nextRunAt = calculateNextRunAt(scheduleFrequency, scheduleTimezone, scheduleHour);

      const campaign: ITestModeCampaign = {
        id: campaignId,
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'scheduled',
        ai_model: validated.model || DEFAULT_WRITER_PRESET,
        tone: validated.tone || 'professional',
        target_word_count: validated.targetWordCount || 1500,
        settings: {},
        image_preset: validated.imagePreset || 'budget',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        generation_run_id: null,
        // Schedule fields
        schedule_frequency: scheduleFrequency,
        schedule_batch_size: validated.scheduleBatchSize || 1,
        next_run_at: nextRunAt,
        last_run_at: null,
        schedule_timezone: scheduleTimezone,
        schedule_hour: scheduleHour,
        // Outrank feature parity fields (with project defaults applied)
        article_style: resolvedArticleStyle || null,
        internal_links_count: resolvedInternalLinksCount,
        global_instructions: resolvedGlobalInstructions || null,
        auto_publish: validated.autoPublish ?? false,
        include_youtube: validated.includeYoutube ?? false,
        include_cta: validated.includeCta ?? false,
        include_infographics: validated.includeInfographics ?? false,
        include_emojis: validated.includeEmojis ?? false,
        image_style: resolvedImageStyle || null,
        // Test mode keywords
        keywords,
      };
      testModeCampaigns.set(campaignId, campaign);

      // Also persist to the file-based mock DB so API endpoints that query
      // via supabaseAdmin (e.g. generate.ts) can find the campaign.
      await supabaseAdmin.from('campaigns').insert({
        id: campaignId,
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'scheduled',
        ai_model: validated.model || DEFAULT_WRITER_PRESET,
        tone: validated.tone || 'professional',
        target_word_count: validated.targetWordCount || 1500,
        settings: {},
        image_preset: validated.imagePreset || 'budget',
        schedule_frequency: scheduleFrequency,
        schedule_batch_size: validated.scheduleBatchSize || 1,
        next_run_at: nextRunAt,
        last_run_at: null,
        schedule_timezone: scheduleTimezone,
        schedule_hour: scheduleHour,
        generation_run_id: null,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        // Outrank feature parity fields (with project defaults applied)
        article_style: resolvedArticleStyle || null,
        internal_links_count: resolvedInternalLinksCount,
        global_instructions: resolvedGlobalInstructions || null,
        auto_publish: validated.autoPublish ?? false,
        include_youtube: validated.includeYoutube ?? false,
        include_cta: validated.includeCta ?? false,
        include_infographics: validated.includeInfographics ?? false,
        include_emojis: validated.includeEmojis ?? false,
        image_style: resolvedImageStyle || null,
      });

      return campaign;
    }

    // Auto-activate: calculate next_run_at from schedule config
    const scheduleFrequency = (validated.scheduleFrequency || 'daily') as ScheduleFrequency;
    const scheduleTimezone = validated.scheduleTimezone || DEFAULT_SCHEDULE_TIMEZONE;
    const scheduleHour = validated.scheduleHour ?? DEFAULT_SCHEDULE_HOUR;
    const nextRunAt = calculateNextRunAt(scheduleFrequency, scheduleTimezone, scheduleHour);

    // Create campaign with status 'scheduled' and next_run_at set (auto-activation)
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'scheduled',
        ai_model: validated.model || DEFAULT_WRITER_PRESET,
        tone: validated.tone || 'professional',
        target_word_count: validated.targetWordCount || 1500,
        settings: {},
        image_preset: validated.imagePreset || 'budget',
        schedule_frequency: scheduleFrequency,
        schedule_batch_size: validated.scheduleBatchSize || 1,
        next_run_at: nextRunAt,
        schedule_timezone: scheduleTimezone,
        schedule_hour: scheduleHour,
        // Outrank feature parity fields (with project defaults applied)
        article_style: resolvedArticleStyle || null,
        internal_links_count: resolvedInternalLinksCount,
        global_instructions: resolvedGlobalInstructions || null,
        auto_publish: validated.autoPublish ?? false,
        include_youtube: validated.includeYoutube ?? false,
        include_cta: validated.includeCta ?? false,
        include_infographics: validated.includeInfographics ?? false,
        include_emojis: validated.includeEmojis ?? false,
        image_style: resolvedImageStyle || null,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Failed to create campaign: ${campaignError?.message ?? 'Unknown error'}`);
    }

    // Deduplicate input keywords before insert using the same normalization
    // logic as the DB uniqueness constraint (case-insensitive + collapsed whitespace).
    const seen = new Set<string>();
    const uniqueKeywords: string[] = [];
    for (const keyword of validated.keywords.map(k => k.trim()).filter(k => k.length > 0)) {
      const normalized = normalizeKeyword(keyword);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      uniqueKeywords.push(keyword);
    }

    // Batch insert unique keywords
    const keywordRows = this.buildKeywordRows(campaign.id, uniqueKeywords);

    if (keywordRows.length > 0) {
      const { error: keywordsError } = await supabaseAdmin.from('keywords').insert(keywordRows);

      // Ignore duplicate key errors (ON CONFLICT DO NOTHING equivalent)
      if (keywordsError && keywordsError.code !== '23505') {
        throw new Error(`Failed to add keywords: ${keywordsError.message}`);
      }
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
      // Schedule fields
      if (validated.scheduleFrequency !== undefined)
        campaign.schedule_frequency = validated.scheduleFrequency;
      if (validated.scheduleBatchSize !== undefined)
        campaign.schedule_batch_size = validated.scheduleBatchSize;
      if (validated.scheduleTimezone !== undefined)
        campaign.schedule_timezone = validated.scheduleTimezone;
      if (validated.scheduleHour !== undefined) campaign.schedule_hour = validated.scheduleHour;
      // BUG H6: Outrank feature parity fields (previously missing from test-mode path)
      if (validated.articleStyle !== undefined) campaign.article_style = validated.articleStyle;
      if (validated.internalLinksCount !== undefined)
        campaign.internal_links_count = validated.internalLinksCount;
      if (validated.globalInstructions !== undefined)
        campaign.global_instructions = validated.globalInstructions;
      if (validated.autoPublish !== undefined) campaign.auto_publish = validated.autoPublish;
      if (validated.includeYoutube !== undefined)
        campaign.include_youtube = validated.includeYoutube;
      if (validated.includeCta !== undefined) campaign.include_cta = validated.includeCta;
      if (validated.includeInfographics !== undefined)
        campaign.include_infographics = validated.includeInfographics;
      if (validated.includeEmojis !== undefined) campaign.include_emojis = validated.includeEmojis;
      if (validated.imageStyle !== undefined) campaign.image_style = validated.imageStyle;

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
    // Schedule fields
    if (validated.scheduleFrequency !== undefined)
      updates.schedule_frequency = validated.scheduleFrequency;
    if (validated.scheduleBatchSize !== undefined)
      updates.schedule_batch_size = validated.scheduleBatchSize;
    if (validated.scheduleTimezone !== undefined)
      updates.schedule_timezone = validated.scheduleTimezone;
    if (validated.scheduleHour !== undefined) updates.schedule_hour = validated.scheduleHour;
    // BUG H6: Outrank feature parity fields (previously missing from DB update path)
    if (validated.articleStyle !== undefined) updates.article_style = validated.articleStyle;
    if (validated.internalLinksCount !== undefined)
      updates.internal_links_count = validated.internalLinksCount;
    if (validated.globalInstructions !== undefined)
      updates.global_instructions = validated.globalInstructions;
    if (validated.autoPublish !== undefined) updates.auto_publish = validated.autoPublish;
    if (validated.includeYoutube !== undefined) updates.include_youtube = validated.includeYoutube;
    if (validated.includeCta !== undefined) updates.include_cta = validated.includeCta;
    if (validated.includeInfographics !== undefined)
      updates.include_infographics = validated.includeInfographics;
    if (validated.includeEmojis !== undefined) updates.include_emojis = validated.includeEmojis;
    if (validated.imageStyle !== undefined) updates.image_style = validated.imageStyle;

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
    // In test mode with mock users, remove from in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaign = testModeCampaigns.get(campaignId);
      // Prevent deleting scheduled campaigns (must pause first)
      if (campaign && campaign.status === 'scheduled') {
        throw new AppError(
          'CAMPAIGN_DELETION_BLOCKED',
          `Cannot delete campaign in '${campaign.status}' state. Please pause the campaign before deleting.`,
          409
        );
      }
      testModeCampaigns.delete(campaignId);
      return;
    }

    // Fetch campaign to validate its status before deleting
    const { data: campaignData, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !campaignData) {
      // Campaign not found or not owned by user — proceed with delete (will be a no-op)
      return;
    }

    if (campaignData.status === 'scheduled') {
      throw new AppError(
        'CAMPAIGN_DELETION_BLOCKED',
        `Cannot delete campaign in '${campaignData.status}' state. Please pause the campaign before deleting.`,
        409
      );
    }

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
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
export const campaignLifecycleService = new CampaignLifecycleService();
