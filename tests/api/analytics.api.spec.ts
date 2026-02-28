import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Analytics (Performance & Sync)
 *
 * Covers:
 *   POST /api/analytics/sync
 *   GET  /api/analytics/performance
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

// =============================================================================
// POST /api/analytics/sync
// =============================================================================

test.describe('API: Analytics Sync (POST /api/analytics/sync)', () => {
  test('should return 401 when not authenticated', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/analytics/sync', {
      projectId: '00000000-0000-4000-8000-000000000001',
    });
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return 400 for invalid body (missing projectId)', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.post('/api/analytics/sync', {});
    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should return 400 for invalid projectId (not a UUID)', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.post('/api/analytics/sync', { projectId: 'not-a-uuid' });
    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should return 404 when no active GSC connection exists for the project', async ({
    request,
  }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });

    // Create a project via API so it exists in the mock DB
    const userApi = new ApiClient(request).withAuth(user.token);
    const projectRes = await userApi.post('/api/projects', { name: 'No-GSC Project' });
    projectRes.expectStatus(201);
    const projectData = (await projectRes.getData()) as { project: { id: string } };
    const projectId = projectData.project.id;

    // Do NOT create a gsc_connection — the service should throw GscConnectionError → 404
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.post('/api/analytics/sync', { projectId, dateRangeDays: 28 });
    response.expectStatus(404);
    await response.expectErrorCode('NOT_FOUND');
  });
});

// =============================================================================
// GET /api/analytics/performance
// =============================================================================

test.describe('API: Analytics Performance (GET /api/analytics/performance)', () => {
  test('should return 401 when not authenticated', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get(
      '/api/analytics/performance?projectId=00000000-0000-4000-8000-000000000001'
    );
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return 400 for missing projectId', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/analytics/performance');
    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should return 400 for invalid projectId (not a UUID)', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/analytics/performance?projectId=not-a-uuid');
    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should return 200 with empty articles array when no snapshots exist', async ({
    request,
  }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });

    // Create a project via API so it exists in the mock DB
    const userApi = new ApiClient(request).withAuth(user.token);
    const projectRes = await userApi.post('/api/projects', { name: 'Analytics Empty State' });
    projectRes.expectStatus(201);
    const projectData = (await projectRes.getData()) as { project: { id: string } };
    const projectId = projectData.project.id;

    // No GSC connection, no articles, no snapshots in the mock DB
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get(
      `/api/analytics/performance?projectId=${projectId}&dateRangeDays=28`
    );
    response.expectStatus(200).expectSuccess();

    const data = (await response.getData()) as {
      articles: unknown[];
      campaigns: unknown[];
      summary: {
        total_clicks: number;
        total_impressions: number;
        avg_ctr: number;
        avg_position: number;
        articles_tracked: number;
        articles_published: number;
      };
      lastSyncedAt: string | null;
      hasGscConnection: boolean;
      dateRangeDays: number;
    };

    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.articles).toHaveLength(0);
    expect(Array.isArray(data.campaigns)).toBe(true);
    expect(data.campaigns).toHaveLength(0);
    expect(data.summary.total_clicks).toBe(0);
    expect(data.summary.total_impressions).toBe(0);
    expect(data.summary.articles_tracked).toBe(0);
    expect(data.summary.articles_published).toBe(0);
    expect(data.hasGscConnection).toBe(false);
    expect(data.lastSyncedAt).toBeNull();
    expect(data.dateRangeDays).toBe(28);
  });

  test('should default dateRangeDays to 28 when not provided', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 10 });

    const userApi = new ApiClient(request).withAuth(user.token);
    const projectRes = await userApi.post('/api/projects', { name: 'Default DateRange Project' });
    projectRes.expectStatus(201);
    const projectData = (await projectRes.getData()) as { project: { id: string } };
    const projectId = projectData.project.id;

    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get(`/api/analytics/performance?projectId=${projectId}`);
    response.expectStatus(200).expectSuccess();

    const data = (await response.getData()) as { dateRangeDays: number };
    expect(data.dateRangeDays).toBe(28);
  });
});
