import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Cross-User Authorization (§1.3)
 *
 * Validates that authenticated users cannot access or mutate another
 * user's resources. Every resource endpoint must return 403 or 404
 * when accessed by an unauthorized user — never 200.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('Cross-User Authorization (§1.3)', () => {
  test('should not allow accessing another user credit history', async ({ request }) => {

    const owner = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
    const attacker = await ctx.createUser({ subscription: 'active', tier: 'growth' });

    // Credit history is scoped by JWT — attacker gets their own empty history, not owner's
    const ownerApi = new ApiClient(request).withAuth(owner.token);
    const ownerHistory = await ownerApi.get('/api/credits/history');
    ownerHistory.expectStatus(200);
    const ownerData = await ownerHistory.getData();

    const attackerApi = new ApiClient(request).withAuth(attacker.token);
    const attackerHistory = await attackerApi.get('/api/credits/history');
    attackerHistory.expectStatus(200);
    const attackerData = await attackerHistory.getData();

    // Attacker should see their own transactions only, not owner's
    if (ownerData.transactions?.length > 0 && attackerData.transactions?.length >= 0) {
      const ownerIds = new Set(ownerData.transactions.map((t: { id: string }) => t.id));
      const leaked = (attackerData.transactions ?? []).some((t: { id: string }) =>
        ownerIds.has(t.id)
      );
      expect(leaked).toBe(false);
    }
  });

  test('non-admin should get 403 on admin endpoints', async ({ request }) => {
    const regularUser = await ctx.createUser({ subscription: 'active', tier: 'growth' });
    const api = new ApiClient(request).withAuth(regularUser.token);

    const adminEndpoints = [
      () => api.get('/api/admin/stats'),
      () => api.get('/api/admin/users'),
      () => api.post('/api/admin/credits/adjust', { userId: regularUser.id, amount: 1000 }),
    ];

    for (const call of adminEndpoints) {
      const response = await call();
      expect([401, 403]).toContain(response.status);
    }
  });
});
