'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiRequest } from '@client/hooks/useApiRequest';

interface IBlogStatusResponse {
  synced: boolean;
  slug: string | null;
}

export function useArticleBlogStatus(articleId: string, enabled: boolean) {
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
export function useInvalidateArticleBlogStatus() {
  const queryClient = useQueryClient();
  return (articleId: string) => {
    queryClient.invalidateQueries({ queryKey: ['article-blog-status', articleId] });
  };
}
