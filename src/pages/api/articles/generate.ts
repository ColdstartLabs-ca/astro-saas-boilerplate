/**
 * POST /api/articles/generate
 * Generate a new SEO article from a keyword
 *
 * Flow (E7: Atomic Operations):
 * 1. Validate input (campaignId is REQUIRED)
 * 2. Verify project ownership
 * 3. Verify campaign ownership
 * 4. Check for existing non-failed article with same keyword (duplicate detection)
 * 5. Create article record and deduct credits atomically via RPC
 * 6. Fire & forget generation via waitUntil()
 * 7. Return 202 with articleId
 *
 * Note: Credit check is now done inside the atomic RPC, preventing race conditions
 * and ensuring no orphaned articles or partial credit states.
 */

import { withAuthAndBody, jsonResponse, errorResponse, fireAndForget } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { openaiEmbeddingsService } from '@server/services/openai-embeddings.service';
import { getEmailService } from '@server/services/email.service';
import { z } from 'zod';
import type { IGenerateArticleResponse } from '@shared/types/article.types';
import { calculateArticleCreditCost } from '@shared/config/credits.config';
import { isValidImagePreset } from '@shared/config/image-models.config';
import { normalizeKeyword } from '@shared/utils/keyword';
import {
  SUBSCRIPTION_CREDITS,
  LOW_CREDIT_EMAIL_THRESHOLD_PERCENT,
  type SubscriptionTier,
} from '@shared/constants/credit-costs.constants';

// Validation schema
const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long').trim(),
  projectId: z.string().uuid('Invalid project ID'),
  campaignId: z.string().uuid('Campaign is required'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional().default(1500),
  imagePreset: z
    .string()
    .optional()
    .refine(val => !val || isValidImagePreset(val), { message: 'Invalid image preset' }),
  forceRegenerate: z.boolean().optional().default(false),
  skipSemanticDedup: z.boolean().optional().default(false),
});

