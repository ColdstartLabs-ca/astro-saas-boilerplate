/**
 * useCampaignDetail Hook
 * React hook for campaign detail with keywords and articles
 *
 * Features:
 * - Fetch campaign detail with keywords and article stats
 * - Polling for active campaigns
 * - Mutations for keywords and generation control
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  ICampaign,
  IKeyword,
  IUpdateCampaignInput,
  ICampaignArticleStats,
  ICampaignCreditStats,
} from '@shared/types/campaign.types';
import type { IArticle } from '@shared/types/article.types';
import { useLogger } from '@client/utils/logger';
import { useToastStore } from '@client/store/toastStore';
import { createClient } from '@shared/utils/supabase/client';
import { getTranslations } from '@src/i18n/utils';

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
 * Fetch campaign detail with keywords, article stats, and credit stats
 */
async function fetchCampaignDetail(campaignId: string): Promise<{
  campaign: ICampaign;
  keywords: IKeyword[];
  articleStats: ICampaignArticleStats;
  creditStats: ICampaignCreditStats;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to fetch campaign detail');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch campaign articles
 */
async function fetchCampaignArticles(campaignId: string): Promise<IArticle[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/articles?campaignId=${campaignId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to fetch articles');
  }

  const data = await response.json();
  return data.data.articles ?? [];
}

/**
 * Add keywords to campaign
 */
async function addKeywords(
  campaignId: string,
  keywords: string[]
): Promise<{
  added: number;
  duplicates: number;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}/keywords`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ keywords }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to add keywords');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Remove a keyword from campaign
 */
async function removeKeyword(campaignId: string, keywordId: string): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}/keywords/${keywordId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to remove keyword');
  }

  return { success: true };
}

/**
 * Update campaign settings
 */
async function updateCampaign(campaignId: string, input: IUpdateCampaignInput): Promise<ICampaign> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to update campaign');
  }

  const data = await response.json();
  return data.data.campaign;
}

/**
 * Start campaign generation
 */
async function startCampaign(campaignId: string): Promise<{
  queued: number;
  creditsRequired: number;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}/start`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to start campaign');
  }

  const data = await response.json();
  return data.data;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseCampaignDetailReturn {
  // Data
  campaign: ICampaign | null;
  keywords: IKeyword[];
  articles: IArticle[];
  articleStats: ICampaignArticleStats | null;
  creditStats: ICampaignCreditStats | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  addKeywords: (keywords: string[]) => Promise<{ added: number; duplicates: number }>;
  removeKeyword: (keywordId: string) => Promise<void>;
  updateCampaign: (input: IUpdateCampaignInput) => Promise<ICampaign>;
  startCampaign: () => Promise<{ queued: number; creditsRequired: number }>;
  refetch: () => void;
}

export function useCampaignDetail(campaignId: string | null | undefined): IUseCampaignDetailReturn {
  const logger = useLogger('useCampaignDetail');
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch campaign detail query
  const {
    data: detailData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['campaign-detail', campaignId],
    queryFn: () => (campaignId ? fetchCampaignDetail(campaignId) : Promise.resolve(null)),
    enabled: !!campaignId && campaignId !== '',
    staleTime: 1000 * 30, // 30 seconds - reduce refetch frequency
  });

  // Derived data - extract campaign first to use its status for polling
  const campaign = detailData?.campaign ?? null;
  const keywords = detailData?.keywords ?? [];
  const articleStats = detailData?.articleStats ?? null;
  const creditStats = detailData?.creditStats ?? null;

  // Fetch articles query (separate for polling)
  // We use a separate query to enable polling based on campaign status
  const campaignStatus = campaign?.status ?? null;
  const { data: articles = [] } = useQuery({
    queryKey: ['campaign-articles', campaignId],
    queryFn: () => (campaignId ? fetchCampaignArticles(campaignId) : Promise.resolve([])),
    enabled: !!campaignId,
    staleTime: 1000 * 5, // 5 seconds
    refetchInterval: campaignStatus === 'active' ? 5000 : false, // Poll every 5s when active
  });

  // Add keywords mutation
  const addKeywordsMutation = useMutation({
    mutationFn: (keywords: string[]) =>
      campaignId ? addKeywords(campaignId, keywords) : Promise.reject(new Error('No campaign ID')),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      showToast({
        message: t('campaigns.keywords.added', { added: data.added, duplicates: data.duplicates }),
        type: 'success',
      });
    },
  });

  // Remove keyword mutation
  const removeKeywordMutation = useMutation({
    mutationFn: (keywordId: string) =>
      campaignId
        ? removeKeyword(campaignId, keywordId)
        : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      showToast({
        message: t('campaigns.keywords.removed'),
        type: 'success',
      });
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (input: IUpdateCampaignInput) =>
      campaignId ? updateCampaign(campaignId, input) : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast({
        message: t('campaigns.success.updated'),
        type: 'success',
      });
    },
  });

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: () =>
      campaignId ? startCampaign(campaignId) : Promise.reject(new Error('No campaign ID')),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-articles', campaignId] });
      showToast({
        message: t('campaigns.generation.started', { count: data.queued }),
        type: 'success',
      });
    },
  });

  // Wrapped mutation functions with error handling
  const handleAddKeywords = useCallback(
    async (keywords: string[]) => {
      try {
        return await addKeywordsMutation.mutateAsync(keywords);
      } catch (error) {
        logger.error('Failed to add keywords', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast({
          message: t('campaigns.keywords.error'),
          type: 'error',
        });
        throw error;
      }
    },
    [addKeywordsMutation, logger, showToast, t]
  );

  const handleRemoveKeyword = useCallback(
    async (keywordId: string) => {
      try {
        await removeKeywordMutation.mutateAsync(keywordId);
      } catch (error) {
        logger.error('Failed to remove keyword', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast({
          message: t('campaigns.keywords.error'),
          type: 'error',
        });
        throw error;
      }
    },
    [removeKeywordMutation, logger, showToast, t]
  );

  const handleUpdateCampaign = useCallback(
    async (input: IUpdateCampaignInput) => {
      try {
        return await updateCampaignMutation.mutateAsync(input);
      } catch (error) {
        logger.error('Failed to update campaign', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast({
          message: t('campaigns.errors.updateFailed'),
          type: 'error',
        });
        throw error;
      }
    },
    [updateCampaignMutation, logger, showToast, t]
  );

  const handleStartCampaign = useCallback(async () => {
    try {
      return await startCampaignMutation.mutateAsync();
    } catch (error) {
      logger.error('Failed to start campaign', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const message = error instanceof Error ? error.message : t('campaigns.errors.startFailed');
      showToast({
        message,
        type: 'error',
      });
      throw error;
    }
  }, [startCampaignMutation, logger, showToast, t]);

  return {
    // Data
    campaign,
    keywords,
    articles,
    articleStats,
    creditStats,
    isLoading,
    error,

    // Actions
    addKeywords: handleAddKeywords,
    removeKeyword: handleRemoveKeyword,
    updateCampaign: handleUpdateCampaign,
    startCampaign: handleStartCampaign,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-articles', campaignId] });
    },
  };
}
