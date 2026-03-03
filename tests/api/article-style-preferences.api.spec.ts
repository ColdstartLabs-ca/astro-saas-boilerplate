import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Article Style Preferences End-to-End
 *
 * Tests that article style preferences are stored correctly on campaigns
 * and flow through to article generation. Since generation happens in the
 * background, we verify the campaign setup and article creation work correctly.
 *
 * Note: These tests verify the API endpoints accept and store style preferences.
 * The actual flow to the LLM is verified through unit tests in
 * tests/unit/server/services/article-generation.service.unit.spec.ts
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('API: Article Style Preferences End-to-End', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'pro', credits: 100 });
    // Create a project - in test mode this uses the mock DB file
    const project = await ctx.createProject(user.id, { name: 'Style Prefs Test Project' });
    projectId = project.id;
  });

  test.describe('Campaign Creation with Style Preferences', () => {
    test('should create campaign with article_style preference', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Style Test Campaign',
        projectId,
        keywords: ['test keyword'],
        model: 'balanced',
        articleStyle: 'how-to',
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();
      expect(campaign.article_style).toBe('how-to');
    });

    test('should create campaign with global_instructions preference', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Style Test Campaign',
        projectId,
        keywords: ['test keyword'],
        model: 'balanced',
        globalInstructions: 'Use simple language and avoid jargon',
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();
      expect(campaign.global_instructions).toBe('Use simple language and avoid jargon');
    });

    test('should create campaign with internal_links_count preference', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Style Test Campaign',
        projectId,
        keywords: ['test keyword'],
        model: 'balanced',
        internalLinksCount: 5,
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();
      expect(campaign.internal_links_count).toBe(5);
    });

    test('should create campaign with boolean style preferences', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Style Test Campaign',
        projectId,
        keywords: ['test keyword'],
        model: 'balanced',
        includeYoutube: true,
        includeCta: true,
        includeEmojis: false,
        includeInfographics: true,
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();
      expect(campaign.include_youtube).toBe(true);
      expect(campaign.include_cta).toBe(true);
      expect(campaign.include_emojis).toBe(false);
      expect(campaign.include_infographics).toBe(true);
    });

    test('should create campaign with image_style preference', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Style Test Campaign',
        projectId,
        keywords: ['test keyword'],
        model: 'balanced',
        imageStyle: 'watercolor',
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();
      expect(campaign.image_style).toBe('watercolor');
    });

    test('should create campaign with all style preferences combined', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'Full Style Test Campaign',
        projectId,
        keywords: ['all prefs keyword'],
        model: 'balanced',
        articleStyle: 'listicle',
        globalInstructions: 'Make it engaging and fun to read',
        internalLinksCount: 3,
        includeYoutube: true,
        includeCta: true,
        includeEmojis: true,
        includeInfographics: false,
        imageStyle: 'cinematic',
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();

      // Verify all preferences are stored
      expect(campaign.article_style).toBe('listicle');
      expect(campaign.global_instructions).toBe('Make it engaging and fun to read');
      expect(campaign.internal_links_count).toBe(3);
      expect(campaign.include_youtube).toBe(true);
      expect(campaign.include_cta).toBe(true);
      expect(campaign.include_emojis).toBe(true);
      expect(campaign.include_infographics).toBe(false);
      expect(campaign.image_style).toBe('cinematic');
    });
  });

  test.describe('Campaign Update with Style Preferences', () => {
    test('should update campaign article_style', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create campaign with initial style
      const createRes = await api.post('/api/campaigns', {
        name: 'Update Test Campaign',
        projectId,
        keywords: ['update keyword'],
        articleStyle: 'informative',
      });
      createRes.expectStatus(201);
      const { campaign } = await createRes.getData();

      // Update to a different style
      const updateRes = await api.put(`/api/campaigns/${campaign.id}`, {
        articleStyle: 'opinion',
      });
      updateRes.expectStatus(200);
      const updatedCampaign = await updateRes.getData();

      expect(updatedCampaign.campaign.article_style).toBe('opinion');
    });

    test('should update campaign global_instructions', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const createRes = await api.post('/api/campaigns', {
        name: 'Update Instructions Campaign',
        projectId,
        keywords: ['instructions keyword'],
        globalInstructions: 'Original instructions',
      });
      createRes.expectStatus(201);
      const { campaign } = await createRes.getData();

      const updateRes = await api.put(`/api/campaigns/${campaign.id}`, {
        globalInstructions: 'Updated instructions with more detail',
      });
      updateRes.expectStatus(200);
      const updatedCampaign = await updateRes.getData();

      expect(updatedCampaign.campaign.global_instructions).toBe(
        'Updated instructions with more detail'
      );
    });
  });

  test.describe('Campaign Start with Style Preferences', () => {
    test('should start campaign with style preferences and create articles', async ({
      request,
    }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create campaign with style preferences
      const createRes = await api.post('/api/campaigns', {
        name: 'Start Style Test Campaign',
        projectId,
        keywords: ['tutorial keyword 1', 'tutorial keyword 2'],
        model: 'balanced',
        articleStyle: 'tutorial',
        globalInstructions: 'Be thorough and step-by-step',
        internalLinksCount: 2,
        includeYoutube: true,
        includeCta: false,
        includeEmojis: false,
        includeInfographics: true,
        imageStyle: 'illustration',
      });
      createRes.expectStatus(201);
      const { campaign } = await createRes.getData();

      // Start the campaign
      const startRes = await api.post(`/api/campaigns/${campaign.id}/start`);
      startRes.expectStatus(202);
      const startData = await startRes.getData();

      // Verify articles were queued
      expect(startData.queued).toBe(2);
      expect(startData.creditsRequired).toBeGreaterThan(0);

      // Verify campaign status is active
      const detailRes = await api.get(`/api/campaigns/${campaign.id}`);
      detailRes.expectStatus(200);
      const detailData = await detailRes.getData();

      expect(detailData.campaign.status).toBe('active');
      // Style preferences should still be intact
      expect(detailData.campaign.article_style).toBe('tutorial');
      expect(detailData.campaign.global_instructions).toBe('Be thorough and step-by-step');
    });
  });

  test.describe('Missing Style Preferences Handling', () => {
    test('should create campaign without style preferences (defaults)', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Create campaign without any style preferences
      const campaignRes = await api.post('/api/campaigns', {
        name: 'No Style Prefs Campaign',
        projectId,
        keywords: ['default style keyword'],
        model: 'balanced',
      });

      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();

      // Verify defaults are null/false
      expect(campaign.article_style).toBeNull();
      expect(campaign.global_instructions).toBeNull();
      expect(campaign.internal_links_count).toBeNull();
      expect(campaign.include_youtube).toBe(false);
      expect(campaign.include_cta).toBe(false);
      expect(campaign.include_emojis).toBe(false);
      expect(campaign.include_infographics).toBe(false);
      expect(campaign.image_style).toBeNull();
    });

    test('should start campaign without style preferences', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      const campaignRes = await api.post('/api/campaigns', {
        name: 'No Prefs Start Campaign',
        projectId,
        keywords: ['no prefs keyword'],
        model: 'balanced',
      });
      campaignRes.expectStatus(201);
      const { campaign } = await campaignRes.getData();

      // Should still be able to start the campaign
      const startRes = await api.post(`/api/campaigns/${campaign.id}/start`);
      startRes.expectStatus(202);
      const startData = await startRes.getData();

      expect(startData.queued).toBe(1);
    });
  });
});
