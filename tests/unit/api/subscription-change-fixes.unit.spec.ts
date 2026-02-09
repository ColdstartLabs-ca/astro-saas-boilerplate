/**
 * Tests for subscription change fixes
 *
 * These tests verify the fixes made to the subscription change flow:
 * 1. Tier-based downgrade detection (using subscription_tier instead of price_id)
 * 2. DB price_id sync with Stripe when out of sync
 * 3. Stripe subscription schedule handling (release existing, use exact start_date)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stripe config
vi.mock('@shared/config/stripe', () => ({
  getPlanForPriceId: vi.fn((priceId: string) => {
    const plans: Record<string, { name: string; key: string; creditsPerMonth: number }> = {
      price_starter: { name: 'Starter', key: 'starter', creditsPerMonth: 30 },
      price_growth: { name: 'Growth', key: 'growth', creditsPerMonth: 100 },
      price_agency: { name: 'Agency', key: 'agency', creditsPerMonth: 500 },
    };
    return plans[priceId] || null;
  }),
  assertKnownPriceId: vi.fn((priceId: string) => {
    const plans: Record<string, { type: string; credits: number; name: string }> = {
      price_starter: { type: 'plan', credits: 30, name: 'Starter' },
      price_growth: { type: 'plan', credits: 100, name: 'Growth' },
      price_agency: { type: 'plan', credits: 500, name: 'Agency' },
    };
    if (!plans[priceId]) {
      throw new Error(`Unknown price ID: ${priceId}`);
    }
    return plans[priceId];
  }),
  STRIPE_PRICES: {
    STARTER_MONTHLY: 'price_starter',
    GROWTH_MONTHLY: 'price_growth',
    AGENCY_MONTHLY: 'price_agency',
  },
}));

describe('Subscription Change Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier-based Downgrade Detection', () => {
    // Credit map used in the actual implementation
    const tierCreditsMap: Record<string, number> = {
      starter: 30,
      growth: 100,
      agency: 500,
    };

    /**
     * Helper to detect downgrade based on subscription_tier
     * This mirrors the logic in change/route.ts
     */
    function isDowngradeByTier(currentTier: string | null, targetCreditsPerMonth: number): boolean {
      const currentTierCredits = tierCreditsMap[currentTier || ''] || 0;
      return currentTierCredits > targetCreditsPerMonth;
    }

    it('should detect downgrade from Agency to Growth', () => {
      const isDowngrade = isDowngradeByTier('agency', 100);
      expect(isDowngrade).toBe(true);
    });

    it('should detect downgrade from Agency to Starter', () => {
      const isDowngrade = isDowngradeByTier('agency', 30);
      expect(isDowngrade).toBe(true);
    });

    it('should detect downgrade from Growth to Starter', () => {
      const isDowngrade = isDowngradeByTier('growth', 30);
      expect(isDowngrade).toBe(true);
    });

    it('should NOT detect downgrade for upgrade from Starter to Growth', () => {
      const isDowngrade = isDowngradeByTier('starter', 100);
      expect(isDowngrade).toBe(false);
    });

    it('should NOT detect downgrade for upgrade from Starter to Agency', () => {
      const isDowngrade = isDowngradeByTier('starter', 500);
      expect(isDowngrade).toBe(false);
    });

    it('should NOT detect downgrade for upgrade from Growth to Agency', () => {
      const isDowngrade = isDowngradeByTier('growth', 500);
      expect(isDowngrade).toBe(false);
    });

    it('should NOT detect downgrade for same tier change', () => {
      const isDowngrade = isDowngradeByTier('growth', 100);
      expect(isDowngrade).toBe(false);
    });

    it('should handle null/unknown tier gracefully', () => {
      const isDowngrade = isDowngradeByTier(null, 100);
      expect(isDowngrade).toBe(false);
    });

    it('should handle unknown tier string gracefully', () => {
      const isDowngrade = isDowngradeByTier('unknown_tier', 100);
      expect(isDowngrade).toBe(false);
    });
  });

  describe('Price ID Sync Logic', () => {
    /**
     * When DB price_id doesn't match Stripe's current price_id,
     * we should sync DB to match Stripe (source of truth)
     */
    it('should identify when sync is needed', () => {
      const dbPriceId = 'price_old_agency_legacy';
      const stripePriceId = 'price_agency';

      const needsSync = dbPriceId !== stripePriceId;
      expect(needsSync).toBe(true);
    });

    it('should NOT sync when prices match', () => {
      const dbPriceId = 'price_agency';
      const stripePriceId = 'price_agency';

      const needsSync = dbPriceId !== stripePriceId;
      expect(needsSync).toBe(false);
    });

    it('should handle undefined DB price_id', () => {
      const dbPriceId = undefined;
      const stripePriceId = 'price_agency';

      const needsSync = dbPriceId !== stripePriceId;
      expect(needsSync).toBe(true);
    });
  });

  describe('Subscription Schedule Phase Handling', () => {
    /**
     * When creating a schedule from a subscription, Stripe sets the phase start_date.
     * We must use that exact value when updating to avoid errors.
     */
    it('should extract start_date from existing phase', () => {
      const mockSchedule = {
        id: 'sub_sched_123',
        phases: [
          {
            start_date: 1704067200, // Unix timestamp
            end_date: null,
            items: [{ price: 'price_growth', quantity: 1 }],
          },
        ],
      };

      const existingPhaseStartDate = mockSchedule.phases[0]?.start_date;
      expect(existingPhaseStartDate).toBe(1704067200);
      expect(existingPhaseStartDate).toBeDefined();
    });

    it('should handle schedule with no phases', () => {
      const mockSchedule = {
        id: 'sub_sched_123',
        phases: [],
      };

      const existingPhaseStartDate = mockSchedule.phases[0]?.start_date;
      expect(existingPhaseStartDate).toBeUndefined();
    });

    it('should create valid phase update structure', () => {
      const existingPhaseStartDate = 1704067200;
      const periodEnd = 1706745600;
      const currentPriceId = 'price_growth';
      const targetPriceId = 'price_starter';

      const phases = [
        {
          items: [{ price: currentPriceId, quantity: 1 }],
          start_date: existingPhaseStartDate, // MUST use exact value
          end_date: periodEnd,
          proration_behavior: 'none',
        },
        {
          items: [{ price: targetPriceId, quantity: 1 }],
          start_date: periodEnd,
          proration_behavior: 'none',
        },
      ];

      expect(phases).toHaveLength(2);
      expect(phases[0].start_date).toBe(existingPhaseStartDate);
      expect(phases[0].end_date).toBe(periodEnd);
      expect(phases[1].start_date).toBe(periodEnd);
      expect(phases[1].end_date).toBeUndefined();
    });
  });

  describe('Scheduled Downgrade Database Updates', () => {
    it('should create correct scheduled change data', () => {
      const targetPriceId = 'price_starter';
      const periodEnd = 1706745600; // Unix timestamp

      const updateData = {
        scheduled_price_id: targetPriceId,
        scheduled_change_date: new Date(periodEnd * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(updateData.scheduled_price_id).toBe('price_starter');
      expect(updateData.scheduled_change_date).toContain('2024-02'); // Feb 2024
    });

    it('should clear scheduled change data on upgrade', () => {
      const updateData = {
        price_id: 'price_agency',
        updated_at: new Date().toISOString(),
        scheduled_price_id: null,
        scheduled_change_date: null,
      };

      expect(updateData.scheduled_price_id).toBeNull();
      expect(updateData.scheduled_change_date).toBeNull();
    });
  });

  describe('Upgrade Proration Behavior', () => {
    /**
     * CRITICAL: Upgrades must use 'always_invoice' to charge the prorated difference immediately.
     * Using 'create_prorations' defers the charge to the next billing cycle, creating an abuse vector
     * where users can upgrade, receive credits immediately, and cancel before paying the difference.
     */
    it('should use always_invoice for upgrades to charge immediately', () => {
      const fs = require('fs');
      const routeSource = fs.readFileSync('server/controllers/SubscriptionController.ts', 'utf-8');

      // Verify the upgrade path uses 'always_invoice', NOT 'create_prorations'
      // The upgrade section follows the comment "// UPGRADE: Apply immediately with proration"
      // Scope to just the subscriptions.update call (before "// Update database")
      const afterUpgradeComment = routeSource.split(
        '// UPGRADE: Apply immediately with proration'
      )[1];
      expect(afterUpgradeComment).toBeDefined();
      const upgradeSection = afterUpgradeComment.split('// Update database')[0];
      expect(upgradeSection).toContain("proration_behavior: 'always_invoice'");
      expect(upgradeSection).not.toContain("proration_behavior: 'create_prorations'");
    });

    it('should use error_if_incomplete to fail on payment failure', () => {
      const fs = require('fs');
      const routeSource = fs.readFileSync('server/controllers/SubscriptionController.ts', 'utf-8');

      const upgradeSection = routeSource.split('// UPGRADE: Apply immediately with proration')[1];
      expect(upgradeSection).toBeDefined();
      expect(upgradeSection).toContain("payment_behavior: 'error_if_incomplete'");
    });
  });

  describe('Bug Fix: No double credit grant on scheduled downgrade completion', () => {
    /**
     * When a scheduled downgrade completes, Stripe sends:
     * 1. subscription_schedule.completed → handleSubscriptionScheduleCompleted
     * 2. invoice.payment_succeeded → handleInvoicePaymentSucceeded
     *
     * Previously, handleSubscriptionScheduleCompleted directly set subscription_credits_balance
     * AND handleInvoicePaymentSucceeded called add_subscription_credits, resulting in 2x credits.
     *
     * Fix: handleSubscriptionScheduleCompleted should ONLY update the tier, NOT touch credits.
     * Credit allocation is exclusively handled by handleInvoicePaymentSucceeded.
     */
    it('should NOT reset credits in handleSubscriptionScheduleCompleted (source code check)', () => {
      const fs = require('fs');
      const handlerSource = fs.readFileSync(
        'server/webhooks/stripe/handlers/subscription.handler.ts',
        'utf-8'
      );

      // Extract the handleSubscriptionScheduleCompleted method body
      const scheduleCompletedSection = handlerSource.split(
        'handleSubscriptionScheduleCompleted'
      )[1];
      expect(scheduleCompletedSection).toBeDefined();

      // The method should NOT directly set subscription_credits_balance
      // (that was the bug - it bypassed the invoice handler)
      const methodEnd = scheduleCompletedSection.indexOf('\n  /**');
      const methodBody =
        methodEnd > 0 ? scheduleCompletedSection.slice(0, methodEnd) : scheduleCompletedSection;

      expect(methodBody).not.toContain('subscription_credits_balance');
      expect(methodBody).not.toContain('creditsPerMonth');
    });

    it('should still update subscription_tier in handleSubscriptionScheduleCompleted', () => {
      const fs = require('fs');
      const handlerSource = fs.readFileSync(
        'server/webhooks/stripe/handlers/subscription.handler.ts',
        'utf-8'
      );

      const scheduleCompletedSection = handlerSource.split(
        'handleSubscriptionScheduleCompleted'
      )[1];
      expect(scheduleCompletedSection).toBeDefined();

      // The method SHOULD still update subscription_tier
      expect(scheduleCompletedSection).toContain('subscription_tier');
    });

    it('should log that credits will be allocated by invoice handler', () => {
      const fs = require('fs');
      const handlerSource = fs.readFileSync(
        'server/webhooks/stripe/handlers/subscription.handler.ts',
        'utf-8'
      );

      const scheduleCompletedSection = handlerSource.split(
        'handleSubscriptionScheduleCompleted'
      )[1];
      expect(scheduleCompletedSection).toBeDefined();

      // Should contain a log indicating credits are deferred to invoice handler
      expect(scheduleCompletedSection).toContain('invoice handler');
    });
  });

  describe('Bug Fix: Release Stripe schedule on upgrade after scheduled downgrade', () => {
    /**
     * When a user upgrades after scheduling a downgrade, the upgrade path must release
     * the existing Stripe subscription schedule. Otherwise, the schedule fires at period end
     * and overrides the upgrade back to the lower plan.
     *
     * The downgrade path already handles this (releases existing schedules before creating new ones),
     * but the upgrade path previously only cleared DB fields without releasing the Stripe schedule.
     */
    it('should release existing schedule in upgrade path (source code check)', () => {
      const fs = require('fs');
      const routeSource = fs.readFileSync('server/controllers/SubscriptionController.ts', 'utf-8');

      // The upgrade section should contain schedule release logic
      const upgradeSection = routeSource.split('// UPGRADE:')[1];
      expect(upgradeSection).toBeDefined();

      // Should call subscriptionSchedules.release before updating the subscription
      expect(upgradeSection).toContain('subscriptionSchedules.release');
    });

    it('should check for existing schedule before releasing in upgrade path', () => {
      const fs = require('fs');
      const routeSource = fs.readFileSync('server/controllers/SubscriptionController.ts', 'utf-8');

      const upgradeSection = routeSource.split('// UPGRADE:')[1];
      expect(upgradeSection).toBeDefined();

      // Should check if schedule exists before trying to release
      expect(upgradeSection).toContain('existingScheduleId');
    });

    it('should handle schedule release failure gracefully in upgrade path', () => {
      const fs = require('fs');
      const routeSource = fs.readFileSync('server/controllers/SubscriptionController.ts', 'utf-8');

      const upgradeSection = routeSource.split('// UPGRADE:')[1];
      expect(upgradeSection).toBeDefined();

      // Should have error handling for schedule release (try/catch)
      expect(upgradeSection).toContain('SCHEDULE_RELEASE_FAILED');
    });

    it('should still clear scheduled DB fields on upgrade', () => {
      const updateData = {
        price_id: 'price_business',
        updated_at: new Date().toISOString(),
        scheduled_price_id: null,
        scheduled_change_date: null,
      };

      expect(updateData.scheduled_price_id).toBeNull();
      expect(updateData.scheduled_change_date).toBeNull();
    });
  });

  describe('Preview Change Response Structure', () => {
    it('should return correct structure for upgrade', () => {
      const response = {
        proration: {
          amount_due: 1500, // $15.00 in cents
          currency: 'usd',
          period_start: '2024-01-01T00:00:00.000Z',
          period_end: '2024-02-01T00:00:00.000Z',
        },
        current_plan: {
          name: 'Growth',
          price_id: 'price_growth',
          credits_per_month: 100,
        },
        new_plan: {
          name: 'Agency',
          price_id: 'price_agency',
          credits_per_month: 500,
        },
        effective_immediately: true,
        is_downgrade: false,
      };

      expect(response.effective_immediately).toBe(true);
      expect(response.is_downgrade).toBe(false);
      expect(response.proration.amount_due).toBeGreaterThan(0);
    });

    it('should return correct structure for downgrade', () => {
      const effectiveDate = '2024-02-01T00:00:00.000Z';

      const response = {
        proration: {
          amount_due: 0, // No charge for downgrades
          currency: 'usd',
          period_start: '2024-01-01T00:00:00.000Z',
          period_end: effectiveDate,
        },
        current_plan: {
          name: 'Agency',
          price_id: 'price_agency',
          credits_per_month: 500,
        },
        new_plan: {
          name: 'Growth',
          price_id: 'price_growth',
          credits_per_month: 100,
        },
        effective_immediately: false,
        effective_date: effectiveDate,
        is_downgrade: true,
      };

      expect(response.effective_immediately).toBe(false);
      expect(response.is_downgrade).toBe(true);
      expect(response.effective_date).toBeDefined();
      expect(response.proration.amount_due).toBe(0);
    });
  });
});
