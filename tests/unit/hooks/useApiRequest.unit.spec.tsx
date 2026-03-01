import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiRequest } from '@client/hooks/useApiRequest';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mocks = vi.hoisted(() => ({
  mockAccessToken: 'test-token' as string | null,
}));

vi.mock('@shared/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: mocks.mockAccessToken ? { access_token: mocks.mockAccessToken } : null,
        },
      })),
    },
  }),
}));

function createMockResponse(init: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  headers?: Record<string, string>;
}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: init.json ?? (async () => ({})),
    headers: {
      get: (key: string) => init.headers?.[key] ?? null,
      has: () => false,
      forEach: () => {},
      entries: () => [][Symbol.iterator](),
      keys: () => [][Symbol.iterator](),
      values: () => [][Symbol.iterator](),
    } as Headers,
  } as Response;
}

describe('useApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockAccessToken = 'test-token';
  });

  it('adds bearer auth by default and unwraps envelope data', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { planned: 4 } }),
      })
    );

    const { result } = renderHook(() => useApiRequest());
    const data = await result.current.request<{ planned: number }>('/api/campaigns/test/plan-content', {
      method: 'POST',
    });

    expect(data).toEqual({ planned: 4 });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/campaigns/test/plan-content',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('supports unauthenticated requests', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: { ok: true } }),
      })
    );

    const { result } = renderHook(() => useApiRequest());
    await result.current.request<{ ok: boolean }>('/api/health', {
      method: 'GET',
      authenticated: false,
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = (options.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('normalizes API error messages', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Valid authentication token required' } }),
      })
    );

    const { result } = renderHook(() => useApiRequest());

    await expect(
      result.current.request('/api/campaigns/test/plan-content', { method: 'POST' })
    ).rejects.toThrow('Valid authentication token required');
  });

  it('serializes object body as JSON', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 204,
      })
    );

    const { result } = renderHook(() => useApiRequest());
    await result.current.request('/api/articles/123/schedule', {
      method: 'PATCH',
      body: { scheduled_publish_at: '2026-03-12T09:00:00.000Z' },
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = (options.headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ scheduled_publish_at: '2026-03-12T09:00:00.000Z' }));
  });
});
