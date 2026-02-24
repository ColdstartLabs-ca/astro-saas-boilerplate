import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * GSC (Google Search Console) API Tests
 *
 * Tests GSC connection management and OAuth flow.
 *
 * NOTE: In test mode (ENV=test), we cannot use direct DB inserts for
 * gsc_connections because the user_id FK references auth.users.
 * Tests that require seeded connections via direct DB inserts are skipped in test mode.
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

test.describe('API: GSC Connections', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  // =============================================================================
  // POST /api/gsc/connect
  // =============================================================================

  test.describe('POST /api/gsc/connect', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post('/api/gsc/connect', {
        projectId: 'test-project-id',
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require projectId parameter', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/gsc/connect');

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    // In test mode, project doesn't exist in DB, so we get 404 - this is correct behavior
    test('should reject non-existent project', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/gsc/connect', {
        projectId: '00000000-0000-4000-8000-000000000000',
      });

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });

    test('should return auth URL', async ({ request }) => {

      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post('/api/gsc/connect', {
        projectId: project.id,
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.authUrl).toBeDefined();
      expect(data.authUrl).toMatch(/^https?:\/\//);
    });
  });

  // =============================================================================
  // GET /api/gsc/connections
  // =============================================================================

  test.describe('GET /api/gsc/connections', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/gsc/connections');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require projectId parameter', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/gsc/connections');

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should return connections without access tokens', async ({ request }) => {

      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      // Create a GSC connection with access token
      await supabaseAdmin.from('gsc_connections').insert({
        user_id: user.id,
        project_id: project.id,
        google_email: 'test@example.com',
        site_url: 'https://test.com',
        access_token: 'encrypted_access_token',
        refresh_token: 'encrypted_refresh_token',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/gsc/connections?projectId=' + project.id);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.connections).toBeInstanceOf(Array);
      expect(data.connections).toHaveLength(1);

      // Verify access_token is not returned
      const connection = data.connections[0];
      expect(connection.access_token).toBeUndefined();
      expect(connection.refresh_token).toBeUndefined();
    });

    test('should return empty array for project with no connections', async ({ request }) => {

      const project = await ctx.createProject(user.id, {
        name: 'Empty Project',
      });

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/gsc/connections?projectId=' + project.id);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.connections).toEqual([]);
    });
  });

  // =============================================================================
  // DELETE /api/gsc/connections/:id
  // =============================================================================

  test.describe('DELETE /api/gsc/connections', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.delete('/api/gsc/connections?connectionId=test-id');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require connectionId parameter', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.delete('/api/gsc/connections');

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should return 404 for non-existent connection', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.delete('/api/gsc/connections?connectionId=00000000-0000-4000-8000-000000000000');

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });

    test('should delete own connection', async ({ request }) => {

      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, {
        name: 'Test Project',
      });

      const { data: connection } = await supabaseAdmin
        .from('gsc_connections')
        .insert({
          user_id: user.id,
          project_id: project.id,
          google_email: 'test@example.com',
          site_url: 'https://test.com',
          access_token: 'encrypted_access_token',
          refresh_token: 'encrypted_refresh_token',
          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.delete('/api/gsc/connections?connectionId=' + connection!.id);

      response.expectStatus(200);

      // Verify deletion in database
      const { data: deleted } = await supabaseAdmin
        .from('gsc_connections')
        .select('*')
        .eq('id', connection!.id)
        .maybeSingle();

      expect(deleted).toBeNull();
    });

    test('should prevent deleting other user connection', async ({ request }) => {

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const { supabaseAdmin } = ctx;
      const otherProject = await ctx.createProject(otherUser.id, {
        name: 'Other User Project',
      });

      const { data: connection } = await supabaseAdmin
        .from('gsc_connections')
        .insert({
          user_id: otherUser.id,
          project_id: otherProject.id,
          google_email: 'other@example.com',
          site_url: 'https://other.com',
          access_token: 'encrypted_access_token',
          refresh_token: 'encrypted_refresh_token',
          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.delete('/api/gsc/connections?connectionId=' + connection!.id);

      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });
  });

  // =============================================================================
  // GET /api/gsc/connections/:id/sites
  // =============================================================================

  test.describe('GET /api/gsc/connections/:id/sites', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/gsc/connections/test-id/sites');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return 404 for non-existent connection', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/gsc/connections/non-existent-id/sites');

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });

    test('should return 404 for other user connection', async ({ request }) => {

      const otherUser = await ctx.createUser({ subscription: 'active' });

      const { supabaseAdmin } = ctx;
      const otherProject = await ctx.createProject(otherUser.id, {
        name: 'Test Project',
      });

      const { data: connection } = await supabaseAdmin
        .from('gsc_connections')
        .insert({
          user_id: otherUser.id,
          project_id: otherProject.id,
          google_email: 'test@example.com',
          site_url: 'https://test.com',
          access_token: 'encrypted_access_token',
          refresh_token: 'encrypted_refresh_token',
          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/gsc/connections/' + connection!.id + '/sites');

      // Endpoint uses .eq('user_id', userId) so other user's connections appear as not found
      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });
});
