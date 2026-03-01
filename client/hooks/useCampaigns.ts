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

import { useMemo } from 'react';
import type { ICampaignWithStats, ICreateCampaignInput } from '@shared/types/campaign.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useCRUD } from './useCRUD';

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
// Types for useCRUD
// =============================================================================

// No update function for campaigns, so we use never for TUpdate
type CampaignUpdateInput = never;

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
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Use the generic CRUD hook
  const crud = useCRUD<ICampaignWithStats, ICreateCampaignInput, CampaignUpdateInput, string>({
    queryKey: ['campaigns', projectId],
    fetchFn: () => (projectId ? fetchCampaigns(projectId) : Promise.resolve([])),
    createFn: createCampaign,
    deleteFn: deleteCampaign,
    enabled: !!projectId,
    staleTime: 1000 * 30, // 30 seconds - campaigns change more frequently
    toastMessages: {
      create: {
        success: t('campaigns.success.created'),
        error: t('campaigns.create.error'),
      },
      delete: {
        success: t('campaigns.delete.success'),
        error: t('campaigns.delete.error'),
      },
    },
    loggerContexts: {
      create: 'Failed to create campaign',
      delete: (campaignId: string) => ({
        message: 'Failed to delete campaign',
        context: { campaignId },
      }),
    },
  });

  return {
    // Data
    campaigns: crud.items,
    isLoading: crud.isLoading,
    error: crud.error,

    // Actions
    createCampaign: crud.create,
    deleteCampaign: crud.remove,
    refetch: crud.refetch,
  };
}
