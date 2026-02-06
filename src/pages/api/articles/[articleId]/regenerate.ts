/**
 * POST /api/articles/[articleId]/regenerate
 * Regenerate a failed article (uses same campaign settings)
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { ErrorCodes } from '@shared/utils/errors';

export const POST: APIRoute = async ({ params, locals }) => {
  const { articleId } = params;
  if (!articleId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Article ID is required' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Authentication required' },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get article with campaign info
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select(`
        *,
        campaigns (
          id,
          project_id,
          ai_model,
          tone,
          target_word_count,
          image_preset
        )
      `)
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.NOT_FOUND, message: 'Article not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const campaign = article.campaigns as any;
    if (!campaign) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Article has no associated campaign' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: ErrorCodes.INSUFFICIENT_CREDITS,
            message: `Insufficient credits. Need ${totalCreditsNeeded} credits.`,
          },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
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
    const ctx = (
      locals as { runtime?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } } }
    ).runtime?.ctx;

    const generateInput: import('@shared/types/article.types').IGenerateArticleInput = {
      keyword: article.primary_keyword,
      projectId: campaign.project_id ?? '',
      campaignId: campaign.id,
      model: campaign.ai_model || undefined,
      tone: campaign.tone || undefined,
      targetWordCount: campaign.target_word_count || undefined,
      imagePreset: campaign.image_preset || undefined,
    };

    if (ctx?.waitUntil) {
      ctx.waitUntil(articleGenerationService.generateArticle(articleId, userId as string, generateInput as any));
    } else {
      // Fallback for dev
      articleGenerationService.generateArticle(articleId, userId as string, generateInput as any).catch(err => {
        console.error('[ArticleRegeneration] Background generation failed:', err);
      });
    }

    return new Response(JSON.stringify({ success: true, data: { status: 'generating' } }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error regenerating article:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to regenerate article' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
