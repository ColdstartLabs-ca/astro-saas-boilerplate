import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Credit History (§7.6)
 *
 * Covers:
 *   GET /api/credits/history
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('API: Credit History (§7.6)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  test('should reject unauthenticated', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/credits/history');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return paginated transaction list', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real DB user');
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    response.expectStatus(200).expectSuccess();
    const data = await response.getData();

    expect(Array.isArray(data.transactions)).toBe(true);
    // Subscription grants credit on user creation
    expect(data.transactions.length).toBeGreaterThanOrEqual(1);
  });

  test('each transaction has required fields', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real DB user');
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    response.expectStatus(200);
    const data = await response.getData();

    for (const tx of data.transactions) {
      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('created_at');
      expect(typeof tx.amount).toBe('number');
    }
  });

  test('subscription credit transaction has positive amount and correct type', async ({
    request,
  }) => {
    test.skip(isTestMode(), 'Requires real DB user');
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    const data = await response.getData();

    const subscriptionTx = data.transactions.find(
      (t: { type: string }) => t.type === 'subscription'
    );
    expect(subscriptionTx).toBeDefined();
    expect(subscriptionTx.amount).toBeGreaterThan(0);
  });

  test('usage transactions have negative amounts', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real DB user');
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    const data = await response.getData();

    const usageTxs = data.transactions.filter((t: { type: string }) => t.type === 'usage');
    for (const tx of usageTxs) {
      expect(tx.amount).toBeLessThan(0);
    }
  });

  test('supports pagination via limit/offset', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real DB user');
    const api = new ApiClient(request).withAuth(user.token);

    const page1 = await api.get('/api/credits/history?limit=1&offset=0');
    page1.expectStatus(200);
    const data1 = await page1.getData();
    expect(data1.transactions.length).toBeLessThanOrEqual(1);

    const page2 = await api.get('/api/credits/history?limit=1&offset=1');
    page2.expectStatus(200);
    const data2 = await page2.getData();
    // Different rows (or empty if only 1 tx)
    if (data1.transactions.length > 0 && data2.transactions.length > 0) {
      expect(data1.transactions[0].id).not.toBe(data2.transactions[0].id);
    }
  });

  test('does not expose other users transactions', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real DB users');
    const other = await ctx.createUser({ subscription: 'active', tier: 'starter', credits: 20 });
    const api = new ApiClient(request).withAuth(other.token);

    // User sees only their own transactions
    const response = await api.get('/api/credits/history');
    response.expectStatus(200);
    const data = await response.getData();

    // All transactions must belong to the requesting user
    const ownerApi = new ApiClient(request).withAuth(user.token);
    const ownerHistory = await ownerApi.get('/api/credits/history');
    const ownerData = await ownerHistory.getData();

    const ownerIds = new Set(ownerData.transactions.map((t: { id: string }) => t.id));
    const leaked = data.transactions.some((t: { id: string }) => ownerIds.has(t.id));
    expect(leaked).toBe(false);
  });
});
