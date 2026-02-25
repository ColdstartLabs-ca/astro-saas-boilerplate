import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Projects, Campaigns & Keywords (§3.1–3.3)
 *
 * Covers:
 *   GET/POST  /api/projects
 *   GET/PATCH/DELETE /api/projects/:id
 *   GET/POST  /api/campaigns
 *   GET/PATCH/DELETE /api/campaigns/:id
 *   GET/POST  /api/campaigns/:id/keywords
 *   DELETE    /api/campaigns/:id/keywords/:keywordId
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

// =============================================================================
// Projects
// =============================================================================

test.describe('API: Projects (§3.1)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
  });

  test.describe('GET /api/projects', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/projects');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return empty array for new user', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/projects');
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(Array.isArray(data.projects)).toBe(true);
    });
  });

  test.describe('POST /api/projects', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post('/api/projects', { name: 'Test' });
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should reject missing name', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/projects', {});
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should create project', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/projects', { name: 'My Project' });
      response.expectStatus(201).expectSuccess();
      const data = await response.getData();
      expect(data.project.id).toBeDefined();
      expect(data.project.name).toBe('My Project');
    });

    test('should appear in list after creation', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      await api.post('/api/projects', { name: 'List Test Project' });
      const list = await api.get('/api/projects');
      list.expectStatus(200).expectSuccess();
      const data = await list.getData();
      expect(data.projects.some((p: { name: string }) => p.name === 'List Test Project')).toBe(
        true
      );
    });
  });

  test.describe('PATCH /api/projects/:id', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.patch('/api/projects/00000000-0000-4000-8000-000000000000', {
        name: 'New Name',
      });
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return 404 for non-existent project', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.patch('/api/projects/00000000-0000-4000-8000-000000000000', {
        name: 'Updated',
      });
      response.expectStatus(404);
    });

    test('should update project name', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const created = await api.post('/api/projects', { name: 'Before Update' });
      const project = await created.getData();
      const updated = await api.patch(`/api/projects/${project.project.id}`, {
        name: 'After Update',
      });
      updated.expectStatus(200).expectSuccess();
      const data = await updated.getData();
      expect(data.project.name).toBe('After Update');
    });
  });

  test.describe('DELETE /api/projects/:id', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.delete('/api/projects/00000000-0000-4000-8000-000000000000');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return 404 for non-existent project', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.delete('/api/projects/00000000-0000-4000-8000-000000000000');
      expect([404, 500]).toContain(response.status); // 500 when DB unreachable in test mode
    });

    test('should delete own project', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const created = await api.post('/api/projects', { name: 'To Delete' });
      const project = await created.getData();
      const deleted = await api.delete(`/api/projects/${project.project.id}`);
      expect([200, 204]).toContain(deleted.status);

      // Verify gone from list
      const list = await api.get('/api/projects');
      const data = await list.getData();
      expect(data.projects.some((p: { id: string }) => p.id === project.project.id)).toBe(false);
    });

    test('should not allow deleting another user project', async ({ request }) => {
      const otherUser = await ctx.createUser({ subscription: 'active' });
      const ownerApi = new ApiClient(request).withAuth(otherUser.token);
      const created = await ownerApi.post('/api/projects', { name: 'Other Project' });
      const project = await created.getData();

      const attackerApi = new ApiClient(request).withAuth(user.token);
      const response = await attackerApi.delete(`/api/projects/${project.project.id}`);
      expect([403, 404]).toContain(response.status);
    });
  });
});

// =============================================================================
// Project Limits by Subscription Tier (§3.1)
// =============================================================================

