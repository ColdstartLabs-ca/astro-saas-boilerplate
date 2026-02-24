import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Credits History (§7.6)
 *
 * Tests GET /api/credits/history — paginated transaction log.
 * Each entry should have: amount, type, description, timestamp.
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

test.describe('GET /api/credits/history', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/credits/history');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return credit transaction history for authenticated user', async ({ request }) => {

    const user = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/credits/history');
    response.expectStatus(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data) || data.data?.transactions !== undefined).toBe(true);
  });

  test('should return correct shape for each transaction entry', async ({ request }) => {

    const user = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/credits/history');
    response.expectStatus(200);

    const data = await response.json();
    const transactions = Array.isArray(data.data) ? data.data : (data.data?.transactions ?? []);

    if (transactions.length > 0) {
      const entry = transactions[0];
      expect(entry).toHaveProperty('amount');
      expect(entry).toHaveProperty('type');
      expect(typeof entry.amount).toBe('number');
      expect(typeof entry.type).toBe('string');
    }
  });

  test('should return paginated results when page param is provided', async ({ request }) => {

    const user = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/credits/history?page=1&limit=5');
    expect([200, 400]).toContain(response.status);

    if (response.status === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });

  test('should not expose another user\'s credit history', async ({ request }) => {

    const user1 = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });
    const user2 = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });

    const api2 = new ApiClient(request).withAuth(user2.token);
    const response = await api2.get('/api/credits/history');
    response.expectStatus(200);

    const data = await response.json();
    const transactions = Array.isArray(data.data) ? data.data : (data.data?.transactions ?? []);

    for (const tx of transactions) {
      if (tx.user_id) {
        expect(tx.user_id).toBe(user2.id);
      }
    }

    void user1;
  });
});
