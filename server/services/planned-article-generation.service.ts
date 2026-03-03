/**
 * Planned Article Generation Service
 *
 * Finds planned articles whose scheduled_publish_at is within the generation
 * lead time (3 days), transitions them to 'queued', deducts credits, and
 * triggers article generation.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from './article-generation.service';
import {
  GENERATION_LEAD_TIME_DAYS,
  MAX_PLANNED_ARTICLES_PER_RUN,
} from '@shared/config/scheduling.config';
import { calculateArticleCreditCost } from '@shared/config/credits.config';
import type { IArticleStylePreferences } from '@shared/types/article.types';

export interface IPlannedArticleGenerationResult {
  processed: number;
  queued: number;
  skippedInsufficientCredits: number;
}

interface IPromotePlannedArticleParams {
  articleId: string;
  userId: string;
  creditsNeeded: number;
  description: string;
}

type PromotePlannedArticleResult =
  | { status: 'promoted' }
  | { status: 'already_promoted' }
  | { status: 'insufficient_credits' };

// Minimal shape of a planned article row needed for processing
interface IPlannedArticle {
  id: string;
  user_id: string;
  campaign_id: string | null;
  project_id: string | null;
  primary_keyword: string;
  ai_model_used: string | null;
  image_preset: string | null;
}

interface ICampaignGenerationSettings {
  ai_model: string | null;
  image_preset: string | null;
  article_style: string | null;
  global_instructions: string | null;
  internal_links_count: number | null;
  include_youtube: boolean;
  include_cta: boolean;
  include_emojis: boolean;
  include_infographics: boolean;
  image_style: string | null;
}

interface IResolvedGenerationSettings {
  model: string;
  imagePreset: string | null;
  stylePreferences: IArticleStylePreferences;
}

export class PlannedArticleGenerationService {
  /**
   * Process planned articles that are due for generation within the lead time window.
   *
   * For each article:
   * 1. Determine credit cost from campaign settings (fallback: 1 credit)
   * 2. Atomically claim article + deduct credits + write ledger transaction via RPC
   * 3. Trigger article generation
   * 4. If insufficient: skip and count as skipped
   *
   * @returns Processing result summary
   */
  async processPlannedArticles(): Promise<IPlannedArticleGenerationResult> {
    const result: IPlannedArticleGenerationResult = {
      processed: 0,
      queued: 0,
      skippedInsufficientCredits: 0,
    };

    // Calculate the cutoff date: articles due within GENERATION_LEAD_TIME_DAYS
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + GENERATION_LEAD_TIME_DAYS);

    // Query planned articles within lead time window
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('id, user_id, campaign_id, project_id, primary_keyword, ai_model_used, image_preset')
      .eq('status', 'planned')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', cutoffDate.toISOString())
      .order('scheduled_publish_at', { ascending: true })
      .limit(MAX_PLANNED_ARTICLES_PER_RUN);

    if (error) {
      throw new Error(`Failed to fetch planned articles: ${error.message}`);
    }

    if (!articles || articles.length === 0) {
      return result;
    }

    result.processed = articles.length;

    for (const article of articles as IPlannedArticle[]) {
      try {
        const campaignSettings = await this.fetchCampaignGenerationSettings(article.campaign_id);
        const generationSettings = this.resolveGenerationSettings(article, campaignSettings);
        const creditCost = this.resolveCreditCost(article, campaignSettings);
        const description =
          `Planned article auto-generation: ${article.primary_keyword}` +
          (generationSettings.imagePreset ? ` with ${generationSettings.imagePreset} images` : '');
        const promotion = await this.promotePlannedArticleWithCredits({
          articleId: article.id,
          userId: article.user_id,
          creditsNeeded: creditCost,
          description,
        });

        if (promotion.status === 'insufficient_credits') {
          result.skippedInsufficientCredits++;
          continue;
        }

        if (promotion.status === 'already_promoted') {
          // Concurrent cron/manual run already claimed this planned article.
          continue;
        }

        // Trigger article generation (synchronous within cron — cron IS the background process)
        await articleGenerationService.generateArticle(article.id, article.user_id, {
          keyword: article.primary_keyword,
          projectId: article.project_id ?? '',
          campaignId: article.campaign_id ?? '',
          model: generationSettings.model,
          imagePreset: generationSettings.imagePreset ?? undefined,
          stylePreferences: generationSettings.stylePreferences,
        });

        result.queued++;

        console.log(
          `[PlannedArticleGeneration] Article ${article.id} queued and generation triggered ` +
            `(keyword="${article.primary_keyword}", cost=${creditCost})`
        );
      } catch (err) {
        console.error(`[PlannedArticleGeneration] Failed to process article ${article.id}:`, err);
        // Continue processing remaining articles
      }
    }

    return result;
  }

  /**
   * Resolve credit cost for an article.
   * Prefers campaign ai_model + image_preset settings; falls back to 1 credit.
   */
  private resolveCreditCost(
    article: IPlannedArticle,
    campaignSettings: ICampaignGenerationSettings | null
  ): number {
    const writerPreset = article.ai_model_used ?? campaignSettings?.ai_model ?? null;
    const imagePreset = article.image_preset ?? campaignSettings?.image_preset ?? null;

    // If nothing is configured, preserve historical minimum cost fallback.
    if (!writerPreset && !imagePreset) {
      return 1;
    }

    return calculateArticleCreditCost(writerPreset, imagePreset);
  }

  /**
   * Promote a planned article to queued status and deduct credits.
   * Does NOT trigger generation — the caller is responsible for that.
   * Used by the "Generate Now" API route so it can return immediately
   * and fire generation in the background.
   *
   * @param articleId - The article to promote
   * @param userId - Must match the article's user_id (ownership check)
   * @throws Error if article not found, not owned by user, not in planned status, or insufficient credits
   */
  async promoteArticle(
    articleId: string,
    userId: string
  ): Promise<{
    creditsDeducted: number;
    article: IPlannedArticle;
    model: string;
    imagePreset: string | null;
    stylePreferences: IArticleStylePreferences;
  }> {
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select(
        'id, user_id, campaign_id, project_id, primary_keyword, ai_model_used, image_preset, status'
      )
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !article) {
      throw new Error('Article not found or access denied');
    }

    if (article.status !== 'planned') {
      throw new Error(`Article is not in planned status (current: ${article.status})`);
    }

    const plannedArticle: IPlannedArticle = article as IPlannedArticle;
    const campaignSettings = await this.fetchCampaignGenerationSettings(plannedArticle.campaign_id);
    const creditCost = this.resolveCreditCost(plannedArticle, campaignSettings);
    const promotion = await this.promotePlannedArticleWithCredits({
      articleId,
      userId,
      creditsNeeded: creditCost,
      description: `Manual generation: ${plannedArticle.primary_keyword}`,
    });

    if (promotion.status === 'insufficient_credits') {
      throw new Error('Insufficient credits');
    }

    if (promotion.status === 'already_promoted') {
      throw new Error('Article is not in planned status (current: queued)');
    }

    const generationSettings = this.resolveGenerationSettings(plannedArticle, campaignSettings);

    return {
      creditsDeducted: creditCost,
      article: plannedArticle,
      model: generationSettings.model,
      imagePreset: generationSettings.imagePreset,
      stylePreferences: generationSettings.stylePreferences,
    };
  }

  /**
   * Generate a single planned article immediately, deducting credits.
   * Used by the "Generate Now" manual action from the calendar detail modal.
   *
   * @param articleId - The article to generate
   * @param userId - Must match the article's user_id (ownership check)
   * @throws Error if article not found, not owned by user, not in planned status, or insufficient credits
   */
  async generateSingleArticle(
    articleId: string,
    userId: string
  ): Promise<{ queued: true; creditsDeducted: number }> {
    const {
      creditsDeducted,
      article: plannedArticle,
      model,
      imagePreset,
      stylePreferences,
    } = await this.promoteArticle(articleId, userId);

    await articleGenerationService.generateArticle(articleId, userId, {
      keyword: plannedArticle.primary_keyword,
      projectId: plannedArticle.project_id ?? '',
      campaignId: plannedArticle.campaign_id ?? '',
      model,
      imagePreset: imagePreset ?? undefined,
      stylePreferences,
    });

    return { queued: true, creditsDeducted };
  }

  private resolveGenerationSettings(
    article: IPlannedArticle,
    campaignSettings: ICampaignGenerationSettings | null
  ): IResolvedGenerationSettings {
    const stylePreferences: IArticleStylePreferences = {
      articleStyle:
        (campaignSettings?.article_style as IArticleStylePreferences['articleStyle']) ?? undefined,
      globalInstructions: campaignSettings?.global_instructions ?? undefined,
      internalLinksCount: campaignSettings?.internal_links_count ?? 0,
      includeYoutube: campaignSettings?.include_youtube ?? false,
      includeCta: campaignSettings?.include_cta ?? false,
      includeEmojis: campaignSettings?.include_emojis ?? false,
      includeInfographics: campaignSettings?.include_infographics ?? false,
      imageStyle: campaignSettings?.image_style ?? undefined,
    };

    return {
      model: article.ai_model_used ?? campaignSettings?.ai_model ?? 'balanced',
      imagePreset: article.image_preset ?? campaignSettings?.image_preset ?? null,
      stylePreferences,
    };
  }

  private async fetchCampaignGenerationSettings(
    campaignId: string | null
  ): Promise<ICampaignGenerationSettings | null> {
    if (!campaignId) {
      return null;
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select(
        'ai_model, image_preset, article_style, global_instructions, internal_links_count, include_youtube, include_cta, include_emojis, include_infographics, image_style'
      )
      .eq('id', campaignId)
      .single();

    return campaign ?? null;
  }

  /**
   * Atomically claim a planned article and deduct credits in a single DB transaction.
   * This prevents double charges and duplicate generation under concurrent cron/manual triggers.
   */
  private async promotePlannedArticleWithCredits(
    params: IPromotePlannedArticleParams
  ): Promise<PromotePlannedArticleResult> {
    const { articleId, userId, creditsNeeded, description } = params;

    const { data, error } = await supabaseAdmin.rpc('promote_planned_article_with_credits', {
      p_article_id: articleId,
      p_user_id: userId,
      p_credits_needed: creditsNeeded,
      p_description: description,
    });

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.toLowerCase().includes('insufficient credits')) {
        return { status: 'insufficient_credits' };
      }
      throw new Error(`Failed to promote planned article: ${errorMessage}`);
    }

    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) {
      return { status: 'already_promoted' };
    }

    return { status: 'promoted' };
  }
}

export const plannedArticleGenerationService = new PlannedArticleGenerationService();
