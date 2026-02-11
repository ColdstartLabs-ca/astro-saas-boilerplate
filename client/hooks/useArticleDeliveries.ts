/**
 * useArticleDeliveries Hook
 * Fetches delivery status for an article and provides retry functionality
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { IIntegrationDeliveryWithDetails } from '@shared/types/integration.types';
import { apiFetch } from '@client/utils/api-client';

async function fetchArticleDeliveries(
  articleId: string
): Promise<IIntegrationDeliveryWithDetails[]> {
  const data = await apiFetch<{ data: { deliveries: IIntegrationDeliveryWithDetails[] } }>(
    `/api/articles/${articleId}/deliveries`,
    { method: 'GET' }
  );
  return data.data.deliveries ?? [];
}

async function retryArticleDelivery(articleId: string): Promise<void> {
  await apiFetch(`/api/articles/${articleId}/deliver`, {
    method: 'POST',
    body: JSON.stringify({ retry: true }),
  });
}

interface IUseArticleDeliveriesReturn {
  deliveries: IIntegrationDeliveryWithDetails[];
  isLoading: boolean;
  retryingId: string | null;
  retryDelivery: (articleId: string) => Promise<void>;
}

export function useArticleDeliveries(articleId: string | null): IUseArticleDeliveriesReturn {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['article-deliveries', articleId],
    queryFn: () => (articleId ? fetchArticleDeliveries(articleId) : Promise.resolve([])),
    enabled: !!articleId,
    staleTime: 1000 * 10,
  });

  const retryMutation = useMutation({
    mutationFn: (artId: string) => retryArticleDelivery(artId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['article-deliveries', articleId] });
    },
  });

  const retryDelivery = useCallback(
    async (artId: string) => {
      setRetryingId(artId);
      try {
        await retryMutation.mutateAsync(artId);
      } finally {
        setRetryingId(null);
      }
    },
    [retryMutation]
  );

  return {
    deliveries,
    isLoading,
    retryingId,
    retryDelivery,
  };
}
