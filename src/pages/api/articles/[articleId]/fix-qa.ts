/**
 * POST /api/articles/[articleId]/fix-qa
 *
 * Triggers a targeted AI fix for a qa_failed article.
 * Unlike full regeneration, this:
 * - Takes existing content and applies targeted edits based on QA findings
 * - Does NOT charge credits
 * - Preserves article structure, headings, and facts
 * - Re-runs QA checks and updates status to qa_passed or qa_failed
 */

import { withAuth, jsonResponse, errorResponse, fireAndForget } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';

export const POST = withAuth(async (userId, { params, locals }) => {
  const { articleId } = params;
  if (!articleId) {
    return errorResponse('INVALID_REQUEST', 'Article ID is required', 400);
  }

  // Verify article belongs to user and is in qa_failed state
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, status, content, qa_results')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  if (article.status !== 'qa_failed') {
    return errorResponse(
      'VALIDATION_ERROR',
      `Article is not in qa_failed status. Current status: ${article.status}`,
      400
    );
  }

  if (!article.content) {
    return errorResponse('VALIDATION_ERROR', 'Article has no content to fix', 400);
  }

  if (!article.qa_results) {
    return errorResponse('VALIDATION_ERROR', 'Article has no QA results to fix against', 400);
  }

  // Atomically claim the article (qa_failed → generating) to prevent duplicate fix runs
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('articles')
    .update({ status: 'generating', generation_error: null })
    .eq('id', articleId)
    .eq('status', 'qa_failed')
    .select('id')
    .single();

  if (claimError || !claimed) {
    return errorResponse('CONFLICT', 'Article fix is already in progress', 409);
  }

  fireAndForget(locals, articleGenerationService.fixArticleQAIssues(articleId, userId));

  return jsonResponse({ status: 'generating' }, 202);
});
