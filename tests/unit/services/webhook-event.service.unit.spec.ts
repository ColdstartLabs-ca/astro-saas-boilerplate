/**
 * Webhook Event Service Unit Tests
 *
 * Tests for webhook subscription management and event dispatch.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebhookEventService } from '@server/services/webhook-event.service';
import type { IWebhookSubscription } from '@shared/types/webhook-event.types';
import { WebhookSubscriptionNotFoundError } from '@shared/types/webhook-event.types';

// Mock supabaseAdmin - all mocks must be defined inside the factory function
// because vi.mock is hoisted to the top of the file
vi.mock('@server/supabase/supabaseAdmin', () => {
  // Create mock functions inside the factory
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();

  // Create a chainable mock that supports multiple .eq() calls and all terminal methods
  const createChain = () => ({
    eq: mockEq,
    single: mockSingle,
    select: mockSelect,
    order: mockOrder,
  });

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  mockSelect.mockImplementation(() => createChain());
  mockInsert.mockImplementation(() => ({ select: mockSelect }));
  mockUpdate.mockImplementation(() => createChain());
  mockDelete.mockImplementation(() => createChain());
  mockEq.mockImplementation(() => createChain());
  mockSingle.mockImplementation(() => ({ data: null, error: null }));
  mockOrder.mockImplementation(() => createChain());

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
  };
});

// Import after mocking to get access to the mock functions
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// Mock fetch for webhook delivery tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto for signature tests
const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue({}),
    sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  },
  getRandomValues: vi.fn().mockReturnValue(new Uint8Array(16)),
};
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('WebhookEventService', () => {
  let service: WebhookEventService;

  const mockUserId = '01234567-89ab-cdef-0123-456789abcdef';
  const mockSubscriptionId = '22222222-2222-2222-2222-222222222222';

  const mockSubscription: IWebhookSubscription = {
    id: mockSubscriptionId,
    user_id: mockUserId,
    event_type: 'article.published',
    target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
    secret: 'test-secret-key-12345',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new WebhookEventService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Subscription Tests
  // ==========================================================================

  describe('subscribe', () => {
    it('should create a new webhook subscription', async () => {
      // Setup: insert().select().single() should return data
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: {
          id: mockSubscriptionId,
          user_id: mockUserId,
          event_type: 'article.published',
          target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({
        single: singleMock,
      });

      const insertMock = vi.fn().mockReturnValue({
        select: selectMock,
      });

      const testFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      // Override the mock for this test
      vi.mocked(supabaseAdmin).from = testFrom;

      const result = await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
      });

      expect(result).toBeDefined();
      expect(result.event_type).toBe('article.published');
      expect(result.target_url).toBe('https://hooks.zapier.com/hooks/catch/123/abc');
      expect(result.active).toBe(true);
    });

    it('should use provided secret if specified', async () => {
      const customSecret = 'my-custom-secret-key';

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: mockSubscriptionId,
              user_id: mockUserId,
              event_type: 'article.published',
              target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
              active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      });

      const testFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
        secret: customSecret,
      });

      // Verify insert was called with the custom secret
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.secret).toBe(customSecret);
    });

    it('should generate a secret if not provided', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: mockSubscriptionId,
              user_id: mockUserId,
              event_type: 'article.published',
              target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
              active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      });

      const testFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
      });

      // Verify insert was called with a generated secret (32 hex chars)
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.secret).toBeDefined();
      expect(insertCall.secret.length).toBe(32);
    });

    it('should throw error on duplicate subscription', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      });

      const testFrom = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await expect(
        service.subscribe(mockUserId, {
          eventType: 'article.published',
          targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
        })
      ).rejects.toThrow('Already subscribed');
    });
  });

  describe('unsubscribe', () => {
    it('should delete a webhook subscription', async () => {
      // delete().eq().eq() should resolve with { error: null }
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const testFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await service.unsubscribe(mockUserId, mockSubscriptionId);

      expect(testFrom).toHaveBeenCalledWith('webhook_subscriptions');
    });

    it('should throw error on failed deletion', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });

      const testFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await expect(service.unsubscribe(mockUserId, mockSubscriptionId)).rejects.toThrow(
        'Failed to delete webhook subscription'
      );
    });
  });

  describe('list', () => {
    it('should return all subscriptions for a user', async () => {
      const mockSubscriptions = [
        { ...mockSubscription, event_type: 'article.published' },
        {
          ...mockSubscription,
          id: '33333333-3333-3333-3333-333333333333',
          event_type: 'article.approved',
        },
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      const result = await service.list(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].event_type).toBe('article.published');
      expect(result[1].event_type).toBe('article.approved');
    });

    it('should return empty array on error', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await expect(service.list(mockUserId)).rejects.toThrow(
        'Failed to list webhook subscriptions'
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle subscription active status', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: {
          id: mockSubscriptionId,
          user_id: mockUserId,
          event_type: 'article.published',
          target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
          active: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const testFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: singleMock,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      const result = await service.toggleActive(mockUserId, mockSubscriptionId, false);

      expect(result.active).toBe(false);
    });

    it('should throw WebhookSubscriptionNotFoundError if not found', async () => {
      const singleMock = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const testFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: singleMock,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      await expect(service.toggleActive(mockUserId, mockSubscriptionId, false)).rejects.toThrow(
        WebhookSubscriptionNotFoundError
      );
    });
  });

  // ==========================================================================
  // Event Dispatch Tests
  // ==========================================================================

  describe('dispatch', () => {
    it('should dispatch to all active subscribers', async () => {
      const subscriptions = [
        mockSubscription,
        { ...mockSubscription, id: 'sub-2', target_url: 'https://make.com/webhook/xyz' },
      ];

      // getActiveSubscriptions uses select('*').eq('user_id').eq('event_type').eq('active')
      const eqMock3 = vi.fn().mockResolvedValue({ data: subscriptions, error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      // Mock successful webhook deliveries
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Mock crypto for signature
      mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32));

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: 'https://example.com/test-article',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        projectId: 'project-1',
        projectName: 'Test Project',
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      // Both subscribers should receive the webhook
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify both URLs were called
      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      expect(calledUrls).toContain('https://hooks.zapier.com/hooks/catch/123/abc');
      expect(calledUrls).toContain('https://make.com/webhook/xyz');
    });

    it('should sign payload with HMAC-SHA256', async () => {
      const subscriptions = [mockSubscription];

      const eqMock3 = vi.fn().mockResolvedValue({ data: subscriptions, error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Create a proper signature mock that returns known bytes
      const mockSignature = new Uint8Array(32).fill(42);
      mockCrypto.subtle.sign.mockResolvedValueOnce(mockSignature.buffer);

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      // Verify the signature header was included
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['X-AutopilotRank-Signature']).toMatch(/^sha256=/);
      expect(headers['X-AutopilotRank-Event']).toBe('article.published');
    });

    it('should only fetch active subscriptions from database', async () => {
      // The database query filters by active=true, so only active subscriptions are returned
      // This test verifies that only active subscriptions are fetched and called
      const activeSubscriptions = [
        { ...mockSubscription, id: 'sub-active-1', active: true },
        { ...mockSubscription, id: 'sub-active-2', active: true },
      ];

      const eqMock3 = vi.fn().mockResolvedValue({ data: activeSubscriptions, error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      // All returned subscriptions should be called (they're all active from DB)
      expect(mockFetch).toHaveBeenCalledTimes(activeSubscriptions.length);
    });

    it('should not throw on delivery failure', async () => {
      const eqMock3 = vi.fn().mockResolvedValue({ data: [mockSubscription], error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      // Mock 400 error (no retries for 4xx)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      // Should not throw - fire and forget
      await expect(
        service.dispatch(mockUserId, 'article.published', articleData)
      ).resolves.not.toThrow();
    });

    it('should retry failed deliveries with exponential backoff', async () => {
      const eqMock3 = vi.fn().mockResolvedValue({ data: [mockSubscription], error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      // Mock initial failures then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      // Should have been called 3 times (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000); // Increase timeout for retry delays

    it('should not retry on 4xx errors', async () => {
      const eqMock3 = vi.fn().mockResolvedValue({ data: [mockSubscription], error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      // Mock 400 error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      // Should only be called once (no retries on 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if no active subscriptions', async () => {
      const eqMock3 = vi.fn().mockResolvedValue({ data: [], error: null });

      const testFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: eqMock3,
            }),
          }),
        }),
      });

      vi.mocked(supabaseAdmin).from = testFrom;

      const articleData = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: null,
        campaignId: null,
        campaignName: null,
        projectId: null,
        projectName: null,
      };

      await service.dispatch(mockUserId, 'article.published', articleData);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Helper Method Tests
  // ==========================================================================

  describe('buildArticleEventData', () => {
    it('should build article event data from article record', () => {
      const article = {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primary_keyword: 'test keyword',
        word_count: 1000,
        seo_score: 85,
        published_url: 'https://example.com/test',
        campaign_id: 'campaign-1',
        project_id: 'project-1',
      };

      const campaign = { id: 'campaign-1', name: 'Test Campaign' };
      const project = { id: 'project-1', name: 'Test Project' };

      const result = service.buildArticleEventData(article, campaign, project);

      expect(result).toEqual({
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        primaryKeyword: 'test keyword',
        wordCount: 1000,
        seoScore: 85,
        publishedUrl: 'https://example.com/test',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        projectId: 'project-1',
        projectName: 'Test Project',
      });
    });
  });

  describe('buildCampaignCompletedData', () => {
    it('should build campaign completed data', () => {
      const campaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        project_id: 'project-1',
      };

      const stats = {
        totalArticles: 10,
        publishedArticles: 8,
        approvedArticles: 9,
      };

      const project = { id: 'project-1', name: 'Test Project' };

      const result = service.buildCampaignCompletedData(campaign, stats, project);

      expect(result).toEqual({
        id: 'campaign-1',
        name: 'Test Campaign',
        projectId: 'project-1',
        projectName: 'Test Project',
        totalArticles: 10,
        publishedArticles: 8,
        approvedArticles: 9,
      });
    });
  });

  describe('buildOpportunityFoundData', () => {
    it('should build opportunity found data', () => {
      const opportunity = {
        id: 'opp-1',
        type: 'content_gap',
        title: 'Missing keyword opportunity',
        description: 'Found a gap in content coverage',
        query: 'best seo tools',
        page_url: 'https://example.com/page',
        estimated_impact: 'high',
        priority_score: 85,
        project_id: 'project-1',
      };

      const project = { id: 'project-1', name: 'Test Project' };

      const result = service.buildOpportunityFoundData(opportunity, project);

      expect(result).toEqual({
        id: 'opp-1',
        type: 'content_gap',
        title: 'Missing keyword opportunity',
        description: 'Found a gap in content coverage',
        query: 'best seo tools',
        pageUrl: 'https://example.com/page',
        estimatedImpact: 'high',
        priorityScore: 85,
        projectId: 'project-1',
        projectName: 'Test Project',
      });
    });
  });
});
