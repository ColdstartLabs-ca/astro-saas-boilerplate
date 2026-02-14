/**
 * API Tests for Cron: Analyze Opportunities
 * POST /api/cron/analyze-opportunities
 */

import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../../helpers';

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

// Match the pattern from tests/api/cron-sync.test.ts
// The test server sources .env.test which has this value
const CRON_SECRET = process.env.CRON_SECRET || 'your-secure-random-string-change-in-production';

test.describe('API: Cron Analyze Opportunities', () => {
  test('should reject requests without cron secret', async ({ request }) => {
    const api = new ApiClient(request);

    const response = await api.post('/api/cron/analyze-opportunities', {});

    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should reject requests with invalid cron secret', async ({ request }) => {
    const api = new ApiClient(request);

    const response = await request.post('/api/cron/analyze-opportunities', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': 'invalid-secret',
      },
      data: {},
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  test('should accept requests with valid cron secret', async ({ request }) => {
    const response = await request.post('/api/cron/analyze-opportunities', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
      data: {},
    });

    // Should succeed (even if no connections to process)
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('processed');
    expect(body.data).toHaveProperty('succeeded');
    expect(body.data).toHaveProperty('failed');
    expect(body.data).toHaveProperty('results');
  });

  test('should return zero counts when no connections are due', async ({ request }) => {
    const response = await request.post('/api/cron/analyze-opportunities', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
      data: {},
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success', true);

    // When no connections are due, all counts should be 0
    expect(body.data.processed).toBe(0);
    expect(body.data.succeeded).toBe(0);
    expect(body.data.failed).toBe(0);
    expect(body.data.results).toEqual([]);
  });
});

test.describe('API: GSC Connection Schedule Updates', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  test('should reject unauthenticated requests to PATCH schedule', async ({ request }) => {
    const api = new ApiClient(request);

    const response = await api.patch('/api/gsc/connections/test-id', {
      autoAnalyze: true,
    });

    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return 404 for non-existent connection on PATCH', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/gsc/connections/00000000-0000-4000-8000-000000000000', {
      autoAnalyze: true,
    });

    response.expectStatus(404);
    await response.expectErrorCode('NOT_FOUND');
  });

  test('should validate autoAnalyze is boolean', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/gsc/connections/test-id', {
      autoAnalyze: 'not-a-boolean',
    });

    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });

  test('should validate analyzeFrequency is valid enum', async ({ request }) => {
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/gsc/connections/test-id', {
      analyzeFrequency: 'invalid-frequency',
    });

    response.expectStatus(400);
    await response.expectErrorCode('VALIDATION_ERROR');
  });
});
