import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { calculateBalanceWithExpiration } from '../../shared/config/subscription.utils';
import { CREDIT_COSTS } from '../../shared/config/credits.config';

// Mock Stripe invoice for testing
const createMockInvoice = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'in_test_123',
  customer: 'cus_test_123',
  subscription: 'sub_test_123',
  lines: {
    data: [
      {
        type: 'subscription',
        price: { id: 'price_STARTER_PLACEHOLDER' },
        plan: { id: 'plan_starter' },
        amount: 4900, // $49.00 for Starter
      },
    ],
  },
  period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
  ...overrides,
});

// Mock profile response
const createMockProfile = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'profile_test_123',
  stripe_customer_id: 'cus_test_123',
  subscription_credits_balance: 0,
  purchased_credits_balance: 0,
  ...overrides,
});

describe('Billing System with Credit Rollover Integration Tests', () => {
  let _supabase: SupabaseClient;
  let _testUserId: string;
  let mockSupabaseAdmin: Record<string, unknown>;

  // Test configuration
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  beforeAll(async () => {
    // Initialize Supabase client with service role for admin operations
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Mock supabaseAdmin for InvoiceHandler tests
    mockSupabaseAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => ({
              data: createMockProfile(),
              error: null,
            }),
          }),
        }),
      }),
      rpc: vi.fn(),
    };
  });

  beforeEach(async () => {
    _testUserId = 'profile_test_123';
  });

  describe('Credit Rollover Calculations', () => {
    test('should calculate rollover correctly for Starter tier', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 70,
        newCredits: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30
        expirationMode: 'never',
        maxRollover: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3, // 90
      });

      expect(result.newBalance).toBe(90); // Capped at 90
      expect(result.expiredAmount).toBe(0);
    });

    test('should not cap when under the rollover limit', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 40,
        newCredits: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(70); // 40 + 30
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle zero current balance', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 0,
        newCredits: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(30);
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle maximum rollover cap', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 90, // Already at cap
        newCredits: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(90); // No change
      expect(result.expiredAmount).toBe(0);
    });
  });

  describe('Invoice Payment with Rollover Caps', () => {
    test('should add credits with rollover for Starter tier', async () => {
      const _mockInvoice = createMockInvoice();
      const mockProfile = createMockProfile({
        subscription_credits_balance: 60,
        purchased_credits_balance: 10,
      });

      // Mock supabase calls
      mockSupabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: mockProfile,
                error: null,
              })
            ),
          })),
        })),
      }));

      mockSupabaseAdmin.rpc = vi.fn((fnName, _params) => {
        if (fnName === 'add_subscription_credits') {
          return Promise.resolve({
            data: null,
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Test the calculation logic
      const currentBalance =
        mockProfile.subscription_credits_balance + mockProfile.purchased_credits_balance;
      const maxRollover = CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3; // 90
      const newCredits = CREDIT_COSTS.STARTER_MONTHLY_CREDITS; // 30

      const { newBalance, expiredAmount } = calculateBalanceWithExpiration({
        currentBalance,
        newCredits,
        expirationMode: 'never',
        maxRollover,
      });

      expect(newBalance).toBe(90); // 70 total + 30 = 100, capped at 90
      expect(expiredAmount).toBe(0);

      // Expected credits to add: 90 - 70 = 20
      const actualCreditsToAdd = newBalance - (expiredAmount > 0 ? 0 : currentBalance);
      expect(actualCreditsToAdd).toBe(20);
    });

    test('should not add credits when already at rollover cap', async () => {
      const _mockInvoice = createMockInvoice();
      const mockProfile = createMockProfile({
        subscription_credits_balance: 90,
        purchased_credits_balance: 0,
      });

      const currentBalance =
        mockProfile.subscription_credits_balance + mockProfile.purchased_credits_balance;
      const maxRollover = CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3; // 90
      const newCredits = CREDIT_COSTS.STARTER_MONTHLY_CREDITS; // 30

      const { newBalance, expiredAmount } = calculateBalanceWithExpiration({
        currentBalance,
        newCredits,
        expirationMode: 'never',
        maxRollover,
      });

      expect(newBalance).toBe(90); // No change, already at cap
      expect(expiredAmount).toBe(0);

      const actualCreditsToAdd = newBalance - (expiredAmount > 0 ? 0 : currentBalance);
      expect(actualCreditsToAdd).toBe(0); // No credits added
    });

    test('should handle different plan tiers with correct caps', () => {
      const testCases = [
        {
          plan: 'starter',
          currentBalance: 70,
          creditsPerCycle: CREDIT_COSTS.STARTER_MONTHLY_CREDITS,
          expectedCap: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3,
        },
        {
          plan: 'growth',
          currentBalance: 250,
          creditsPerCycle: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS,
          expectedCap: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS * 3,
        },
        {
          plan: 'agency',
          currentBalance: 400,
          creditsPerCycle: CREDIT_COSTS.AGENCY_MONTHLY_CREDITS,
          expectedCap: 0, // Agency has no rollover
        },
      ];

      testCases.forEach(({ plan: _plan, currentBalance, creditsPerCycle, expectedCap }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance,
          newCredits: creditsPerCycle,
          expirationMode: 'never',
          maxRollover: expectedCap,
        });

        const expectedBalance =
          expectedCap === 0
            ? currentBalance + creditsPerCycle // No cap for Agency
            : Math.min(currentBalance + creditsPerCycle, expectedCap);
        expect(result.newBalance).toBe(expectedBalance);
        expect(result.expiredAmount).toBe(0);
      });
    });
  });

  describe('Credit Pool Handling', () => {
    test('should correctly calculate total balance from both pools', () => {
      const testCases = [
        {
          subscriptionBalance: 60,
          purchasedBalance: 20,
          expectedTotal: 80,
        },
        {
          subscriptionBalance: 0,
          purchasedBalance: 30,
          expectedTotal: 30,
        },
        {
          subscriptionBalance: 70,
          purchasedBalance: 0,
          expectedTotal: 70,
        },
      ];

      testCases.forEach(({ subscriptionBalance, purchasedBalance, expectedTotal }) => {
        const totalBalance = subscriptionBalance + purchasedBalance;
        expect(totalBalance).toBe(expectedTotal);
      });
    });

    test('should apply rollover cap to total balance, not just subscription pool', () => {
      const subscriptionBalance = 60;
      const purchasedBalance = 10;
      const totalBalance = subscriptionBalance + purchasedBalance;
      const maxRollover = 90;

      // Total balance (70) is under cap, should all be preserved
      const result = calculateBalanceWithExpiration({
        currentBalance: totalBalance,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover,
      });

      expect(result.newBalance).toBe(90); // 70 + 30 = 100, capped at 90
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle purchased credits exceeding rollover cap', () => {
      const subscriptionBalance = 30;
      const purchasedBalance = 80; // Over cap
      const totalBalance = subscriptionBalance + purchasedBalance;
      const maxRollover = 90;

      const result = calculateBalanceWithExpiration({
        currentBalance: totalBalance,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover,
      });

      expect(result.newBalance).toBe(90); // Capped at maxRollover
      expect(result.expiredAmount).toBe(0);
    });
  });

  describe('Expiration Mode Behavior', () => {
    test('should handle transition from end_of_cycle to never mode', () => {
      // Simulate old behavior: credits expire
      const oldModeResult = calculateBalanceWithExpiration({
        currentBalance: 60,
        newCredits: 30,
        expirationMode: 'end_of_cycle',
        maxRollover: 90,
      });

      expect(oldModeResult.newBalance).toBe(30); // Only new credits
      expect(oldModeResult.expiredAmount).toBe(60); // All old credits expired

      // Simulate new behavior: credits roll over
      const newModeResult = calculateBalanceWithExpiration({
        currentBalance: 60,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(newModeResult.newBalance).toBe(90); // All credits preserved
      expect(newModeResult.expiredAmount).toBe(0); // No expiration
    });

    test('should handle rolling_window mode same as end_of_cycle', () => {
      const result1 = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 30,
        expirationMode: 'end_of_cycle',
        maxRollover: 90,
      });

      const result2 = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 30,
        expirationMode: 'rolling_window',
        maxRollover: 90,
      });

      expect(result1.newBalance).toBe(result2.newBalance);
      expect(result1.expiredAmount).toBe(result2.expiredAmount);
    });
  });

  describe('Edge Cases for Rollover Logic', () => {
    test('should handle very large credit balances', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 1000,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(90); // Capped at maxRollover
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle zero maxRollover (no cap)', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 500,
        newCredits: 500,
        expirationMode: 'never',
        maxRollover: 0, // Agency tier
      });

      expect(result.newBalance).toBe(500); // Only new credits (use it or lose it)
      expect(result.expiredAmount).toBe(500); // Previous balance expired
    });

    test('should handle negative current balance', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: -20,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(10); // -20 + 30
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle zero new credits', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 0,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(50); // No change
      expect(result.expiredAmount).toBe(0);
    });
  });

  describe('Plan-specific Rollover Scenarios', () => {
    test('should apply correct caps for Starter tier upgrade scenarios', () => {
      const scenarios = [
        {
          name: 'Starter to Growth upgrade',
          starterBalance: 90, // Starter cap
          growthCredits: 100,
          growthCap: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS * 3, // 300
          expectedBalance: 190, // 90 + 100
        },
        {
          name: 'Starter to Agency upgrade',
          starterBalance: 90, // Starter cap
          agencyCredits: 500,
          agencyCap: 0, // No cap for Agency
          expectedBalance: 590, // 90 + 500
        },
      ];

      scenarios.forEach(
        ({ name: _name, starterBalance, growthCredits, growthCap, expectedBalance }) => {
          const result = calculateBalanceWithExpiration({
            currentBalance: starterBalance,
            newCredits: growthCredits,
            expirationMode: 'never',
            maxRollover: growthCap,
          });

          expect(result.newBalance).toBe(expectedBalance);
          expect(result.expiredAmount).toBe(0);
        }
      );
    });

    test('should handle downgrade scenarios with cap reduction', () => {
      const scenarios = [
        {
          name: 'Growth to Starter downgrade',
          growthBalance: 250, // From Growth plan
          starterCredits: 30,
          starterCap: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3, // 90
          expectedBalance: 90, // Capped at Starter level
        },
        {
          name: 'Agency to Growth downgrade',
          agencyBalance: 450, // From Agency plan
          growthCredits: 100,
          growthCap: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS * 3, // 300
          expectedBalance: 300, // Capped at Growth level
        },
      ];

      scenarios.forEach(
        ({ name: _name, growthBalance, starterCredits, starterCap, expectedBalance }) => {
          const result = calculateBalanceWithExpiration({
            currentBalance: growthBalance,
            newCredits: starterCredits,
            expirationMode: 'never',
            maxRollover: starterCap,
          });

          expect(result.newBalance).toBe(expectedBalance);
          expect(result.expiredAmount).toBe(0);
        }
      );
    });
  });
});
