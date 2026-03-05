/**
 * QA API Tests for Core SaaS Boilerplate Infrastructure
 *
 * These tests verify the remaining API endpoints after stripping
 * domain-specific code from AutopilotRank to create a reusable
 * SaaS boilerplate.
 *
 * PR: feat: Strip AutopilotRank to reusable SaaS boilerplate
 *
 * Tested endpoints:
 * - Health checks
 * - Auth endpoints
 * - Credits endpoints
 * - Subscription endpoints
 * - Admin endpoints
 * - Webhook endpoints
 */

import { test, expect } from '../../fixtures';

test.describe('Core API Health QA', () => {
  test.describe('Health Endpoints', () => {
    test('GET /api/health should return 200', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
    });

    test('GET /api/health/stripe should return valid response', async ({ request }) => {
      const response = await request.get('/api/health/stripe');
      // Should return 200 or 503 (if Stripe is not configured)
      expect([200, 503]).toContain(response.status());
    });
  });
});

test.describe('Core API Structure QA', () => {
  test.describe('Auth Endpoints', () => {
    test('POST /api/auth/callback should exist', async ({ request }) => {
      const response = await request.post('/api/auth/callback', {
        data: {},
      });
      // Should not return 404 (endpoint exists)
      expect(response.status()).not.toBe(404);
    });
  });

  test.describe('Credits Endpoints', () => {
    test('GET /api/credits without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/credits');
      expect(response.status()).toBe(401);
    });

    test('GET /api/credits/history without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/credits/history');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Subscription Endpoints', () => {
    test('GET /api/subscription without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/subscription');
      expect(response.status()).toBe(401);
    });

    test('POST /api/subscription/change without auth should return 401', async ({ request }) => {
      const response = await request.post('/api/subscription/change', {
        data: { priceId: 'test' },
      });
      expect(response.status()).toBe(401);
    });

    test('POST /api/subscriptions/cancel without auth should return 401', async ({ request }) => {
      const response = await request.post('/api/subscriptions/cancel', {
        data: {},
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Checkout Endpoints', () => {
    test('POST /api/checkout without auth should return 401', async ({ request }) => {
      const response = await request.post('/api/checkout', {
        data: { priceId: 'test' },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Portal Endpoint', () => {
    test('POST /api/portal without auth should return 401', async ({ request }) => {
      const response = await request.post('/api/portal', {
        data: {},
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Settings Endpoints', () => {
    test('GET /api/settings without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/settings');
      expect(response.status()).toBe(401);
    });

    test('GET /api/settings/api-keys without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/settings/api-keys');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Admin Endpoints', () => {
    test('GET /api/admin without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/admin');
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/users without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/admin/users');
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/stats without auth should return 401', async ({ request }) => {
      const response = await request.get('/api/admin/stats');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Support Endpoint', () => {
    test('POST /api/support/contact should validate input', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: {},
      });
      // Should return 400 (validation error) or 401 (auth required)
      expect([400, 401, 422]).toContain(response.status());
    });
  });

  test.describe('Analytics Endpoint', () => {
    test('POST /api/analytics/event without auth should return 401', async ({ request }) => {
      const response = await request.post('/api/analytics/event', {
        data: { event: 'test', properties: {} },
      });
      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Webhook Endpoints QA', () => {
  test.describe('Stripe Webhook', () => {
    test('POST /api/webhooks/stripe should require signature', async ({ request }) => {
      const response = await request.post('/api/webhooks/stripe', {
        data: { type: 'test' },
      });
      // Should return 400 (bad request) or 401 (unauthorized)
      // Stripe webhooks require valid signature
      expect([400, 401]).toContain(response.status());
    });
  });
});

test.describe('Cron Endpoints QA', () => {
  test('GET /api/cron/credit-expiration should require auth', async ({ request }) => {
    const response = await request.get('/api/cron/credit-expiration');
    // Should require authorization
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Email Endpoints QA', () => {
  test('POST /api/email/preferences without auth should return 401', async ({ request }) => {
    const response = await request.post('/api/email/preferences', {
      data: {},
    });
    expect(response.status()).toBe(401);
  });
});
