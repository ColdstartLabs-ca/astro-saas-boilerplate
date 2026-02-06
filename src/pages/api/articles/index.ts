/**
 * GET /api/articles
 * List articles for the authenticated user with optional filters
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticlesListResponse } from '@shared/types/article.types';
import { ErrorCodes } from '@shared/utils/errors';
import { z } from 'zod';

// Query params schema
const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  status: z.enum(['queued', 'generating', 'draft', 'reviewed', 'published', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const GET: APIRoute = async ({ url, locals }) => {
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
    // Parse query params
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const query = listQuerySchema.parse(queryParams);

    // Build query - include campaign information
    let dbQuery = supabaseAdmin
      .from('articles')
      .select(`
        *,
        campaigns (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    // Apply optional filters
    if (query.projectId) {
      dbQuery = dbQuery.eq('project_id', query.projectId);
    }
    if (query.campaignId) {
      dbQuery = dbQuery.eq('campaign_id', query.campaignId);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    const { data: articles, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    const response: IArticlesListResponse = {
      articles: (articles ?? []) as any,
      total: count ?? 0,
    };

    return new Response(JSON.stringify({ success: true, data: response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing articles:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: error.errors[0]?.message ?? 'Invalid query params',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to list articles' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
