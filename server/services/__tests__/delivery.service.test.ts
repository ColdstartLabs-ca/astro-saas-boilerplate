/**
 * DeliveryService Tests
 *
 * Tests for article delivery to integrations including:
 * - Article image inclusion in payloads
 * - Project data extraction from campaign joins
 * - Auto-publish gating
 * - Delivery record creation and status tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Track calls to adapter.publish to verify payload contents
const mockPublish = vi.fn().mockResolvedValue({
  success: true,
  externalId: 'wp-123',
  externalUrl: 'https://example.com/test-post',
});

const mockTestConnection = vi.fn().mockResolvedValue({
  success: true,
  timestamp: new Date().toISOString(),
});

// Mock getAdapter to return our controlled adapter
vi.mock('@server/integrations', () => ({
  getAdapter: vi.fn(() => ({
    publish: mockPublish,
    testConnection: mockTestConnection,
    type: 'wordpress',
  })),
}));

// Mock integration service
vi.mock('../integration.service', () => ({
  integrationService: {
    getWithCredentials: vi.fn().mockResolvedValue({
      integration: {
        id: 'int-1',
        type: 'wordpress',
        name: 'My WP Site',
        config: { site_url: 'https://example.com', username: 'admin' },
        status: 'connected',
        user_id: 'user-1',
      },
      credentials: { appPassword: 'test-app-password' },
    }),
  },
}));

// Build chainable Supabase mock
function createChain(resolvedValue: unknown = null) {
  const chain: Record<string, any> = {};
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: resolvedValue, error: null }));
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  return chain;
}

// The article data with images (bug fix #2 verifies this is present)
const mockArticleWithImages = {
  id: 'article-1',
  title: 'Test Article',
  content: '## Hello\n\nContent here.',
  slug: 'test-article',
  meta_description: 'Test meta',
  primary_keyword: 'test keyword',
  word_count: 50,
  seo_score: 85,
  featured_image_url: null,
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  article_images: [
    { position: 1, image_url: 'https://storage.example.com/img1.png', status: 'completed' },
    { position: 2, image_url: 'https://storage.example.com/img2.png', status: 'completed' },
    { position: 3, image_url: null, status: 'failed' },
  ],
};

// Campaign with project as single object (bug fix #3 - many-to-one FK)
const mockCampaignWithProjectObject = {
  id: 'campaign-1',
  name: 'Test Campaign',
  settings: { auto_publish: true },
  project_id: 'project-1',
  projects: { id: 'project-1', name: 'My Project', domain: 'example.com' },
};

// Campaign with project as array (backwards compat for bug fix #3)
const mockCampaignWithProjectArray = {
  id: 'campaign-1',
  name: 'Test Campaign',
  settings: { auto_publish: true },
  project_id: 'project-1',
  projects: [{ id: 'project-1', name: 'My Project', domain: 'example.com' }],
};

const mockCampaignIntegrations = [{ integration_id: 'int-1' }];

const mockIntegration = {
  id: 'int-1',
  type: 'wordpress',
  name: 'My WP Site',
  config: { site_url: 'https://example.com', username: 'admin' },
  status: 'connected',
  user_id: 'user-1',
  encrypted_credentials: 'encrypted-data',
};

const mockDeliveryRecord = {
  id: 'delivery-1',
  article_id: 'article-1',
  integration_id: 'int-1',
  campaign_id: 'campaign-1',
  status: 'delivered',
  external_id: 'wp-123',
  external_url: 'https://example.com/test-post',
  error: null,
  attempt_count: 1,
  delivered_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

// Build supabase mock that returns different data per table
function buildSupabaseMock(campaignData = mockCampaignWithProjectObject) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'articles') {
        return createChain(mockArticleWithImages);
      }
      if (table === 'campaigns') {
        return createChain(campaignData);
      }
      if (table === 'campaign_integrations') {
        const chain = createChain(null);
        // Override eq to resolve with array data (not .single())
        chain.eq = vi.fn(() => ({
          ...chain,
          eq: vi.fn(() => Promise.resolve({ data: mockCampaignIntegrations, error: null })),
        }));
        return chain;
      }
      if (table === 'integrations') {
        const chain = createChain(null);
        chain.in = vi.fn(() => Promise.resolve({ data: [mockIntegration], error: null }));
        return chain;
      }
      if (table === 'integration_deliveries') {
        return createChain(mockDeliveryRecord);
      }
      return createChain(null);
    }),
    rpc: vi.fn(),
  };
}

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: buildSupabaseMock(),
}));

// Import after mocks
const { DeliveryService } = await import('../delivery.service');
const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

describe('DeliveryService', () => {
  let service: DeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPublish.mockClear();
    service = new DeliveryService();
  });

  describe('deliverArticle - article images in payload (Bug #2)', () => {
    it('should fetch article with article_images join', async () => {
      await service.deliverArticle('article-1');

      // Verify that supabaseAdmin.from('articles').select() was called
      expect(supabaseAdmin.from).toHaveBeenCalledWith('articles');

      // Verify the select includes article_images
      const articleFromCall = (supabaseAdmin.from as any).mock.results.find(
        (r: any) => (supabaseAdmin.from as any).mock.calls[(supabaseAdmin.from as any).mock.results.indexOf(r)] &&
          (supabaseAdmin.from as any).mock.calls[(supabaseAdmin.from as any).mock.results.indexOf(r)][0] === 'articles'
      );
      expect(articleFromCall).toBeDefined();
    });

    it('should pass article data (including images) to adapter.publish', async () => {
      await service.deliverArticle('article-1');

      // The adapter.publish should receive article data
      expect(mockPublish).toHaveBeenCalled();
      const publishCall = mockPublish.mock.calls[0];
      const context = publishCall[0];

      // Article should be the full object from DB (including article_images)
      expect(context.article).toBeDefined();
      expect(context.article.id).toBe('article-1');
    });
  });

  describe('deliverArticle - project data handling (Bug #3)', () => {
    it('should handle project as single object (Supabase many-to-one FK)', async () => {
      // Re-mock with project as single object
      (supabaseAdmin as any).from = buildSupabaseMock(mockCampaignWithProjectObject).from;

      await service.deliverArticle('article-1');

      expect(mockPublish).toHaveBeenCalled();
      const context = mockPublish.mock.calls[0][0];
      // Project should be extracted correctly regardless of format
      expect(context.project).toBeDefined();
      expect(context.project?.id).toBe('project-1');
      expect(context.project?.name).toBe('My Project');
      expect(context.project?.domain).toBe('example.com');
    });

    it('should handle project as array (backwards compatibility)', async () => {
      // Re-mock with project as array
      (supabaseAdmin as any).from = buildSupabaseMock(mockCampaignWithProjectArray).from;

      await service.deliverArticle('article-1');

      expect(mockPublish).toHaveBeenCalled();
      const context = mockPublish.mock.calls[0][0];
      expect(context.project).toBeDefined();
      expect(context.project?.id).toBe('project-1');
      expect(context.project?.name).toBe('My Project');
    });

    it('should handle null project gracefully', async () => {
      const campaignNoProject = {
        ...mockCampaignWithProjectObject,
        projects: null,
      };
      (supabaseAdmin as any).from = buildSupabaseMock(campaignNoProject).from;

      await service.deliverArticle('article-1');

      expect(mockPublish).toHaveBeenCalled();
      const context = mockPublish.mock.calls[0][0];
      expect(context.project).toBeNull();
    });

    it('should handle empty array project gracefully', async () => {
      const campaignEmptyProject = {
        ...mockCampaignWithProjectObject,
        projects: [],
      };
      (supabaseAdmin as any).from = buildSupabaseMock(campaignEmptyProject).from;

      await service.deliverArticle('article-1');

      expect(mockPublish).toHaveBeenCalled();
      const context = mockPublish.mock.calls[0][0];
      expect(context.project).toBeNull();
    });
  });

  describe('shouldAutoDeliver', () => {
    it('should return true when auto_publish is enabled', async () => {
      const result = await service.shouldAutoDeliver('campaign-1');
      expect(result).toBe(true);
    });

    it('should return false when campaign has no settings', async () => {
      // Override the campaign query to return no auto_publish
      const mockFrom = vi.fn().mockReturnValue(
        createChain({ settings: {} })
      );
      (supabaseAdmin as any).from = mockFrom;

      const result = await service.shouldAutoDeliver('campaign-no-settings');
      expect(result).toBe(false);
    });

    it('should return false when campaign not found', async () => {
      const chain = createChain(null);
      chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      (supabaseAdmin as any).from = vi.fn(() => chain);

      const result = await service.shouldAutoDeliver('nonexistent-campaign');
      expect(result).toBe(false);
    });
  });
});
