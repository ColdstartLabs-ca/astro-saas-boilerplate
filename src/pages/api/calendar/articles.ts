/**
 * GET /api/calendar/articles
 * Returns articles with scheduled_publish_at within a date range for the calendar view.
 */

import type { APIRoute } from 'astro';
import { withAuth, jsonResponse, errorResponse, handleApiError } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

/**
 * Calendar article shape — a lightweight projection used by the calendar UI.
 */
export interface ICalendarArticle {
  id: string;
  title: string | null;
  primaryKeyword: string;
  scheduledPublishAt: string;
  status: string;
  campaignId: string | null;
  campaignName: string | null;
}

export interface ICalendarArticlesResponse {
  articles: ICalendarArticle[];
  total: number;
}

export const GET: APIRoute = withAuth(async (userId, context) => {
  const url = new URL(context.request.url);
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  if (!dateFrom) {
    return errorResponse('INVALID_REQUEST', 'dateFrom is required', 400);
  }

  if (!dateTo) {
    return errorResponse('INVALID_REQUEST', 'dateTo is required', 400);
  }

  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select(
      `
      id,
      title,
      primary_keyword,
      scheduled_publish_at,
      status,
      campaign_id,
      campaigns (
        id,
        name
      )
    `
    )
    .eq('user_id', userId)
    .not('scheduled_publish_at', 'is', null)
    .gte('scheduled_publish_at', dateFrom)
    .lte('scheduled_publish_at', dateTo)
    .order('scheduled_publish_at', { ascending: true });

  if (error) {
    throw error;
  }

  const calendarArticles: ICalendarArticle[] = (articles ?? []).map(article => {
    const campaign = article.campaigns as unknown as { id: string; name: string } | null;
    return {
      id: article.id,
      title: article.title,
      primaryKeyword: article.primary_keyword,
      scheduledPublishAt: article.scheduled_publish_at as string,
      status: article.status,
      campaignId: campaign?.id ?? article.campaign_id,
      campaignName: campaign?.name ?? null,
    };
  });

  const response: ICalendarArticlesResponse = {
    articles: calendarArticles,
    total: calendarArticles.length,
  };

  return jsonResponse(response);
});

export const onError = handleApiError;
