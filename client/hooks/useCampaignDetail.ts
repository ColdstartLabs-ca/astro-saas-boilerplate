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
  IAddKeywordsResponse,
} from '@shared/types/campaign.types';
import type { IArticle } from '@shared/types/article.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch campaign detail with keywords, article stats, and credit stats
 */
async function fetchCampaignDetail(campaignId: string): Promise<{
  campaign: ICampaign;
  keywords: IKeyword[];
  articleStats: ICampaignArticleStats;
  creditStats: ICampaignCreditStats;
}> {
  const data = await apiFetch<{
    data: {
      campaign: ICampaign;
      keywords: IKeyword[];
      articleStats: ICampaignArticleStats;
      creditStats: ICampaignCreditStats;
    };
  }>(`/api/campaigns/${campaignId}`, { method: 'GET' });
  return data.data;
}

/**
 * Fetch campaign articles
 */
async function fetchCampaignArticles(campaignId: string): Promise<IArticle[]> {
  const data = await apiFetch<{ data: { articles: IArticle[] } }>(
    `/api/articles?campaignId=${campaignId}&limit=100`,
    { method: 'GET' }
  );
  return data.data.articles ?? [];
}

/**
 * Add keywords to campaign
 */
async function addKeywords(
  campaignId: string,
  keywords: string[]
): Promise<IAddKeywordsResponse> {
  const data = await apiFetch<{
    data: IAddKeywordsResponse;
  }>(`/api/campaigns/${campaignId}/keywords`, {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  });
  return data.data;
}

/**
 * Remove a keyword from campaign
 */
async function removeKeyword(campaignId: string, keywordId: string): Promise<{ success: boolean }> {
  await apiFetch<{ success: boolean }>(
    `/api/campaigns/${campaignId}/keywords/${keywordId}`,
    { method: 'DELETE' }
  );
  return { success: true };
}

/**
 * Update campaign settings
 */
