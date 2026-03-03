import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Campaign Schedule Pause/Resume
 *
 * All campaigns are schedule-only (auto-activated on creation with status='scheduled').
 * These tests validate pause/resume functionality:
 * - Campaign is 'scheduled' immediately after creation
 * - POST /api/campaigns/:id/pause-schedule transitions to 'paused'
 * - POST /api/campaigns/:id/resume-schedule transitions back to 'scheduled'
 * - Pause/resume endpoints are idempotent (only valid on correct status)
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('API: Campaign Schedule Pause/Resume', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'pro', credits: 100 });
    if (process.env.ENV === 'test') {
      projectId = crypto.randomUUID();
    } else {
      const api = new ApiClient(request).withAuth(user.token);
      const projectResponse = await api.post('/api/projects', {
        name: 'Test Project',
        domain: 'test.example.com',
      });
      const projectData = await projectResponse.getData();
      projectId = projectData.project.id;
    }
  });

  test('campaign is scheduled immediately after creation', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords: ['keyword 1', 'keyword 2'],
      tone: 'professional',
      targetWordCount: 800,
      model: 'budget',
      scheduleFrequency: 'daily',
      scheduleBatchSize: 1,
      scheduleHour: 9,
      scheduleTimezone: 'UTC',
    });
    createResponse.expectStatus(201);
    const campaignData = await createResponse.getData();
    const campaignId = campaignData.campaign.id;

    // Campaign should be 'scheduled' immediately
    const detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailResponse.expectStatus(200);
    const detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('scheduled');
  });

  test('should pause a scheduled campaign', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Pause Campaign',
      projectId,
      keywords: ['keyword 1'],
      tone: 'professional',
      targetWordCount: 800,
      model: 'budget',
      scheduleFrequency: 'daily',
      scheduleBatchSize: 1,
      scheduleHour: 9,
      scheduleTimezone: 'UTC',
    });
    createResponse.expectStatus(201);
    const campaignId = (await createResponse.getData()).campaign.id;

    // Pause the scheduled campaign
    const pauseResponse = await api.post(`/api/campaigns/${campaignId}/pause-schedule`);
    pauseResponse.expectStatus(200);

    // Verify campaign is paused
    const detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailResponse.expectStatus(200);
    const detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('paused');
  });

  test('should resume a paused campaign', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Resume Campaign',
      projectId,
      keywords: ['keyword 1'],
      tone: 'professional',
      targetWordCount: 800,
      model: 'budget',
      scheduleFrequency: 'daily',
      scheduleBatchSize: 1,
      scheduleHour: 9,
      scheduleTimezone: 'UTC',
    });
    createResponse.expectStatus(201);
    const campaignId = (await createResponse.getData()).campaign.id;

    // Pause first
    await api.post(`/api/campaigns/${campaignId}/pause-schedule`);

    // Then resume
    const resumeResponse = await api.post(`/api/campaigns/${campaignId}/resume-schedule`);
    resumeResponse.expectStatus(200);

    // Verify campaign is scheduled again
    const detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailResponse.expectStatus(200);
    const detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('scheduled');
  });

  test('should reject campaign creation with no keywords', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords: [],
      tone: 'professional',
      targetWordCount: 800,
    });
    createResponse.expectStatus(400);
    await createResponse.expectErrorCode('VALIDATION_ERROR');
  });

  test('should return 404 for pause on non-existent campaign', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.post(
      '/api/campaigns/00000000-0000-4000-8000-000000000000/pause-schedule'
    );
    response.expectStatus(404);
  });
});
