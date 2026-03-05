import { test, expect } from '@playwright/test';

interface IHealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  region: string;
  checks: {
    database: {
      status: 'pass' | 'fail';
      message: string;
      duration?: number;
    };
  };
}

test.describe('API: Health — Stripe (§13)', () => {
  test('GET /api/health/stripe — returns response with required fields', async ({ request }) => {
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

  test('GET /api/health/stripe — reports test_mode when using dummy key', async ({ request }) => {
    const response = await request.get('/api/health/stripe');
    expect(response.status()).toBe(200);
    const data = await response.json();
    // In local dev with a dummy Stripe key, test_mode should be true
    expect(data.test_mode).toBe(true);
  });

  test('GET /api/health/stripe — has correct content-type', async ({ request }) => {
    const response = await request.get('/api/health/stripe');
    expect(response.headers()['content-type']).toContain('application/json');
  });
});


test.describe('API: Health Check', () => {
  test('should return valid health status response', async ({ request }) => {
    const response = await request.get('/api/health');

    // Accept both 200 (healthy/degraded) and 503 (unhealthy)
    expect([200, 503]).toContain(response.status());

    const data: IHealthCheckResponse = await response.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('region');
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('database');

    // Validate ISO 8601 timestamp
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  test('should return correct region header', async ({ request }) => {
    const response = await request.get('/api/health');
    const data: IHealthCheckResponse = await response.json();

    // Local dev should return 'Local'
    expect(data.region).toBe('Local');
  });

  test('should have database check results', async ({ request }) => {
    const response = await request.get('/api/health');
    const data: IHealthCheckResponse = await response.json();

    expect(data.checks.database).toHaveProperty('status');
    expect(['pass', 'fail']).toContain(data.checks.database.status);
    expect(data.checks.database).toHaveProperty('message');
    expect(typeof data.checks.database.message).toBe('string');
    expect(data.checks.database).toHaveProperty('duration');
    expect(typeof data.checks.database.duration).toBe('number');
  });

  test('should have correct content-type header', async ({ request }) => {
    const response = await request.get('/api/health');
    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
  });

  test('should respond quickly', async ({ request }) => {
    const startTime = Date.now();
    await request.get('/api/health');
    const duration = Date.now() - startTime;

    // Health check should respond in less than 3 seconds (allows for cold starts in dev)
    expect(duration).toBeLessThan(3000);
  });

  test('should return correct status code based on health', async ({ request }) => {
    const response = await request.get('/api/health');
    const data: IHealthCheckResponse = await response.json();

    // Healthy or degraded should return 200, unhealthy should return 503
    if (data.status === 'unhealthy') {
      expect(response.status()).toBe(503);
    } else {
      expect(response.status()).toBe(200);
    }
  });
});
