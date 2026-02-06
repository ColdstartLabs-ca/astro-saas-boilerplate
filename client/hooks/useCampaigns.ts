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
 * Fetch campaigns for a project from API
 */
async function fetchCampaigns(projectId: string): Promise<ICampaignWithStats[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns?projectId=${projectId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to fetch campaigns');
  }

  const data = await response.json();
  return data.data.campaigns ?? [];
}

/**
 * Create a new campaign
 */
async function createCampaign(input: ICreateCampaignInput): Promise<ICampaignWithStats> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to create campaign');
  }

  const data = await response.json();
  return data.data.campaign;
}

/**
 * Delete a campaign
 */
async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || 'Failed to delete campaign');
  }

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
  const logger = useLogger('useCampaigns');
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
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
      showToast({
        message: t('campaigns.success.created'),
        type: 'success',
      });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', projectId] });
      showToast({
        message: t('campaigns.delete.success'),
        type: 'success',
      });
    },
  });

  // Wrapped mutation functions with error handling
  const handleCreateCampaign = useCallback(
    async (input: ICreateCampaignInput): Promise<ICampaignWithStats> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch (error) {
        logger.error('Failed to create campaign', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        showToast({
          message: t('campaigns.create.error'),
          type: 'error',
        });
        throw error;
      }
    },
    [createMutation, logger, showToast, t]
  );

  const handleDeleteCampaign = useCallback(
    async (campaignId: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(campaignId);
      } catch (error) {
        logger.error('Failed to delete campaign', {
          error: error instanceof Error ? error.message : 'Unknown error',
          campaignId,
        });
        showToast({
          message: t('campaigns.delete.error'),
          type: 'error',
        });
        throw error;
      }
    },
    [deleteMutation, logger, showToast, t]
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
