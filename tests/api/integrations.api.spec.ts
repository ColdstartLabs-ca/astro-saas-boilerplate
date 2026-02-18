import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * Integration Tests for Integrations API Routes
 *
 * Tests CRUD operations for WordPress and webhook integrations,
 * including validation, authentication, and error handling.
 *
 * NOTE: In test mode (ENV=test), we cannot use direct DB inserts for
 * integrations because the user_id FK references profiles, which references auth.users.
 * Tests that require seeded integrations via direct DB inserts are skipped in test mode.
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

// Check if encryption key is available (required for creating integrations)
const hasEncryptionKey = () => !!process.env.CMS_ENCRYPTION_KEY;

test.describe('API: Integrations', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  // =============================================================================
  // GET /api/integrations
  // =============================================================================

  test.describe('GET /api/integrations', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/integrations');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return empty list for new user', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/integrations');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.integrations).toEqual([]);
    });

    test('should return user integrations', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      // Seed integration via direct DB insert
      const { supabaseAdmin } = ctx;
      await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test WordPress',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass',
          },
          encrypted_credentials: 'encrypted_credentials_here',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/integrations');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.integrations).toHaveLength(1);
      expect(data.integrations[0]).toMatchObject({
        id: integration!.id,
        user_id: user.id,
        type: 'wordpress',
        name: 'Test WordPress',
        status: 'active',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        campaign_count: expect.any(Number),
      });
    });

    test('should not return encrypted_credentials field', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const { supabaseAdmin } = ctx;
      await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test WordPress',
          config: {
            site_url: 'https://test.com',
          },
          encrypted_credentials: 'encrypted_credentials_here',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/integrations');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      // Verify encrypted_credentials is NOT in response
      expect(data.integrations[0]).not.toHaveProperty('encrypted_credentials');
    });

    test('should return 404 for other user integration', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const { supabaseAdmin } = ctx;
      await ctx.createProject(otherUser.id, {
        name: 'Other User Project',
      });

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: otherUser.id,
          type: 'wordpress',
          name: 'Other User Integration',
          config: {
            site_url: 'https://other.com',
          },
          encrypted_credentials: 'encrypted_credentials_here',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/integrations/${integration!.id}`);

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });

  // =============================================================================
  // POST /api/integrations
  // =============================================================================

  test.describe('POST /api/integrations', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'Test Integration',
        siteUrl: 'https://example.com',
        username: 'testuser',
        appPassword: 'testpass',
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should create WordPress integration', async ({ request }) => {
      // Skip in test mode without encryption key (required for credential encryption)
      test.skip(isTestMode() && !hasEncryptionKey(), 'CMS_ENCRYPTION_KEY not set in test mode');

      // Skip DB verification in test mode since we can't query with mock user IDs
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'My WordPress Blog',
        siteUrl: 'https://myblog.com',
        username: 'admin',
        appPassword: 'secret123',
      });

      response.expectStatus(201).expectSuccess();
      const data = await response.getData();

      expect(data.integration).toMatchObject({
        id: expect.any(String),
        type: 'wordpress',
        name: 'My WordPress Blog',
        status: 'active',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(data.testResult).toBeDefined();

      // Skip DB verification in test mode
      if (!isTestMode()) {
        // Verify in database
        const { supabaseAdmin } = ctx;
        const { data: dbIntegration } = await supabaseAdmin
          .from('integrations')
          .select('*')
          .eq('id', data.integration.id)
          .single();

        expect(dbIntegration).toBeTruthy();
        expect(dbIntegration.type).toBe('wordpress');
      }
    });

    test('should create webhook integration', async ({ request }) => {
      // Skip in test mode without encryption key (required for credential encryption)
      test.skip(isTestMode() && !hasEncryptionKey(), 'CMS_ENCRYPTION_KEY not set in test mode');

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/integrations', {
        type: 'webhook',
        name: 'Test Webhook',
        url: 'https://webhook.example.com',
        secret: 'webhook_secret',
      });

      response.expectStatus(201).expectSuccess();
      const data = await response.getData();

      expect(data.integration).toMatchObject({
        id: expect.any(String),
        type: 'webhook',
        name: 'Test Webhook',
        status: 'active',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(data.testResult).toBeDefined();

      // Skip DB verification in test mode
      if (!isTestMode()) {
        // Verify in database
        const { supabaseAdmin } = ctx;
        const { data: dbIntegration } = await supabaseAdmin
          .from('integrations')
          .select('*')
          .eq('id', data.integration.id)
          .single();

        expect(dbIntegration).toBeTruthy();
        expect(dbIntegration.type).toBe('webhook');
      }
    });

    test('should validate required fields', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Missing name
      let response = await api.post('/api/integrations', {
        type: 'wordpress',
        siteUrl: 'https://example.com',
        username: 'testuser',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');

      // Missing siteUrl
      response = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'Test',
        username: 'testuser',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');

      // Missing username for WordPress
      response = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'Test',
        siteUrl: 'https://example.com',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should validate URL format', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'Test',
        siteUrl: 'not-a-url',
        username: 'testuser',
        appPassword: 'testpass',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject invalid type', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/integrations', {
        type: 'invalid_type',
        name: 'Test',
        url: 'https://example.com',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });
  });

  // =============================================================================
  // GET /api/integrations/:id
  // =============================================================================

  test.describe('GET /api/integrations/:id', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/integrations/valid-id');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return integration by ID', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const { supabaseAdmin } = ctx;
      await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test WordPress',
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

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/integrations/${integration!.id}`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data).toMatchObject({
        id: integration!.id,
        user_id: user.id,
        type: 'wordpress',
        name: 'Test WordPress',
        status: 'active',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    test('should return 404 for other user integration', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const { supabaseAdmin } = ctx;
      await ctx.createProject(otherUser.id, {
        name: 'Other User Project',
      });

      const { data: integration } = await supabaseAdmin
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

      const response = await api.get(`/api/integrations/${integration!.id}`);

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });

  // =============================================================================
  // PUT /api/integrations/:id
  // =============================================================================

  test.describe('PUT /api/integrations/:id', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.put('/api/integrations/valid-id', {
        name: 'Updated Name',
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should update integration name', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const { supabaseAdmin } = ctx;
      await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Original Name',
          config: {
            site_url: 'https://test.com',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.put(`/api/integrations/${integration!.id}`, {
        name: 'Updated Name',
      });

      response.expectStatus(200).expectSuccess();

      // Verify in database
      const { data: dbIntegration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('id', integration!.id)
        .single();

      expect(dbIntegration!.name).toBe('Updated Name');
    });
  });

  // =============================================================================
  // DELETE /api/integrations/:id
  // =============================================================================

  test.describe('DELETE /api/integrations/:id', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.delete('/api/integrations/valid-id');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should delete integration', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed integrations in test mode with mock users');

      const { supabaseAdmin } = ctx;
      await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'To Delete',
          config: {
            site_url: 'https://test.com',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.delete(`/api/integrations/${integration!.id}`);

      response.expectStatus(204);

      // Verify in database
      const { data: dbIntegration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('id', integration!.id)
        .maybeSingle();

      expect(dbIntegration).toBeNull();
    });
  });

  // =============================================================================
  // POST /api/integrations/:id/test
  // =============================================================================

  test.describe('POST /api/integrations/:id/test', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post('/api/integrations/valid-id/test');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should test connection for API-created integration', async ({ request }) => {
      // Skip in test mode without encryption key (required for credential encryption)
      test.skip(isTestMode() && !hasEncryptionKey(), 'CMS_ENCRYPTION_KEY not set in test mode');

      const api = new ApiClient(request).withAuth(user.token);

      // Create integration through the API (so credentials are properly encrypted)
      const createResponse = await api.post('/api/integrations', {
        type: 'wordpress',
        name: 'Test Connection WP',
        siteUrl: 'https://test.com',
        username: 'testuser',
        appPassword: 'testpass',
      });

      createResponse.expectStatus(201).expectSuccess();
      const createData = await createResponse.getData();
      const integrationId = createData.integration.id;

      // Test connection
      const response = await api.post(`/api/integrations/${integrationId}/test`);

      // Connection test returns 200 with result (may succeed or fail based on actual endpoint)
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.result).toMatchObject({
        success: expect.any(Boolean),
        timestamp: expect.any(String),
      });
    });
  });
});
