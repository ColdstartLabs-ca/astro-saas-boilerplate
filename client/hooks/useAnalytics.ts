/**
 * useAnalytics Hook
 * React hook for analytics performance data with React Query
 *
 * Features:
 * - Fetch GSC performance data per article/campaign via React Query
 * - Sync (trigger) analytics data from GSC
 * - Toast notifications via useMutationWithToast
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type {
  IAnalyticsData,
  IAnalyticsSyncResponse,
} from '@shared/types/article-performance.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch performance data for a project from API
 */
async function fetchPerformanceData(
  projectId: string,
  dateRangeDays: 7 | 28 | 90
): Promise<IAnalyticsData> {
  const params = new URLSearchParams({
    projectId,
    dateRangeDays: String(dateRangeDays),
  });

  const data = await apiFetch<{ data: IAnalyticsData }>(
    `/api/analytics/performance?${params.toString()}`,
    { method: 'GET' }
  );
  return data.data;
}

/**
 * Trigger analytics sync from GSC for a project
 */
async function syncAnalyticsData(
  projectId: string,
  dateRangeDays: 7 | 28 | 90
): Promise<IAnalyticsSyncResponse> {
  const data = await apiFetch<{ data: IAnalyticsSyncResponse }>('/api/analytics/sync', {
    method: 'POST',
    body: JSON.stringify({ projectId, dateRangeDays }),
  });
  return data.data;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseAnalyticsReturn {
  /** Performance analytics data */
  data: IAnalyticsData | undefined;
  /** Whether the analytics query is loading */
  isLoading: boolean;
  /** Error from the analytics query */
  error: Error | null;
  /** Trigger a GSC sync for the project */
  sync: () => Promise<IAnalyticsSyncResponse>;
  /** Whether a sync is in progress */
  isSyncing: boolean;
  /** Refetch analytics data */
  refetch: () => void;
}

export function useAnalytics(
  projectId: string | null | undefined,
  dateRangeDays: 7 | 28 | 90 = 28
): IUseAnalyticsReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch analytics performance data query
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', projectId, dateRangeDays],
    queryFn: () =>
      projectId
        ? fetchPerformanceData(projectId, dateRangeDays)
        : Promise.resolve(undefined as unknown as IAnalyticsData),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync mutation — triggers a GSC data pull
  const syncMutation = useMutation({
    mutationFn: () =>
      projectId
        ? syncAnalyticsData(projectId, dateRangeDays)
        : Promise.reject(new Error('No project selected')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', projectId, dateRangeDays] });
    },
  });

  const handleSync = useMutationWithToast(syncMutation, {
    successMessage: t('analytics.success.sync'),
    errorMessage: t('analytics.error.sync'),
    loggerContext: 'Failed to sync analytics data from GSC',
  });

  return {
    data,
    isLoading,
    error,
    sync: () => handleSync(undefined as void),
    isSyncing: syncMutation.isPending,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ['analytics', projectId, dateRangeDays] }),
  };
}
