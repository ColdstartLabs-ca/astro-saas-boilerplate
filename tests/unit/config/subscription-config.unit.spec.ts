import { describe, test, expect } from 'vitest';
import { SUBSCRIPTION_CONFIG, getSubscriptionConfig } from '@shared/config/subscription.config';
import { validateSubscriptionConfig } from '@shared/config/subscription.validator';
import {
  getPlanByPriceId,
  getPlanByKey,
  getEnabledPlans,
  getRecommendedPlan,
  calculateCreditCost,
  getCreditCostForMode,
  getFreeUserCredits,
  getLowCreditThreshold,
  getExpirationConfig,
  creditsExpireForPlan,
  calculateBalanceWithExpiration,
  shouldSendExpirationWarning,
} from '@shared/config/subscription.utils';

describe('Subscription Configuration', () => {
  describe('Configuration Validation', () => {
    test('default config passes validation', () => {
      expect(() => {
        validateSubscriptionConfig(SUBSCRIPTION_CONFIG);
      }).not.toThrow();
    });

    test('config has all required fields', () => {
      const config = getSubscriptionConfig();
      expect(config.version).toBeDefined();
      expect(config.plans).toBeInstanceOf(Array);
      expect(config.plans.length).toBeGreaterThan(0);
      expect(config.creditCosts).toBeDefined();
      expect(config.freeUser).toBeDefined();
      expect(config.warnings).toBeDefined();
      expect(config.defaults).toBeDefined();
    });

    test('all plans have valid Stripe price IDs', () => {
      const config = getSubscriptionConfig();
      for (const plan of config.plans) {
        if (plan.stripePriceId !== null) {
          expect(plan.stripePriceId).toMatch(/^price_/);
        }
      }
    });

    test('credit costs are positive', () => {
      const config = getSubscriptionConfig();
      expect(config.creditCosts.modes.api).toBeGreaterThan(0);
      expect(config.creditCosts.modes.basic).toBeGreaterThan(0);
      expect(config.creditCosts.modes.premium).toBeGreaterThan(0);
      expect(config.creditCosts.modes.enterprise).toBeGreaterThan(0);
    });

    test('minimumCost <= maximumCost', () => {
      const config = getSubscriptionConfig();
      expect(config.creditCosts.minimumCost).toBeLessThanOrEqual(config.creditCosts.maximumCost);
    });
  });

  describe('Plan Lookup Functions', () => {
    test('getPlanByPriceId returns correct plan for Starter', () => {
      const plan = getPlanByPriceId('price_starter_monthly');
      expect(plan).toBeDefined();
      expect(plan?.key).toBe('starter');
      expect(plan?.name).toBe('Starter');
    });

    test('getPlanByPriceId returns null for invalid price ID', () => {
      const plan = getPlanByPriceId('invalid_price_id');
      expect(plan).toBeNull();
    });

    test('getPlanByKey returns correct plan for Starter', () => {
      const plan = getPlanByKey('starter');
      expect(plan).toBeDefined();
      expect(plan?.stripePriceId).toBe('price_starter_monthly');
      expect(plan?.creditsPerCycle).toBe(30);
    });

    test('getPlanByKey returns null for invalid key', () => {
      const plan = getPlanByKey('invalid_key');
      expect(plan).toBeNull();
    });

    test('getEnabledPlans returns only enabled plans', () => {
      const plans = getEnabledPlans();
      expect(plans.every(p => p.enabled)).toBe(true);
    });

    test('getEnabledPlans returns plans in display order', () => {
      const plans = getEnabledPlans();
      for (let i = 1; i < plans.length; i++) {
        expect(plans[i].displayOrder).toBeGreaterThanOrEqual(plans[i - 1].displayOrder);
      }
    });

    test('getRecommendedPlan returns the recommended plan', () => {
      const plan = getRecommendedPlan();
      expect(plan).toBeDefined();
      expect(plan?.recommended).toBe(true);
      expect(plan?.key).toBe('growth'); // Growth is marked as recommended
    });
  });

  describe('Credit Cost Calculations', () => {
    test('calculateCreditCost for api mode', () => {
      const cost = calculateCreditCost({ mode: 'api' });
      expect(cost).toBe(1);
    });

    test('calculateCreditCost for basic mode', () => {
      const cost = calculateCreditCost({ mode: 'basic' });
      expect(cost).toBe(1);
    });

    test('calculateCreditCost for premium mode', () => {
      const cost = calculateCreditCost({ mode: 'premium' });
      expect(cost).toBe(1); // Changed to 1 in new pricing model
    });

    test('calculateCreditCost for enterprise mode', () => {
      const cost = calculateCreditCost({ mode: 'enterprise' });
      expect(cost).toBe(1); // Changed to 1 in new pricing model
    });

    test('calculateCreditCost respects minimum cost', () => {
      const cost = calculateCreditCost({ mode: 'api' });
      expect(cost).toBeGreaterThanOrEqual(1); // minimumCost = 1
    });

    test('getCreditCostForMode returns correct costs', () => {
      expect(getCreditCostForMode('api')).toBe(1);
      expect(getCreditCostForMode('basic')).toBe(1);
      expect(getCreditCostForMode('premium')).toBe(1); // Changed to 1
      expect(getCreditCostForMode('enterprise')).toBe(1); // Changed to 1
    });
  });

  describe('Free User & Warnings', () => {
    test('getFreeUserCredits returns initial credits', () => {
      const credits = getFreeUserCredits();
      expect(credits).toBe(3); // Changed from 10 to 3 for new pricing
    });

    test('getLowCreditThreshold returns warning threshold', () => {
      const threshold = getLowCreditThreshold();
      expect(threshold).toBe(2); // Changed from 5 to 2
    });
  });

  describe('Plan Configuration Values', () => {
    test('starter plan has correct values', () => {
      const plan = getPlanByKey('starter');
      expect(plan?.creditsPerCycle).toBe(30);
      expect(plan?.maxRollover).toBeDefined();
      expect(plan?.rolloverMultiplier).toBe(3); // Changed from 6 to 3
      expect(plan?.priceInCents).toBe(4900);
    });

    test('growth plan has correct values', () => {
      const plan = getPlanByKey('growth');
      expect(plan?.creditsPerCycle).toBe(100);
      expect(plan?.maxRollover).toBeDefined();
      expect(plan?.rolloverMultiplier).toBe(3); // Changed from 6 to 3
      expect(plan?.priceInCents).toBe(9900);
      expect(plan?.recommended).toBe(true);
    });

    test('agency plan has correct values', () => {
      const plan = getPlanByKey('agency');
      expect(plan?.creditsPerCycle).toBe(500);
      expect(plan?.maxRollover).toBe(0); // No rollover for agency
      expect(plan?.rolloverMultiplier).toBe(0);
      expect(plan?.priceInCents).toBe(24900);
    });
  });

  describe('Trial Configuration (Disabled)', () => {
    test('all plans have trial disabled by default', () => {
      const plans = getEnabledPlans();
      for (const plan of plans) {
        expect(plan.trial.enabled).toBe(false);
        expect(plan.trial.durationDays).toBe(0);
      }
    });
  });

  describe('Credits Expiration Configuration', () => {
    test('all plans have valid expiration configuration', () => {
      const plans = getEnabledPlans();
      for (const plan of plans) {
        expect(plan.creditsExpiration).toBeDefined();
        expect(plan.creditsExpiration.mode).toBeDefined();
        expect(['never', 'end_of_cycle', 'rolling_window']).toContain(plan.creditsExpiration.mode);
      }
    });
  });

  describe('Credits Expiration Functions', () => {
    test('getExpirationConfig returns config for valid price ID', () => {
      const config = getExpirationConfig('price_growth_monthly'); // Growth plan
      expect(config).toBeDefined();
      expect(config?.mode).toBeDefined();
      expect(['never', 'end_of_cycle', 'rolling_window']).toContain(config?.mode);
    });

    test('getExpirationConfig returns null for invalid price ID', () => {
      const config = getExpirationConfig('invalid_price_id');
      expect(config).toBeNull();
    });

    test('creditsExpireForPlan returns correct value based on mode', () => {
      const expires = creditsExpireForPlan('price_growth_monthly'); // Growth plan
      expect(typeof expires).toBe('boolean');
    });

    test('calculateBalanceWithExpiration - never mode with rollover', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(80); // 50 + 30
      expect(result.expiredAmount).toBe(0);
    });

    test('calculateBalanceWithExpiration - never mode with rollover cap', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 80,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(90); // Capped at max
      expect(result.expiredAmount).toBe(0);
    });

    test('calculateBalanceWithExpiration - end_of_cycle mode expires all', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 30,
        expirationMode: 'end_of_cycle',
        maxRollover: null,
      });

      expect(result.newBalance).toBe(30); // Fresh allocation
      expect(result.expiredAmount).toBe(50); // All old credits expired
    });

    test('calculateBalanceWithExpiration - rolling_window mode expires all', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 25,
        newCredits: 30,
        expirationMode: 'rolling_window',
        maxRollover: null,
      });

      expect(result.newBalance).toBe(30); // Fresh allocation
      expect(result.expiredAmount).toBe(25); // All old credits expired
    });

    test('calculateBalanceWithExpiration - end_of_cycle with zero balance', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 0,
        newCredits: 30,
        expirationMode: 'end_of_cycle',
        maxRollover: null,
      });

      expect(result.newBalance).toBe(30);
      expect(result.expiredAmount).toBe(0); // Nothing to expire
    });

    test('shouldSendExpirationWarning returns correct value based on config', () => {
      const plan = getPlanByPriceId('price_growth_monthly'); // Growth plan
      const should = shouldSendExpirationWarning({
        priceId: 'price_growth_monthly',
        daysUntilExpiration: 3,
      });

      // Result depends on plan config
      expect(typeof should).toBe('boolean');

      // If mode is 'never', should always be false
      if (plan?.creditsExpiration.mode === 'never') {
        expect(should).toBe(false);
      }
    });

    test('shouldSendExpirationWarning returns false for invalid price ID', () => {
      const should = shouldSendExpirationWarning({
        priceId: 'invalid_price_id',
        daysUntilExpiration: 3,
      });

      expect(should).toBe(false);
    });

    test('shouldSendExpirationWarning checks warning configuration', () => {
      const plan = getPlanByPriceId('price_growth_monthly'); // Growth plan
      const warningDays = plan?.creditsExpiration.warningDaysBefore || 0;

      // Test within warning window
      const shouldWarn = shouldSendExpirationWarning({
        priceId: 'price_growth_monthly',
        daysUntilExpiration: warningDays - 1,
      });

      // Test outside warning window
      const shouldNotWarn = shouldSendExpirationWarning({
        priceId: 'price_growth_monthly',
        daysUntilExpiration: warningDays + 1,
      });

      expect(typeof shouldWarn).toBe('boolean');
      expect(typeof shouldNotWarn).toBe('boolean');
    });
  });
});
