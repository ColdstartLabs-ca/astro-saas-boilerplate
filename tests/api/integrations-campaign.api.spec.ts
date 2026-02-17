import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';
import type { ICampaignIntegrationWithDetails } from '@shared/types/integration.types';

/**
 * Campaign Integrations API Tests
 *
 * Tests assigning integrations to campaigns and auto-publish settings.
 *
 * NOTE: In test mode (ENV=test), we cannot use direct DB inserts for
 * campaigns/integrations because the user_id FK references profiles/auth.users.
 * Tests that require seeded data via direct DB inserts are skipped in test mode.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

// Check if we're in test mode with mock users
const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('API: Campaign Integrations', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let campaignId: string;
  let integrationId: string;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

    // Skip DB setup in test mode since we can't insert with mock user IDs
    if (isTestMode()) {
      // Use mock IDs for tests that don't need DB verification
      campaignId = crypto.randomUUID();
      integrationId = crypto.randomUUID();
      return;
    }

    // Create a campaign and integration for testing (only in non-test mode)
    const { supabaseAdmin } = ctx;
    const project = await ctx.createProject(user.id, {
      name: 'Test Project',
    });

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: user.id,
        project_id: project.id,
        name: 'Test Campaign',
        status: 'draft',
        settings: {},
      })
      .select()
      .single();

    campaignId = campaign!.id;

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .insert({
        user_id: user.id,
        type: 'wordpress',
        name: 'Test Integration',
        config: {
          site_url: 'https://test.com',
          username: 'testuser',
          app_password: 'testpass',
        },
        encrypted_credentials: 'encrypted',
        status: 'active',
      })
      .select()
      .single();

    integrationId = integration!.id;
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
      test.skip(isTestMode(), 'Cannot seed campaign_integrations in test mode with mock users');

      const api = new ApiClient(request).withAuth(user.token);

      // Add campaign_integrations junction record
      await ctx.supabaseAdmin
        .from('campaign_integrations')
        .insert({
          campaign_id: campaignId,
          integration_id: integrationId,
          enabled: true,
        })
        .select();

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
      test.skip(isTestMode(), 'Cannot verify DB updates in test mode with mock users');

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
      test.skip(isTestMode(), 'Cannot verify DB updates in test mode with mock users');

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
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const { supabaseAdmin } = ctx;
      await ctx.createProject(otherUser.id, {
        name: 'Other User Project',
      });

      const { data: otherIntegration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: otherUser.id,
          type: 'wordpress',
          name: 'Other User Integration',
          config: {
            site_url: 'https://other.com',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.put(`/api/campaigns/${campaignId}/integrations`, {
        integrationIds: [otherIntegration!.id],
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
      // Skip DB setup in test mode
      if (isTestMode()) {
        articleId = crypto.randomUUID();
        return;
      }

      // Create an article for testing
      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: user.id,
          project_id: project.id,
          name: 'Test Campaign',
          status: 'draft',
          settings: {},
        })
        .select()
        .single();

      campaignId = campaign!.id;

      const { data: article } = await supabaseAdmin
        .from('articles')
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          title: 'Test Article',
          slug: 'test-article',
          content: 'Test content',
          status: 'draft',
        })
        .select()
        .single();

      articleId = article!.id;

      // Create and assign an integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'webhook',
          name: 'Test Webhook',
          config: {
            url: 'https://example.com/webhook',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      integrationId = integration!.id;

      await supabaseAdmin.from('campaign_integrations').insert({
        campaign_id: campaignId,
        integration_id: integrationId,
        enabled: true,
      });
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
      test.skip(isTestMode(), 'Cannot seed articles in test mode with mock users');

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
      test.skip(isTestMode(), 'Cannot seed articles in test mode with mock users');

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
      test.skip(isTestMode(), 'Cannot seed articles in test mode with mock users');

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
      // Skip DB setup in test mode
      if (isTestMode()) {
        articleId = crypto.randomUUID();
        return;
      }

      // Create an article for testing
      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: user.id,
          project_id: project.id,
          name: 'Test Campaign',
          status: 'draft',
          settings: {},
        })
        .select()
        .single();

      campaignId = campaign!.id;

      const { data: article } = await supabaseAdmin
        .from('articles')
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          title: 'Test Article for Deliveries',
          slug: 'test-article-deliveries',
          content: 'Test content',
          status: 'draft',
        })
        .select()
        .single();

      articleId = article!.id;
    });

    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return delivery records', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed articles in test mode with mock users');

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.deliveries).toBeDefined();
      expect(Array.isArray(data.deliveries)).toBe(true);
    });

    test('should return empty array for article with no deliveries', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed articles in test mode with mock users');

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/articles/${articleId}/deliveries`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.deliveries).toEqual([]);
    });
  });
});
