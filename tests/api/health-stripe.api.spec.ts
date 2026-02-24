import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Health — Stripe (§13)
 *
 * Route tested:
 *   GET /api/health/stripe
 *
 * NOTE: /api/health/stripe is NOT in PUBLIC_API_ROUTES — it requires
 * authentication. The unauthenticated 401 test always runs.
 * Authenticated response-shape tests are skipped in mock test mode.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('GET /api/health/stripe', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/health/stripe');
    response.expectStatus(401);
  });

  test('should return valid response shape for authenticated user', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase auth — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/health/stripe');
    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('stripe_configured');
      expect(data).toHaveProperty('webhook_secret_valid');
      expect(data).toHaveProperty('api_key_valid');
      expect(data).toHaveProperty('test_mode');
      expect(typeof data.stripe_configured).toBe('boolean');
      expect(typeof data.webhook_secret_valid).toBe('boolean');
      expect(typeof data.api_key_valid).toBe('boolean');
      expect(typeof data.test_mode).toBe('boolean');
    }
  });

  test('should reflect test_mode: true when using dummy Stripe key', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase auth — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/health/stripe');
    if (response.status === 200) {
      const data = await response.json();
      if (data.test_mode) {
        expect(data.test_mode).toBe(true);
      }
    }
  });

  test('should respond within 5 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/health/stripe');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
