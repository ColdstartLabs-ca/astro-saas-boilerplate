/**
 * POST /api/articles/[articleId]/regenerate
 * Regenerate a failed or rejected article (uses same campaign settings)
 *
 * Security:
 * - Only allows regeneration for 'failed' or 'rejected' status articles
 * - Uses conditional UPDATE to prevent race conditions
 * - Returns 409 Conflict if regeneration is already in progress
 */

import { withAuth, jsonResponse, errorResponse, fireAndForget } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import type { IGenerateArticleInput, ArticleStatus } from '@shared/types/article.types';

// Valid statuses for regeneration
const REGENERATABLE_STATUSES: ArticleStatus[] = ['failed', 'rejected'];

export const POST = withAuth(async (userId, { params, locals }) => {
  const { articleId } = params;
  if (!articleId) {
    return errorResponse('INVALID_REQUEST', 'Article ID is required', 400);
  }

  // Get article with campaign info
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select(
      `
      *,
      campaigns (
        id,
        project_id,
        ai_model,
        tone,
        target_word_count,
        image_preset
      )
    `
    )
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  const campaign = article.campaigns as {
    id: string;
    project_id: string | null;
    ai_model: string | null;
    tone: string | null;
    target_word_count: number | null;
    image_preset: string | null;
  } | null;

  if (!campaign) {
    return errorResponse('VALIDATION_ERROR', 'Article has no associated campaign', 400);
  }

  // Validate article status - only allow regeneration for failed or rejected
  if (!REGENERATABLE_STATUSES.includes(article.status as ArticleStatus)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Article cannot be regenerated. Current status: ${article.status}. Only failed or rejected articles can be regenerated.`,
      400
    );
  }

  // Calculate credit cost using shared helper
  const imageCreditCost = getImagePresetCreditCost(campaign.image_preset);
  const totalCreditsNeeded = 1 + imageCreditCost;

  // Check user has credits
  const { data: profile } = await supabaseAdmin
    .from('user_credits')
    .select('total_credits_balance')
    .eq('user_id', userId)
    .single();

  if (!profile || profile.total_credits_balance < totalCreditsNeeded) {
    return errorResponse(
      'INSUFFICIENT_CREDITS',
      `Insufficient credits. Need ${totalCreditsNeeded} credits.`,
      402
    );
  }

  // Use conditional update to prevent race conditions
  // Only update if status is still in REGENERATABLE_STATUSES (acquires lock)
  const { data: updateResult, error: updateError } = await supabaseAdmin
    .from('articles')
    .update(
      {
        status: 'generating',
        generation_error: null,
      },
      { count: 'exact' }
    )
    .eq('id', articleId)
    .in('status', REGENERATABLE_STATUSES)
    .select('id')
    .single();

  // If no rows were updated, another request already started regeneration
  if (updateError || !updateResult) {
    return errorResponse(
      'CONFLICT',
      'Article regeneration is already in progress. Please wait for the current regeneration to complete.',
      409
    );
  }

  // Deduct credit
  await supabaseAdmin.rpc('consume_credits_v2', {
    target_user_id: userId,
    amount: totalCreditsNeeded,
    ref_id: articleId,
    description: `Article regeneration: ${article.primary_keyword}`,
  });

  // Fire & forget generation
  const generateInput: IGenerateArticleInput = {
    keyword: article.primary_keyword,
    projectId: campaign.project_id ?? '',
    campaignId: campaign.id,
    model: campaign.ai_model || undefined,
    tone: (campaign.tone as IGenerateArticleInput['tone']) || undefined,
    targetWordCount: campaign.target_word_count || undefined,
    imagePreset: campaign.image_preset || undefined,
  };

  fireAndForget(locals, articleGenerationService.generateArticle(articleId, userId, generateInput));

  return jsonResponse({ status: 'generating' }, 202);
});
