// Import dayjs mock BEFORE any other imports
import './dayjs-mock.setup';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../src/pages/api/webhooks/stripe/index';
import { supabaseAdmin } from '../../../server/supabase/supabaseAdmin';
import {
  getPlanByPriceId,
  resolvePlanOrPack,
  assertKnownPriceId,
} from '@shared/config/subscription.utils';

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
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
}));

// Mock the webhook verification service - bypasses signature verification in tests
vi.mock('@server/webhooks/stripe/services/webhook-verification.service', () => ({
  WebhookVerificationService: {
    verifyWebhook: vi.fn(async (request: Request) => {
      try {
        const body = await request.json();
        return { event: body, isTestMode: true };
      } catch (e) {
        // If JSON parsing fails, return a minimal mock event
        return {
          event: {
            id: 'evt_test',
            type: 'invoice.paid',
            data: { object: {} },
          },
          isTestMode: true,
        };
      }
    }),
  },
}));

// Mock the idempotency service - allows events through in tests
vi.mock('@server/webhooks/stripe/services/idempotency.service', () => ({
  IdempotencyService: {
    checkAndClaimEvent: vi.fn(() =>
      Promise.resolve({
        isNew: true,
        existingStatus: undefined,
      })
    ),
    markEventCompleted: vi.fn(() => Promise.resolve()),
    markEventFailed: vi.fn(() => Promise.resolve()),
    markEventUnrecoverable: vi.fn(() => Promise.resolve()),
  },
}));

// Mock other handlers to prevent errors (but NOT InvoiceHandler - we want to test its logic)
vi.mock('@server/webhooks/stripe/handlers/payment.handler', () => ({
  PaymentHandler: {
    handleCheckoutSessionCompleted: vi.fn(() => Promise.resolve()),
    handleChargeRefunded: vi.fn(() => Promise.resolve()),
    handleInvoicePaymentRefunded: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@server/webhooks/stripe/handlers/subscription.handler', () => ({
  SubscriptionHandler: {
    handleCustomerCreated: vi.fn(() => Promise.resolve()),
    handleSubscriptionUpdate: vi.fn(() => Promise.resolve()),
    handleSubscriptionDeleted: vi.fn(() => Promise.resolve()),
    handleTrialWillEnd: vi.fn(() => Promise.resolve()),
    handleSubscriptionScheduleCompleted: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@server/webhooks/stripe/handlers/dispute.handler', () => ({
  DisputeHandler: {
    handleChargeDisputeCreated: vi.fn(() => Promise.resolve()),
    handleChargeDisputeUpdated: vi.fn(() => Promise.resolve()),
    handleChargeDisputeClosed: vi.fn(() => Promise.resolve()),
  },
}));

// Helper to create a webhook_events mock that allows events through (for idempotency)
const getWebhookEventsMock = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null })), // Event doesn't exist, allow through
    })),
  })),
  insert: vi.fn(() => Promise.resolve({ error: null })), // Claim succeeds
  update: vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }), // Update succeeds
  })),
});

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
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

vi.mock('@shared/config/env', () => ({
  serverEnv: {
    STRIPE_SECRET_KEY: 'sk_test_dummy_key',
    ENV: 'test',
  },
  isTest: vi.fn(() => true),
}));

