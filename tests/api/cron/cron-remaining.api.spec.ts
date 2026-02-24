import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers';

/**
 * API Tests: Remaining Cron Endpoints — Auth (§15)
 *
 * All cron endpoints share the same auth pattern:
 *   - 401 without x-cron-secret header
 *   - 401 with wrong x-cron-secret
 *   - 200 with correct x-cron-secret (even if no work to do)
 *
 * Endpoints covered:
 *   POST /api/cron/process-scheduled-campaigns
 *   POST /api/cron/recover-stale-articles
 *   POST /api/cron/recover-webhooks
 *   POST /api/cron/check-expirations
 *   POST /api/cron/reconcile
 */

const getCronSecret = () => process.env.CRON_SECRET || 'test-cron-secret';
const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

const CRON_ENDPOINTS = [
  '/api/cron/process-scheduled-campaigns',
  '/api/cron/recover-stale-articles',
  '/api/cron/recover-webhooks',
  '/api/cron/check-expirations',
  '/api/cron/reconcile',
] as const;

for (const endpoint of CRON_ENDPOINTS) {
  test.describe(`POST ${endpoint}`, () => {
    test('should reject requests without cron secret (401)', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post(endpoint, {});
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should reject requests with invalid cron secret (401)', async ({ request }) => {
      const response = await request.post(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': 'totally-wrong-secret',
        },
        data: {},
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('UNAUTHORIZED');
    });

    test('should accept requests with valid cron secret (200)', async ({ request }) => {

      const response = await request.post(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': getCronSecret(),
        },
        data: {},
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should NOT be accessible without any authentication header', async ({ request }) => {
      const response = await request.post(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      expect(response.status()).not.toBe(200);
      expect([401, 403]).toContain(response.status());
    });
  });
}
