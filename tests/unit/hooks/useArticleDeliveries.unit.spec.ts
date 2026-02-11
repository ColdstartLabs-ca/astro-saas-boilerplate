import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArticleDeliveries } from '@client/hooks/useArticleDeliveries';
import React from 'react';

const mockApiFetch = vi.fn();
vi.mock('@client/utils/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const createWrapper = function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  Wrapper.displayName = 'Wrapper';

  return Wrapper;
};

describe('useArticleDeliveries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty deliveries when articleId is null', () => {
    const { result } = renderHook(() => useArticleDeliveries(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.deliveries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch deliveries for a given article', async () => {
    const mockDeliveries = [
      {
        id: 'del-1',
        article_id: 'art-1',
        integration_id: 'int-1',
        status: 'delivered',
        integration: { id: 'int-1', name: 'My Blog', type: 'wordpress', status: 'active' },
      },
    ];

    mockApiFetch.mockResolvedValueOnce({
      data: { deliveries: mockDeliveries },
    });

    const { result } = renderHook(() => useArticleDeliveries('art-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.deliveries).toHaveLength(1);
      expect(result.current.deliveries[0].id).toBe('del-1');
    });
  });

  it('should return empty array on error', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useArticleDeliveries('art-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.deliveries).toEqual([]);
  });
});
