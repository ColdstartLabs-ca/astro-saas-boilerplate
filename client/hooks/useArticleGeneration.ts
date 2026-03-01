/**
 * useArticleGeneration Hook
 * React hook for article generation with polling
 *
 * Delegates status polling to useArticlePoller so the ['article', id] cache
 * is shared with all other views (campaign list, calendar, etc.).
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { IArticle, IGenerateArticleInput } from '@shared/types/article.types';
import { apiFetch } from '@client/utils/api-client';
import { useArticlePoller, isArticleInProgress } from './useArticlePoller';

// =============================================================================
// API Functions
// =============================================================================

async function generateArticle(
  input: IGenerateArticleInput
): Promise<{ articleId: string; status: 'generating' }> {
  const data = await apiFetch<{ data: { articleId: string; status: 'generating' } }>(
    '/api/articles/generate',
    { method: 'POST', body: JSON.stringify(input) }
  );
  return data.data;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseArticleGenerationReturn {
  article: IArticle | null;
  isGenerating: boolean;
  error: string | null;
  generate: (input: IGenerateArticleInput) => Promise<{ articleId: string }>;
  reset: () => void;
}

export function useArticleGeneration(
  articleId: string | null,
  setArticleId?: (id: string | null) => void
): IUseArticleGenerationReturn {
  const queryClient = useQueryClient();

  // Delegate polling to the shared poller — uses ['article', id] cache key
  const { articles } = useArticlePoller(articleId ? [articleId] : []);
  const article = articles[0] ?? null;

  // Generate article mutation
  const generateMutation = useMutation({
    mutationFn: generateArticle,
    onSuccess: result => {
      setArticleId?.(result.articleId);
    },
  });

  // Clean up query cache when articleId is cleared
  useEffect(() => {
    if (!articleId) {
      queryClient.removeQueries({ queryKey: ['article'] });
    }
  }, [articleId, queryClient]);

  const handleGenerate = async (input: IGenerateArticleInput): Promise<{ articleId: string }> => {
    const result = await generateMutation.mutateAsync(input);
    return result;
  };

  const handleReset = (): void => {
    queryClient.removeQueries({ queryKey: ['article'] });
    generateMutation.reset();
  };

  const isGenerating =
    generateMutation.isPending ||
    (!!article && isArticleInProgress(article.status)) ||
    (!!articleId && !article); // still loading first response

  return {
    article,
    isGenerating,
    error: generateMutation.error?.message ?? null,
    generate: handleGenerate,
    reset: handleReset,
  };
}
