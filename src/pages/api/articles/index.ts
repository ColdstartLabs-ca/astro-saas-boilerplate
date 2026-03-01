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

// Status priority: closer to published = higher priority (lower number = first)
const STATUS_PRIORITY: Record<string, number> = {
  published: 0,
  approved: 1,
  qa_passed: 2,
  reviewed: 3,
  draft: 4,
  generating: 5,
  queued: 6,
  failed: 7,
  failed_quality: 7,
  failed_timeout: 7,
  qa_failed: 7,
  rejected: 8,
  planned: 9,
};

// Query params schema
const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  status: z
    .enum([
      'planned',
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
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const GET = withAuth(async (userId, { url }) => {
  // Parse query params (ZodError auto-handled by withAuth)
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const query = listQuerySchema.parse(queryParams);

  // Build query — fetch ALL matching rows (no .range()) so we can sort by status priority in JS
  let dbQuery = supabaseAdmin
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
        status
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

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
  if (query.search) {
    dbQuery = dbQuery.or(
      `title.ilike.%${query.search}%,primary_keyword.ilike.%${query.search}%`
    );
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

  // Sort by status priority (closer to published first), then by created_at DESC within same priority
  const sorted = (articles ?? []).sort((a: IArticle, b: IArticle) => {
    const aPriority = STATUS_PRIORITY[a.status] ?? 9;
    const bPriority = STATUS_PRIORITY[b.status] ?? 9;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Apply pagination in JS after sorting
  const page = sorted.slice(query.offset, query.offset + query.limit);

  // Calculate SEO score on-the-fly for articles that don't have one
  const articlesWithScore = page.map((article: IArticle) => {
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
    total: count ?? sorted.length,
  };

  return jsonResponse(response);
});
