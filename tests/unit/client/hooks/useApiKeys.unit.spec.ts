/**
 * useApiKeys Hook Unit Tests
 *
 * Tests for API key fetching, creation, and deletion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiKeys } from '@client/hooks/useApiKeys';
import type { IApiKey, ApiKeyScope } from '@shared/types/api-key.types';

// =============================================================================
// Mocks
// =============================================================================

const mockApiFetch = vi.fn();
vi.mock('@client/utils/api-client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock('@client/utils/logger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@src/i18n/utils', () => ({
  getTranslations: () => (key: string) => key,
}));

// =============================================================================
// Helpers
// =============================================================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createMockApiKey(overrides: Partial<IApiKey> = {}): IApiKey {
  return {
    id: 'key-1',
    user_id: 'user-1',
    name: 'Test Key',
    key_prefix: 'apr_test',
    last_used_at: '2026-01-01T00:00:00Z',
    rate_limit: 100,
    scopes: ['articles:read', 'articles:write'] as ApiKeyScope[],
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useApiKeys', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  describe('fetching API keys', () => {
    it('should return empty array when no keys exist', async () => {
      mockApiFetch.mockResolvedValueOnce({ keys: [] });

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.apiKeys).toEqual([]);
    });

    it('should fetch API keys for the current user', async () => {
      const mockKeys = [createMockApiKey(), createMockApiKey({ id: 'key-2', name: 'Second Key' })];

      mockApiFetch.mockResolvedValueOnce({ keys: mockKeys });

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.apiKeys).toHaveLength(2);
      expect(result.current.apiKeys[0].name).toBe('Test Key');
      expect(mockApiFetch).toHaveBeenCalledWith('/api/settings/api-keys', {
        method: 'GET',
      });
    });

    it('should handle fetch errors', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch');
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const newKey = createMockApiKey();
      const secretKey = 'apr_live_1234567890abcdef';

      mockApiFetch.mockResolvedValueOnce({ keys: [] });
      mockApiFetch.mockResolvedValueOnce({
        key: {
          ...newKey,
          key: secretKey,
        },
        warning: 'This is the only time you will see this API key.',
      });

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.createApiKey({
          name: 'New Key',
          scopes: ['articles:read'] as ApiKeyScope[],
        });
        expect(response.key.key).toBe(secretKey);
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/settings/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Key',
          scopes: ['articles:read'],
        }),
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      const mockKeys = [createMockApiKey()];

      mockApiFetch.mockResolvedValueOnce({ keys: mockKeys });
      mockApiFetch.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteApiKey('key-1');
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/settings/api-keys?keyId=key-1', {
        method: 'DELETE',
      });
    });
  });

  describe('refetch', () => {
    it('should refetch API keys when refetch is called', async () => {
      mockApiFetch.mockResolvedValueOnce({ keys: [] });

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiFetch).toHaveBeenCalledTimes(1);

      mockApiFetch.mockResolvedValueOnce({ keys: [createMockApiKey()] });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
