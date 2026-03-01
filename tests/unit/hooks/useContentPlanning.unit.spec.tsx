import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContentPlanning } from '@client/hooks/useContentPlanning';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mocks = vi.hoisted(() => ({
  mockAccessToken: 'test-token' as string | null,
  mockLoggerError: vi.fn(),
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

vi.mock('@client/utils/logger', () => ({
  ClientLogger: {
    error: mocks.mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
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

describe('useContentPlanning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockAccessToken = 'test-token';
  });

  it('sends Authorization header when planning content', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            planned: 3,
            startDate: '2026-03-01',
            endDate: '2026-03-21',
          },
        }),
      })
    );

    const { result } = renderHook(() => useContentPlanning());

    await act(async () => {
      await result.current.planContent('campaign-123');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/campaigns/campaign-123/plan-content',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(result.current.result).toEqual({
      planned: 3,
      startDate: '2026-03-01',
      endDate: '2026-03-21',
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces API error message', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Valid authentication token required' },
        }),
      })
    );

    const { result } = renderHook(() => useContentPlanning());

    await act(async () => {
      await result.current.planContent('campaign-123');
    });

    expect(result.current.error).toBe('Valid authentication token required');
    expect(mocks.mockLoggerError).toHaveBeenCalled();
  });
});
