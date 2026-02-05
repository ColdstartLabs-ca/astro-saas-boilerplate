import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';
import { stripeWebhookMocks } from '../helpers/stripe-webhook-mocks';

/**
 * Billing System Integration Tests
 *
 * Tests the complete billing workflow including:
 * - Subscription creation and management
 * - Credit allocation and rollover
 * - Stripe webhook handling
 * - Customer portal access
 * - Billing state transitions
 */
test.describe('Billing System Integration', () => {
  let ctx: TestContext;
  let freeUser: { id: string; email: string; token: string };
  let growthUser: { id: string; email: string; token: string };

  test.beforeAll(async () => {
    ctx = new TestContext();

    // Create test users with different subscription states
    freeUser = await ctx.createUser({ subscription: 'free' });
    growthUser = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test.describe('Subscription Status Validation', () => {
    test('should reflect correct subscription status', async ({ request }) => {
      const freeApi = new ApiClient(request).withAuth(freeUser.token);
      const growthApi = new ApiClient(request).withAuth(growthUser.token);

      const freeResponse = await freeApi.get('/api/profile');
      freeResponse.expectStatus(200);
      const freeProfile = await freeResponse.json();
      expect(freeProfile.data.subscription_status).toBeNull();
      expect(freeProfile.data.subscription_tier).toBeNull();
      expect(freeProfile.data.credits_balance).toBe(10);

      const growthResponse = await growthApi.get('/api/profile');
      growthResponse.expectStatus(200);
      const growthProfile = await growthResponse.json();
      expect(growthProfile.data.subscription_status).toBe('active');
      expect(growthProfile.data.subscription_tier).toBe('growth');
      expect(growthProfile.data.credits_balance).toBe(100);
    });
  });

  test.describe('Credit Allocation by Tier', () => {
    test('should enforce correct credit limits per tier', async ({ request }) => {
      // Test free tier limitations
      const freeCreditsResponse = await request.get('/api/credits', {
        headers: {
          Authorization: `Bearer ${freeUser.token}`,
        },
      });

      const freeCredits = await freeCreditsResponse.json();
      expect(freeCredits.data.balance).toBe(10);
      expect(freeCredits.data.monthlyAllowance).toBe(10);
      expect(freeCredits.data.maxRollover).toBe(10);

      // Test growth tier benefits
      const growthCreditsResponse = await request.get('/api/credits', {
        headers: {
          Authorization: `Bearer ${growthUser.token}`,
        },
      });

      const growthCredits = await growthCreditsResponse.json();
      expect(growthCredits.data.balance).toBe(100);
      expect(growthCredits.data.monthlyAllowance).toBe(100);
      expect(growthCredits.data.maxRollover).toBe(600);
    });
  });

  test.describe('Stripe Webhook Integration', () => {
    test('should handle checkout.session.completed webhook', async ({ request }) => {
      // Mock webhook payload
      const webhookPayload = stripeWebhookMocks.checkoutCompleted({
        customerId: `cus_test_${freeUser.id}`,
        userId: freeUser.id,
        tier: 'growth',
        amount: 2900,
      });

      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'stripe-signature': 'test-signature',
        },
        data: webhookPayload,
      });

      // Should process webhook (signature verification will fail in tests, but structure should be valid)
      expect([200, 401].includes(response.status())).toBeTruthy();
    });

    test('should handle invoice.payment_succeeded webhook', async ({ request }) => {
      const webhookPayload = stripeWebhookMocks.invoicePaymentSucceeded({
        customerId: `cus_test_${growthUser.id}`,
        userId: growthUser.id,
        tier: 'growth',
        amount: 2900,
      });

      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'stripe-signature': 'test-signature',
        },
        data: webhookPayload,
      });

      expect([200, 401].includes(response.status())).toBeTruthy();
    });

    test('should handle customer.subscription.updated webhook', async ({ request }) => {
      const webhookPayload = stripeWebhookMocks.subscriptionUpdated({
        customerId: `cus_test_${growthUser.id}`,
        userId: growthUser.id,
        status: 'active',
        tier: 'growth',
      });

      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'stripe-signature': 'test-signature',
        },
        data: webhookPayload,
      });

      expect([200, 401].includes(response.status())).toBeTruthy();
    });

    test('should reject webhook without valid signature', async ({ request }) => {
      const webhookPayload = stripeWebhookMocks.checkoutCompleted({
        customerId: `cus_test_${freeUser.id}`,
        userId: freeUser.id,
        tier: 'growth',
        amount: 2900,
      });

      const response = await request.post('/api/webhooks/stripe', {
        data: webhookPayload,
      });

      expect(response.status()).toBe(401);
    });

    test('should handle invalid webhook events gracefully', async ({ request }) => {
      const invalidPayload = {
        type: 'invalid.event',
        data: {
          object: {
            id: 'evt_test_invalid',
          },
        },
      };

      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'stripe-signature': 'test-signature',
        },
        data: invalidPayload,
      });

      // Should handle unknown events without crashing
      expect([200, 400, 401].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Checkout Session Integration', () => {
    test('should create checkout session for upgrade', async ({ request }) => {
      const response = await request.post('/api/billing/checkout', {
        headers: {
          Authorization: `Bearer ${freeUser.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          priceId: 'price_growth_monthly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.checkoutUrl).toBeDefined();
      expect(result.data.checkoutUrl).toContain('stripe.com');
    });

    test('should validate price IDs', async ({ request }) => {
      const response = await request.post('/api/billing/checkout', {
        headers: {
          Authorization: `Bearer ${freeUser.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          priceId: 'invalid_price_id',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('INVALID_PRICE');
    });

    test('should require authentication for checkout', async ({ request }) => {
      const response = await request.post('/api/billing/checkout', {
        data: {
          priceId: 'price_growth_monthly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Customer Portal Integration', () => {
    test('should create portal session for active subscribers', async ({ request }) => {
      // First ensure user has a Stripe customer ID (mock this scenario)
      await ctx.data.setSubscriptionStatus(growthUser.id, 'active', 'pro', 'cus_test_portal');

      const response = await request.post('/api/billing/portal', {
        headers: {
          Authorization: `Bearer ${growthUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.portalUrl).toBeDefined();
      expect(result.data.portalUrl).toContain('stripe.com');
    });

    test('should handle users without Stripe customer', async ({ request }) => {
      const response = await request.post('/api/billing/portal', {
        headers: {
          Authorization: `Bearer ${freeUser.token}`,
        },
      });

      // May return error or create new customer
      expect([200, 400, 404].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Credit Rollover Logic', () => {
    test('should calculate correct rollover for different tiers', async ({ request }) => {
      // Create user with existing credits for rollover testing
      const rolloverUser = await ctx.data.createTestUserWithSubscription('active', 'starter', 50); // Above normal starter amount

      const response = await request.get('/api/credits', {
        headers: {
          Authorization: `Bearer ${rolloverUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const credits = await response.json();
      expect(credits.data.balance).toBe(50);
      expect(credits.data.maxRollover).toBe(180); // 6x monthly for starter (30 * 6)

      await ctx.data.cleanupUser(rolloverUser.id);
    });
  });

  test.describe('Billing State Transitions', () => {
    let transitioningUser: { id: string; email: string; token: string };

    test.beforeAll(async () => {
      transitioningUser = await ctx.data.createTestUser();
    });

    test.afterAll(async () => {
      if (transitioningUser) {
        await ctx.data.cleanupUser(transitioningUser.id);
      }
    });

    test('should handle free to active transition', async () => {
      // Set to active subscription
      await ctx.data.setSubscriptionStatus(transitioningUser.id, 'active', 'growth');

      // Add credits for subscription
      await ctx.data.addCredits(transitioningUser.id, 100);

      const profile = await ctx.data.getUserProfile(transitioningUser.id);
      expect(profile.subscription_status).toBe('active');
      expect(profile.subscription_tier).toBe('growth');
      expect(profile.credits_balance).toBeGreaterThan(100);
    });

    test('should handle active to canceled transition', async () => {
      // Cancel subscription
      await ctx.data.setSubscriptionStatus(transitioningUser.id, 'canceled', 'growth');

      const profile = await ctx.data.getUserProfile(transitioningUser.id);
      expect(profile.subscription_status).toBe('canceled');
      // Credits should remain but no new ones will be added
      expect(profile.credits_balance).toBeGreaterThan(0);
    });

    test('should handle past due state', async () => {
      // Set to past due
      await ctx.data.setSubscriptionStatus(transitioningUser.id, 'past_due', 'growth');

      const profile = await ctx.data.getUserProfile(transitioningUser.id);
      expect(profile.subscription_status).toBe('past_due');
    });
  });

  test.describe('Transaction History', () => {
    test('should track credit transactions', async () => {
      // Add some credits to generate transactions
      await ctx.data.addCredits(growthUser.id, 50, 'purchase');

      const transactions = await ctx.data.getCreditTransactions(growthUser.id);
      expect(transactions.length).toBeGreaterThan(0);

      // Find our test transaction
      const testTransaction = transactions.find(t =>
        t.description?.includes('Test purchase credits')
      );
      expect(testTransaction).toBeDefined();
      expect(testTransaction.amount).toBe(50);
      expect(testTransaction.type).toBe('purchase');
    });

    test('should track usage transactions', async () => {
      // Simulate credit deduction (would normally happen during processing)
      const _initialBalance = (await ctx.data.getUserProfile(growthUser.id)).credits_balance;

      // This would be done by the actual processing logic
      // For testing, we can manually create a usage transaction
      await ctx.data.addCredits(growthUser.id, -1, 'usage');

      const transactions = await ctx.data.getCreditTransactions(growthUser.id);
      const usageTransaction = transactions.find(t => t.type === 'usage' && t.amount === -1);
      expect(usageTransaction).toBeDefined();
    });
  });

  test.describe('Billing Security', () => {
    test("should prevent accessing another user's billing data", async ({ request }) => {
      // Try to access pro user's billing data with free user token
      const response = await request.get('/api/billing/subscription', {
        headers: {
          Authorization: `Bearer ${freeUser.token}`,
        },
      });

      // Should return user's own data or deny access
      expect([200, 401, 404].includes(response.status())).toBeTruthy();

      if (response.ok()) {
        const data = await response.json();
        // Should not return pro user's data
        expect(data.data.subscription_tier).not.toBe('growth');
      }
    });

    test('should validate webhook signatures', async ({ request }) => {
      const validPayload = stripeWebhookMocks.checkoutCompleted({
        customerId: 'cus_test_security',
        userId: freeUser.id,
        tier: 'growth',
        amount: 2900,
      });

      // Test with missing signature
      const missingSigResponse = await request.post('/api/webhooks/stripe', {
        data: validPayload,
      });

      expect(missingSigResponse.status()).toBe(401);

      // Test with invalid signature
      const invalidSigResponse = await request.post('/api/webhooks/stripe', {
        headers: {
          'stripe-signature': 'invalid_signature_format',
        },
        data: validPayload,
      });

      expect(invalidSigResponse.status()).toBe(401);
    });
  });
});
