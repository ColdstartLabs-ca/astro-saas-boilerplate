// Import dayjs mock BEFORE any other imports
import '../bugfixes/dayjs-mock.setup';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../src/pages/api/webhooks/stripe/index';
import { supabaseAdmin } from '../../../server/supabase/supabaseAdmin';
import { stripe } from '../../../server/stripe';
import { getPlanForPriceId } from '@shared/config/stripe';
import { getPlanConfig, getTrialConfig } from '@shared/config/subscription.config';
import {
  getPlanByPriceId,
  calculateBalanceWithExpiration,
} from '@shared/config/subscription.utils';
import type { IWebhookVerificationResult } from '../../../server/webhooks/stripe/services/webhook-verification.service';

// Track whether verification should fail and with what error
let mockVerificationError: Error | null = null;
let mockVerificationResult: IWebhookVerificationResult | null = null;

// Mock WebhookVerificationService - this is the key fix
vi.mock('@server/webhooks/stripe/services/webhook-verification.service', () => ({
  WebhookVerificationService: {
    verifyWebhook: vi.fn(async (request: Request) => {
      if (mockVerificationError) {
        throw mockVerificationError;
      }
      if (mockVerificationResult) {
        return mockVerificationResult;
      }
      // Default behavior: check for stripe-signature header
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        throw new Error('Missing stripe-signature header');
      }
      // Parse body and return default event
      const body = await request.text();
      try {
        const event = JSON.parse(body);
        // Ensure event has an id for idempotency checks
        return {
          event: {
            ...event,
            id: event.id || `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            livemode: false,
          },
          isTestMode: true,
        };
      } catch {
        throw new Error('Invalid webhook body');
      }
    }),
  },
}));

// Mock dependencies
vi.mock('@server/stripe', () => ({
  stripe: {
    webhooks: {
      constructEventAsync: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_real_test_secret_not_placeholder',
}));

vi.mock('@shared/config/stripe', () => ({
  getPlanForPriceId: vi.fn(),
  assertKnownPriceId: vi.fn((priceId: string) => ({
    type: 'plan',
    key: 'starter',
    name: 'Starter',
    stripePriceId: priceId,
    priceInCents: 4900,
    currency: 'usd',
    credits: 30,
    maxRollover: 90,
    creditsPerMonth: 30,
    creditsPerCycle: 30,
  })),
  resolvePriceId: vi.fn((priceId: string) => ({
    type: 'plan',
    key: 'starter',
    name: 'Starter',
    stripePriceId: priceId,
    priceInCents: 4900,
    currency: 'usd',
    credits: 30,
    maxRollover: 90,
    creditsPerMonth: 30,
    creditsPerCycle: 30,
  })),
  resolvePlanOrPack: vi.fn((priceId: string) => ({
    type: 'plan',
    key: 'starter',
    name: 'Starter',
    stripePriceId: priceId,
    priceInCents: 4900,
    currency: 'usd',
    credits: 30,
    maxRollover: 90,
    creditsPerMonth: 30,
    creditsPerCycle: 30,
  })),
}));

vi.mock('@shared/config/subscription.config', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getPlanConfig: vi.fn(),
    getTrialConfig: vi.fn(),
  };
});

vi.mock('@shared/config/subscription.utils', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getPlanByPriceId: vi.fn(),
    calculateBalanceWithExpiration: vi.fn(),
    resolvePlanOrPack: vi.fn(),
    assertKnownPriceId: vi.fn(),
  };
});

vi.mock('@server/services/SubscriptionCredits', () => ({
  SubscriptionCreditsService: {
    calculateUpgradeCredits: vi.fn(() => ({
      creditsToAdd: 100,
      reason: 'Upgrade eligible',
      isLegitimate: true,
    })),
    getExplanation: vi.fn(() => 'Mock explanation'),
  },
}));

// Helper to create a webhook_events mock that allows events through (for idempotency)
const getWebhookEventsMock = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null })), // Event doesn't exist, allow through
    })),
  })),
  // IdempotencyService.checkAndClaimEvent does: insert({...}).select('status').maybeSingle()
  // We need to return data with status for the insert to succeed
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: { status: 'processing' },
          error: null,
        })
      ),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })), // Update succeeds
  })),
});

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
      // Handle webhook_events for idempotency check
      if (table === 'webhook_events') {
        return getWebhookEventsMock();
      }
      // Default mock for other tables
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
            single: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }),
  },
}));

// Use a factory function to allow test-specific overrides
let mockEnv = {
  STRIPE_SECRET_KEY: 'sk_test_dummy_key',
  ENV: 'test',
};

vi.mock('@shared/config/env', () => ({
  serverEnv: new Proxy({} as Record<string, string>, {
    get(_, prop) {
      return mockEnv[prop as keyof typeof mockEnv];
    },
  }),
  isTest: vi.fn(() => true),
}));

describe('Stripe Webhook Handler', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock env to test defaults
    mockEnv = {
      STRIPE_SECRET_KEY: 'sk_test_dummy_key',
      ENV: 'test',
    };
    // Reset verification mocks to default behavior
    mockVerificationError = null;
    mockVerificationResult = null;
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Signature validation', () => {
    test('should reject requests without stripe-signature header', async () => {
      // Arrange
      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('stripe-signature');
    });

    test('should accept valid request in test mode', async () => {
      // Arrange
      const event = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123' } },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock the RPC call for credit addition
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ error: null } as never);

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });

    test('should handle invalid JSON in test mode', async () => {
      // Arrange
      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid webhook body');
    });

    test('should verify signature in production mode', async () => {
      // Arrange - set env to production
      mockEnv.STRIPE_SECRET_KEY = 'sk_live_real_key';
      mockEnv.ENV = 'production';

      const event = {
        id: 'evt_test_123',
        type: 'test.event',
        data: { object: { id: 'evt_test_123' } },
        livemode: true,
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful signature verification
      mockVerificationResult = {
        event: event as never,
        isTestMode: false,
      };

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
    });

    test('should reject invalid signature in production mode', async () => {
      // Arrange - set env to production
      mockEnv.STRIPE_SECRET_KEY = 'sk_live_real_key';
      mockEnv.ENV = 'production';

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'stripe-signature': 'invalid_signature',
          'content-type': 'application/json',
        },
      });

      // Mock failed signature verification
      mockVerificationError = new Error('Webhook signature verification failed: Invalid signature');

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('signature verification failed');
    });
  });

  describe('checkout.session.completed handler', () => {
    const sessionWithCredits = {
      id: 'cs_test_credits_123',
      mode: 'payment' as const,
      metadata: {
        user_id: 'user_123',
        credits_amount: '100',
      },
      payment_status: 'paid',
      status: 'complete',
    };

    const sessionWithSubscription = {
      id: 'cs_test_sub_123',
      mode: 'subscription' as const,
      metadata: {
        user_id: 'user_456',
      },
      subscription: 'sub_test_456',
      payment_status: 'paid',
      status: 'complete',
    };

    test('should ignore one-time payment sessions (subscription-only mode)', async () => {
      // Arrange - one-time payments are no longer supported
      const event = {
        type: 'checkout.session.completed',
        data: { object: sessionWithCredits },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      // Should not add any credits for one-time payments
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    test('should handle subscription credit addition failure gracefully', async () => {
      // Arrange
      const mockPlan = {
        key: 'starter',
        name: 'Starter',
        creditsPerMonth: 30,
        maxRollover: 90,
      };

      // Mock successful plan lookup
      vi.mocked(getPlanForPriceId).mockReturnValue(mockPlan);

      // Mock Stripe subscription retrieval
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        items: {
          data: [
            {
              price: {
                id: 'price_test_starter',
              },
            },
          ],
        },
      } as never);

      const event = {
        type: 'checkout.session.completed',
        data: { object: sessionWithSubscription },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock failed credit addition
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        error: { message: 'Database error' },
      } as never);

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200); // Still returns 200 as webhook was processed
      expect(consoleSpy.error).toHaveBeenCalledWith('Error adding test subscription credits:', {
        message: 'Database error',
      });
    });

    test('should skip zero credit amounts', async () => {
      // Arrange
      const sessionWithZeroCredits = {
        ...sessionWithCredits,
        metadata: {
          ...sessionWithCredits.metadata,
          credits_amount: '0',
        },
      };

      const event = {
        type: 'checkout.session.completed',
        data: { object: sessionWithZeroCredits },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    test('should handle subscription mode by adding initial credits', async () => {
      // Arrange
      const mockPlan = {
        key: 'growth',
        name: 'Growth',
        creditsPerMonth: 100,
        maxRollover: 300,
      };

      // Mock successful plan lookup for the default GROWTH_MONTHLY price ID
      vi.mocked(getPlanForPriceId).mockReturnValue(mockPlan);

      const event = {
        type: 'checkout.session.completed',
        data: { object: sessionWithSubscription },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful credit addition
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ error: null } as never);

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(getPlanForPriceId).toHaveBeenCalledWith('price_1SxZp7K2K0pPNfoSMt94q8kP');
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_subscription_credits', {
        target_user_id: 'user_456',
        amount: 100,
        ref_id: 'cs_test_sub_123',
        description: 'Test subscription credits - Growth plan - 100 credits',
      });
    });

    test('should handle missing user_id in metadata', async () => {
      // Arrange
      const sessionWithoutUserId = {
        ...sessionWithCredits,
        metadata: {
          credits_amount: '100',
        },
      };

      const event = {
        type: 'checkout.session.completed',
        data: { object: sessionWithoutUserId },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('No user_id in session metadata');
    });
  });

  describe('subscription event handlers', () => {
    const subscriptionData = {
      id: 'sub_test_123',
      customer: 'cus_test_123',
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_1SxZp9K2K0pPNfoSeOwSLmcp' },
          },
        ],
      },
      current_period_start: 1640995200, // 2022-01-01
      current_period_end: 1643587200, // 2022-02-01
      cancel_at_period_end: false,
      canceled_at: null,
    };

    test('should handle customer.subscription.created', async () => {
      // Arrange
      const mockPlan = {
        key: 'agency',
        name: 'Agency',
        creditsPerMonth: 500,
        maxRollover: 0,
      };

      // Mock successful plan lookup
      vi.mocked(getPlanForPriceId).mockReturnValue(mockPlan);
      vi.mocked(getPlanConfig).mockReturnValue({ key: 'agency', name: 'Agency' });
      vi.mocked(getTrialConfig).mockReturnValue({
        enabled: false,
        trialCredits: null,
      });

      const event = {
        type: 'customer.subscription.created',
        data: { object: subscriptionData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful profile lookup and updates
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: {
              id: 'user_123',
              subscription_status: 'trialing',
              subscription_credits_balance: 100,
              purchased_credits_balance: 0,
            },
          })),
          single: vi.fn(() => ({
            data: {
              id: 'user_123',
              subscription_status: 'trialing',
              subscription_credits_balance: 100,
              purchased_credits_balance: 0,
            },
          })),
        })),
      }));

      const mockUpsert = vi.fn(() => ({ error: null }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        } else if (table === 'profiles') {
          return { select: mockSelect, update: mockUpdate };
        } else if (table === 'subscriptions') {
          return {
            upsert: mockUpsert,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({ data: null })),
              })),
            })),
          };
        }
        return {};
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(mockSelect).toHaveBeenCalledWith(
        'id, subscription_status, subscription_credits_balance, purchased_credits_balance'
      );
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub_test_123',
          user_id: 'user_123',
          status: 'active',
          price_id: 'price_1SxZp9K2K0pPNfoSeOwSLmcp',
          cancel_at_period_end: false,
          canceled_at: null,
        })
      );
    });

    test('should handle customer.subscription.deleted', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.deleted',
        data: { object: subscriptionData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful profile lookup and updates
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: { id: 'user_123' },
          })),
          single: vi.fn(() => ({
            data: { id: 'user_123' },
          })),
        })),
      }));

      const mockSubUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      }));

      const mockProfileUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        } else if (table === 'profiles') {
          return { select: mockSelect, update: mockProfileUpdate };
        } else if (table === 'subscriptions') {
          return { update: mockSubUpdate };
        }
        return {};
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(mockSubUpdate).toHaveBeenCalledWith({
        status: 'canceled',
        canceled_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      expect(mockProfileUpdate).toHaveBeenCalledWith({
        subscription_status: 'canceled',
      });
    });

    test('should handle missing profile for subscription events', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.created',
        data: { object: subscriptionData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock failed profile lookup
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: null,
          })),
          single: vi.fn(() => ({
            data: null,
          })),
        })),
      }));

      // Add necessary mocks for functions used in subscription handlers
      vi.mocked(getTrialConfig).mockReturnValue({ enabled: false, trialCredits: null });
      vi.mocked(getPlanForPriceId).mockReturnValue({
        type: 'plan',
        key: 'growth',
        name: 'Growth',
        creditsPerMonth: 100,
        creditsPerCycle: 100,
        maxRollover: 300,
      });

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        }
        return { select: mockSelect };
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert - In test mode, webhook returns 200 (not 500) to avoid test failures
      expect(response.status).toBe(200);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WEBHOOK_TEST_MODE] No profile found for customer cus_test_123 - skipping in test mode',
        expect.objectContaining({
          subscriptionId: 'sub_test_123',
          customerId: 'cus_test_123',
        })
      );
    });

    test('should handle subscription update errors gracefully', async () => {
      // Arrange
      // Mock successful plan lookup to get past that validation
      vi.mocked(getPlanConfig).mockReturnValue({ key: 'growth', name: 'Growth' });
      vi.mocked(getTrialConfig).mockReturnValue({ enabled: false, trialCredits: null });
      vi.mocked(getPlanForPriceId).mockReturnValue({
        type: 'plan',
        key: 'growth',
        name: 'Growth',
        creditsPerMonth: 100,
        creditsPerCycle: 100,
        maxRollover: 300,
      });

      const event = {
        type: 'customer.subscription.created',
        data: { object: subscriptionData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful profile lookup but failed update
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: {
              id: 'user_123',
              subscription_status: 'active',
              subscription_credits_balance: 500,
              purchased_credits_balance: 0,
            },
          })),
          single: vi.fn(() => ({
            data: {
              id: 'user_123',
              subscription_status: 'active',
              subscription_credits_balance: 500,
              purchased_credits_balance: 0,
            },
          })),
        })),
      }));

      const mockUpsert = vi.fn(() => ({ error: { message: 'Database error' } }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        } else if (table === 'profiles') {
          return { select: mockSelect, update: mockUpdate };
        } else if (table === 'subscriptions') {
          return {
            upsert: mockUpsert,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({ data: null })),
              })),
            })),
          };
        }
        return {};
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error upserting subscription:', {
        message: 'Database error',
      });
    });
  });

  describe('invoice event handlers', () => {
    test('should handle invoice.paid and add credits in test mode', async () => {
      // Arrange
      const mockPlan = {
        key: 'growth',
        name: 'Growth',
        creditsPerMonth: 100,
        maxRollover: 300,
      };

      // Mock successful plan lookup
      const { resolvePlanOrPack, assertKnownPriceId } =
        await import('@shared/config/subscription.utils');
      vi.mocked(getPlanForPriceId).mockReturnValue(mockPlan);
      vi.mocked(getPlanConfig).mockReturnValue({ key: 'growth', name: 'Growth' });
      vi.mocked(getTrialConfig).mockReturnValue({ enabled: false, trialCredits: null });
      vi.mocked(getPlanByPriceId).mockReturnValue({ creditsExpiration: { mode: 'never' } });
      vi.mocked(calculateBalanceWithExpiration).mockReturnValue({
        newBalance: 200,
        expiredAmount: 0,
      });
      vi.mocked(resolvePlanOrPack).mockReturnValue({
        type: 'plan',
        key: 'growth',
        name: 'Growth',
        creditsPerCycle: 100,
        maxRollover: 300,
      });
      vi.mocked(assertKnownPriceId).mockReturnValue({
        type: 'plan',
        key: 'growth',
        name: 'Growth',
        stripePriceId: 'price_test_growth_monthly',
        priceInCents: 9900,
        currency: 'usd',
        credits: 100,
        maxRollover: 300,
      });

      const customerId = 'cus_test_renewal';
      const userId = 'user_renewal_123';

      const invoiceData = {
        id: 'in_test_123',
        customer: customerId,
        subscription: 'sub_test_123',
        paid: true,
        status: 'paid',
        lines: {
          data: [
            {
              price: { id: 'price_test_growth_monthly' },
            },
          ],
        },
      };

      // BUG H12 FIX: Use 'invoice.paid' instead of 'invoice.payment_succeeded'
      // Stripe fires both events for the same payment with different event IDs,
      // so only 'invoice.paid' is handled to prevent double credit allocation.
      const event = {
        type: 'invoice.paid',
        data: { object: invoiceData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock profile lookup
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: {
              id: userId,
              subscription_credits_balance: 100,
              purchased_credits_balance: 0,
              subscription_status: 'active',
            },
          })),
          single: vi.fn(() => ({
            data: {
              id: userId,
              subscription_credits_balance: 100,
              purchased_credits_balance: 0,
              subscription_status: 'active',
            },
          })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        } else if (table === 'profiles') {
          return { select: mockSelect };
        }
        return {};
      });

      // Mock successful credit addition
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ error: null } as never);

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      // Now we add credits on subscription renewal (this was the bug fix!)
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_subscription_credits', {
        target_user_id: userId,
        amount: 100, // Growth tier credits
        ref_id: 'invoice_in_test_123',
        description: 'Monthly subscription renewal - Growth plan',
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Added'));
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    test('should handle invoice.payment_failed', async () => {
      // Arrange
      const invoiceData = {
        id: 'in_test_failed_123',
        customer: 'cus_test_123',
        paid: false,
        status: 'open',
      };

      const event = {
        type: 'invoice.payment_failed',
        data: { object: invoiceData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock successful profile lookup and update
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: { id: 'user_123' },
          })),
          single: vi.fn(() => ({
            data: { id: 'user_123' },
          })),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        }
        return { select: mockSelect, update: mockUpdate };
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        subscription_status: 'past_due',
      });
      expect(consoleSpy.log).toHaveBeenCalledWith('Marked user user_123 subscription as past_due');
    });

    test('should handle invoice.payment_failed with missing customer', async () => {
      // Arrange
      const invoiceData = {
        id: 'in_test_failed_123',
        customer: 'cus_missing_123',
        paid: false,
        status: 'open',
      };

      const event = {
        type: 'invoice.payment_failed',
        data: { object: invoiceData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Mock failed profile lookup
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: null,
          })),
          single: vi.fn(() => ({
            data: null,
          })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'webhook_events') {
          return getWebhookEventsMock();
        }
        return { select: mockSelect };
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert - In test mode, webhook returns 200 (not 500) to avoid test failures
      expect(response.status).toBe(200);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[WEBHOOK_TEST_MODE] No profile found for customer cus_missing_123 - skipping in test mode',
        expect.objectContaining({
          invoiceId: 'in_test_failed_123',
          customerId: 'cus_missing_123',
        })
      );
    });

    test('should skip invoice.payment_succeeded without subscription', async () => {
      // Arrange
      const invoiceData = {
        id: 'in_test_no_sub_123',
        customer: 'cus_test_123',
        subscription: null,
        paid: true,
        status: 'paid',
      };

      const event = {
        type: 'invoice.payment_succeeded',
        data: { object: invoiceData },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });
  });

  describe('unhandled events', () => {
    test('should log unhandled event types', async () => {
      // Arrange
      const event = {
        type: 'account.updated',
        data: { object: { id: 'acct_test_123' } },
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(200);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'UNHANDLED WEBHOOK TYPE: account.updated - this may require code update'
      );
    });
  });

  describe('error handling', () => {
    test('should handle general errors in webhook processing', async () => {
      // Arrange
      // Create a request that will cause an error during processing
      const event = {
        type: 'checkout.session.completed',
        data: { object: null }, // This should cause an error
      };

      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'test_signature',
          'content-type': 'application/json',
        },
      });

      // Act
      // Astro APIRoutes expect context object with { request }
      const response = await POST({ request });

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
  });
});
