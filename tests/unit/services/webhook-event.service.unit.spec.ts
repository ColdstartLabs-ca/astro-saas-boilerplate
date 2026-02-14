/**
 * Webhook Event Service Unit Tests
 *
 * Tests for webhook subscription management and event dispatch.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebhookEventService } from '@server/services/webhook-event.service';
import type {
  IWebhookSubscription,
  WebhookEventType,
} from '@shared/types/webhook-event.types';
import {
  WebhookSubscriptionNotFoundError,
} from '@shared/types/webhook-event.types';

// Mock supabaseAdmin - must use factory function
vi.mock('@server/supabase/supabaseAdmin', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();

  const eqChain = () => ({
    single: mockSingle,
    select: mockSelect,
    order: mockOrder,
    eq: mockEq,
  });

  const selectChain = () => ({ eq: mockEq, single: mockSingle, order: mockOrder });
  const insertChain = () => ({ select: mockSelect });
  const updateChain = () => ({ eq: mockEq });
  const deleteChain = () => ({ eq: mockEq });

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  mockSelect.mockImplementation(() => selectChain());
  mockInsert.mockImplementation(() => insertChain());
  mockUpdate.mockImplementation(() => updateChain());
  mockDelete.mockImplementation(() => deleteChain());
  mockEq.mockImplementation(() => eqChain());
  mockSingle.mockImplementation(() => ({ data: null, error: null }));
  mockOrder.mockImplementation(() => selectChain());

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
  };
});

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
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;

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

    // Get mock references
    const supabaseModule = await import('@server/supabase/supabaseAdmin');
    mockFrom = supabaseModule.supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockSelect = vi.fn();
    mockInsert = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();
    mockEq = vi.fn();
    mockSingle = vi.fn();
    mockOrder = vi.fn();

    // Setup chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle, select: mockSelect, order: mockOrder });
    mockOrder.mockReturnValue({ eq: mockEq });

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
      mockSingle.mockResolvedValueOnce({
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

      const result = await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
      });

      expect(result).toBeDefined();
      expect(result.event_type).toBe('article.published');
      expect(result.target_url).toBe('https://hooks.zapier.com/hooks/catch/123/abc');
      expect(result.active).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should use provided secret if specified', async () => {
      const customSecret = 'my-custom-secret-key';
      mockSingle.mockResolvedValueOnce({
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

      await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
        secret: customSecret,
      });

      // Verify insert was called with the custom secret
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.secret).toBe(customSecret);
    });

    it('should generate a secret if not provided', async () => {
      mockSingle.mockResolvedValueOnce({
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

      await service.subscribe(mockUserId, {
        eventType: 'article.published',
        targetUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
      });

      // Verify insert was called with a generated secret (32 hex chars)
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.secret).toBeDefined();
      expect(insertCall.secret.length).toBe(32);
    });

    it('should throw error on duplicate subscription', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      });

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
      mockEq.mockReturnValue({ error: null });

      await service.unsubscribe(mockUserId, mockSubscriptionId);

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw error on failed deletion', async () => {
      mockEq.mockReturnValue({ error: { message: 'Database error' } });

      await expect(
        service.unsubscribe(mockUserId, mockSubscriptionId)
      ).rejects.toThrow('Failed to delete webhook subscription');
    });
  });

  describe('list', () => {
    it('should return all subscriptions for a user', async () => {
      const mockSubscriptions = [
        { ...mockSubscription, event_type: 'article.published' },
        { ...mockSubscription, id: '33333333-3333-3333-3333-333333333333', event_type: 'article.approved' },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockSubscriptions, error: null });

      const result = await service.list(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].event_type).toBe('article.published');
      expect(result[1].event_type).toBe('article.approved');
    });

    it('should return empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      await expect(service.list(mockUserId)).rejects.toThrow('Failed to list webhook subscriptions');
    });
  });

  describe('toggleActive', () => {
    it('should toggle subscription active status', async () => {
      mockSingle.mockResolvedValueOnce({
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

      const result = await service.toggleActive(mockUserId, mockSubscriptionId, false);

      expect(result.active).toBe(false);
    });

    it('should throw WebhookSubscriptionNotFoundError if not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        service.toggleActive(mockUserId, mockSubscriptionId, false)
      ).rejects.toThrow(WebhookSubscriptionNotFoundError);
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

      // Mock getActiveSubscriptions - return subscriptions with secrets
      mockOrder.mockResolvedValueOnce({ data: subscriptions, error: null });

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
      mockOrder.mockResolvedValueOnce({ data: subscriptions, error: null });

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

    it('should skip inactive subscriptions', async () => {
      // Only one active subscription
      const subscriptions = [
        { ...mockSubscription, active: false },  // Inactive - should be skipped
        { ...mockSubscription, id: 'sub-active', active: true }, // Active
      ];

      mockOrder.mockResolvedValueOnce({ data: subscriptions, error: null });

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

      // Only the active subscription should be called (the first active one in filtered list)
      // The service filters to active=true subscriptions
      const activeSubs = subscriptions.filter(s => s.active);
      expect(mockFetch).toHaveBeenCalledTimes(activeSubs.length);
    });

    it('should not throw on delivery failure', async () => {
      mockOrder.mockResolvedValueOnce({ data: [mockSubscription], error: null });

      // Mock failed delivery
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
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
      mockOrder.mockResolvedValueOnce({ data: [mockSubscription], error: null });

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

      // Should have been called 3 times (initial + 2 retries = 3 attempts before success on retry 2)
      // Actually: attempt 0 (fail), attempt 1 (fail), attempt 2 (success) = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000); // Increase timeout for retry delays

    it('should not retry on 4xx errors', async () => {
      mockOrder.mockResolvedValueOnce({ data: [mockSubscription], error: null });

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
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

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
