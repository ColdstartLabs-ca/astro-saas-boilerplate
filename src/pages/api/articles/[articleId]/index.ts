/**
 * GET /api/articles/:articleId
 * Get details of a single article by ID
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticleResponse } from '@shared/types/article.types';
import { ErrorCodes } from '@shared/utils/errors';
import { z } from 'zod';

const updateSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  meta_description: z.string().optional(),
  status: z.enum(['draft', 'reviewed', 'published']).optional(),
  published_url: z.string().url().optional(),
});

export const GET: APIRoute = async ({ params, locals }) => {
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

  const articleId = params.articleId;
  if (!articleId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Article ID is required' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (error || !article) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.NOT_FOUND, message: 'Article not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response: IArticleResponse = { article };
    return new Response(JSON.stringify({ success: true, data: response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting article:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to get article' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * PATCH /api/articles/[articleId]
 * Update an article (content, title, etc.)
 */

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const { articleId } = params;

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
    // Parse and validate request body
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    const input = updateSchema.parse(body);

    // Verify article ownership
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('id, user_id')
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

    // Update article
    const { data: updatedArticle, error: updateError } = await supabaseAdmin
      .from('articles')
      .update(input)
      .eq('id', articleId)
      .select()
      .single();

    if (updateError || !updatedArticle) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, data: { article: updatedArticle } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating article:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: error.errors[0]?.message ?? 'Validation failed',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to update article' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE /api/articles/[articleId]
 * Delete an article
 */

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { articleId } = params;

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
    // Verify article ownership
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('id')
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

    // Delete article (images and other related records cascade via FK)
    const { error: deleteError } = await supabaseAdmin
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true, data: { deleted: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting article:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to delete article' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