async function updateCampaign(campaignId: string, input: IUpdateCampaignInput): Promise<ICampaign> {
  const data = await apiFetch<{
    data: { campaign: ICampaign };
  }>(`/api/campaigns/${campaignId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.data.campaign;
}

/**
 * Start campaign generation
 */
async function startCampaign(campaignId: string): Promise<{
  queued: number;
  creditsRequired: number;
}> {
  const data = await apiFetch<{ data: { queued: number; creditsRequired: number } }>(
    `/api/campaigns/${campaignId}/start`,
    { method: 'POST' }
  );
  return data.data;
}

/**
 * Start scheduled campaign
 */
async function startScheduleApi(campaignId: string): Promise<{
  nextRunAt: string;
  pendingKeywords: number;
}> {
  const data = await apiFetch<{ data: { nextRunAt: string; pendingKeywords: number } }>(
    `/api/campaigns/${campaignId}/start-schedule`,
    { method: 'POST' }
  );
  return data.data;
}

/**
 * Pause scheduled campaign
 */
async function pauseScheduleApi(campaignId: string): Promise<void> {
  await apiFetch<{ data: { paused: boolean } }>(
    `/api/campaigns/${campaignId}/pause-schedule`,
    { method: 'POST' }
  );
}

/**
 * Resume scheduled campaign
 */
async function resumeScheduleApi(campaignId: string): Promise<{
  nextRunAt: string;
}> {
  const data = await apiFetch<{ data: { nextRunAt: string } }>(
    `/api/campaigns/${campaignId}/resume-schedule`,
    { method: 'POST' }
  );
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
  addKeywords: (keywords: string[]) => Promise<IAddKeywordsResponse>;
  removeKeyword: (keywordId: string) => Promise<void>;
  updateCampaign: (input: IUpdateCampaignInput) => Promise<ICampaign>;
  startCampaign: () => Promise<{ queued: number; creditsRequired: number }>;
  startSchedule: () => Promise<void>;
  pauseSchedule: () => Promise<void>;
  resumeSchedule: () => Promise<void>;
  refetch: () => void;
}

export function useCampaignDetail(campaignId: string | null | undefined): IUseCampaignDetailReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // BUG M4: Campaign detail query needs polling so that keyword/article counts update
  // while the campaign is actively generating (active) or scheduled.
  // We read the cached status without creating a circular dependency by using queryClient.
  const cachedDetail = queryClient.getQueryData<{ campaign: { status: string } } | null>([
    'campaign-detail',
    campaignId,
  ]);
  const cachedStatus = cachedDetail?.campaign?.status ?? null;
  // Poll every 5s when active (articles being generated), every 30s when scheduled (waiting for next run)
  const detailRefetchInterval: number | false =
    cachedStatus === 'active' ? 5000 : cachedStatus === 'scheduled' ? 30000 : false;

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
    refetchInterval: detailRefetchInterval,
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
    onSuccess: _data => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
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
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (input: IUpdateCampaignInput) =>
      campaignId ? updateCampaign(campaignId, input) : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: () =>
      campaignId ? startCampaign(campaignId) : Promise.reject(new Error('No campaign ID')),
    onSuccess: _data => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-articles', campaignId] });
    },
  });

  // Wrapped mutation functions with error handling
  const handleAddKeywords = useMutationWithToast(addKeywordsMutation, {
    successMessage: (data: IAddKeywordsResponse) =>
      t('campaigns.keywords.added', { added: data.added, duplicates: data.duplicates }),
    errorMessage: t('campaigns.keywords.error'),
    loggerContext: 'Failed to add keywords',
  });

  const removeKeywordWithToast = useMutationWithToast(removeKeywordMutation, {
    successMessage: t('campaigns.keywords.removed'),
    errorMessage: t('campaigns.keywords.error'),
    loggerContext: (keywordId: string) => ({
      message: 'Failed to remove keyword',
      context: { keywordId },
    }),
  });

  const handleRemoveKeyword = useCallback(
    async (keywordId: string): Promise<void> => {
      await removeKeywordWithToast(keywordId);
    },
    [removeKeywordWithToast]
  );

  const handleUpdateCampaign = useMutationWithToast(updateCampaignMutation, {
    successMessage: t('campaigns.success.updated'),
    errorMessage: t('campaigns.errors.updateFailed'),
    loggerContext: 'Failed to update campaign',
  });

  const handleStartCampaign = useMutationWithToast(startCampaignMutation, {
    successMessage: (data: { queued: number; creditsRequired: number }) =>
      t('campaigns.generation.started', { count: data.queued }),
    errorMessage: (error: Error) =>
      error instanceof Error ? error.message : t('campaigns.errors.startFailed'),
    loggerContext: 'Failed to start campaign',
  });

  // Start schedule mutation
  const startScheduleMutation = useMutation({
    mutationFn: () =>
      campaignId ? startScheduleApi(campaignId) : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Pause schedule mutation
  const pauseScheduleMutation = useMutation({
    mutationFn: () =>
      campaignId ? pauseScheduleApi(campaignId) : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Resume schedule mutation
  const resumeScheduleMutation = useMutation({
    mutationFn: () =>
      campaignId ? resumeScheduleApi(campaignId) : Promise.reject(new Error('No campaign ID')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const startScheduleWithToast = useMutationWithToast(startScheduleMutation, {
    successMessage: t('campaigns.schedule.started'),
    errorMessage: (error: Error) =>
      error instanceof Error ? error.message : t('campaigns.errors.startFailed'),
    loggerContext: 'Failed to start schedule',
  });

  const pauseScheduleWithToast = useMutationWithToast(pauseScheduleMutation, {
    successMessage: t('campaigns.schedule.paused'),
    errorMessage: (error: Error) =>
      error instanceof Error ? error.message : t('campaigns.errors.pauseFailed'),
    loggerContext: 'Failed to pause schedule',
  });

  const resumeScheduleWithToast = useMutationWithToast(resumeScheduleMutation, {
    successMessage: t('campaigns.schedule.resumed'),
    errorMessage: (error: Error) =>
      error instanceof Error ? error.message : t('campaigns.errors.resumeFailed'),
    loggerContext: 'Failed to resume schedule',
  });

  const handleStartSchedule = useCallback(
    async (): Promise<void> => {
      await startScheduleWithToast(undefined);
    },
    [startScheduleWithToast]
  );

  const handlePauseSchedule = useCallback(
    async (): Promise<void> => {
      await pauseScheduleWithToast(undefined);
    },
    [pauseScheduleWithToast]
  );

  const handleResumeSchedule = useCallback(
    async (): Promise<void> => {
      await resumeScheduleWithToast(undefined);
    },
    [resumeScheduleWithToast]
  );

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
    startSchedule: handleStartSchedule,
    pauseSchedule: handlePauseSchedule,
    resumeSchedule: handleResumeSchedule,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-articles', campaignId] });
    },
  };
}
