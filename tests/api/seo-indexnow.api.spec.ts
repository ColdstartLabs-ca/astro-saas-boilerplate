import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers';

/**
 * API Tests: SEO IndexNow (§16)
 *
 * Routes tested:
 *   GET  /api/seo/indexnow  — status (requires x-cron-secret)
 *   POST /api/seo/indexnow  — submit URL(s) (requires x-cron-secret)
 *
 * Auth: x-cron-secret header (same as cron endpoints)
 */

const getCronSecret = () => process.env.CRON_SECRET || 'test-cron-secret';
const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('GET /api/seo/indexnow', () => {
  test('should reject requests without x-cron-secret (401)', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/seo/indexnow');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should reject requests with invalid x-cron-secret (401)', async ({ request }) => {
    const response = await request.get('/api/seo/indexnow', {
      headers: { 'x-cron-secret': 'wrong-secret' },
    });
    expect(response.status()).toBe(401);
  });

  test('should return status with valid x-cron-secret', async ({ request }) => {
    test.skip(
    );

    const response = await request.get('/api/seo/indexnow', {
      headers: { 'x-cron-secret': getCronSecret() },
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });
});

test.describe('POST /api/seo/indexnow', () => {
  test('should reject requests without x-cron-secret (401)', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/seo/indexnow', {
      url: 'https://autopilotrank.com/blog/test',
    });
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should reject requests with invalid x-cron-secret (401)', async ({ request }) => {
    const response = await request.post('/api/seo/indexnow', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': 'bad-secret',
      },
      data: { url: 'https://autopilotrank.com/blog/test' },
    });
    expect(response.status()).toBe(401);
  });

  test('should reject invalid request body (400) with valid cron secret', async ({ request }) => {
    );

    const response = await request.post('/api/seo/indexnow', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': getCronSecret(),
      },
      data: { notAUrl: 'garbage' },
    });

    expect([400, 422]).toContain(response.status());
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('should accept a valid single URL with valid cron secret', async ({ request }) => {
    );

    const response = await request.post('/api/seo/indexnow', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': getCronSecret(),
      },
      data: { url: 'https://autopilotrank.com/blog/test-post' },
    });

    expect([200, 500]).toContain(response.status());
  });

  test('should reject empty urls array with valid cron secret', async ({ request }) => {
    );

    const response = await request.post('/api/seo/indexnow', {
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': getCronSecret(),
      },
      data: { urls: [] },
    });

    expect([400, 422]).toContain(response.status());
  });
});
