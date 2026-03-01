/**
 * Article Publish-Now API Unit Tests
 *
 * Covers:
 * - Ownership/not-found validation
 * - No-integration guard (must not mark published)
 * - All-deliveries-failed guard (must not mark published)
 * - Successful delivery updates article status to published
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publishNowModulePath = path.resolve(
  __dirname,
  '../../../src/pages/api/articles/[articleId]/publish-now.ts'
);

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockDeliverArticle = vi.fn();

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

vi.mock('@server/services/delivery.service', () => ({
  deliveryService: {
    deliverArticle: mockDeliverArticle,
  },
}));

vi.mock('@pages/api/_utils', () => ({
  withAuth: (handler: unknown) => handler,
  jsonResponse: (data: unknown, status = 200) => ({
    status,
    json: async () => ({ success: true, data }),
  }),
  errorResponse: (code: string, message: string, status: number, details?: unknown) => ({
    status,
    json: async () => ({
      success: false,
      error: { code, message, details },
    }),
  }),
  handleApiError: (_err: unknown) => new Response(),
}));

let POST: (
  userId: string,
  context: { params: { articleId: string } }
) => Promise<{ status: number; json: () => Promise<unknown> }>;

describe('POST /api/articles/[articleId]/publish-now', () => {
  beforeAll(async () => {
    const module = await import(publishNowModulePath);
    POST = module.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    let fromCalls = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'articles') {
        throw new Error(`Unexpected table: ${table}`);
      }

      fromCalls += 1;
      if (fromCalls === 1) {
        return { select: mockSelect };
      }
      return { update: mockUpdate };
    });

    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });

    mockUpdate.mockReturnValue({
      eq: mockUpdateEq,
    });

    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('returns 404 when article is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const response = await POST('user-123', {
      params: { articleId: 'article-1' },
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockDeliverArticle).not.toHaveBeenCalled();
  });

  it('returns 400 when no integrations are enabled', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-1',
        user_id: 'user-123',
        status: 'approved',
        published_at: null,
      },
      error: null,
    });
    mockDeliverArticle.mockResolvedValueOnce({
      total: 0,
      successful: 0,
      failed: 0,
      deliveries: [],
    });

    const response = await POST('user-123', {
      params: { articleId: 'article-1' },
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NO_INTEGRATIONS');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 502 when all deliveries fail', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-1',
        user_id: 'user-123',
        status: 'approved',
        published_at: null,
      },
      error: null,
    });
    mockDeliverArticle.mockResolvedValueOnce({
      total: 2,
      successful: 0,
      failed: 2,
      deliveries: [],
    });

    const response = await POST('user-123', {
      params: { articleId: 'article-1' },
    });

    expect(response.status).toBe(502);
    const body = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DELIVERY_FAILED');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks article as published when at least one delivery succeeds', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-1',
        user_id: 'user-123',
        status: 'approved',
        published_at: null,
      },
      error: null,
    });
    mockDeliverArticle.mockResolvedValueOnce({
      total: 2,
      successful: 1,
      failed: 1,
      deliveries: [{ id: 'delivery-1' }],
    });

    const response = await POST('user-123', {
      params: { articleId: 'article-1' },
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        published_at: expect.any(String),
      })
    );

    const body = (await response.json()) as {
      success: boolean;
      data: { status: string; successful: number; total: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('published');
    expect(body.data.successful).toBe(1);
    expect(body.data.total).toBe(2);
  });

  it('preserves existing published_at when marking as published', async () => {
    const existingPublishedAt = '2026-02-28T10:00:00.000Z';
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-1',
        user_id: 'user-123',
        status: 'approved',
        published_at: existingPublishedAt,
      },
      error: null,
    });
    mockDeliverArticle.mockResolvedValueOnce({
      total: 1,
      successful: 1,
      failed: 0,
      deliveries: [{ id: 'delivery-1' }],
    });

    const response = await POST('user-123', {
      params: { articleId: 'article-1' },
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'published',
      published_at: existingPublishedAt,
    });
  });
});
