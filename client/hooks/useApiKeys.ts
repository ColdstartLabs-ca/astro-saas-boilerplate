/**
 * useApiKeys Hook
 * React hook for API key management with React Query
 *
 * Features:
 * - Fetch API keys via React Query
 * - Create key mutation
 * - Delete (revoke) key mutation
 * - Toast notifications for all operations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  IApiKey,
  ICreateApiKeyInput,
  ICreateApiKeyResponse,
  IApiKeysListResponse,
} from '@shared/types/api-key.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch API keys for the current user from API
 */
async function fetchApiKeys(): Promise<IApiKey[]> {
  const data = await apiFetch<IApiKeysListResponse>('/api/settings/api-keys', {
    method: 'GET',
  });
  return data.keys ?? [];
}

/**
 * Create a new API key
 */
async function createApiKey(input: ICreateApiKeyInput): Promise<ICreateApiKeyResponse> {
  return apiFetch<ICreateApiKeyResponse>('/api/settings/api-keys', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Delete (revoke) an API key
 */
async function deleteApiKey(keyId: string): Promise<void> {
  await apiFetch<void>(`/api/settings/api-keys?keyId=${keyId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Hook
// =============================================================================

interface IUseApiKeysReturn {
  // Data
  apiKeys: IApiKey[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  createApiKey: (input: ICreateApiKeyInput) => Promise<ICreateApiKeyResponse>;
  deleteApiKey: (keyId: string) => Promise<void>;
  refetch: () => void;
}

export function useApiKeys(): IUseApiKeysReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('settings'), []);

  // Fetch API keys query
  const {
    data: apiKeys = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: fetchApiKeys,
    staleTime: 1000 * 60, // 1 minute
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  // Wrapped mutation functions with error handling
  const handleCreateApiKey = useMutationWithToast(createMutation, {
    successMessage: t('apiKeys.createSuccess'),
    errorMessage: t('apiKeys.createError'),
    loggerContext: 'Failed to create API key',
  });

  const handleDeleteApiKey = useMutationWithToast(deleteMutation, {
    successMessage: t('apiKeys.revokeSuccess'),
    errorMessage: t('apiKeys.revokeError'),
    loggerContext: (keyId: string) => ({
      message: 'Failed to delete API key',
      context: { keyId },
    }),
  });

  const deleteApiKeyWithToast = useCallback(
    async (keyId: string): Promise<void> => {
      await handleDeleteApiKey(keyId);
    },
    [handleDeleteApiKey]
  );

  return {
    // Data
    apiKeys,
    isLoading,
    error,

    // Actions
    createApiKey: handleCreateApiKey,
    deleteApiKey: deleteApiKeyWithToast,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['apiKeys'] }),
  };
}
