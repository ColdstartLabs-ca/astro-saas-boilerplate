/**
 * POST /api/articles/[articleId]/regenerate
 * Regenerate a failed article (uses same campaign settings)
 */

import { withAuth, jsonResponse, errorResponse, fireAndForget } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import type { IGenerateArticleInput } from '@shared/types/article.types';

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

  // Check user has credits
  const { data: profile } = await supabaseAdmin
    .from('user_credits')
    .select('total_credits_balance')
    .eq('user_id', userId)
    .single();

  const imageCreditCost = campaign.image_preset ? 1 : 0;
  const totalCreditsNeeded = 1 + imageCreditCost;

  if (!profile || profile.total_credits_balance < totalCreditsNeeded) {
    return errorResponse(
      'INSUFFICIENT_CREDITS',
      `Insufficient credits. Need ${totalCreditsNeeded} credits.`,
      402
    );
  }

  // Update article status to generating
  await supabaseAdmin
    .from('articles')
    .update({
      status: 'generating',
      generation_error: null,
    })
    .eq('id', articleId);

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

  fireAndForget(
    locals,
    articleGenerationService.generateArticle(articleId, userId, generateInput)
  );

  return jsonResponse({ status: 'generating' }, 202);
});
