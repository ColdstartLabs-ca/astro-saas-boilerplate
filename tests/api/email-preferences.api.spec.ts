import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Email Preferences (§11.4)
 *
 * Routes tested:
 *   GET   /api/email/preferences — fetch current email preferences
 *   PATCH /api/email/preferences — update email preferences
 *
 * NOTE: Authenticated tests require a real Supabase connection.
 * Tests that need DB access are skipped in mock test mode.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('GET /api/email/preferences', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/email/preferences');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return email preferences for authenticated user', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/email/preferences');
    response.expectStatus(200);

    const data = await response.json();
    expect(data).toHaveProperty('marketing_emails');
    expect(data).toHaveProperty('product_updates');
    expect(data).toHaveProperty('low_credit_alerts');
    expect(typeof data.marketing_emails).toBe('boolean');
    expect(typeof data.product_updates).toBe('boolean');
    expect(typeof data.low_credit_alerts).toBe('boolean');
  });

  test('should return default values for a fresh user (no preferences row)', async ({
    request,
  }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/email/preferences');
    response.expectStatus(200);

    const data = await response.json();
    if (data.user_id === undefined) {
      // No row yet → defaults
      expect(data.marketing_emails).toBe(true);
      expect(data.product_updates).toBe(true);
      expect(data.low_credit_alerts).toBe(true);
    }
  });
});

test.describe('PATCH /api/email/preferences', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.patch('/api/email/preferences', {
      marketing_emails: false,
    });
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should update a single preference', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/email/preferences', {
      marketing_emails: false,
    });
    response.expectStatus(200);

    const data = await response.json();
    expect(data.marketing_emails).toBe(false);
  });

  test('should update multiple preferences at once', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/email/preferences', {
      marketing_emails: false,
      product_updates: false,
      low_credit_alerts: true,
    });
    response.expectStatus(200);

    const data = await response.json();
    expect(data.marketing_emails).toBe(false);
    expect(data.product_updates).toBe(false);
    expect(data.low_credit_alerts).toBe(true);
  });

  test('should persist preference changes (GET after PATCH)', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    await api.patch('/api/email/preferences', { marketing_emails: false });

    const getResponse = await api.get('/api/email/preferences');
    getResponse.expectStatus(200);
    const data = await getResponse.json();
    expect(data.marketing_emails).toBe(false);
  });

  test('should reject invalid preference values', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.patch('/api/email/preferences', {
      marketing_emails: 'yes', // must be boolean
    });
    expect([400, 422]).toContain(response.status);
  });

  test('should not expose another user\'s preferences', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user1 = await ctx.createUser();
    const user2 = await ctx.createUser();

    const api1 = new ApiClient(request).withAuth(user1.token);
    await api1.patch('/api/email/preferences', {
      marketing_emails: false,
      product_updates: false,
      low_credit_alerts: false,
    });

    const api2 = new ApiClient(request).withAuth(user2.token);
    const response = await api2.get('/api/email/preferences');
    response.expectStatus(200);
    const data = await response.json();

    if (data.user_id) {
      expect(data.user_id).toBe(user2.id);
    }
  });
});
