/**
 * useOpportunities Hook
 * React hook for opportunity management with React Query
 *
 * Features:
 * - Fetch opportunities for a project via React Query
 * - Trigger opportunity analysis (POST)
 * - Update opportunity status (dismiss, etc.)
 * - Toast notifications via useMutationWithToast
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  IOpportunity,
  IOpportunityListResponse,
  IAnalyzeOpportunitiesResponse,
  IUpdateOpportunityInput,
  ICreateArticleFromOpportunityResponse,
  IGscConnectionListResponse,
} from '@shared/types/opportunity.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch opportunities for a project from API
 */
async function fetchOpportunities(
  projectId: string,
  filters?: { category?: string; status?: string }
): Promise<IOpportunity[]> {
  const params = new URLSearchParams({ projectId });
  if (filters?.category && filters.category !== 'all') {
    params.set('category', filters.category);
  }
  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }

  const data = await apiFetch<IOpportunityListResponse>(`/api/opportunities?${params.toString()}`, {
    method: 'GET',
  });
  return data.opportunities ?? [];
}

/**
 * Trigger opportunity analysis for a project
 */
async function analyzeOpportunities(projectId: string): Promise<IAnalyzeOpportunitiesResponse> {
  const data = await apiFetch<IAnalyzeOpportunitiesResponse>('/api/opportunities/analyze', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });
  return data;
}

/**
 * Update an opportunity's status
 */
async function updateOpportunityStatus(
  opportunityId: string,
  input: IUpdateOpportunityInput
): Promise<IOpportunity> {
  const data = await apiFetch<{ opportunity: IOpportunity }>(
    `/api/opportunities?opportunityId=${opportunityId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
  return data.opportunity;
}

/**
 * Create an article from a content opportunity
 */
async function createArticleFromOpportunity(
  opportunityId: string,
  projectId: string
): Promise<ICreateArticleFromOpportunityResponse> {
  const data = await apiFetch<ICreateArticleFromOpportunityResponse>(
    `/api/opportunities/${opportunityId}/create-article`,
    {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }
  );
  return data;
}

/**
 * Mark an opportunity as completed
 */
async function markOpportunityComplete(opportunityId: string): Promise<IOpportunity> {
  const data = await apiFetch<{ opportunity: IOpportunity }>(
    `/api/opportunities/${opportunityId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    }
  );
  return data.opportunity;
}

/**
 * Fetch GSC connections for a project
 */
