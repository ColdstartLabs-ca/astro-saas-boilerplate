/**
 * useAvailableModels Hook
 * React hook for fetching available AI models with React Query
 *
 * Features:
 * - Fetch available writer models and image presets
 * - 5-minute cache since models rarely change
 * - Proper error handling
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

// =============================================================================
// API Function
// =============================================================================

/**
 * Fetch available models from the API
 */
async function fetchAvailableModels(): Promise<IAvailableModelsResponse> {
  const response = await fetch('/api/models', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch available models');
  }

  return response.json() as Promise<IAvailableModelsResponse>;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseAvailableModelsReturn {
  // Data
  writerModels: IAvailableModelsResponse['writerModels'];
  imagePresets: IAvailableModelsResponse['imagePresets'];
  isLoading: boolean;
  error: Error | null;
}

export function useAvailableModels(): IUseAvailableModelsReturn {
  const {
    data: responseData,
    isLoading,
    error,
  } = useQuery<IAvailableModelsResponse>({
    queryKey: ['available-models'],
    queryFn: fetchAvailableModels,
    staleTime: 5 * 60 * 1000, // 5 min — models rarely change
  });

  return {
    writerModels: responseData?.writerModels ?? [],
    imagePresets: responseData?.imagePresets ?? [],
    isLoading,
    error,
  };
}
