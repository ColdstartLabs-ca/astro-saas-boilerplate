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

export interface IPlannedArticleGenerationResult {
  processed: number;
  queued: number;
  skippedInsufficientCredits: number;
}

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

export class PlannedArticleGenerationService {
  /**
   * Process planned articles that are due for generation within the lead time window.
   *
   * For each article:
   * 1. Determine credit cost from campaign settings (fallback: 1 credit)
   * 2. Check user credit balance
   * 3. If sufficient: transition article to 'queued', deduct credits, trigger generation
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
        // Determine credit cost: use campaign's ai_model + image_preset if available
        const creditCost = await this.resolveCreditCost(article);

        // Check user credit balance
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('subscription_credits_balance, purchased_credits_balance')
          .eq('id', article.user_id)
          .single();

        if (profileError || !profile) {
          console.warn(
            `[PlannedArticleGeneration] Could not fetch profile for user ${article.user_id}, skipping article ${article.id}`
          );
          result.skippedInsufficientCredits++;
          continue;
        }

        const totalBalance =
          (profile.subscription_credits_balance ?? 0) + (profile.purchased_credits_balance ?? 0);

        if (totalBalance < creditCost) {
          console.warn(
            `[PlannedArticleGeneration] Insufficient credits for user ${article.user_id}: ` +
              `balance=${totalBalance}, required=${creditCost}, skipping article ${article.id}`
          );
          result.skippedInsufficientCredits++;
          continue;
        }

        // Transition article to queued and record credit cost
        const { error: updateError } = await supabaseAdmin
          .from('articles')
          .update({ status: 'queued', credits_used: creditCost })
          .eq('id', article.id);

        if (updateError) {
          console.error(
            `[PlannedArticleGeneration] Failed to update article ${article.id} to queued:`,
            updateError
          );
          continue;
        }

        // Deduct credits: subscription balance first (FIFO), then purchased
        const fromSubscription = Math.min(profile.subscription_credits_balance ?? 0, creditCost);
        const fromPurchased = creditCost - fromSubscription;

        const { error: creditDeductError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_credits_balance:
              (profile.subscription_credits_balance ?? 0) - fromSubscription,
            purchased_credits_balance: (profile.purchased_credits_balance ?? 0) - fromPurchased,
          })
          .eq('id', article.user_id);

        if (creditDeductError) {
          // Roll back article status update on credit failure
          console.error(
            `[PlannedArticleGeneration] Failed to deduct credits for user ${article.user_id}:`,
            creditDeductError
          );
          await supabaseAdmin
            .from('articles')
            .update({ status: 'planned', credits_used: 0 })
            .eq('id', article.id);
          continue;
        }

        // Log credit transaction
        const description =
          `Planned article auto-generation: ${article.primary_keyword}` +
          (article.image_preset ? ` with ${article.image_preset} images` : '');

        await supabaseAdmin.from('credit_transactions').insert({
          user_id: article.user_id,
          amount: -creditCost,
          type: 'usage',
          reference_id: article.id,
          description,
        });

        // Resolve the model to use for generation
        const model = await this.resolveGenerationModel(article);

        // Trigger article generation (synchronous within cron — cron IS the background process)
        await articleGenerationService.generateArticle(article.id, article.user_id, {
          keyword: article.primary_keyword,
          projectId: article.project_id ?? '',
          campaignId: article.campaign_id ?? '',
          model,
          imagePreset: article.image_preset ?? undefined,
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
  private async resolveCreditCost(article: IPlannedArticle): Promise<number> {
    // If article already has a model stored, use it directly
    if (article.ai_model_used) {
      return calculateArticleCreditCost(article.ai_model_used, article.image_preset);
    }

    // Otherwise look up campaign settings
    if (article.campaign_id) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('ai_model, image_preset')
        .eq('id', article.campaign_id)
        .single();

      if (campaign) {
        return calculateArticleCreditCost(campaign.ai_model, campaign.image_preset);
      }
    }

    // Default to minimum cost (1 credit)
    return 1;
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
    // Fetch article with ownership check
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
    const creditCost = await this.resolveCreditCost(plannedArticle);

    // Check user credit balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_credits_balance, purchased_credits_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not fetch user profile');
    }

    const totalBalance =
      (profile.subscription_credits_balance ?? 0) + (profile.purchased_credits_balance ?? 0);

    if (totalBalance < creditCost) {
      throw new Error(`Insufficient credits: balance=${totalBalance}, required=${creditCost}`);
    }

    // Transition article to queued
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({ status: 'queued', credits_used: creditCost })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Failed to update article status: ${updateError.message}`);
    }

    // Deduct credits: subscription balance first (FIFO), then purchased
    const fromSubscription = Math.min(profile.subscription_credits_balance ?? 0, creditCost);
    const fromPurchased = creditCost - fromSubscription;

    const { error: creditDeductError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_credits_balance:
          (profile.subscription_credits_balance ?? 0) - fromSubscription,
        purchased_credits_balance: (profile.purchased_credits_balance ?? 0) - fromPurchased,
      })
      .eq('id', userId);

    if (creditDeductError) {
      // Roll back article status on credit failure
      await supabaseAdmin
        .from('articles')
        .update({ status: 'planned', credits_used: 0 })
        .eq('id', articleId);
      throw new Error(`Failed to deduct credits: ${creditDeductError.message}`);
    }

    // Log credit transaction
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: userId,
      amount: -creditCost,
      type: 'usage',
      reference_id: articleId,
      description: `Manual generation: ${plannedArticle.primary_keyword}`,
    });

    // Trigger generation
    const model = await this.resolveGenerationModel(plannedArticle);
    await articleGenerationService.generateArticle(articleId, userId, {
      keyword: plannedArticle.primary_keyword,
      projectId: plannedArticle.project_id ?? '',
      campaignId: plannedArticle.campaign_id ?? '',
      model,
      imagePreset: plannedArticle.image_preset ?? undefined,
    });

    return { queued: true, creditsDeducted: creditCost };
  }

  /**
   * Resolve the AI model to use for generation.
   * Uses article's stored model, then campaign model, then falls back to 'pro'.
   */
  private async resolveGenerationModel(article: IPlannedArticle): Promise<string> {
    if (article.ai_model_used) {
      return article.ai_model_used;
    }

    if (article.campaign_id) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('ai_model')
        .eq('id', article.campaign_id)
        .single();

      if (campaign?.ai_model) {
        return campaign.ai_model;
      }
    }

    return 'pro';
  }
}

export const plannedArticleGenerationService = new PlannedArticleGenerationService();
