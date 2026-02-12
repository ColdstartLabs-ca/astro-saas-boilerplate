import { apiFetch } from '@client/utils/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

// Mock the Supabase client module before importing api-client
const mockGetSession = vi.fn();
vi.mock('@shared/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth headers', () => {
    it('should add auth headers when session exists', async () => {
      const mockToken = 'test-access-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({ data: 'test' }),
      }));

      await apiFetch<{ data: string }>('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should work without auth when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({ success: true }),
      }));

      await apiFetch<{ success: boolean }>('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        json: async () => ({ error: 'Test error message' }),
      }));

      await expect(apiFetch('/api/test')).rejects.toThrow('Test error message');
    });

    it('should handle nested error objects correctly', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        json: async () => ({ error: { message: 'Nested error message' } }),
      }));

      await expect(apiFetch('/api/test')).rejects.toThrow('Nested error message');
    });

    it('should use default error message when response parsing fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('JSON parse error');
        },
      }));

      await expect(apiFetch('/api/test')).rejects.toThrow('Unknown error');
    });
  });

  describe('response parsing', () => {
    it('should parse JSON response correctly', async () => {
      const mockData = { success: true, count: 42 };
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => mockData,
      }));

      const result = await apiFetch<{ success: boolean; count: number }>('/api/test');
      expect(result).toEqual(mockData);
    });
  });

  describe('request options', () => {
    it('should merge custom headers with auth headers', async () => {
      const mockToken = 'test-access-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({}),
      }));

      await apiFetch('/api/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should pass through method and body options', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({}),
      }));

      await apiFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: '{"test":"data"}',
        })
      );
    });
  });
});
