/**
 * useArticles Hook
 *
 * Hook for fetching articles for the current user/project.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { IArticleWithCampaign } from '@shared/types/article.types';
import { apiFetch } from '@client/utils/api-client';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch articles from API
 */
async function fetchArticles(params: {
  projectId?: string;
  campaignId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: IArticleWithCampaign[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params.projectId) queryParams.set('projectId', params.projectId);
  if (params.campaignId) queryParams.set('campaignId', params.campaignId);
  if (params.status) queryParams.set('status', params.status);
  if (params.search) queryParams.set('search', params.search);
  if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.set('dateTo', params.dateTo);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset != null) queryParams.set('offset', params.offset.toString());

  const data = await apiFetch<{ data: { articles: IArticleWithCampaign[]; total: number } }>(
    `/api/articles?${queryParams.toString()}`,
    { method: 'GET' }
  );
  return data.data;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseArticlesOptions {
  projectId?: string;
  campaignId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
  enabled?: boolean;
}

export function useArticles({
  projectId,
  campaignId,
  status,
  search,
  dateFrom,
  dateTo,
  limit = 20,
  page = 1,
  enabled = true,
}: IUseArticlesOptions = {}): {
  articles: IArticleWithCampaign[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const offset = (page - 1) * limit;

  // Fetch articles query
  const {
    data: { articles = [], total = 0 } = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['articles', projectId, campaignId, status, search, dateFrom, dateTo, limit, page],
    queryFn: () =>
      fetchArticles({ projectId, campaignId, status, search, dateFrom, dateTo, limit, offset }),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    articles,
    total,
    totalPages: Math.ceil(total / limit),
    isLoading,
    error,
    refetch,
  };
}
