import { test, expect } from '@playwright/test';

/**
 * API Tests: Health — Stripe
 *
 * Route tested:
 *   GET /api/health/stripe
 *
 * NOTE: /api/health/stripe is a PUBLIC health check endpoint.
 * It returns Stripe configuration status without requiring authentication.
 */

test.describe('GET /api/health/stripe', () => {
  test('should return valid response without authentication', async ({ request }) => {
    const response = await request.get('/api/health/stripe');

    // Should always return 200 (even with dummy keys)
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('stripe_configured');
    expect(data).toHaveProperty('webhook_secret_valid');
    expect(data).toHaveProperty('api_key_valid');
    expect(data).toHaveProperty('test_mode');
    expect(typeof data.stripe_configured).toBe('boolean');
    expect(typeof data.webhook_secret_valid).toBe('boolean');
    expect(typeof data.api_key_valid).toBe('boolean');
    expect(typeof data.test_mode).toBe('boolean');
  });

  test('should reflect test_mode: true when using dummy Stripe key', async ({ request }) => {
    const response = await request.get('/api/health/stripe');
    expect(response.status()).toBe(200);

    const data = await response.json();
    // In local dev/test with a dummy Stripe key, test_mode should be true
    expect(data.test_mode).toBe(true);
  });

  test('should respond within 5 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/health/stripe');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('should return correct content-type', async ({ request }) => {
    const response = await request.get('/api/health/stripe');
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
