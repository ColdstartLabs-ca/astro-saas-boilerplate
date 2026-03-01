'use client';

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useApiRequest } from '@client/hooks/useApiRequest';

interface IBlogStatusResponse {
  synced: boolean;
  slug: string | null;
}

export function useArticleBlogStatus(
  articleId: string,
  enabled: boolean
): UseQueryResult<IBlogStatusResponse, Error> {
  const { request } = useApiRequest();

  return useQuery({
    queryKey: ['article-blog-status', articleId],
    queryFn: () => request<IBlogStatusResponse>(`/api/articles/${articleId}/blog-status`),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

/**
 * Invalidate blog status cache for an article (call after syncing)
 */
export function useInvalidateArticleBlogStatus(): (articleId: string) => Promise<void> {
  const queryClient = useQueryClient();
  return async (articleId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['article-blog-status', articleId] });
  };
}
