import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * Opportunities API Tests
 *
 * Tests CRUD operations for opportunities including listing,
 * filtering, status updates, and article creation.
 *
 * NOTE: In test mode (ENV=test), we cannot use direct DB inserts for
 * opportunities because the user_id FK references auth.users. Tests that
 * require seeded opportunities are skipped in test mode.
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

test.describe('API: Opportunities', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

    // In test mode with mock users, we cannot create projects via direct DB insert
    // because user_id FK references auth.users. Use API instead.
    if (isTestMode()) {
      // Generate a valid UUID v4 format for the mock project ID
      // The API will validate project ownership using the extracted user ID from the token
      projectId = crypto.randomUUID();
    } else {
      // In non-test mode, create project via direct DB insert
      const project = await ctx.createProject(user.id, { name: 'Test Project' });
      projectId = project.id;
    }
  });

  // =============================================================================
  // GET /api/opportunities
  // =============================================================================

  test.describe('GET /api/opportunities', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/opportunities?projectId=test');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require projectId parameter', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get('/api/opportunities');

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    // In test mode, this will return 404 because the project doesn't exist in DB
    // This is expected behavior - the API correctly validates project ownership
    test('should return empty list for project with no opportunities', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}`);

      if (isTestMode()) {
        // In test mode, project doesn't exist in DB, so we get 404
        response.expectStatus(404);
        await response.expectErrorCode('NOT_FOUND');
      } else {
        response.expectStatus(200).expectSuccess();
        const data = await response.getData();
        expect(data.opportunities).toEqual([]);
        expect(data.total).toBe(0);
      }
    });

    // Skip in test mode because we can't seed opportunities with mock user IDs
    test('should return paginated list', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      // Seed opportunities
      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Opportunity 1',
          description: 'Description 1',
          query: 'test keyword 1',
          priority_score: 80,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_hanging_fruit',
          category: 'content',
          title: 'Opportunity 2',
          description: 'Description 2',
          query: 'test keyword 2',
          priority_score: 60,
          status: 'open',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}&page=1&limit=10`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.opportunities).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    test('should filter by category', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Content Opportunity',
          description: 'A content opportunity',
          query: 'content keyword',
          priority_score: 80,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_ctr',
          category: 'technical',
          title: 'Technical Opportunity',
          description: 'A technical opportunity',
          query: 'technical keyword',
          priority_score: 70,
          status: 'open',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}&category=content`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.opportunities.length).toBeGreaterThanOrEqual(1);
      for (const opp of data.opportunities) {
        expect(opp.category).toBe('content');
      }
    });

    test('should filter by status', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Open Opportunity',
          description: 'An open opportunity',
          priority_score: 80,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_ctr',
          category: 'technical',
          title: 'Completed Opportunity',
          description: 'A completed opportunity',
          priority_score: 70,
          status: 'completed',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}&status=open`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      for (const opp of data.opportunities) {
        expect(opp.status).toBe('open');
      }
    });

    test('should filter by type', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Content Gap',
          description: 'A content gap',
          priority_score: 80,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_ctr',
          category: 'technical',
          title: 'Low CTR',
          description: 'Low CTR opportunity',
          priority_score: 60,
          status: 'open',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}&type=content_gap`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      for (const opp of data.opportunities) {
        expect(opp.type).toBe('content_gap');
      }
    });

    test('should search by text', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Best running shoes review',
          description: 'Write a comprehensive review',
          query: 'best running shoes',
          priority_score: 90,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_hanging_fruit',
          category: 'content',
          title: 'Dog training tips',
          description: 'Tips for training dogs',
          query: 'dog training',
          priority_score: 70,
          status: 'open',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities?projectId=${projectId}&search=running`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.opportunities.length).toBeGreaterThanOrEqual(1);
      const titles = data.opportunities.map((o: { title: string }) => o.title);
      expect(titles.some((t: string) => t.toLowerCase().includes('running'))).toBe(true);
    });

    test('should sort by priority desc', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      await supabaseAdmin.from('opportunities').insert([
        {
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Low Priority',
          description: 'Low priority',
          priority_score: 30,
          status: 'open',
        },
        {
          project_id: projectId,
          user_id: user.id,
          type: 'low_hanging_fruit',
          category: 'content',
          title: 'High Priority',
          description: 'High priority',
          priority_score: 90,
          status: 'open',
        },
      ]);

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(
        `/api/opportunities?projectId=${projectId}&sortBy=priority_score&sortOrder=desc`
      );

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      if (data.opportunities.length >= 2) {
        expect(data.opportunities[0].priority_score).toBeGreaterThanOrEqual(
          data.opportunities[1].priority_score
        );
      }
    });
  });

  // =============================================================================
  // GET /api/opportunities/:id
  // =============================================================================

  test.describe('GET /api/opportunities/:id', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.get('/api/opportunities/test-id');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return opportunity by ID', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Test Opportunity',
          description: 'Test description',
          query: 'test query',
          priority_score: 85,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities/${opportunity!.id}`);

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.opportunity).toMatchObject({
        id: opportunity!.id,
        type: 'content_gap',
        category: 'content',
        title: 'Test Opportunity',
        priority_score: 85,
        status: 'open',
      });
    });

    test('should return 404 for other user opportunity', async ({ request }) => {

      const otherUser = await ctx.createUser({ subscription: 'active' });
      const otherProject = await ctx.createProject(otherUser.id, { name: 'Other Project' });

      const { supabaseAdmin } = ctx;
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: otherProject.id,
          user_id: otherUser.id,
          type: 'content_gap',
          category: 'content',
          title: 'Other User Opportunity',
          description: 'Other user description',
          priority_score: 70,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.get(`/api/opportunities/${opportunity!.id}`);

      response.expectStatus(404);
      await response.expectErrorCode('NOT_FOUND');
    });
  });

  // =============================================================================
  // PATCH /api/opportunities
  // =============================================================================

  test.describe('PATCH /api/opportunities', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.patch('/api/opportunities?opportunityId=test', {
        status: 'completed',
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should update opportunity status', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Status Update Test',
          description: 'Test status update',
          priority_score: 75,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.patch(`/api/opportunities?opportunityId=${opportunity!.id}`, {
        status: 'completed',
      });

      response.expectStatus(200).expectSuccess();

      // Verify in database
      const { data: updated } = await supabaseAdmin
        .from('opportunities')
        .select('status')
        .eq('id', opportunity!.id)
        .single();

      expect(updated!.status).toBe('completed');
    });

    test('should reject invalid status', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Invalid Status Test',
          description: 'Test invalid status',
          priority_score: 75,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.patch(`/api/opportunities?opportunityId=${opportunity!.id}`, {
        status: 'invalid_status',
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });
  });

  // =============================================================================
  // POST /api/opportunities/:id/create-article
  // =============================================================================

  test.describe('POST /api/opportunities/:id/create-article', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post('/api/opportunities/test-id/create-article');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should create campaign from content opportunity', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Content Gap Article',
          description: 'Create article for content gap',
          query: 'best seo tools 2024',
          priority_score: 85,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post(`/api/opportunities/${opportunity!.id}/create-article`, {
        projectId,
      });

      response.expectStatus(201).expectSuccess();
      const data = await response.getData();

      expect(data.campaignId).toBeDefined();
      expect(data.opportunityId).toBe(opportunity!.id);
    });

    test('should reject non-content type opportunity', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'low_ctr',
          category: 'technical',
          title: 'Technical Issue',
          description: 'Fix low CTR issue',
          query: 'technical keyword',
          priority_score: 60,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      const response = await api.post(`/api/opportunities/${opportunity!.id}/create-article`, {
        projectId,
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should update opportunity status to in_progress', async ({ request }) => {

      const { supabaseAdmin } = ctx;

      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'low_hanging_fruit',
          category: 'content',
          title: 'Low Hanging Fruit',
          description: 'Easy win opportunity',
          query: 'easy keyword',
          priority_score: 90,
          status: 'open',
        })
        .select()
        .single();

      const api = new ApiClient(request).withAuth(user.token);

      await api.post(`/api/opportunities/${opportunity!.id}/create-article`, {
        projectId,
      });

      // Verify opportunity status was updated
      const { data: updated } = await supabaseAdmin
        .from('opportunities')
        .select('status, action_type')
        .eq('id', opportunity!.id)
        .single();

      expect(updated!.status).toBe('in_progress');
      expect(updated!.action_type).toBe('create_article');
    });
  });
});
