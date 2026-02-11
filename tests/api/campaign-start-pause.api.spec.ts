import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * Integration Tests for Campaign Start/Pause/Resume API
 *
 * These tests validate the pause/resume functionality for campaigns:
 * - Pause stops in-flight campaign generation
 * - Resume continues processing queued keywords
 * - Campaign status is checked before each keyword generation
 * - Unprocessed keywords remain queued for resume
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('API: Campaign Start/Pause/Resume', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;
  let campaignId: string;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'pro', credits: 100 });
    // Create a project via API for testing
    // Note: In test mode with mock users, we create a mock project ID
    if (process.env.ENV === 'test') {
      projectId = `mock_project_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else {
      const api = new ApiClient(ctx.supabaseAdmin.rest).withAuth(user.token);
      const projectResponse = await api.post('/api/projects', {
        name: 'Test Project',
        domain: 'test.example.com',
      });
      const projectData = await projectResponse.getData();
      projectId = projectData.project.id;
    }
  });

  test('should start campaign and generate articles sequentially', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const keywords = ['keyword 1', 'keyword 2', 'keyword 3'];

    // Create campaign
    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords,
      tone: 'professional',
      targetWordCount: 500,
      model: 'pro', // Use explicit preset (pro = 2 credits base)
    });
    createResponse.expectStatus(201);
    const campaignData = await createResponse.getData();
    campaignId = campaignData.campaign.id;

    // Start generation
    const startResponse = await api.post(`/api/campaigns/${campaignId}/start`);
    startResponse.expectStatus(202);
    const startData = await startResponse.getData();
    expect(startData.queued).toBe(3);
    // pro preset = 2 credits per article (base writer cost)
    expect(startData.creditsRequired).toBe(6);

    // Wait a bit for generation to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check campaign status is active
    const detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailResponse.expectStatus(200);
    const detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('active');
  });

  test('should pause campaign and stop processing remaining keywords', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const keywords = ['keyword 1', 'keyword 2', 'keyword 3', 'keyword 4', 'keyword 5'];

    // Create campaign
    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords,
      tone: 'professional',
      targetWordCount: 500,
    });
    createResponse.expectStatus(201);
    const campaignData = await createResponse.getData();
    campaignId = campaignData.campaign.id;

    // Start generation
    const startResponse = await api.post(`/api/campaigns/${campaignId}/start`);
    startResponse.expectStatus(202);

    // Wait a moment for first keyword to start processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Pause the campaign
    const pauseResponse = await api.put(`/api/campaigns/${campaignId}`, {
      status: 'paused',
    });
    pauseResponse.expectStatus(200);

    // Wait a moment for pause to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify campaign is paused
    const detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailResponse.expectStatus(200);
    const detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('paused');

    // Verify that some keywords remain queued (not all completed)
    // We can't guarantee exact numbers due to timing, but we should have queued keywords
    expect(detailData.keywords.some((k: { status: string }) => k.status === 'queued')).toBeTruthy();
  });

  test('should resume paused campaign and continue processing queued keywords', async ({
    request,
  }) => {
    const api = new ApiClient(request).withAuth(user.token);
    const keywords = ['keyword 1', 'keyword 2', 'keyword 3'];

    // Create campaign
    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords,
      tone: 'professional',
      targetWordCount: 500,
    });
    createResponse.expectStatus(201);
    const campaignData = await createResponse.getData();
    campaignId = campaignData.campaign.id;

    // Start generation
    const startResponse = await api.post(`/api/campaigns/${campaignId}/start`);
    startResponse.expectStatus(202);

    // Wait a moment then pause
    await new Promise(resolve => setTimeout(resolve, 200));
    await api.put(`/api/campaigns/${campaignId}`, { status: 'paused' });

    // Wait for pause to take effect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify we have queued keywords
    let detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    let detailData = await detailResponse.getData();
    const initialQueuedCount = detailData.keywords.filter(
      (k: { status: string }) => k.status === 'queued'
    ).length;
    expect(initialQueuedCount).toBeGreaterThan(0);

    // Resume by starting again
    const resumeResponse = await api.post(`/api/campaigns/${campaignId}/start`);
    resumeResponse.expectStatus(202);
    const resumeData = await resumeResponse.getData();
    expect(resumeData.queued).toBe(initialQueuedCount);
    // No new credits should be required for resume
    expect(resumeData.creditsRequired).toBe(0);

    // Campaign should be active again
    detailResponse = await api.get(`/api/campaigns/${campaignId}`);
    detailData = await detailResponse.getData();
    expect(detailData.campaign.status).toBe('active');
  });

  test('should throw NoPendingKeywordsError when starting with no pending or queued keywords', async ({
    request,
  }) => {
    const api = new ApiClient(request).withAuth(user.token);

    // Create campaign with no keywords
    const createResponse = await api.post('/api/campaigns', {
      name: 'Test Campaign',
      projectId,
      keywords: [],
      tone: 'professional',
      targetWordCount: 500,
    });
    createResponse.expectStatus(201);
    const campaignData = await createResponse.getData();
    campaignId = campaignData.campaign.id;

    // Try to start - should fail with no pending keywords
    const startResponse = await api.post(`/api/campaigns/${campaignId}/start`);
    startResponse.expectStatus(400);
    await startResponse.expectErrorCode('NO_PENDING_KEYWORDS');
  });
});
