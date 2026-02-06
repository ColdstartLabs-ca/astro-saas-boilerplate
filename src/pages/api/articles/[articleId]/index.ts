/**
 * GET /api/articles/:articleId
 * Get details of a single article by ID
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticleResponse } from '@shared/types/article.types';
import { ErrorCodes } from '@shared/utils/errors';

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