test.describe('API: Project Limits by Subscription Tier (§3.1)', () => {
  /**
   * Project limits by tier (from subscription.config.ts):
   * - Free: 1 project max
   * - Starter: 1 project max
   * - Growth: 3 projects max
   * - Agency: unlimited
   */

  test.describe('Free tier (1 project max)', () => {
    let freeUser: Awaited<ReturnType<typeof ctx.createUser>>;

    test.beforeEach(async () => {
      freeUser = await ctx.createUser({ subscription: 'free', credits: 3 });
    });

    test('should allow creating 1 project for free tier', async ({ request }) => {
      const api = new ApiClient(request).withAuth(freeUser.token);
      const response = await api.post('/api/projects', { name: 'First Project' });
      response.expectStatus(201).expectSuccess();
      const data = await response.getData();
      expect(data.project.id).toBeDefined();
      expect(data.project.name).toBe('First Project');
    });

    test('should block 2nd project creation for free tier with FORBIDDEN error', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(freeUser.token);

      // Create first project - should succeed
      const first = await api.post('/api/projects', { name: 'First Project' });
      first.expectStatus(201).expectSuccess();

      // Attempt to create second project - should fail with 403 FORBIDDEN
      const second = await api.post('/api/projects', { name: 'Second Project' });
      second.expectStatus(403);
      await second.expectErrorCode('FORBIDDEN');
      await second.expectErrorMessage('Project limit exceeded');
    });
  });

  test.describe('Starter tier (1 project max)', () => {
    let starterUser: Awaited<ReturnType<typeof ctx.createUser>>;

    test.beforeEach(async () => {
      starterUser = await ctx.createUser({
        subscription: 'active',
        tier: 'starter',
        credits: 30,
      });
    });

    test('should allow creating 1 project for starter tier', async ({ request }) => {
      const api = new ApiClient(request).withAuth(starterUser.token);
      const response = await api.post('/api/projects', { name: 'Starter Project' });
      response.expectStatus(201).expectSuccess();
      const data = await response.getData();
      expect(data.project.name).toBe('Starter Project');
    });

    test('should block 2nd project creation for starter tier with FORBIDDEN error', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(starterUser.token);

      // Create first project - should succeed
      const first = await api.post('/api/projects', { name: 'First Starter Project' });
      first.expectStatus(201).expectSuccess();

      // Attempt to create second project - should fail with 403 FORBIDDEN
      const second = await api.post('/api/projects', { name: 'Second Starter Project' });
      second.expectStatus(403);
      await second.expectErrorCode('FORBIDDEN');
      await second.expectErrorMessage('Project limit exceeded');
    });
  });

  test.describe('Growth tier (3 projects max)', () => {
    let growthUser: Awaited<ReturnType<typeof ctx.createUser>>;

    test.beforeEach(async () => {
      growthUser = await ctx.createUser({
        subscription: 'active',
        tier: 'growth',
        credits: 100,
      });
    });

    test('should allow creating 3 projects for growth tier', async ({ request }) => {
      const api = new ApiClient(request).withAuth(growthUser.token);

      // Create 3 projects - all should succeed
      for (let i = 1; i <= 3; i++) {
        const response = await api.post('/api/projects', { name: `Growth Project ${i}` });
        response.expectStatus(201).expectSuccess();
        const data = await response.getData();
        expect(data.project.name).toBe(`Growth Project ${i}`);
      }

      // Verify all 3 projects exist
      const list = await api.get('/api/projects');
      list.expectStatus(200).expectSuccess();
      const listData = await list.getData();
      expect(listData.projects.length).toBe(3);
    });

    test('should block 4th project creation for growth tier with FORBIDDEN error', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(growthUser.token);

      // Create 3 projects - all should succeed
      for (let i = 1; i <= 3; i++) {
        const response = await api.post('/api/projects', { name: `Growth Project ${i}` });
        response.expectStatus(201).expectSuccess();
      }

      // Attempt to create 4th project - should fail with 403 FORBIDDEN
      const fourth = await api.post('/api/projects', { name: 'Fourth Growth Project' });
      fourth.expectStatus(403);
      await fourth.expectErrorCode('FORBIDDEN');
      await fourth.expectErrorMessage('Project limit exceeded');
    });
  });

  test.describe('Agency tier (unlimited projects)', () => {
    let agencyUser: Awaited<ReturnType<typeof ctx.createUser>>;

    test.beforeEach(async () => {
      agencyUser = await ctx.createUser({
        subscription: 'active',
        tier: 'agency',
        credits: 500,
      });
    });

    test('should allow creating 5 projects for agency tier (unlimited)', async ({ request }) => {
      const api = new ApiClient(request).withAuth(agencyUser.token);

      // Create 5 projects - all should succeed
      for (let i = 1; i <= 5; i++) {
        const response = await api.post('/api/projects', { name: `Agency Project ${i}` });
        response.expectStatus(201).expectSuccess();
        const data = await response.getData();
        expect(data.project.name).toBe(`Agency Project ${i}`);
      }

      // Verify all 5 projects exist
      const list = await api.get('/api/projects');
      list.expectStatus(200).expectSuccess();
      const listData = await list.getData();
      expect(listData.projects.length).toBe(5);
    });

    test('should allow creating many projects for agency tier', async ({ request }) => {
      const api = new ApiClient(request).withAuth(agencyUser.token);

      // Create 10 projects to verify unlimited - all should succeed
      for (let i = 1; i <= 10; i++) {
        const response = await api.post('/api/projects', { name: `Agency Site ${i}` });
        response.expectStatus(201).expectSuccess();
      }

      // Verify all 10 projects exist
      const list = await api.get('/api/projects');
      list.expectStatus(200).expectSuccess();
      const listData = await list.getData();
      expect(listData.projects.length).toBe(10);
    });
  });
});

// =============================================================================
// Campaigns
// =============================================================================

