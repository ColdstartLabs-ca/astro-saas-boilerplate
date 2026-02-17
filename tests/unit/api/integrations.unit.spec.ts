/**
 * Unit tests for Integration API Routes
 *
 * Tests for:
 * - /api/integrations (GET, POST)
 * - /api/integrations/:id (GET, PUT, DELETE)
 * - /api/integrations/:id/test (POST)
 * - /api/campaigns/:id/integrations (GET, PUT)
 * - /api/articles/:id/deliver (POST)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
let mockArticleExists = false;
const setMockArticleExists = (exists: boolean) => {
  mockArticleExists = exists;
};

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve(
                mockArticleExists
                  ? { data: { id: 'test-article-id', user_id: 'test-user-id' }, error: null }
                  : { data: null, error: { message: 'Not found' } }
              )
            ),
          })),
          single: vi.fn(() =>
            Promise.resolve(
              mockArticleExists
                ? { data: { id: 'test-article-id', user_id: 'test-user-id' }, error: null }
                : { data: null, error: { message: 'Not found' } }
            )
          ),
        })),
      })),
    })),
  },
  setMockArticleExists,
}));

vi.mock('@server/services/integration.service', () => ({
  integrationService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    assignIntegrationToCampaign: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
  },
}));

vi.mock('@server/services/delivery.service', () => ({
  deliveryService: {
    deliverArticle: vi.fn(),
    getArticleDeliveries: vi.fn(),
    shouldAutoDeliver: vi.fn(),
  },
}));

vi.mock('@pages/api/_utils', () => ({
  withAuth: (handler: any) => handler,
  withAuthAndBody: (schema: any, handler: any) => handler,
  jsonResponse: (data: any, status = 200) => ({
    status,
    json: async () => ({ success: true, data }),
  }),
  errorResponse: (code: string, message: string, status: number) => ({
    status,
    json: async () => ({ success: false, error: { code, message } }),
  }),
  handleApiError: undefined,
}));

describe('Integrations API', () => {
  const mockUserId = 'test-user-id';
  const mockIntegrationId = 'test-integration-id';
  const mockCampaignId = 'test-campaign-id';
  const mockArticleId = 'test-article-id';

  let getIntegrations: any;
  let createIntegration: any;
  let getIntegration: any;
  let updateIntegration: any;
  let deleteIntegration: any;
  let testIntegration: any;
  let deliverArticle: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const integrationsModule = await import('../../../src/pages/api/integrations/index');
    const integrationDetailModule =
      await import('../../../src/pages/api/integrations/[integrationId]/index');
    const integrationTestModule =
      await import('../../../src/pages/api/integrations/[integrationId]/test');
    const articleDeliverModule =
      await import('../../../src/pages/api/articles/[articleId]/deliver');

    getIntegrations = integrationsModule.GET;
    createIntegration = integrationsModule.POST;
    getIntegration = integrationDetailModule.GET;
    updateIntegration = integrationDetailModule.PUT;
    deleteIntegration = integrationDetailModule.DELETE;
    testIntegration = integrationTestModule.POST;
    deliverArticle = articleDeliverModule.POST;
  });

  describe('GET /api/integrations', () => {
    it('should list integrations for authenticated user', async () => {
      const { integrationService } = await import('@server/services/integration.service');
      const mockIntegrations = [
        {
          id: mockIntegrationId,
          user_id: mockUserId,
          type: 'wordpress',
          name: 'My Blog',
          config: { site_url: 'https://example.com', username: 'admin' },
          status: 'active',
          last_tested_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          campaign_count: 0,
        },
      ];

      vi.mocked(integrationService.list).mockResolvedValue(mockIntegrations);

      const context = {
        request: new Request('http://localhost'),
        params: {},
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await getIntegrations(mockUserId, context);

      expect(response.status).toBe(200);
      expect(integrationService.list).toHaveBeenCalledWith(mockUserId);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.integrations).toHaveLength(1);
      expect(data.data.integrations[0]).not.toHaveProperty('encrypted_credentials');
    });
  });

  describe('POST /api/integrations', () => {
    it('should create WordPress integration with valid input', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const input = {
        type: 'wordpress' as const,
        name: 'My Blog',
        siteUrl: 'https://example.com',
        username: 'admin',
        appPassword: 'abcd-1234-efgh-5678',
      };

      const mockResult = {
        integration: {
          id: mockIntegrationId,
          user_id: mockUserId,
          type: 'wordpress' as const,
          name: 'My Blog',
          config: { site_url: 'https://example.com', username: 'admin' },
          status: 'active' as const,
          last_tested_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        testResult: {
          success: true,
          timestamp: new Date().toISOString(),
        },
      };

      vi.mocked(integrationService.create).mockResolvedValue(mockResult);

      const context = {
        request: new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        params: {},
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await createIntegration(mockUserId, input, context);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.integration.name).toBe('My Blog');
      expect(data.data.integration).not.toHaveProperty('encrypted_credentials');
      expect(data.data.testResult.success).toBe(true);
    });

    it('should create webhook integration with valid input', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const input = {
        type: 'webhook' as const,
        name: 'My Webhook',
        url: 'https://hook.example.com/article',
        secret: 'my-secret',
      };

      const mockResult = {
        integration: {
          id: mockIntegrationId,
          user_id: mockUserId,
          type: 'webhook' as const,
          name: 'My Webhook',
          config: { url: 'https://hook.example.com/article' },
          status: 'active' as const,
          last_tested_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        testResult: {
          success: true,
          timestamp: new Date().toISOString(),
        },
      };

      vi.mocked(integrationService.create).mockResolvedValue(mockResult);

      const context = {
        request: new Request('http://localhost'),
        params: {},
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await createIntegration(mockUserId, input, context);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data.integration.type).toBe('webhook');
    });

    it('should assign integration to campaign when campaignId is provided', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const input = {
        type: 'wordpress' as const,
        name: 'My Blog',
        siteUrl: 'https://example.com',
        username: 'admin',
        appPassword: 'abcd-1234-efgh-5678',
        campaignId: mockCampaignId,
        autoPublish: true,
      };

      const mockResult = {
        integration: {
          id: mockIntegrationId,
          user_id: mockUserId,
          type: 'wordpress' as const,
          name: 'My Blog',
          config: { site_url: 'https://example.com', username: 'admin' },
          status: 'active' as const,
          last_tested_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        testResult: {
          success: true,
          timestamp: new Date().toISOString(),
        },
      };

      vi.mocked(integrationService.create).mockResolvedValue(mockResult);
      vi.mocked(integrationService.assignIntegrationToCampaign).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        params: {},
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await createIntegration(mockUserId, input, context);

      expect(response.status).toBe(201);
      expect(integrationService.create).toHaveBeenCalledWith(mockUserId, {
        type: 'wordpress',
        name: 'My Blog',
        siteUrl: 'https://example.com',
        username: 'admin',
        appPassword: 'abcd-1234-efgh-5678',
      });
      expect(integrationService.assignIntegrationToCampaign).toHaveBeenCalledWith(
        mockCampaignId,
        mockUserId,
        mockIntegrationId,
        true
      );
    });

    it('should rollback created integration when campaign assignment fails', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const input = {
        type: 'webhook' as const,
        name: 'My Webhook',
        url: 'https://hook.example.com/article',
        campaignId: mockCampaignId,
        autoPublish: true,
      };

      const mockResult = {
        integration: {
          id: mockIntegrationId,
          user_id: mockUserId,
          type: 'webhook' as const,
          name: 'My Webhook',
          config: { url: 'https://hook.example.com/article' },
          status: 'active' as const,
          last_tested_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        testResult: {
          success: true,
          timestamp: new Date().toISOString(),
        },
      };

      vi.mocked(integrationService.create).mockResolvedValue(mockResult);
      vi.mocked(integrationService.assignIntegrationToCampaign).mockRejectedValue(
        new Error('Assignment failed')
      );
      vi.mocked(integrationService.delete).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        params: {},
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      await expect(createIntegration(mockUserId, input, context)).rejects.toThrow('Assignment failed');
      expect(integrationService.delete).toHaveBeenCalledWith(mockIntegrationId, mockUserId);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('should get integration by ID', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const mockIntegration = {
        id: mockIntegrationId,
        user_id: mockUserId,
        type: 'wordpress',
        name: 'My Blog',
        config: { site_url: 'https://example.com', username: 'admin' },
        status: 'active',
        last_tested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(integrationService.getById).mockResolvedValue(mockIntegration);

      const context = {
        request: new Request('http://localhost'),
        params: { integrationId: mockIntegrationId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await getIntegration(mockUserId, context);

      expect(response.status).toBe(200);

      const data = await response.json();
      // The mocked jsonResponse wraps the data: { success: true, data: integration }
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockIntegrationId);
      expect(data.data).not.toHaveProperty('encrypted_credentials');
    });
  });

  describe('PUT /api/integrations/:id', () => {
    it('should update integration name', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const mockUpdatedIntegration = {
        id: mockIntegrationId,
        user_id: mockUserId,
        type: 'wordpress',
        name: 'Updated Name',
        config: { site_url: 'https://example.com', username: 'admin' },
        status: 'active',
        last_tested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(integrationService.update).mockResolvedValue(mockUpdatedIntegration);

      const input = { name: 'Updated Name' };
      const context = {
        request: new Request('http://localhost'),
        params: { integrationId: mockIntegrationId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await updateIntegration(mockUserId, input, context);

      expect(response.status).toBe(200);

      const data = await response.json();
      // The mocked jsonResponse wraps the data: { success: true, data: integration }
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/integrations/:id', () => {
    it('should delete integration', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      vi.mocked(integrationService.delete).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost'),
        params: { integrationId: mockIntegrationId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await deleteIntegration(mockUserId, context);

      expect(response.status).toBe(204);
      expect(integrationService.delete).toHaveBeenCalledWith(mockIntegrationId, mockUserId);
    });
  });

  describe('POST /api/integrations/:id/test', () => {
    it('should test integration connection', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const mockTestResult = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(integrationService.testConnection).mockResolvedValue(mockTestResult);

      const context = {
        request: new Request('http://localhost'),
        params: { integrationId: mockIntegrationId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await testIntegration(mockUserId, context);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.result.success).toBe(true);
    });

    it('should handle failed connection test', async () => {
      const { integrationService } = await import('@server/services/integration.service');

      const mockTestResult = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Authentication failed',
      };

      vi.mocked(integrationService.testConnection).mockResolvedValue(mockTestResult);

      const context = {
        request: new Request('http://localhost'),
        params: { integrationId: mockIntegrationId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await testIntegration(mockUserId, context);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.result.success).toBe(false);
      expect(data.data.result.error).toBe('Authentication failed');
    });
  });

  describe('POST /api/articles/:id/deliver', () => {
    it('should trigger article delivery', async () => {
      const { deliveryService } = await import('@server/services/delivery.service');
      const { setMockArticleExists } = await import('@server/supabase/supabaseAdmin');

      setMockArticleExists(true);

      const mockResult = {
        total: 2,
        successful: 2,
        failed: 0,
        deliveries: [],
      };

      vi.mocked(deliveryService.deliverArticle).mockResolvedValue(mockResult);

      const input = { retry: false };
      const context = {
        request: new Request('http://localhost'),
        params: { articleId: mockArticleId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await deliverArticle(mockUserId, input, context);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.total).toBe(2);
      expect(data.data.successful).toBe(2);

      setMockArticleExists(false);
    });

    it('should retry failed deliveries when retry=true', async () => {
      const { deliveryService } = await import('@server/services/delivery.service');
      const { setMockArticleExists } = await import('@server/supabase/supabaseAdmin');

      setMockArticleExists(true);

      const mockResult = {
        total: 1,
        successful: 1,
        failed: 0,
        deliveries: [],
      };

      vi.mocked(deliveryService.deliverArticle).mockResolvedValue(mockResult);

      const input = { retry: true };
      const context = {
        request: new Request('http://localhost'),
        params: { articleId: mockArticleId },
        locals: { userId: mockUserId },
        url: new URL('http://localhost'),
      };

      const response = await deliverArticle(mockUserId, input, context);

      expect(response.status).toBe(200);
      expect(deliveryService.deliverArticle).toHaveBeenCalledWith(mockArticleId, true);

      setMockArticleExists(false);
    });
  });
});
