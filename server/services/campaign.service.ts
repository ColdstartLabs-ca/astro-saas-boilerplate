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
  CampaignNotFoundError,
  InsufficientCreditsError,
  NoPendingKeywordsError,
} from '@shared/types/campaign.types';
import { z } from 'zod';
import { isValidImagePreset, getImagePresetCreditCost } from '@shared/config/image-models.config';

// =============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod schema for campaign creation input
 */
const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less')
    .trim(),
  projectId: z.string().uuid('Invalid project ID'),
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z.string().optional().refine(
    val => !val || isValidImagePreset(val),
    { message: 'Invalid image preset' }
  ),
});

/**
 * Zod schema for campaign update input
 */
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z.string().optional().refine(
    val => !val || isValidImagePreset(val),
    { message: 'Invalid image preset' }
  ),
});

/**
 * Zod schema for adding keywords input
 */
const addKeywordsSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed'),
});

// =============================================================================
// Campaign Service Class
// ============================================================================

export class CampaignService {
  /**
   * List all campaigns for a project with aggregated stats
   */
  async listByProject(userId: string, projectId: string): Promise<ICampaignWithStats[]> {
    // First verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

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
   * Get campaign detail with keywords and article stats
   */
  async getDetail(
    campaignId: string,
    userId: string
  ): Promise<{
    campaign: ICampaign;
    keywords: IKeyword[];
    articleStats: ICampaignArticleStats;
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
      .select('status')
      .eq('campaign_id', campaignId);

    if (articlesError) {
      throw new Error(`Failed to get article stats: ${articlesError.message}`);
    }

    // Compute stats
    const stats: ICampaignArticleStats = {
      queued: 0,
      generating: 0,
      draft: 0,
      published: 0,
      total: articles?.length ?? 0,
    };

    for (const article of articles ?? []) {
      switch (article.status) {
        case 'queued':
          stats.queued++;
          break;
        case 'generating':
          stats.generating++;
          break;
        case 'draft':
        case 'reviewed':
          stats.draft++;
          break;
        case 'published':
          stats.published++;
          break;
      }
    }

    return {
      campaign,
      keywords: keywords as IKeyword[],
      articleStats: stats,
    };
  }

  /**
   * Create a new campaign with keywords
   */
  async create(userId: string, input: ICreateCampaignInput): Promise<ICampaign> {
    // Validate input
    const validated = createCampaignSchema.parse(input);

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', validated.projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: userId,
        project_id: validated.projectId,
        name: validated.name,
        status: 'draft',
        ai_model: validated.model || 'auto',
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
    const keywordRows = validated.keywords.map(keyword => ({
      campaign_id: campaign.id,
      keyword: keyword.trim(),
      status: 'pending' as const,
      difficulty: 'unknown' as const,
      priority: 0,
    }));

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
    addKeywordsSchema.parse({ campaignId, keywords });

    // Verify campaign ownership
    const campaign = await this.getById(campaignId, userId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Get existing keywords to count duplicates
    const { data: existingKeywords } = await supabaseAdmin
      .from('keywords')
      .select('keyword')
      .eq('campaign_id', campaignId);

    const existingSet = new Set(existingKeywords?.map(k => k.keyword.toLowerCase()) ?? []);
    const newKeywords = keywords.map(k => k.trim()).filter(k => k.length > 0);
    const uniqueNew = newKeywords.filter(k => !existingSet.has(k.toLowerCase()));

    // Batch insert unique keywords
    const keywordRows = uniqueNew.map(keyword => ({
      campaign_id: campaignId,
      keyword: keyword,
      status: 'pending' as const,
      difficulty: 'unknown' as const,
      priority: 0,
    }));

    if (keywordRows.length > 0) {
      const { error } = await supabaseAdmin.from('keywords').insert(keywordRows);

      if (error && error.code !== '23505') {
        throw new Error(`Failed to add keywords: ${error.message}`);
      }
    }

    return {
      added: uniqueNew.length,
      duplicates: newKeywords.length - uniqueNew.length,
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
   * Start bulk article generation for a campaign
   * Queues articles, updates campaign status, uses credits
   */
  async startGeneration(
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

    // Get pending keywords
    const { data: pendingKeywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (keywordsError) {
      throw new Error(`Failed to get pending keywords: ${keywordsError.message}`);
    }

    if (!pendingKeywords || pendingKeywords.length === 0) {
      throw new NoPendingKeywordsError();
    }

    const keywordCount = pendingKeywords.length;

    // Calculate credits per keyword (1 base + optional image cost)
    const imageCreditCost = getImagePresetCreditCost(campaign.image_preset);
    const creditsPerKeyword = 1 + imageCreditCost;
    const totalCreditsNeeded = keywordCount * creditsPerKeyword;

    // Check user has enough credits
    const { data: profile } = await supabaseAdmin
      .from('user_credits')
      .select('total_credits_balance')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.total_credits_balance < totalCreditsNeeded) {
      throw new InsufficientCreditsError(totalCreditsNeeded, profile?.total_credits_balance ?? 0);
    }

    // Update campaign status to active
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)
      .eq('user_id', userId);

    // Queue articles for each pending keyword
    const articleRecords = pendingKeywords.map(keyword => ({
      user_id: userId,
      campaign_id: campaignId,
      project_id: campaign.project_id,
      primary_keyword: keyword.keyword,
      status: 'queued' as const,
      credits_used: creditsPerKeyword,
    }));

    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('articles')
      .insert(articleRecords)
      .select('id, primary_keyword');

    if (articlesError || !articles) {
      throw new Error(
        `Failed to create article records: ${articlesError?.message ?? 'Unknown error'}`
      );
    }

    // Update keywords to queued status
    const keywordIds = pendingKeywords.map(k => k.id);
    await supabaseAdmin.from('keywords').update({ status: 'queued' }).in('id', keywordIds);

    // Deduct total credits (batch)
    await supabaseAdmin.rpc('consume_credits_v2', {
      target_user_id: userId,
      amount: totalCreditsNeeded,
      ref_id: campaignId,
      description: `Campaign generation: ${campaign.name}`,
    });

    return {
      queued: keywordCount,
      creditsRequired: totalCreditsNeeded,
    };
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