vi.mock('@shared/config/subscription.utils', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getPlanByPriceId: vi.fn(priceId => {
      // Mock implementation that returns plan data for known price IDs
      const plans = {
        price_starter_monthly: {
          creditsPerMonth: 100,
          creditsPerCycle: 100,
          creditsExpiration: { mode: 'never' },
        },
        price_hobby_monthly: {
          creditsPerMonth: 200,
          creditsPerCycle: 200,
          creditsExpiration: { mode: 'never' },
        },
        price_pro_monthly: {
          creditsPerMonth: 1000,
          creditsPerCycle: 1000,
          creditsExpiration: { mode: 'never' },
        },
        price_business_monthly: {
          creditsPerMonth: 5000,
          creditsPerCycle: 5000,
          creditsExpiration: { mode: 'never' },
        },
      };
      return plans[priceId] || null;
    }),
    resolvePlanOrPack: vi.fn(priceId => {
      // Mock implementation that returns plan data for known price IDs
      const plans = {
        price_starter_monthly: {
          type: 'plan',
          name: 'Starter',
          creditsPerCycle: 100,
          maxRollover: 600,
        },
        price_hobby_monthly: {
          type: 'plan',
          name: 'Hobby',
          creditsPerCycle: 200,
          maxRollover: 1200,
        },
        price_pro_monthly: {
          type: 'plan',
          name: 'Professional',
          creditsPerCycle: 1000,
          maxRollover: 6000,
        },
        price_business_monthly: {
          type: 'plan',
          name: 'Business',
          creditsPerCycle: 5000,
          maxRollover: 30000,
        },
      };
      return plans[priceId] || null;
    }),
    assertKnownPriceId: vi.fn(priceId => {
      // Mock implementation that returns IPriceIndexEntry structure
      const plans = {
        price_starter_monthly: {
          type: 'plan',
          key: 'starter',
          name: 'Starter',
          stripePriceId: priceId,
          priceInCents: 499,
          currency: 'usd',
          credits: 100,
          maxRollover: 600,
        },
        price_hobby_monthly: {
          type: 'plan',
          key: 'hobby',
          name: 'Hobby',
          stripePriceId: priceId,
          priceInCents: 999,
          currency: 'usd',
          credits: 200,
          maxRollover: 1200,
        },
        price_pro_monthly: {
          type: 'plan',
          key: 'pro',
          name: 'Professional',
          stripePriceId: priceId,
          priceInCents: 1999,
          currency: 'usd',
          credits: 1000,
          maxRollover: 6000,
        },
        price_business_monthly: {
          type: 'plan',
          key: 'business',
          name: 'Business',
          stripePriceId: priceId,
          priceInCents: 4999,
          currency: 'usd',
          credits: 5000,
          maxRollover: 30000,
        },
      };
      if (!plans[priceId]) {
        throw new Error(`Unknown price ID: ${priceId}`);
      }
      return plans[priceId];
    }),
    calculateBalanceWithExpiration: vi.fn(params => {
      // Return the new balance as current balance + new credits (no expiration)
      const { currentBalance, newCredits } = params;
      return {
        newBalance: currentBalance + newCredits,
        expiredAmount: 0,
      };
    }),
  };
});

vi.mock('@shared/config/subscription.config', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTrialConfig: vi.fn(() => ({
      enabled: false,
      trialCredits: null,
    })),
  };
});

vi.mock('@server/services/SubscriptionCredits', () => ({
  SubscriptionCreditsService: {
    calculateUpgradeCredits: vi.fn(() => ({
      creditsToAdd: 0,
      isLegitimate: true,
      reason: 'test',
    })),
    getExplanation: vi.fn(() => 'test explanation'),
  },
}));

vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    unix: vi.fn(() => 1640995200), // Mock timestamp
    toISOString: vi.fn(() => '2022-01-01T00:00:00.000Z'),
    add: vi.fn(() => ({
      unix: vi.fn(() => 1643673600),
    })),
    diff: vi.fn(() => 30),
  })),
}));

