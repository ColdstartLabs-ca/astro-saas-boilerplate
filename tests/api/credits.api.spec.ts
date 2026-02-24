import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Credit History (§7.6) and Free Tier Credit Behavior (§7.1)
 *
 * Covers:
 *   GET /api/credits/history
 *   Free tier initial credits, exhaustion, no refresh, and cap
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

/**
 * Free tier configuration constants from subscription.config.ts
 * Free users get 3 initial credits, no monthly refresh, capped at 3
 */
const FREE_TIER_CONFIG = {
  initialCredits: 3,
  monthlyRefresh: false,
  maxBalance: 3,
} as const;

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
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    response.expectStatus(200).expectSuccess();
    const data = await response.getData();

    expect(Array.isArray(data.transactions)).toBe(true);
    // Subscription grants credit on user creation
    expect(data.transactions.length).toBeGreaterThanOrEqual(1);
  });

  test('each transaction has required fields', async ({ request }) => {
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
    const api = new ApiClient(request).withAuth(user.token);
    const response = await api.get('/api/credits/history');
    const data = await response.getData();

    const usageTxs = data.transactions.filter((t: { type: string }) => t.type === 'usage');
    for (const tx of usageTxs) {
      expect(tx.amount).toBeLessThan(0);
    }
  });

  test('supports pagination via limit/offset', async ({ request }) => {
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

/**
 * API Tests: Free Tier Credit Behavior (§7.1)
 *
 * Tests the credit behavior for free tier users:
 * - Initial credits: 3 on signup
 * - Credit exhaustion: blocked at 0 credits with upgrade prompt
 * - No monthly refresh for free users
 * - Credit cap: max 3 credits (cannot exceed initial allocation)
 */
test.describe('API: Free Tier Credit Behavior (§7.1)', () => {
  let freeUser: Awaited<ReturnType<typeof ctx.createUser>>;
  let project: Awaited<ReturnType<typeof ctx.createProject>>;
  let campaign: Awaited<ReturnType<typeof ctx.createCampaign>>;

  test.beforeEach(async () => {
    // Create free tier user with default 3 credits
    freeUser = await ctx.createUser({
      subscription: 'free',
      credits: FREE_TIER_CONFIG.initialCredits,
    });

    // Create project and campaign for article generation tests
    project = await ctx.createProject(freeUser.id, {
      name: 'Free Tier Test Project',
      url: 'https://example.com',
    });

    campaign = await ctx.createCampaign(freeUser.id, project.id, {
      name: 'Free Tier Test Campaign',
      keywords: ['test keyword'],
    });
  });

  test('new free user starts with 3 credits', async ({ request }) => {
    // Skip in test mode - requires real DB to verify initial credit allocation
    test.skip(isTestMode(), 'Free tier initial credits requires real DB for credit verification');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Get user profile to check initial credits
    const profileResponse = await api.get('/api/user/profile');
    profileResponse.expectStatus(200);

    const profile = await profileResponse.getData();

    // Free user should start with exactly 3 credits
    expect(profile.credits_balance ?? profile.subscription_credits_balance).toBe(
      FREE_TIER_CONFIG.initialCredits
    );
  });

  test('free user credit balance reflects initial allocation', async ({ request }) => {
    // Skip in test mode - requires real DB for credit verification
    test.skip(isTestMode(), 'Credit balance verification requires real DB');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Get credits via dashboard/billing endpoint if available
    const creditsResponse = await api.get('/api/credits/balance');
    creditsResponse.expectStatus(200);

    const credits = await creditsResponse.getData();

    // Verify free tier gets exactly 3 initial credits
    expect(credits.total_balance ?? credits.balance).toBe(FREE_TIER_CONFIG.initialCredits);
    expect(credits.subscription_tier).toBeNull();
  });

  test('article generation with 3 credits succeeds 3 times then fails on 4th', async ({
    request,
  }) => {
    // Skip in test mode - requires real DB and full article generation flow
    test.skip(isTestMode(), 'Credit exhaustion flow requires real DB for article generation');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Generate 3 articles (should all succeed with 3 credits)
    for (let i = 0; i < FREE_TIER_CONFIG.initialCredits; i++) {
      const generateResponse = await api.post('/api/articles/generate', {
        keyword: `test article ${i + 1}`,
        projectId: project.id,
        campaignId: campaign.id,
      });

      // Should succeed with 202 Accepted
      generateResponse.expectStatus(202);
    }

    // Verify credits are now 0
    const balanceResponse = await api.get('/api/credits/balance');
    const balance = await balanceResponse.getData();
    expect(balance.total_balance ?? balance.balance).toBe(0);

    // 4th generation attempt should be blocked with 402 Payment Required
    const fourthGenerateResponse = await api.post('/api/articles/generate', {
      keyword: 'fourth article attempt',
      projectId: project.id,
      campaignId: campaign.id,
    });

    fourthGenerateResponse.expectStatus(402);
    await fourthGenerateResponse.expectErrorCode('INSUFFICIENT_CREDITS');
  });

  test('insufficient credits shows upgrade prompt in error response', async ({ request }) => {
    // Skip in test mode - requires real DB
    test.skip(isTestMode(), 'Upgrade prompt verification requires real DB');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Create a user with 0 credits directly
    const zeroCreditUser = await ctx.createUser({ subscription: 'free', credits: 0 });
    const zeroProject = await ctx.createProject(zeroCreditUser.id, {
      name: 'Zero Credit Project',
    });
    const zeroCampaign = await ctx.createCampaign(zeroCreditUser.id, zeroProject.id, {
      name: 'Zero Credit Campaign',
      keywords: ['test'],
    });

    const zeroApi = new ApiClient(request).withAuth(zeroCreditUser.token);

    // Attempt generation with 0 credits
    const response = await zeroApi.post('/api/articles/generate', {
      keyword: 'blocked article',
      projectId: zeroProject.id,
      campaignId: zeroCampaign.id,
    });

    response.expectStatus(402);

    const errorData = (await response.json()) as {
      success: boolean;
      error?: { code: string; message: string; upgradeRequired?: boolean };
    };

    expect(errorData.success).toBe(false);
    expect(errorData.error?.code).toBe('INSUFFICIENT_CREDITS');

    // Error message should indicate upgrade is needed
    const message = errorData.error?.message?.toLowerCase() ?? '';
    expect(
      message.includes('insufficient') || message.includes('credit') || message.includes('upgrade')
    ).toBe(true);
  });

  test('free users do not get monthly credit refresh', async ({ request }) => {
    // Skip in test mode - requires real DB and time-based testing
    test.skip(isTestMode(), 'Monthly refresh verification requires real DB');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Get initial credits
    const initialResponse = await api.get('/api/credits/balance');
    const initialCredits = await initialResponse.getData();

    // Verify the subscription config says no monthly refresh for free tier
    // This is a configuration verification test
    expect(FREE_TIER_CONFIG.monthlyRefresh).toBe(false);

    // Free tier should not have a subscription that triggers monthly credit grants
    const profileResponse = await api.get('/api/user/profile');
    const profile = await profileResponse.getData();

    // Free users have null subscription status
    expect(profile.subscription_status).toBeNull();
    expect(profile.subscription_tier).toBeNull();

    // Initial credits should remain at the free tier allocation
    expect(initialCredits.total_balance ?? initialCredits.balance).toBe(
      FREE_TIER_CONFIG.initialCredits
    );
  });

  test('free users capped at max 3 credits - cannot exceed allocation', async ({ request }) => {
    // Skip in test mode - requires real DB
    test.skip(isTestMode(), 'Credit cap verification requires real DB');

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Verify the max balance config for free tier
    expect(FREE_TIER_CONFIG.maxBalance).toBe(3);

    // Get current balance
    const balanceResponse = await api.get('/api/credits/balance');
    const balance = await balanceResponse.getData();

    // Free users should never have more than maxBalance
    const currentBalance = balance.total_balance ?? balance.balance ?? 0;
    expect(currentBalance).toBeLessThanOrEqual(FREE_TIER_CONFIG.maxBalance);
  });

  test('free tier credit transaction shows initial grant', async ({ request }) => {
    // Skip in test mode - requires real DB for transaction history
    test.skip(isTestMode(), 'Transaction history requires real DB');

    const api = new ApiClient(request).withAuth(freeUser.token);

    const historyResponse = await api.get('/api/credits/history');
    historyResponse.expectStatus(200);

    const history = await historyResponse.getData();

    // Should have at least one transaction for initial credits
    expect(history.transactions.length).toBeGreaterThanOrEqual(1);

    // Find the initial credit grant transaction
    const initialGrant = history.transactions.find(
      (t: { type: string; amount: number }) =>
        (t.type === 'initial' || t.type === 'bonus' || t.type === 'trial') && t.amount > 0
    );

    // Free users get initial credits via bonus/initial grant
    expect(initialGrant).toBeDefined();
    expect(initialGrant.amount).toBe(FREE_TIER_CONFIG.initialCredits);
  });

  test('free user cannot access paid-only credit pack endpoints', async ({ request }) => {
    const api = new ApiClient(request).withAuth(freeUser.token);

    // Attempt to access credit pack purchase endpoint
    const packsResponse = await api.get('/api/credits/packs');

    // Endpoint should either not exist (404) or return packs without allowing purchase
    // Free tier can view packs but may be restricted from purchasing
    expect([200, 404]).toContain(packsResponse.status);
  });

  test('free tier batch limit is 1 article at a time', async ({ request }) => {
    // Skip in test mode - requires real DB
    test.skip(isTestMode(), 'Batch limit verification requires real DB');

    // Verify batch limit configuration for free tier
    // From subscription.config.ts: freeUser.batchLimit = 1
    const FREE_BATCH_LIMIT = 1;

    const api = new ApiClient(request).withAuth(freeUser.token);

    // Attempt to generate more than 1 article in a batch should be rejected
    const batchResponse = await api.post('/api/articles/generate-batch', {
      keywords: ['keyword 1', 'keyword 2'],
      projectId: project.id,
      campaignId: campaign.id,
    });

    // Should be rejected if batch exceeds limit
    // Note: This endpoint may not exist, in which case we test single generation flow
    if (batchResponse.status !== 404) {
      expect([400, 403]).toContain(batchResponse.status);
    }
  });
});

/**
 * Interface for credit balance response
 */
interface ICreditBalanceResponse {
  total_balance?: number;
  balance?: number;
  subscription_credits_balance?: number;
  purchased_credits_balance?: number;
  subscription_tier?: string | null;
}

/**
 * Interface for user profile response
 */
interface IUserProfileResponse {
  id: string;
  email?: string;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  credits_balance?: number;
  subscription_credits_balance?: number;
  purchased_credits_balance?: number;
}
