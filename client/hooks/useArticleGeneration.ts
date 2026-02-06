/**
 * useArticleGeneration Hook
 * React hook for article generation with polling
 *
 * Features:
 * - Generate article via API
 * - Poll for status updates
 * - Return generated article when complete
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { IArticle, IGenerateArticleInput } from '@shared/types/article.types';
import { createClient } from '@shared/utils/supabase/client';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get the current user's access token for API requests
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Build auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Generate an article from a keyword
 */
async function generateArticle(
  input: IGenerateArticleInput
): Promise<{ articleId: string; status: 'generating' }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/articles/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || error.error || 'Failed to generate article');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch article details by ID
 */
async function fetchArticle(articleId: string): Promise<IArticle> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/articles/${articleId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || error.error || 'Failed to fetch article');
  }

  const data = await response.json();
  return data.data.article;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseArticleGenerationReturn {
  // Data
  article: IArticle | null;
  isGenerating: boolean;
  error: string | null;

  // Actions
  generate: (input: IGenerateArticleInput) => Promise<{ articleId: string }>;
  reset: () => void;
}

export function useArticleGeneration(
  articleId: string | null,
  setArticleId?: (id: string | null) => void
): IUseArticleGenerationReturn {
  const queryClient = useQueryClient();

  // Poll for article status
  const {
    data: article,
    isLoading: isPolling,
    error: pollError,
    refetch: _refetch,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () =>
      articleId ? fetchArticle(articleId) : Promise.reject(new Error('No article ID')),
    enabled: !!articleId,
    refetchInterval: query => {
      // Poll every 3 seconds while generating
      const data = query.state.data;
      if (data?.status === 'generating') {
        return 3000;
      }
      // Stop polling when not generating
      return false;
    },
    refetchIntervalInBackground: true, // Keep polling in background
    staleTime: 0, // Always refetch when needed
  });

  // Generate article mutation
  const generateMutation = useMutation({
    mutationFn: generateArticle,
    onSuccess: result => {
      // Set the articleId so polling starts automatically
      setArticleId?.(result.articleId);
    },
  });

  // Reset query when articleId becomes null
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

  return {
    article: article ?? null,
    isGenerating: isPolling || article?.status === 'generating' || generateMutation.isPending,
    error: pollError?.message ?? generateMutation.error?.message ?? null,
    generate: handleGenerate,
    reset: handleReset,
  };
}
