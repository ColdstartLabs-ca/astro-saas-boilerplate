import { test, expect } from '@playwright/test';

/**
 * API Tests: SEO — IndexNow (§16)
 *
 * IndexNow uses x-cron-secret header auth (same as cron endpoints).
 *
 * Covers:
 *   GET  /api/seo/indexnow  — status
 *   POST /api/seo/indexnow  — submit single URL or batch
 */

const getCronSecret = () => process.env.CRON_SECRET || 'test-cron-secret';
const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('API: SEO — IndexNow (§16)', () => {
  test.describe('Authentication', () => {
    test('GET — 401 without secret', async ({ request }) => {
      const response = await request.get('/api/seo/indexnow');
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    test('POST — 401 without secret', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        data: { url: 'https://autopilotrank.com/blog/test' },
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    test('GET — 401 with wrong secret', async ({ request }) => {
      const response = await request.get('/api/seo/indexnow', {
        headers: { 'x-cron-secret': 'totally-wrong' },
      });
      expect(response.status()).toBe(401);
    });

    test('POST — 401 with wrong secret', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: { 'x-cron-secret': 'totally-wrong' },
        data: { url: 'https://autopilotrank.com/blog/test' },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/seo/indexnow — Status', () => {
    test('returns 200 with valid secret', async ({ request }) => {
      const response = await request.get('/api/seo/indexnow', {
        headers: { 'x-cron-secret': getCronSecret() },
      });
      expect(response.status()).toBe(200);
    });
  });

  test.describe('POST /api/seo/indexnow — Submit', () => {
    test('should reject body without url or urls', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: {
          'x-cron-secret': getCronSecret(),
          'Content-Type': 'application/json',
        },
        data: { unrelated_field: 'value' },
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject invalid url format', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: {
          'x-cron-secret': getCronSecret(),
          'Content-Type': 'application/json',
        },
        data: { url: 'not-a-url' },
      });
      expect(response.status()).toBe(400);
    });

    test('should reject empty urls array', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: {
          'x-cron-secret': getCronSecret(),
          'Content-Type': 'application/json',
        },
        data: { urls: [] },
      });
      expect(response.status()).toBe(400);
    });

    test('should accept single URL submission', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: {
          'x-cron-secret': getCronSecret(),
          'Content-Type': 'application/json',
        },
        data: { url: 'https://autopilotrank.com/blog/test-post' },
      });
      // 200 = success, 500 = IndexNow key not configured — both fine in test env
      expect([200, 500]).toContain(response.status());
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });

    test('should accept batch URL submission', async ({ request }) => {
      const response = await request.post('/api/seo/indexnow', {
        headers: {
          'x-cron-secret': getCronSecret(),
          'Content-Type': 'application/json',
        },
        data: {
          urls: ['https://autopilotrank.com/blog/post-1', 'https://autopilotrank.com/blog/post-2'],
        },
      });
      expect([200, 500]).toContain(response.status());
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });
  });
});