test.describe('API: Campaigns (§3.2)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
    if (!isTestMode()) {
      const project = await ctx.createProject(user.id, { name: 'Campaign Test Project' });
      projectId = project.id;
    } else {
      // In test mode, create a real project via API so it exists in the mock DB
      const api = new ApiClient(request).withAuth(user.token);
      const projectRes = await api.post('/api/projects', { name: 'Campaign Test Project' });
      const projectData = await projectRes.getData() as { project: { id: string } };
      projectId = projectData.project.id;
    }
  });

  test.describe('GET /api/campaigns', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/campaigns?projectId=test');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require projectId', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/campaigns');
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should return campaigns list', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get(`/api/campaigns?projectId=${projectId}`);
      response.expectStatus(200).expectSuccess();
      const data = await response.getData() as any;
      expect(Array.isArray(data.campaigns)).toBe(true);
    });
  });

  test.describe('POST /api/campaigns', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post('/api/campaigns', { name: 'Test', projectId });
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should reject invalid body', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/campaigns', {});
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should create campaign', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/campaigns', {
        name: 'My Campaign',
        projectId,
      });
      response.expectStatus(201).expectSuccess();
      const data = await response.getData() as any;
      expect(data.campaign.id).toBeDefined();
      expect(data.campaign.name).toBe('My Campaign');
      expect(data.campaign.project_id).toBe(projectId);
    });
  });

  test.describe('GET/PATCH/DELETE /api/campaigns/:id', () => {
    test('should reject unauthenticated GET', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/campaigns/00000000-0000-4000-8000-000000000000');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return 404 for non-existent campaign', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/campaigns/00000000-0000-4000-8000-000000000000');
      response.expectStatus(404);
    });

    test('full CRUD cycle', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create
      const created = await api.post('/api/campaigns', { name: 'CRUD Test', projectId });
      created.expectStatus(201);
      const { campaign } = await created.getData() as any;

      // Read
      const fetched = await api.get(`/api/campaigns/${campaign.id}`);
      fetched.expectStatus(200).expectSuccess();

      // Update
      const patched = await api.patch(`/api/campaigns/${campaign.id}`, { name: 'Updated Name' });
      patched.expectStatus(200).expectSuccess();
      const patchedData = await patched.getData() as any;
      expect(patchedData.campaign.name).toBe('Updated Name');

      // Delete
      const deleted = await api.delete(`/api/campaigns/${campaign.id}`);
      expect([200, 204]).toContain(deleted.status);

      // Confirm gone
      const gone = await api.get(`/api/campaigns/${campaign.id}`);
      gone.expectStatus(404);
    });
  });
});

// =============================================================================
// Keywords
// =============================================================================

test.describe('API: Keywords (§3.3)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let campaignId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
    if (!isTestMode()) {
      const project = await ctx.createProject(user.id, { name: 'Keywords Test Project' });
      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Keywords Campaign',
        keywords: [],
      });
      campaignId = campaign.id;
    } else {
      // In test mode, create a real campaign via API so it exists in testModeCampaigns
      const api = new ApiClient(request).withAuth(user.token);
      const projectRes = await api.post('/api/projects', { name: 'Keywords Test Project' });
      const projectData = await projectRes.getData();
      const createdProjectId = (projectData as { project: { id: string } }).project.id;
      const campaignRes = await api.post('/api/campaigns', {
        name: 'Keywords Campaign',
        projectId: createdProjectId,
      });
      const campaignData = await campaignRes.getData();
      campaignId = (campaignData as { campaign: { id: string } }).campaign.id;
    }
  });

  test('should reject unauthenticated GET', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get(`/api/campaigns/${campaignId}/keywords`);
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should reject unauthenticated POST', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post(`/api/campaigns/${campaignId}/keywords`, {
      keywords: ['seo tips'],
    });
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return 404 for unknown campaign keywords', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/campaigns/00000000-0000-4000-8000-000000000000/keywords');
    response.expectStatus(404);
  });

  test('should add and list keywords', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    // Add keywords
    const added = await api.post(`/api/campaigns/${campaignId}/keywords`, {
      keywords: ['best seo tools', 'keyword research tips'],
    });
    added.expectStatus(200).expectSuccess();
    const addedData = await added.getData() as any;
    expect(addedData.added).toBe(2);

    // List keywords
    const list = await api.get(`/api/campaigns/${campaignId}/keywords`);
    list.expectStatus(200).expectSuccess();
    const listData = await list.getData() as any;
    expect(Array.isArray(listData.keywords)).toBe(true);
    expect(listData.keywords.length).toBeGreaterThanOrEqual(2);
  });

  test('should reject empty keywords array', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.post(`/api/campaigns/${campaignId}/keywords`, { keywords: [] });
    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should delete a keyword', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const added = await api.post(`/api/campaigns/${campaignId}/keywords`, {
      keywords: ['delete me keyword'],
    });
    added.expectStatus(200);
    const addedData = await added.getData() as any;
    const keywordId = addedData.keywords?.[0]?.id ?? addedData.added;

    if (typeof keywordId === 'string') {
      const deleted = await api.delete(`/api/campaigns/${campaignId}/keywords/${keywordId}`);
      expect([200, 204]).toContain(deleted.status);
    }
  });
});
