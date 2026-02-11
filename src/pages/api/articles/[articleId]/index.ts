/**
 * GET /api/articles/:articleId
 * Get details of a single article by ID
 */

import { withAuth, withAuthAndBody, jsonResponse, errorResponse } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticleDetailResponse } from '@shared/types/article.types';
import { z } from 'zod';

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
    ])
    .optional(),
  published_url: z.string().url().optional(),
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
export const PATCH = withAuthAndBody(updateSchema, async (userId, input, { params }) => {
  const { articleId } = params;

  // Verify article ownership
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, user_id')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Update article and fetch full data with images
  const { data: updatedArticle, error: updateError } = await supabaseAdmin
    .from('articles')
    .update(input)
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
  const { error: deleteError } = await supabaseAdmin
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (deleteError) {
    throw deleteError;
  }

  return jsonResponse({ deleted: true });
});
