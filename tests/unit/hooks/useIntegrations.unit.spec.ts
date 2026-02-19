import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useIntegrations } from '@client/hooks/useIntegrations';
import type {
  IIntegrationWithCampaigns,
  ICreateIntegrationInput,
} from '@shared/types/integration.types';

// Helper to create a mock Response object with proper headers support
const createMockResponse = (init: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  headers?: Record<string, string>;
}) => {
  const headersGet = vi.fn((key: string) => {
    // Simulate Response.headers.get() behavior
    if (init.headers && key in init.headers) {
      return (init.headers as Record<string, string>)[key];
    }
    return null;
  });

  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: init.json ?? (() => Promise.resolve({})),
    headers: {
      get: headersGet,
      has: vi.fn(() => false),
      forEach: vi.fn(),
      entries: vi.fn(() => []),
      keys: vi.fn(() => []),
      values: vi.fn(() => []),
    } as unknown as Response,
  };
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase client (required by apiFetch to get auth token)
vi.mock('@shared/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } } }),
    },
  })),
}));

// Mock logger
vi.mock('@client/utils/logger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock toast store
vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock translations
vi.mock('@src/i18n/utils', () => ({
  getTranslations: () => (_key: string) => (key: string) => key,
}));

// Test data
const mockIntegrations: IIntegrationWithCampaigns[] = [
  {
    id: 'integration-1',
    user_id: 'user-1',
    type: 'wordpress',
    name: 'My WordPress Blog',
    config: {
      site_url: 'https://blog.example.com',
      username: 'admin',
    },
    status: 'active',
    last_tested_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    campaign_count: 2,
  },
  {
    id: 'integration-2',
    user_id: 'user-1',
    type: 'webhook',
    name: 'Custom Webhook',
    config: {
      url: 'https://api.example.com/webhook',
    },
    status: 'active',
    last_tested_at: '2024-01-02T00:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    campaign_count: 0,
  },
];

const mockWordPressInput: ICreateIntegrationInput = {
  type: 'wordpress',
  name: 'New WordPress',
  siteUrl: 'https://newblog.example.com',
  username: 'admin',
  appPassword: 'secret123',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useIntegrations Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query', () => {
    it('should fetch integrations successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({
            data: { integrations: mockIntegrations },
          }),
        })
      );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.integrations).toEqual(mockIntegrations);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.integrations).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should return empty array when no integrations exist', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({ data: { integrations: [] } }),
        })
      );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.integrations).toEqual([]);
    });
  });

  describe('Create Mutation', () => {
    it('should create integration successfully', async () => {
      const newIntegration: IIntegrationWithCampaigns = {
        id: 'integration-3',
        user_id: 'user-1',
        type: 'wordpress',
        name: 'New WordPress',
        config: {
          site_url: 'https://newblog.example.com',
          username: 'admin',
        },
        status: 'active',
        last_tested_at: null,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        campaign_count: 0,
      };

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: mockIntegrations } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integration: newIntegration } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: [...mockIntegrations, newIntegration] } }),
          })
        );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(result.current.createIntegration(mockWordPressInput)).resolves.toEqual(
        newIntegration
      );
    });
  });

  describe('Delete Mutation', () => {
    it('should delete integration successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: mockIntegrations } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { success: true } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: [mockIntegrations[1]] } }),
          })
        );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(result.current.deleteIntegration('integration-1')).resolves.toBeUndefined();
    });
  });

  describe('Test Mutation', () => {
    it('should test integration successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: mockIntegrations } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({
              data: {
                result: { success: true, timestamp: '2024-01-01T00:00:00Z' },
              },
            }),
          })
        );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const testResult = await result.current.testIntegration('integration-1');

      expect(testResult).toEqual({
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle test failures', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: mockIntegrations } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: false,
            json: async () => ({
              data: {
                result: {
                  success: false,
                  timestamp: '2024-01-01T00:00:00Z',
                  error: 'Connection failed',
                },
              },
            }),
          })
        );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(result.current.testIntegration('integration-1')).rejects.toThrow();
    });
  });

  describe('Refetch', () => {
    it('should refetch integrations', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: mockIntegrations } }),
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            ok: true,
            json: async () => ({ data: { integrations: [mockIntegrations[0]] } }),
          })
        );

      const { result } = renderHook(() => useIntegrations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });
});
