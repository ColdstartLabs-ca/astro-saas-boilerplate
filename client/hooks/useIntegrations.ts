/**
 * useIntegrations Hook
 * React hook for integration management with React Query
 *
 * Features:
 * - Fetch integrations via React Query
 * - CRUD mutations for integrations
 * - Test connection mutations
 * - Toast notifications for all operations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  IIntegrationWithCampaigns,
  ICreateIntegrationInput,
  IUpdateIntegrationInput,
  ITestConnectionResult,
} from '@shared/types/integration.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch integrations for the current user from API
 */
async function fetchIntegrations(): Promise<IIntegrationWithCampaigns[]> {
  const data = await apiFetch<{ data: IIntegrationsListResponse }>('/api/integrations', {
    method: 'GET',
  });
  return data.data.integrations ?? [];
}

interface IIntegrationsListResponse {
  integrations: IIntegrationWithCampaigns[];
}

/**
 * Create a new integration
 */
async function createIntegration(
  input: ICreateIntegrationInput
): Promise<IIntegrationWithCampaigns> {
  const data = await apiFetch<{ data: { integration: IIntegrationWithCampaigns } }>(
    '/api/integrations',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return data.data.integration;
}

/**
 * Update an integration
 */
async function updateIntegration({
  integrationId,
  ...input
}: IUpdateIntegrationInput & { integrationId: string }): Promise<IIntegrationWithCampaigns> {
  const data = await apiFetch<{ data: { integration: IIntegrationWithCampaigns } }>(
    `/api/integrations/${integrationId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
  return data.data.integration;
}

/**
 * Delete an integration
 */
async function deleteIntegration(integrationId: string): Promise<{ success: boolean }> {
  await apiFetch<{ success: boolean }>(`/api/integrations/${integrationId}`, {
    method: 'DELETE',
  });
  return { success: true };
}

/**
 * Test an integration connection
 */
async function testIntegration(integrationId: string): Promise<ITestConnectionResult> {
  const data = await apiFetch<{ data: { result: ITestConnectionResult } }>(
    `/api/integrations/${integrationId}/test`,
    {
      method: 'POST',
    }
  );
  return data.data.result;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseIntegrationsReturn {
  // Data
  integrations: IIntegrationWithCampaigns[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  createIntegration: (input: ICreateIntegrationInput) => Promise<IIntegrationWithCampaigns>;
  updateIntegration: (
    input: IUpdateIntegrationInput & { integrationId: string }
  ) => Promise<IIntegrationWithCampaigns>;
  deleteIntegration: (integrationId: string) => Promise<void>;
  testIntegration: (integrationId: string) => Promise<ITestConnectionResult>;
  refetch: () => void;
}

export function useIntegrations(): IUseIntegrationsReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch integrations query
  const {
    data: integrations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
    staleTime: 1000 * 60, // 1 minute - integrations don't change often
  });

  // Create integration mutation
  const createMutation = useMutation({
    mutationFn: createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Update integration mutation
  const updateMutation = useMutation({
    mutationFn: updateIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Delete integration mutation
  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Test integration mutation (no cache invalidation needed)
  const testMutation = useMutation({
    mutationFn: testIntegration,
  });

  // Wrapped mutation functions with error handling
  const handleCreateIntegration = useMutationWithToast(createMutation, {
    successMessage: t('integrations.form.success'),
    errorMessage: t('integrations.form.error'),
    loggerContext: 'Failed to create integration',
  });

  const handleUpdateIntegration = useMutationWithToast(updateMutation, {
    successMessage: t('integrations.form.updateSuccess'),
    errorMessage: t('integrations.form.error'),
    loggerContext: (input: IUpdateIntegrationInput & { integrationId: string }) => ({
      message: 'Failed to update integration',
      context: { integrationId: input.integrationId },
    }),
  });

  const deleteIntegrationWithToast = useMutationWithToast(deleteMutation, {
    successMessage: t('integrations.deleteSuccess'),
    errorMessage: t('integrations.deleteError'),
    loggerContext: (integrationId: string) => ({
      message: 'Failed to delete integration',
      context: { integrationId },
    }),
  });

  const handleDeleteIntegration = useCallback(
    async (integrationId: string): Promise<void> => {
      await deleteIntegrationWithToast(integrationId);
    },
    [deleteIntegrationWithToast]
  );

  const handleTestIntegration = useCallback(
    async (integrationId: string): Promise<ITestConnectionResult> => {
      const result = await testMutation.mutateAsync(integrationId);
      return result;
    },
    [testMutation]
  );

  return {
    // Data
    integrations,
    isLoading,
    error,

    // Actions
    createIntegration: handleCreateIntegration,
    updateIntegration: handleUpdateIntegration,
    deleteIntegration: handleDeleteIntegration,
    testIntegration: handleTestIntegration,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  };
}
