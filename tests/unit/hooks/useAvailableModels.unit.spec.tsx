import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockAvailableModels: IAvailableModelsResponse = {
  writerModels: [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
    },
  ],
  imagePresets: [
    {
      key: 'realistic',
      displayName: 'Realistic',
      description: 'Photorealistic images',
      bestFor: 'Product photography',
      replicateModel: 'flux-realism',
      creditCost: 10,
      aspectRatio: '1:1',
    },
    {
      key: 'artistic',
      displayName: 'Artistic',
      description: 'Artistic style images',
      bestFor: 'Creative visuals',
      replicateModel: 'stable-diffusion-xl',
      creditCost: 8,
      aspectRatio: '16:9',
    },
  ],
};

// Wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

describe('useAvailableModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and return available models', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAvailableModels,
    });

    const { result } = renderHook(() => useAvailableModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.writerModels).toEqual(mockAvailableModels.writerModels);
    expect(result.current.imagePresets).toEqual(mockAvailableModels.imagePresets);
    expect(mockFetch).toHaveBeenCalledWith('/api/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle loading state', () => {
    mockFetch.mockReturnValueOnce(
      new Promise(resolve =>
        setTimeout(() =>
          resolve({
            ok: true,
            json: async () => mockAvailableModels,
          } as Response)
        )
      )
    );

    const { result } = renderHook(() => useAvailableModels(), {
      wrapper: createWrapper(),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useAvailableModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Failed to fetch available models');
  });

  it('should return empty arrays when data is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        ({ writerModels: undefined, imagePresets: undefined }) as IAvailableModelsResponse,
    });

    const { result } = renderHook(() => useAvailableModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.writerModels).toEqual([]);
    expect(result.current.imagePresets).toEqual([]);
  });
});
