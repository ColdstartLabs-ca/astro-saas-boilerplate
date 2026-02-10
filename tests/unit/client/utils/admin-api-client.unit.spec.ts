/**
 * Admin API Client Unit Tests
 *
 * Tests for client-side admin API utilities including:
 * - Authentication token management
 * - Authenticated API requests
 * - Error handling for admin endpoints
 * - Request/response validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminFetch } from '@client/utils/admin-api-client';

// Mock Supabase client
const mockGetSession = vi.fn();
vi.mock('@shared/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

describe('admin-api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminFetch', () => {
    it('should make successful GET request and return parsed JSON', async () => {
      const mockData = { id: 1, name: 'Admin User' };
      const mockToken = 'test-admin-token';

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await adminFetch<{ id: number; name: string }>('/api/admin/users');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
    });

    it('should make successful POST request with body', async () => {
      const mockData = { success: true };
      const requestBody = { action: 'update' };
      const mockToken = 'test-admin-token';

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await adminFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should include Authorization header with Bearer token', async () => {
      const mockToken = 'admin-jwt-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      await adminFetch('/api/admin/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should merge custom headers with default headers', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const customHeaders = { 'X-Admin-Header': 'admin-value' };
      await adminFetch('/api/admin/test', {
        headers: customHeaders,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Admin-Header': 'admin-value',
          }),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(adminFetch('/api/admin/users')).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error with message from response', async () => {
      const errorMessage = 'Unauthorized access';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: errorMessage }),
      } as Response);

      await expect(adminFetch('/api/admin/users')).rejects.toThrow(errorMessage);
    });

    it('should handle HTTP error responses with status text', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      await expect(adminFetch('/api/admin/users')).rejects.toThrow('Server error');
    });

    it('should throw generic error when response JSON is invalid', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      // When JSON parsing fails, it falls back to "An error occurred"
      await expect(adminFetch('/api/admin/users')).rejects.toThrow('An error occurred');
    });

    it('should handle DELETE requests', async () => {
      const mockToken = 'admin-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await adminFetch('/api/admin/users/123', {
        method: 'DELETE',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle PUT requests', async () => {
      const mockToken = 'admin-token';
      const updateData = { name: 'Updated Name' };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await adminFetch('/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should handle PATCH requests', async () => {
      const mockToken = 'admin-token';
      const patchData = { status: 'active' };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await adminFetch('/api/admin/users/123/status', {
        method: 'PATCH',
        body: JSON.stringify(patchData),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/123/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
    });

    it('should handle 403 Forbidden responses', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Insufficient permissions' }),
      } as Response);

      await expect(adminFetch('/api/admin/settings')).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 404 Not Found responses', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      } as Response);

      await expect(adminFetch('/api/admin/unknown')).rejects.toThrow('Resource not found');
    });

    it('should handle successful responses with no data', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await adminFetch('/api/admin/action');

      expect(result).toEqual({});
    });

    it('should handle responses with complex data structures', async () => {
      const complexData = {
        users: [
          { id: 1, name: 'User 1', roles: ['admin', 'user'] },
          { id: 2, name: 'User 2', roles: ['user'] },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => complexData,
      } as Response);

      const result = await adminFetch('/api/admin/users');

      expect(result).toEqual(complexData);
      expect(result.users).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should handle network errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(adminFetch('/api/admin/users')).rejects.toThrow('Network error');
    });

    it('should ensure Content-Type is always application/json', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      await adminFetch('/api/admin/test');

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[1]?.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should handle empty session object (no access_token)', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: {} },
      });

      await expect(adminFetch('/api/admin/users')).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should support custom Content-Type header override', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      await adminFetch('/api/admin/upload', {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // The custom headers should be merged with the default ones
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/upload',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        })
      );
    });

    it('should handle array responses', async () => {
      const mockArray = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockArray,
      } as Response);

      const result = await adminFetch('/api/admin/items');

      expect(result).toEqual(mockArray);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null responses gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => null,
      } as Response);

      const result = await adminFetch('/api/admin/check');

      expect(result).toBeNull();
    });
  });
});
