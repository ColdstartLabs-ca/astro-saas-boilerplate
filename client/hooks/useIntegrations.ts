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

import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  IIntegrationWithCampaigns,
  ICreateIntegrationInput,
  IUpdateIntegrationInput,
  ITestConnectionResult,
} from '@shared/types/integration.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useCRUD } from './useCRUD';

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
// Types for useCRUD
// =============================================================================

type IntegrationUpdateInput = IUpdateIntegrationInput & { integrationId: string };

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
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Use the generic CRUD hook
  const crud = useCRUD<
    IIntegrationWithCampaigns,
    ICreateIntegrationInput,
    IntegrationUpdateInput,
    string
  >({
    queryKey: ['integrations'],
    fetchFn: fetchIntegrations,
    createFn: createIntegration,
    updateFn: updateIntegration,
    deleteFn: deleteIntegration,
    staleTime: 1000 * 60, // 1 minute - integrations don't change often
    toastMessages: {
      create: {
        success: t('integrations.form.success'),
        error: t('integrations.form.error'),
      },
      update: {
        success: t('integrations.form.updateSuccess'),
        error: t('integrations.form.error'),
      },
      delete: {
        success: t('integrations.deleteSuccess'),
        error: t('integrations.deleteError'),
      },
    },
    loggerContexts: {
      create: 'Failed to create integration',
      update: (input: IntegrationUpdateInput) => ({
        message: 'Failed to update integration',
        context: { integrationId: input.integrationId },
      }),
      delete: (integrationId: string) => ({
        message: 'Failed to delete integration',
        context: { integrationId },
      }),
    },
  });

  // Test integration mutation (no cache invalidation needed)
  const testMutation = useMutation({
    mutationFn: testIntegration,
  });

  const handleTestIntegration = useCallback(
    async (integrationId: string): Promise<ITestConnectionResult> => {
      const result = await testMutation.mutateAsync(integrationId);
      return result;
    },
    [testMutation]
  );

  return {
    // Data
    integrations: crud.items,
    isLoading: crud.isLoading,
    error: crud.error,

    // Actions
    createIntegration: crud.create,
    updateIntegration: crud.update,
    deleteIntegration: crud.remove,
    testIntegration: handleTestIntegration,
    refetch: crud.refetch,
  };
}
