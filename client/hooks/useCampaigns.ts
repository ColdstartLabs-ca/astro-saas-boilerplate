/**
 * useCampaigns Hook
 * React hook for campaign management with React Query
 *
 * Features:
 * - Fetch campaigns for a project via React Query
 * - CRUD mutations for campaigns
 * - Delete campaign with toast notifications
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { ICampaignWithStats, ICreateCampaignInput } from '@shared/types/campaign.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch campaigns for a project from API
 */
async function fetchCampaigns(projectId: string): Promise<ICampaignWithStats[]> {
  const data = await apiFetch<{ data: { campaigns: ICampaignWithStats[] } }>(
    `/api/campaigns?projectId=${projectId}`,
    { method: 'GET' }
  );
  return data.data.campaigns ?? [];
}

/**
 * Create a new campaign
 */
async function createCampaign(input: ICreateCampaignInput): Promise<ICampaignWithStats> {
  const data = await apiFetch<{ data: { campaign: ICampaignWithStats } }>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.data.campaign;
}

/**
 * Delete a campaign
 */
async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  await apiFetch<{ success: boolean }>(`/api/campaigns/${campaignId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

// =============================================================================
// Hook
// =============================================================================

interface IUseCampaignsReturn {
  // Data
  campaigns: ICampaignWithStats[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  createCampaign: (input: ICreateCampaignInput) => Promise<ICampaignWithStats>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  refetch: () => void;
}

export function useCampaigns(projectId: string | null | undefined): IUseCampaignsReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch campaigns query
  const {
    data: campaigns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['campaigns', projectId],
    queryFn: () => (projectId ? fetchCampaigns(projectId) : Promise.resolve([])),
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds - campaigns change more frequently
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', projectId] });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', projectId] });
    },
  });

  // Wrapped mutation functions with error handling
  const handleCreateCampaign = useMutationWithToast(createMutation, {
    successMessage: t('campaigns.success.created'),
    errorMessage: t('campaigns.create.error'),
    loggerContext: 'Failed to create campaign',
  });

  const deleteCampaignWithToast = useMutationWithToast(deleteMutation, {
    successMessage: t('campaigns.delete.success'),
    errorMessage: t('campaigns.delete.error'),
    loggerContext: (campaignId: string) => ({
      message: 'Failed to delete campaign',
      context: { campaignId },
    }),
  });

  const handleDeleteCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      await deleteCampaignWithToast(campaignId);
    },
    [deleteCampaignWithToast]
  );

  return {
    // Data
    campaigns,
    isLoading,
    error,

    // Actions
    createCampaign: handleCreateCampaign,
    deleteCampaign: handleDeleteCampaign,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['campaigns', projectId] }),
  };
}