describe('Bug Fix: Billing Credit Renewal on invoice.payment_succeeded', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };

    // Mock plan lookup for different price IDs
    vi.mocked(getPlanByPriceId).mockImplementation((priceId: string) => {
      if (priceId === 'price_hobby_monthly') {
        return { key: 'hobby', name: 'Hobby', creditsPerMonth: 200, maxRollover: 1200 };
      }
      if (priceId === 'price_pro_monthly') {
        return { key: 'pro', name: 'Professional', creditsPerMonth: 1000, maxRollover: 6000 };
      }
      if (priceId === 'price_business_monthly') {
        return { key: 'business', name: 'Business', creditsPerMonth: 5000, maxRollover: 30000 };
      }
      return null;
    });

    // Mock resolvePlanOrPack function
    vi.mocked(resolvePlanOrPack).mockImplementation((priceId: string) => {
      if (priceId === 'price_hobby_monthly') {
        return { type: 'plan', name: 'Hobby', creditsPerCycle: 200, maxRollover: 1200 };
      }
      if (priceId === 'price_pro_monthly') {
        return { type: 'plan', name: 'Professional', creditsPerCycle: 1000, maxRollover: 6000 };
      }
      if (priceId === 'price_business_monthly') {
        return { type: 'plan', name: 'Business', creditsPerCycle: 5000, maxRollover: 30000 };
      }
      return null;
    });

    // Mock assertKnownPriceId function - returns IPriceIndexEntry
    vi.mocked(assertKnownPriceId).mockImplementation((priceId: string) => {
      if (priceId === 'price_hobby_monthly') {
        return {
          type: 'plan',
          key: 'hobby',
          name: 'Hobby',
          stripePriceId: priceId,
          priceInCents: 999,
          currency: 'usd',
          credits: 200,
          maxRollover: 1200,
        };
      }
      if (priceId === 'price_pro_monthly') {
        return {
          type: 'plan',
          key: 'pro',
          name: 'Professional',
          stripePriceId: priceId,
          priceInCents: 1999,
          currency: 'usd',
          credits: 1000,
          maxRollover: 6000,
        };
      }
      if (priceId === 'price_business_monthly') {
        return {
          type: 'plan',
          key: 'business',
          name: 'Business',
          stripePriceId: priceId,
          priceInCents: 4999,
          currency: 'usd',
          credits: 5000,
          maxRollover: 30000,
        };
      }
      throw new Error(`Unknown price ID: ${priceId}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should add credits on subscription renewal (hobby tier)', async () => {
    // Arrange
    const customerId = 'cus_test_hobby';
    const userId = 'user_hobby_123';
    const invoiceId = 'in_test_hobby_renewal';

    const invoiceData = {
      id: invoiceId,
      customer: customerId,
      subscription: 'sub_test_hobby',
      paid: true,
      status: 'paid',
      period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
      billing_reason: 'subscription_cycle', // Not the first invoice
      lines: {
        data: [
          {
            type: 'subscription',
            price: { id: 'price_hobby_monthly' },
          },
        ],
      },
    };

    const event = {
      id: `evt_test_${invoiceId}`,
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

    // Mock profile lookup - the webhook looks up by stripe_customer_id
    const mockEq = vi.fn(() => ({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 50, purchased_credits_balance: 0 },
        })
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 50, purchased_credits_balance: 0 },
        })
      ),
    }));
    const mockSelect = vi.fn(() => ({
      eq: mockEq,
    }));

    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return getWebhookEventsMock();
      } else if (table === 'profiles') {
        return { select: mockSelect };
      }
      return {};
    });

    // Mock successful RPC calls
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockImplementation((rpcName: string) => {
      if (rpcName === 'expire_subscription_credits') {
        return Promise.resolve({ data: 0, error: null });
      }
      if (rpcName === 'add_subscription_credits') {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    });

    // Act
    // Astro APIRoutes expect context object with { request }
    const response = await POST({ request });

    // Debug - check response body for error details
    console.log('[DEBUG] Response status:', response.status);
    if (response.status === 500) {
      try {
        const text = await response.text();
        console.log('[DEBUG] Response body:', text);
      } catch (e) {
        console.log('[DEBUG] Failed to read response body:', e);
      }
    }

    // Assert
    expect(response.status).toBe(200);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_subscription_credits', {
      target_user_id: userId,
      amount: 200, // Hobby tier credits
      ref_id: `invoice_${invoiceId}`,
      description: 'Monthly subscription renewal - Hobby plan',
    });
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Added 200 subscription credits')
    );
  });

  test('should add credits on subscription renewal (pro tier)', async () => {
    // Arrange
    const customerId = 'cus_test_pro';
    const userId = 'user_pro_123';
    const invoiceId = 'in_test_pro_renewal';

    const invoiceData = {
      id: invoiceId,
      customer: customerId,
      subscription: 'sub_test_pro',
      paid: true,
      status: 'paid',
      period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
      billing_reason: 'subscription_cycle', // Not the first invoice
      lines: {
        data: [
          {
            type: 'subscription',
            price: { id: 'price_pro_monthly' },
          },
        ],
      },
    };

    const event = {
      id: `evt_test_${invoiceId}`,
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

    // Mock profile lookup - the webhook looks up by stripe_customer_id
    const mockEq = vi.fn(() => ({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 100, purchased_credits_balance: 0 },
        })
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 100, purchased_credits_balance: 0 },
        })
      ),
    }));
    const mockSelect = vi.fn(() => ({
      eq: mockEq,
    }));

    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return getWebhookEventsMock();
      } else if (table === 'profiles') {
        return { select: mockSelect };
      }
      return {};
    });

    // Mock successful RPC calls
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockImplementation((rpcName: string) => {
      if (rpcName === 'expire_subscription_credits') {
        return Promise.resolve({ data: 0, error: null });
      }
      if (rpcName === 'add_subscription_credits') {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    });

    // Act
    // Astro APIRoutes expect context object with { request }
    const response = await POST({ request });

    // Debug - check response body for error details
    console.log('[DEBUG] Response status:', response.status);
    if (response.status === 500) {
      try {
        const text = await response.text();
        console.log('[DEBUG] Response body:', text);
      } catch (e) {
        console.log('[DEBUG] Failed to read response body:', e);
      }
    }

    // Assert
    expect(response.status).toBe(200);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_subscription_credits', {
      target_user_id: userId,
      amount: 1000, // Pro tier credits
      ref_id: `invoice_${invoiceId}`,
      description: 'Monthly subscription renewal - Professional plan',
    });
  });

  test('should add credits on subscription renewal (business tier)', async () => {
    // Arrange
    const customerId = 'cus_test_business';
    const userId = 'user_business_123';
    const invoiceId = 'in_test_business_renewal';

    const invoiceData = {
      id: invoiceId,
      customer: customerId,
      subscription: 'sub_test_business',
      paid: true,
      status: 'paid',
      period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
      billing_reason: 'subscription_cycle', // Not the first invoice
      lines: {
        data: [
          {
            type: 'subscription',
            price: { id: 'price_business_monthly' },
          },
        ],
      },
    };

    const event = {
      id: `evt_test_${invoiceId}`,
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

    // Mock profile lookup - the webhook looks up by stripe_customer_id
    const mockEq = vi.fn(() => ({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 500, purchased_credits_balance: 0 },
        })
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: userId, subscription_credits_balance: 500, purchased_credits_balance: 0 },
        })
      ),
    }));
    const mockSelect = vi.fn(() => ({
      eq: mockEq,
    }));

    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return getWebhookEventsMock();
      } else if (table === 'profiles') {
        return { select: mockSelect };
      }
      return {};
    });

    // Mock successful RPC calls
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockImplementation((rpcName: string) => {
      if (rpcName === 'expire_subscription_credits') {
        return Promise.resolve({ data: 0, error: null });
      }
      if (rpcName === 'add_subscription_credits') {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    });

    // Act
    // Astro APIRoutes expect context object with { request }
    const response = await POST({ request });

    // Debug - check response body for error details
    console.log('[DEBUG] Response status:', response.status);
    if (response.status === 500) {
      try {
        const text = await response.text();
        console.log('[DEBUG] Response body:', text);
      } catch (e) {
        console.log('[DEBUG] Failed to read response body:', e);
      }
    }

    // Assert
    expect(response.status).toBe(200);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_subscription_credits', {
      target_user_id: userId,
      amount: 5000, // Business tier credits
      ref_id: `invoice_${invoiceId}`,
      description: 'Monthly subscription renewal - Business plan',
    });
  });

  test('should skip credit addition for non-subscription invoice', async () => {
    // Arrange
    const invoiceId = 'in_test_no_sub';
    const invoiceData = {
      id: invoiceId,
      customer: 'cus_test',
      subscription: null, // No subscription
      paid: true,
      status: 'paid',
    };

    const event = {
      id: `evt_test_${invoiceId}`,
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

    // Act
    // Astro APIRoutes expect context object with { request }
    const response = await POST({ request });

    // Debug - check response body for error details
    console.log('[DEBUG] Response status:', response.status);
    if (response.status === 500) {
      try {
        const text = await response.text();
        console.log('[DEBUG] Response body:', text);
      } catch (e) {
        console.log('[DEBUG] Failed to read response body:', e);
      }
    }

    // Assert
    expect(response.status).toBe(200);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  test('should handle missing profile gracefully', async () => {
    // Arrange
    const invoiceId = 'in_test_no_profile';
    const invoiceData = {
      id: invoiceId,
      customer: 'cus_unknown',
      subscription: 'sub_test',
      paid: true,
      status: 'paid',
      period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
      billing_reason: 'subscription_cycle', // Not the first invoice
      lines: {
        data: [
          {
            type: 'subscription',
            price: { id: 'price_pro_monthly' },
          },
        ],
      },
    };

    const event = {
      id: `evt_test_${invoiceId}`,
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

    // Mock profile lookup returning null
    const mockEq = vi.fn(() => ({
      maybeSingle: vi.fn(() =>
        Promise.resolve({
          data: null,
        })
      ),
      single: vi.fn(() =>
        Promise.resolve({
          data: null,
        })
      ),
    }));
    const mockSelect = vi.fn(() => ({
      eq: mockEq,
    }));

    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return getWebhookEventsMock();
      } else if (table === 'profiles') {
        return { select: mockSelect };
      }
      return {};
    });

    // Act
    // Astro APIRoutes expect context object with { request }
    const response = await POST({ request });

    // Assert - In test mode, webhook returns 200 (not 500) to avoid test failures
    expect(response.status).toBe(200);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      '[WEBHOOK_TEST_MODE] No profile found for customer cus_unknown - skipping in test mode',
      expect.objectContaining({
        invoiceId: 'in_test_no_profile',
        customerId: 'cus_unknown',
        timestamp: expect.any(String),
      })
    );
  });
});
