/**
 * GET /api/articles/:articleId
 * Get details of a single article by ID
 */

import {
  withAuth,
  withAuthAndBody,
  jsonResponse,
  errorResponse,
  fireAndForget,
} from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticleDetailResponse } from '@shared/types/article.types';
import { z } from 'zod';
import {
  validateTransition,
  validateRequiredFieldsForTransition,
  InvalidStatusTransitionError,
  getValidTransitions,
} from '@server/services/article-status-transitions';

// Schema for article update
const updateSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  meta_description: z.string().optional(),
  status: z
    .enum([
      'queued',
      'generating',
      'draft',
      'approved',
      'rejected',
      'reviewed',
      'published',
      'failed',
      'failed_quality',
    ])
    .optional(),
  published_url: z.string().url().optional(),
  published_at: z.string().optional(),
  rejection_reason: z.string().optional(),
});

export const GET = withAuth(async (userId, { params }) => {
  const articleId = params.articleId;
  if (!articleId) {
    return errorResponse('INVALID_REQUEST', 'Article ID is required', 400);
  }

  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select(
      `
      *,
      campaigns (
        id,
        name
      ),
      article_images (
        id,
        position,
        image_url,
        prompt,
        status
      )
    `
    )
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (error || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  const response: IArticleDetailResponse = {
    article: article as IArticleDetailResponse['article'],
  };
  return jsonResponse(response);
});

/**
 * PATCH /api/articles/[articleId]
 * Update an article (content, title, etc.)
 */
export const PATCH = withAuthAndBody(updateSchema, async (userId, input, context) => {
  const { articleId } = context.params;

  // Verify article ownership and get current status and campaign info
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, user_id, status, campaign_id, content')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Validate status transition if status is being changed
  if (input.status && input.status !== article.status) {
    try {
      // Check if transition is valid
      validateTransition(article.status, input.status);

      // Check if required fields are present
      validateRequiredFieldsForTransition(input.status, input);
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        return errorResponse('INVALID_STATUS_TRANSITION', error.message, 400, {
          from: error.fromStatus,
          to: error.toStatus,
          validTransitions: getValidTransitions(article.status),
        });
      }
      return errorResponse('VALIDATION_ERROR', (error as Error).message, 400);
    }
  }

  // Prepare update data - auto-set published_at if transitioning to published and not provided
  const updateData: Record<string, unknown> = { ...input };
  if (input.status === 'published' && !input.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  // Update article and fetch full data with images
  const { data: updatedArticle, error: updateError } = await supabaseAdmin
    .from('articles')
    .update(updateData)
    .eq('id', articleId)
    .select(
      `
      *,
      campaigns (
        id,
        name
      ),
      article_images (
        id,
        position,
        image_url,
        prompt,
        status
      )
    `
    )
    .single();

  if (updateError || !updatedArticle) {
    throw updateError;
  }

  // Trigger delivery if status changed to 'approved' and article has a campaign
  if (
    input.status === 'approved' &&
    input.status !== article.status &&
    article.campaign_id &&
    articleId
  ) {
    // Dynamic import to avoid circular dependencies
    // eslint-disable-next-line no-restricted-syntax
    const deliveryPromise = import('@server/services/delivery.service').then(
      ({ deliveryService }) => deliveryService.deliverArticle(articleId)
    );
    fireAndForget(context.locals, deliveryPromise);
  }

  // Auto-re-analyze AI detection score if content changed
  if (input.content && input.content !== article.content && articleId) {
    // Dynamic import to avoid circular dependencies
    // eslint-disable-next-line no-restricted-syntax
    const reanalyzePromise = import('@server/services/ai-detection.service').then(
      ({ aiDetectionService }) => aiDetectionService.analyzeHeuristic(articleId, input.content!)
    );
    fireAndForget(context.locals, reanalyzePromise);
  }

  return jsonResponse({ article: updatedArticle });
});

/**
 * DELETE /api/articles/[articleId]
 * Delete an article
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const { articleId } = params;

  // Verify article ownership
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Delete article (images and other related records cascade via FK)
  const { error: deleteError } = await supabaseAdmin.from('articles').delete().eq('id', articleId);

  if (deleteError) {
    throw deleteError;
  }

  return jsonResponse({ deleted: true });
});
