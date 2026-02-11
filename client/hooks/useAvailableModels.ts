/**
 * useAvailableModels Hook
 * React hook for fetching available AI presets with React Query
 *
 * Features:
 * - Fetch available writer presets and image presets
 * - 5-minute cache since presets rarely change
 * - Proper error handling
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

// =============================================================================
// API Function
// =============================================================================

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
  writerPresets: IAvailableModelsResponse['writerPresets'];
  imagePresets: IAvailableModelsResponse['imagePresets'];
  /** @deprecated Use writerPresets instead */
  writerModels: IAvailableModelsResponse['writerModels'];
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
    staleTime: 5 * 60 * 1000, // 5 min — presets rarely change
  });

  return {
    writerPresets: responseData?.writerPresets ?? [],
    imagePresets: responseData?.imagePresets ?? [],
    writerModels: responseData?.writerModels ?? [],
    isLoading,
    error,
  };
}
