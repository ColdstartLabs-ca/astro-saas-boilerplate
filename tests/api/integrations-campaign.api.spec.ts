import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';
import type { ICampaignIntegrationWithDetails } from '@shared/types/integration.types';

/**
 * Campaign Integrations API Tests
 *
 * Tests assigning integrations to campaigns and auto-publish settings.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('API: Campaign Integrations', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let campaignId: string;
  let integrationId: string;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

    const project = await ctx.createProject(user.id, { name: 'Test Project' });

    const campaign = await ctx.createCampaignRecord(user.id, project.id, {
      name: 'Test Campaign',
    });
    campaignId = campaign.id;

    const integration = await ctx.createIntegrationRecord(user.id, {
      type: 'wordpress',
      name: 'Test Integration',
      config: { site_url: 'https://test.com', username: 'testuser' },
    });
    integrationId = integration.id;
  });

  // =============================================================================
  // GET /api/campaigns/:campaignId/integrations
  // =============================================================================

  test.describe('GET /api/campaigns/:campaignId/integrations', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get(`/api/campaigns/${campaignId}/integrations`);

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return assigned integrations with autoPublish flag', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      // Add campaign_integrations junction record
      await ctx.assignIntegrationToCampaign(campaignId, integrationId, true);

      const response = await api.get(`/api/campaigns/${campaignId}/integrations`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.autoPublish).toBeDefined();
      expect(data.integrations).toBeInstanceOf(Array);
      expect(data.integrations).toHaveLength(1);

      const campaignIntegration = data.integrations[0] as ICampaignIntegrationWithDetails;
      expect(campaignIntegration).toMatchObject({
        campaign_id: campaignId,
        integration_id: integrationId,
        enabled: true,
      });
    });

    test('should return 404 for non-existent campaign', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/campaigns/non-existent/integrations');

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });

  // =============================================================================
  // PUT /api/campaigns/:campaignId/integrations
  // =============================================================================

  test.describe('PUT /api/campaigns/:campaignId/integrations', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.put(`/api/campaigns/${campaignId}/integrations`, {
        integrationIds: [integrationId],
        autoPublish: true,
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should assign integrations to campaign', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.put(`/api/campaigns/${campaignId}/integrations`, {
        integrationIds: [integrationId],
        autoPublish: false,
      });

      response.expectStatus(200).expectSuccess();

      // Verify auto_publish setting was updated
      const { data: campaign } = await ctx.supabaseAdmin
        .from('campaigns')
        .select('settings')
        .eq('id', campaignId)
        .single();

      const settings = campaign!.settings as { auto_publish?: boolean } | null;
      expect(settings?.auto_publish).toBe(false);
    });

    test('should update autoPublish flag to true', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.put(`/api/campaigns/${campaignId}/integrations`, {
        integrationIds: [integrationId],
        autoPublish: true,
      });

      response.expectStatus(200).expectSuccess();

      // Verify auto_publish setting was updated
      const { data: campaign } = await ctx.supabaseAdmin
        .from('campaigns')
        .select('settings')
        .eq('id', campaignId)
        .single();

      const settings = campaign!.settings as { auto_publish?: boolean } | null;
      expect(settings?.auto_publish).toBe(true);
    });

    test('should reject other user integrations', async ({ request }) => {

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const otherIntegration = await ctx.createIntegrationRecord(otherUser.id, {
        type: 'wordpress',
        name: 'Other User Integration',
        config: { site_url: 'https://other.com' },
      });

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.put(`/api/campaigns/${campaignId}/integrations`, {
        integrationIds: [otherIntegration.id],
        autoPublish: true,
      });

      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });
  });

  // =============================================================================
  // POST /api/articles/:articleId/deliver
  // =============================================================================

  test.describe('POST /api/articles/:articleId/deliver', () => {
    let articleId: string;

    test.beforeEach(async () => {
      const article = await ctx.createArticleRecord(user.id, campaignId, {
        title: 'Test Article',
        slug: `test-article-${Date.now()}`,
        content: 'Test content',
        status: 'draft',
      });
      articleId = article.id;

      // Assign the integration from the outer beforeEach to the campaign
      await ctx.assignIntegrationToCampaign(campaignId, integrationId, true);
    });

    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post(`/api/articles/${articleId}/deliver`, {
        retry: false,
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should trigger delivery', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post(`/api/articles/${articleId}/deliver`, {
        retry: false,
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data).toMatchObject({
        total: expect.any(Number),
        successful: expect.any(Number),
        failed: expect.any(Number),
        deliveries: expect.any(Array),
      });
    });

    test('should support retry flag', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post(`/api/articles/${articleId}/deliver`, {
        retry: true,
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data).toMatchObject({
        total: expect.any(Number),
        successful: expect.any(Number),
        failed: expect.any(Number),
        deliveries: expect.any(Array),
      });
    });

    test('should return 404 for non-existent article', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/articles/non-existent-id/deliver', {
        retry: false,
      });

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });

    test('should return 404 for other user article', async ({ request }) => {

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const api = new ApiClient(request).withAuth(otherUser.token);

      const response = await api.post(`/api/articles/${articleId}/deliver`, {
        retry: false,
      });

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });

  // =============================================================================
  // GET /api/articles/:articleId/deliveries
  // =============================================================================

  test.describe('GET /api/articles/:articleId/deliveries', () => {
    let articleId: string;

    test.beforeEach(async () => {
      const article = await ctx.createArticleRecord(user.id, campaignId, {
        title: 'Test Article for Deliveries',
        slug: `test-article-deliveries-${Date.now()}`,
        content: 'Test content',
        status: 'draft',
      });
      articleId = article.id;
    });

    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return delivery records', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.deliveries).toBeDefined();
      expect(Array.isArray(data.deliveries)).toBe(true);
    });

    test('should return empty array for article with no deliveries', async ({ request }) => {

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.deliveries).toEqual([]);
    });
  });
});
