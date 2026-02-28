/**
 * Unit tests for ScheduledPublishingService
 *
 * Focus: optimistic claim behavior and delivery outcomes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduledPublishingService } from '@server/services/scheduled-publishing.service';

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@server/services/delivery.service', () => ({
  deliveryService: {
    deliverArticle: vi.fn(),
  },
}));

vi.mock('@shared/config/scheduling.config', () => ({
  MAX_PUBLISH_PER_RUN: 10,
  MAX_PUBLISH_RETRIES: 3,
}));

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { deliveryService } from '@server/services/delivery.service';

const ARTICLE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: ARTICLE_ID,
    status: 'approved',
    attempt_count: 0,
    ...overrides,
  };
}

function mockDueArticlesQuery(articles: Record<string, unknown>[] | null, error: { message: string } | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: articles, error }),
  };
}

function mockClaimQuery(claimed: boolean, error: { message: string } | null = null) {
  const chain: {
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  } = {
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    select: vi.fn(),
  };

  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.select.mockResolvedValue({ data: claimed ? [{ id: ARTICLE_ID }] : [], error });

  return chain;
}

function mockUpdateByIdQuery() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
}

describe('ScheduledPublishingService', () => {
  let service: ScheduledPublishingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScheduledPublishingService();
  });

  it('returns zero counts when no due articles exist', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockDueArticlesQuery([]) as never);

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 0, published: 0, failed: 0, skipped: 0 });
  });

  it('throws when due articles query fails', async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValue(
      mockDueArticlesQuery(null, { message: 'DB error' }) as never
    );

    await expect(service.processScheduledPublications()).rejects.toThrow(
      'Failed to fetch scheduled articles: DB error'
    );
  });

  it('claims then marks as published when delivery succeeds', async () => {
    const article = makeArticle({ attempt_count: 0 });
    const listQuery = mockDueArticlesQuery([article]);
    const claimQuery = mockClaimQuery(true);
    const publishQuery = mockUpdateByIdQuery();

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(listQuery as never)
      .mockReturnValueOnce(claimQuery as never)
      .mockReturnValueOnce(publishQuery as never);

    vi.mocked(deliveryService.deliverArticle).mockResolvedValue({
      total: 2,
      successful: 2,
      failed: 0,
      deliveries: [],
    });

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 1, failed: 0, skipped: 0 });
    expect(claimQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_count: 1 })
    );
    expect(publishQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' })
    );
  });

  it('skips when claim is not acquired (already claimed by another worker)', async () => {
    const article = makeArticle({ attempt_count: 0 });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(mockDueArticlesQuery([article]) as never)
      .mockReturnValueOnce(mockClaimQuery(false) as never);

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 0, failed: 0, skipped: 1 });
    expect(deliveryService.deliverArticle).not.toHaveBeenCalled();
  });

  it('records failure when all deliveries fail (attempt already counted during claim)', async () => {
    const article = makeArticle({ attempt_count: 1 });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(mockDueArticlesQuery([article]) as never)
      .mockReturnValueOnce(mockClaimQuery(true) as never);

    vi.mocked(deliveryService.deliverArticle).mockResolvedValue({
      total: 2,
      successful: 0,
      failed: 2,
      deliveries: [],
    });

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 0, failed: 1, skipped: 0 });
  });

  it('records failure when delivery throws', async () => {
    const article = makeArticle({ attempt_count: 1 });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(mockDueArticlesQuery([article]) as never)
      .mockReturnValueOnce(mockClaimQuery(true) as never);

    vi.mocked(deliveryService.deliverArticle).mockRejectedValue(new Error('Network error'));

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 0, failed: 1, skipped: 0 });
  });

  it('skips when there are no integrations (total=0)', async () => {
    const article = makeArticle({ attempt_count: 0 });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(mockDueArticlesQuery([article]) as never)
      .mockReturnValueOnce(mockClaimQuery(true) as never);

    vi.mocked(deliveryService.deliverArticle).mockResolvedValue({
      total: 0,
      successful: 0,
      failed: 0,
      deliveries: [],
    });

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 0, failed: 0, skipped: 1 });
  });

  it('skips articles that already exceeded max retries', async () => {
    const article = makeArticle({ attempt_count: 3 });
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockDueArticlesQuery([article]) as never);

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 0, failed: 0, skipped: 1 });
    expect(deliveryService.deliverArticle).not.toHaveBeenCalled();
  });

  it('marks as published when partial delivery succeeds', async () => {
    const article = makeArticle({ attempt_count: 0 });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(mockDueArticlesQuery([article]) as never)
      .mockReturnValueOnce(mockClaimQuery(true) as never)
      .mockReturnValueOnce(mockUpdateByIdQuery() as never);

    vi.mocked(deliveryService.deliverArticle).mockResolvedValue({
      total: 3,
      successful: 2,
      failed: 1,
      deliveries: [],
    });

    const result = await service.processScheduledPublications();

    expect(result).toEqual({ processed: 1, published: 1, failed: 0, skipped: 0 });
  });
});