async function fetchGscConnections(projectId: string): Promise<IGscConnectionListResponse> {
  const data = await apiFetch<IGscConnectionListResponse>(
    `/api/gsc/connections?projectId=${projectId}`,
    { method: 'GET' }
  );
  return data;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseOpportunitiesReturn {
  // Data
  opportunities: IOpportunity[];
  isLoading: boolean;
  error: Error | null;
  hasGscConnection: boolean;
  isLoadingGsc: boolean;

  // Analysis
  analyzeOpportunities: () => Promise<IAnalyzeOpportunitiesResponse>;
  isAnalyzing: boolean;
  lastAnalyzedAt: string | null;

  // Actions
  updateStatus: (opportunityId: string, input: IUpdateOpportunityInput) => Promise<IOpportunity>;
  dismissOpportunity: (opportunityId: string) => Promise<void>;
  createArticle: (
    opportunityId: string,
    projectId: string
  ) => Promise<ICreateArticleFromOpportunityResponse>;
  isCreatingArticle: boolean;
  markComplete: (opportunityId: string) => Promise<void>;
  refetch: () => void;
}

export function useOpportunities(projectId: string | null | undefined): IUseOpportunitiesReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch opportunities query
  const {
    data: opportunities = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['opportunities', projectId],
    queryFn: () => (projectId ? fetchOpportunities(projectId) : Promise.resolve([])),
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch GSC connections query
  const { data: gscData, isLoading: isLoadingGsc } = useQuery({
    queryKey: ['gsc-connections', projectId],
    queryFn: () =>
      projectId ? fetchGscConnections(projectId) : Promise.resolve({ connections: [] }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const hasGscConnection = useMemo(() => {
    if (!gscData?.connections) return false;
    return gscData.connections.some(c => c.status === 'active');
  }, [gscData]);

  // Derive last analyzed timestamp from most recent opportunity
  const lastAnalyzedAt = useMemo(() => {
    if (opportunities.length === 0) return null;
    const sorted = [...opportunities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0].created_at;
  }, [opportunities]);

  // Analyze opportunities mutation
  const analyzeMutation = useMutation({
    mutationFn: () => (projectId ? analyzeOpportunities(projectId) : Promise.reject('No project')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      opportunityId,
      input,
    }: {
      opportunityId: string;
      input: IUpdateOpportunityInput;
    }) => updateOpportunityStatus(opportunityId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] });
    },
  });

  // Wrapped mutation functions with toast notifications
  const handleAnalyze = useMutationWithToast(analyzeMutation, {
    successMessage: t('opportunities.success.analyzed'),
    errorMessage: t('opportunities.error.analyze'),
    loggerContext: 'Failed to analyze opportunities',
  });

  const updateStatusWithToast = useMutationWithToast(updateStatusMutation, {
    successMessage: t('opportunities.success.dismissed'),
    errorMessage: t('opportunities.error.dismiss'),
    loggerContext: (variables: { opportunityId: string; input: IUpdateOpportunityInput }) => ({
      message: 'Failed to update opportunity status',
      context: { opportunityId: variables.opportunityId },
    }),
  });

  const handleUpdateStatus = useCallback(
    async (opportunityId: string, input: IUpdateOpportunityInput): Promise<IOpportunity> => {
      return updateStatusWithToast({ opportunityId, input });
    },
    [updateStatusWithToast]
  );

  const handleDismiss = useCallback(
    async (opportunityId: string): Promise<void> => {
      await handleUpdateStatus(opportunityId, { status: 'dismissed' });
    },
    [handleUpdateStatus]
  );

  // Create article from opportunity mutation
  const createArticleMutation = useMutation({
    mutationFn: ({ opportunityId, projectId: pId }: { opportunityId: string; projectId: string }) =>
      createArticleFromOpportunity(opportunityId, pId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] });
    },
  });

  const handleCreateArticle = useMutationWithToast(createArticleMutation, {
    successMessage: t('opportunities.success.articleCreated'),
    errorMessage: t('opportunities.error.createArticle'),
    loggerContext: (variables: { opportunityId: string; projectId: string }) => ({
      message: 'Failed to create article from opportunity',
      context: { opportunityId: variables.opportunityId },
    }),
  });

  const createArticleWrapper = useCallback(
    async (opportunityId: string, pId: string): Promise<ICreateArticleFromOpportunityResponse> => {
      return handleCreateArticle({ opportunityId, projectId: pId });
    },
    [handleCreateArticle]
  );

  // Mark complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: (opportunityId: string) => markOpportunityComplete(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] });
    },
  });

  const handleMarkComplete = useMutationWithToast(markCompleteMutation, {
    successMessage: t('opportunities.success.completed'),
    errorMessage: t('opportunities.error.complete'),
    loggerContext: 'Failed to mark opportunity as complete',
  });

  const markCompleteWrapper = useCallback(
    async (opportunityId: string): Promise<void> => {
      await handleMarkComplete(opportunityId);
    },
    [handleMarkComplete]
  );

  return {
    // Data
    opportunities,
    isLoading,
    error,
    hasGscConnection,
    isLoadingGsc,

    // Analysis
    analyzeOpportunities: handleAnalyze,
    isAnalyzing: analyzeMutation.isPending,
    lastAnalyzedAt,

    // Actions
    updateStatus: handleUpdateStatus,
    dismissOpportunity: handleDismiss,
    createArticle: createArticleWrapper,
    isCreatingArticle: createArticleMutation.isPending,
    markComplete: markCompleteWrapper,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] }),
  };
}
