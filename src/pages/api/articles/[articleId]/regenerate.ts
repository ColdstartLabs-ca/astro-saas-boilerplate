/**
 * POST /api/articles/[articleId]/regenerate
 * Regenerate a retryable article (uses same campaign settings)
 *
 * Security:
 * - Only allows regeneration for retryable status articles
 * - Uses conditional UPDATE to prevent race conditions
 * - Returns 409 Conflict if regeneration is already in progress
 */

import { withAuth, jsonResponse, errorResponse, fireAndForget } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { calculateArticleCreditCost } from '@shared/config/credits.config';
import type {
  IGenerateArticleInput,
  IArticleStylePreferences,
  ArticleStatus,
} from '@shared/types/article.types';

// Valid statuses for regeneration
const REGENERATABLE_STATUSES: ArticleStatus[] = [
  'failed',
  'failed_quality',
  'failed_timeout',
  'qa_failed',
  'rejected',
];

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
        image_preset,
        article_style,
        global_instructions,
        internal_links_count,
        include_youtube,
        include_cta,
        include_emojis,
        include_infographics,
        image_style
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
    article_style: string | null;
    global_instructions: string | null;
    internal_links_count: number | null;
    include_youtube: boolean | null;
    include_cta: boolean | null;
    include_emojis: boolean | null;
    include_infographics: boolean | null;
    image_style: string | null;
  } | null;

  if (!campaign) {
    return errorResponse('VALIDATION_ERROR', 'Article has no associated campaign', 400);
  }

  // Validate article status - only allow regeneration for explicit retryable states
  if (!REGENERATABLE_STATUSES.includes(article.status as ArticleStatus)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Article cannot be regenerated. Current status: ${article.status}. Only failed, failed_quality, failed_timeout, qa_failed, or rejected articles can be regenerated.`,
      400
    );
  }

  // Calculate credit cost using shared helper (fixes hardcoded 1 cost bug)
  const totalCreditsNeeded = calculateArticleCreditCost(campaign.ai_model, campaign.image_preset);

  // BUG H1 FIX: Deduct credits FIRST (atomic via RPC) before updating status.
  // This prevents concurrent requests from overdrawing the balance — the atomic
  // consume_credits_v2 RPC will fail for whichever concurrent caller loses the race,
  // so we never charge more credits than the user has.
  // If the subsequent status update fails we immediately refund the deduction.
  const { error: deductError } = await supabaseAdmin.rpc('consume_credits_v2', {
    target_user_id: userId,
    amount: totalCreditsNeeded,
    ref_id: articleId,
    description: `Article regeneration: ${article.primary_keyword}`,
  });

  if (deductError) {
    // consume_credits_v2 returns an error when the balance is insufficient
    return errorResponse(
      'INSUFFICIENT_CREDITS',
      `Insufficient credits. Need ${totalCreditsNeeded} credits.`,
      402
    );
  }

  // Use conditional update to prevent race conditions
  // Only update if status is still in REGENERATABLE_STATUSES
  // IMPORTANT: Update credits_used here so refund reads correct amount if generation fails
  const { data: updateResult, error: updateError } = await supabaseAdmin
    .from('articles')
    .update(
      {
        status: 'generating',
        generation_error: null,
        credits_used: totalCreditsNeeded, // Store charged amount for accurate refund
      },
      { count: 'exact' }
    )
    .eq('id', articleId)
    .in('status', REGENERATABLE_STATUSES)
    .select('id')
    .single();

  // If no rows were updated, another request already started regeneration.
  // Refund the credits we just deducted so the user is not left out of pocket.
  if (updateError || !updateResult) {
    await supabaseAdmin.rpc('refund_credits_v2', {
      target_user_id: userId,
      amount: totalCreditsNeeded,
      job_id: articleId,
      p_description: `Refund for failed regeneration lock: ${article.primary_keyword}`,
    });

    return errorResponse(
      'CONFLICT',
      'Article regeneration is already in progress. Please wait for the current regeneration to complete.',
      409
    );
  }

  // Build style preferences from campaign outrank fields
  const stylePreferences: IArticleStylePreferences = {
    articleStyle: (campaign.article_style as IArticleStylePreferences['articleStyle']) ?? undefined,
    globalInstructions: campaign.global_instructions ?? undefined,
    internalLinksCount: campaign.internal_links_count ?? 0,
    includeYoutube: campaign.include_youtube ?? false,
    includeCta: campaign.include_cta ?? false,
    includeEmojis: campaign.include_emojis ?? false,
    includeInfographics: campaign.include_infographics ?? false,
    imageStyle: campaign.image_style ?? undefined,
  };

  // Fire & forget generation
  const generateInput: IGenerateArticleInput = {
    keyword: article.primary_keyword,
    projectId: campaign.project_id ?? '',
    campaignId: campaign.id,
    model: campaign.ai_model || undefined,
    tone: (campaign.tone as IGenerateArticleInput['tone']) || undefined,
    targetWordCount: campaign.target_word_count || undefined,
    imagePreset: campaign.image_preset || undefined,
    stylePreferences,
  };

  fireAndForget(locals, articleGenerationService.generateArticle(articleId, userId, generateInput));

  return jsonResponse({ status: 'generating' }, 202);
});