export const POST = withAuthAndBody(generateSchema, async (userId, input, { locals }) => {
  // Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, user_id')
    .eq('id', input.projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  // Verify campaign ownership and get project_id
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('id, project_id, name, ai_model')
    .eq('id', input.campaignId)
    .eq('user_id', userId)
    .single();

  if (campaignError || !campaign) {
    return errorResponse('NOT_FOUND', 'Campaign not found', 404);
  }

  // Verify the campaign belongs to the same project
  if (campaign.project_id !== input.projectId) {
    return errorResponse('VALIDATION_ERROR', 'Campaign does not belong to this project', 400);
  }

  // Resolve writer preset: use input.model if provided, otherwise fall back to campaign's ai_model
  // This ensures the billed model matches the actual generation model
  const resolvedModel = input.model || campaign.ai_model || 'pro';

  // Calculate total credits needed (writer preset base cost + optional image cost)
  // Use the resolved model to ensure billing matches actual generation
  const totalCreditsNeeded = calculateArticleCreditCost(resolvedModel, input.imagePreset);

  // Check for existing non-failed article with the same normalized keyword in this campaign
  // This prevents duplicate article generation for the same topic
  if (!input.forceRegenerate) {
    const normalizedKeyword = normalizeKeyword(input.keyword);

    const { data: existingArticle } = await supabaseAdmin
      .from('articles')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('keyword_normalized', normalizedKeyword)
      .not('status', 'eq', 'failed') // Exclude failed articles from duplicate check
      .maybeSingle();

    // If we found an existing article with the same keyword (case-insensitive), return 409
    if (existingArticle) {
      return errorResponse(
        'DUPLICATE_ARTICLE',
        'An article with this keyword already exists in this campaign',
        409,
        { existingArticleId: existingArticle.id }
      );
    }

    // E10: Semantic deduplication check - detect near-duplicates with different wording
    if (!input.skipSemanticDedup && openaiEmbeddingsService.isConfigured()) {
      const { data: projectArticles } = await supabaseAdmin
        .from('articles')
        .select('id, title, topic_fingerprint')
        .eq('project_id', campaign.project_id)
        .not('topic_fingerprint', 'is', null)
        .not('status', 'eq', 'failed')
        .limit(50); // Limit to recent 50 articles for performance

      if (projectArticles && projectArticles.length > 0) {
        try {
          const similarityResult = await openaiEmbeddingsService.checkSimilarity(
            input.keyword,
            projectArticles.map(a => ({
              id: a.id,
              title: a.title,
              topic_fingerprint: a.topic_fingerprint as number[] | null,
            })),
            { threshold: 0.85, maxResults: 3 }
          );

          if (similarityResult.isSimilar) {
            // Return 409 with similarity information
            return errorResponse(
              'SIMILAR_ARTICLE',
              `This topic is very similar to an existing article (similarity: ${(similarityResult.maxSimilarity * 100).toFixed(1)}%)`,
              409,
              {
                similarArticleId: similarityResult.similarArticleId,
                similarityScore: similarityResult.maxSimilarity,
                similarArticles: similarityResult.similarArticles,
              }
            );
          }
        } catch (error) {
          // Log semantic dedup error but don't block generation
          console.error('[Semantic Dedup] Failed to check similarity:', error);
          // Continue with generation - semantic dedup is a safety net, not a hard requirement
        }
      }
    }
  }

  // E7: Use atomic RPC to create article and deduct credits in a single transaction
  // This prevents orphaned articles and partial credit states
  const { data: articleResult, error: articleError } = await supabaseAdmin.rpc(
    'create_article_with_credits',
    {
      p_user_id: userId,
      p_campaign_id: campaign.id,
      p_project_id: campaign.project_id,
      p_primary_keyword: input.keyword,
      p_credits_needed: totalCreditsNeeded,
      p_status: 'generating',
      p_image_preset: input.imagePreset || null,
    }
  );

  if (articleError) {
    // Check if it's a credit insufficiency error
    if (articleError.message?.includes('Insufficient credits')) {
      return errorResponse(
        'INSUFFICIENT_CREDITS',
        `Insufficient credits for article generation. Need ${totalCreditsNeeded} credits.`,
        402
      );
    }

    // Check if it's a unique constraint violation (duplicate)
    if (articleError.code === '23505') {
      const normalizedKeyword = normalizeKeyword(input.keyword);
      const { data: existingArticle } = await supabaseAdmin
        .from('articles')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('keyword_normalized', normalizedKeyword)
        .not('status', 'eq', 'failed')
        .maybeSingle();

      if (existingArticle) {
        return errorResponse(
          'DUPLICATE_ARTICLE',
          'An article with this keyword already exists in this campaign',
          409,
          { existingArticleId: existingArticle.id }
        );
      }
    }

    // Generic error
    throw new Error(`Failed to create article and deduct credits: ${articleError.message}`);
  }

  if (!articleResult || articleResult.length === 0) {
    throw new Error('Failed to create article record - no data returned from RPC');
  }

  const result = articleResult[0];
  const { article_id: articleId, new_total_balance: newBalance } = result;

  // Fire & forget generation using waitUntil()
  // Pass resolved model to ensure billing matches actual generation
  fireAndForget(
    locals,
    articleGenerationService.generateArticle(articleId, userId, {
      ...input,
      model: resolvedModel,
    })
  );

  // Check for low credits and send alert email if needed
  // Use fireAndForget to not block the response
  if (newBalance !== null && newBalance > 0) {
    fireAndForget(
      locals,
      (async () => {
        try {
          // Get user's subscription tier to determine plan credits
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('subscription_tier, email, display_name')
            .eq('id', userId)
            .single();

          if (!profile?.subscription_tier) {
            // Free tier or no subscription - use free tier credits
            return;
          }

          const tier = profile.subscription_tier as SubscriptionTier;
          const planCredits = SUBSCRIPTION_CREDITS[tier];

          if (!planCredits) {
            // Unknown tier, skip
            return;
          }

          const threshold = Math.floor(planCredits * LOW_CREDIT_EMAIL_THRESHOLD_PERCENT);

          // Send low-credit alert if balance is at or below threshold
          if (newBalance <= threshold && profile.email) {
            const emailService = getEmailService();
            await emailService.sendLowCreditAlert({
              userId,
              email: profile.email,
              userName: profile.display_name || 'there',
              creditsRemaining: newBalance,
              planCredits,
              planName: tier.charAt(0).toUpperCase() + tier.slice(1), // Capitalize
            });
          }
        } catch (error) {
          // Log error but don't throw - email failure must never block generation
          console.error('[Generate] Failed to check/send low-credit alert:', error);
        }
      })()
    );
  }

  const response: IGenerateArticleResponse = {
    articleId,
    status: 'generating',
  };

  return jsonResponse(response, 202);
});
