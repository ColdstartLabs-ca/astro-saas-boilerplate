import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Content Planning Endpoints
 *
 * Covers authentication, validation, and basic access-control for:
 * - POST /api/campaigns/:campaignId/plan-content
 * - POST /api/articles/:articleId/generate-now
 * - POST /api/cron/generate-planned-articles
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

// =============================================================================
// POST /api/campaigns/:campaignId/plan-content
// =============================================================================

test.describe('API: POST /api/campaigns/:id/plan-content', () => {
  // ---------------------------------------------------------------------------
  // 401 — unauthenticated
  // ---------------------------------------------------------------------------
  test('should return 401 when called without authentication', async ({ request }) => {
    const api = new ApiClient(request);
    // Use a valid UUID so the request reaches auth check, not UUID validation
    const validUuid = crypto.randomUUID();
    const response = await api.post(`/api/campaigns/${validUuid}/plan-content`, {});

    response.expectStatus(401);
  });

  // ---------------------------------------------------------------------------
  // 400 — invalid UUID format
  // ---------------------------------------------------------------------------
  test('should return 400 when campaignId is not a valid UUID', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth' });
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/campaigns/not-a-uuid/plan-content', {});

    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // 404 — campaign not found
  // ---------------------------------------------------------------------------
  test('should return 404 when campaign does not exist', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth' });
    const api = new ApiClient(request).withAuth(user.token);

    // Valid UUID that doesn't correspond to any campaign
    const nonExistentCampaignId = crypto.randomUUID();
    const response = await api.post(`/api/campaigns/${nonExistentCampaignId}/plan-content`, {});

    response.expectStatus(404);
    await response.expectErrorCode('NOT_FOUND');
  });
});

// =============================================================================
// POST /api/articles/:articleId/generate-now
// =============================================================================

test.describe('API: POST /api/articles/:id/generate-now', () => {
  // ---------------------------------------------------------------------------
  // 401 — unauthenticated
  // ---------------------------------------------------------------------------
  test('should return 401 when called without authentication', async ({ request }) => {
    const api = new ApiClient(request);
    const validUuid = crypto.randomUUID();
    const response = await api.post(`/api/articles/${validUuid}/generate-now`, {});

    response.expectStatus(401);
  });

  // ---------------------------------------------------------------------------
  // 404 — article not found or not owned
  // ---------------------------------------------------------------------------
  test('should return 404 when article does not exist', async ({ request }) => {
    const user = await ctx.createUser({ subscription: 'active', tier: 'growth' });
    const api = new ApiClient(request).withAuth(user.token);

    const nonExistentArticleId = crypto.randomUUID();
    const response = await api.post(`/api/articles/${nonExistentArticleId}/generate-now`, {});

    // 404 when article not found or not owned
    response.expectStatus(404);
  });
});

// =============================================================================
// POST /api/cron/generate-planned-articles
// =============================================================================

test.describe('API: POST /api/cron/generate-planned-articles', () => {
  // ---------------------------------------------------------------------------
  // 401 — no cron secret header
  // ---------------------------------------------------------------------------
  test('should return 401 when x-cron-secret header is missing', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/cron/generate-planned-articles', {});

    response.expectStatus(401);
  });

  // ---------------------------------------------------------------------------
  // 401 — wrong cron secret
  // ---------------------------------------------------------------------------
  test('should return 401 when x-cron-secret header is wrong', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post(
      '/api/cron/generate-planned-articles',
      {},
      { headers: { 'x-cron-secret': 'wrong-secret-value' } }
    );

    response.expectStatus(401);
  });
});
