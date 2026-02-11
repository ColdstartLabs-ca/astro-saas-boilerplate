/**
 * GET /api/articles
 * List articles for the authenticated user with optional filters
 */

import { withAuth, jsonResponse } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IArticlesListResponse } from '@shared/types/article.types';
import { z } from 'zod';
import { calculateOverallSEOScore } from '@shared/utils/seo';
import type { IArticle } from '@shared/types/article.types';

// Query params schema
const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
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
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const GET = withAuth(async (userId, { url }) => {
  // Parse query params (ZodError auto-handled by withAuth)
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const query = listQuerySchema.parse(queryParams);

  // Build query - include campaign information
  let dbQuery = supabaseAdmin
    .from('articles')
    .select(
      `
      *,
      campaigns (
        id,
        name
      )
    `,
      { count: 'exact' }
    )
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
  if (query.dateFrom) {
    dbQuery = dbQuery.gte('created_at', query.dateFrom);
  }
  if (query.dateTo) {
    dbQuery = dbQuery.lte('created_at', query.dateTo);
  }

  const { data: articles, error, count } = await dbQuery;

  if (error) {
    throw error;
  }

  // Calculate SEO score on-the-fly for articles that don't have one
  const articlesWithScore = (articles ?? []).map((article: IArticle) => {
    if (article.seo_score === null && article.content && article.title) {
      const seoResult = calculateOverallSEOScore({
        title: article.title,
        content: article.content,
        meta_description: article.meta_description,
        primary_keyword: article.primary_keyword,
        word_count: article.word_count,
      });
      return { ...article, seo_score: seoResult.overallScore };
    }
    return article;
  });

  const response: IArticlesListResponse = {
    articles: articlesWithScore as IArticlesListResponse['articles'],
    total: count ?? 0,
  };

  return jsonResponse(response);
});
