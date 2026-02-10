import { apiFetch } from '@client/utils/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

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
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Test error message' }),
      });

      await expect(apiFetch('/api/test')).rejects.toThrow('Test error message');
    });

    it('should handle nested error objects correctly', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Nested error message' } }),
      });

      await expect(apiFetch('/api/test')).rejects.toThrow('Nested error message');
    });

    it('should use default error message when response parsing fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('JSON parse error');
        },
      });

      await expect(apiFetch('/api/test')).rejects.toThrow('Unknown error');
    });
  });

  describe('response parsing', () => {
    it('should parse JSON response correctly', async () => {
      const mockData = { success: true, count: 42 };
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

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
