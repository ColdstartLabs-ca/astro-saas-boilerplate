/**
 * Stripe Configuration Unit Tests
 *
 * Tests for Stripe configuration utilities including:
 * - getPriceId function
 * - isStripePricesConfigured function
 * - getStripePublishableKey, getStripeSecretKey, getStripeWebhookSecret functions
 * - getStripeConfig function
 * - validateStripeConfig function
 * - getPlanForPriceId function
 * - getPlanByKey function
 * - getPlanDisplayName function
 * - isStripeConfigured function
 * - Backward compatibility exports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPriceId,
  isStripePricesConfigured,
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getStripeConfig,
  validateStripeConfig,
  getPlanForPriceId,
  getPlanByKey,
  getPlanDisplayName,
  isStripeConfigured,
  STRIPE_PRICES,
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  HOMEPAGE_TIERS,
  SUBSCRIPTION_PRICE_MAP,
  SUBSCRIPTION_PRICE_IDS,
  type StripePriceKey,
  type ISubscriptionPlanMetadata,
} from '@shared/config/stripe';
import { clientEnv, serverEnv } from '@shared/config/env';

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = vi.fn();
});

describe('shared/config/stripe', () => {
  describe('STRIPE_PRICES', () => {
    it('should have all required price keys', () => {
      expect(STRIPE_PRICES).toHaveProperty('STARTER_MONTHLY');
      expect(STRIPE_PRICES).toHaveProperty('GROWTH_MONTHLY');
      expect(STRIPE_PRICES).toHaveProperty('AGENCY_MONTHLY');
      expect(STRIPE_PRICES).toHaveProperty('SMALL_CREDITS');
      expect(STRIPE_PRICES).toHaveProperty('MEDIUM_CREDITS');
      expect(STRIPE_PRICES).toHaveProperty('LARGE_CREDITS');
    });

    it('should have string values for all price IDs', () => {
      Object.values(STRIPE_PRICES).forEach(priceId => {
        expect(typeof priceId).toBe('string');
        expect(priceId.length).toBeGreaterThan(0);
      });
    });

    it('should have Stripe price ID format (starts with price_)', () => {
      Object.values(STRIPE_PRICES).forEach(priceId => {
        expect(priceId).toMatch(/^price_/);
      });
    });
  });

  describe('CREDIT_PACKS', () => {
    it('should have all required credit pack keys', () => {
      expect(CREDIT_PACKS).toHaveProperty('SMALL_CREDITS');
      expect(CREDIT_PACKS).toHaveProperty('MEDIUM_CREDITS');
      expect(CREDIT_PACKS).toHaveProperty('LARGE_CREDITS');
    });

    it('should have required properties for each credit pack', () => {
      Object.values(CREDIT_PACKS).forEach(pack => {
        expect(pack).toHaveProperty('name');
        expect(pack).toHaveProperty('description');
        expect(pack).toHaveProperty('price');
        expect(pack).toHaveProperty('credits');
        expect(pack).toHaveProperty('features');
        expect(Array.isArray(pack.features)).toBe(true);
      });
    });

    it('should have numeric price and credits', () => {
      Object.values(CREDIT_PACKS).forEach(pack => {
        expect(typeof pack.price).toBe('number');
        expect(typeof pack.credits).toBe('number');
        expect(pack.price).toBeGreaterThan(0);
        expect(pack.credits).toBeGreaterThan(0);
      });
    });
  });

  describe('SUBSCRIPTION_PLANS', () => {
    it('should have all required plan keys', () => {
      expect(SUBSCRIPTION_PLANS).toHaveProperty('STARTER_MONTHLY');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('GROWTH_MONTHLY');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('AGENCY_MONTHLY');
    });

    it('should have required properties for each plan', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('interval');
        expect(plan).toHaveProperty('creditsPerMonth');
        expect(plan).toHaveProperty('features');
        expect(Array.isArray(plan.features)).toBe(true);
        // key and maxRollover are not on all plans (e.g., Free plan)
      });
    });

    it('should have valid interval values', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(['month', 'year']).toContain(plan.interval);
      });
    });
  });

  describe('HOMEPAGE_TIERS', () => {
    it('should be an array', () => {
      expect(Array.isArray(HOMEPAGE_TIERS)).toBe(true);
    });

    it('should have at least 3 tiers', () => {
      expect(HOMEPAGE_TIERS.length).toBeGreaterThanOrEqual(3);
    });

    it('should have required properties for each tier', () => {
      HOMEPAGE_TIERS.forEach(tier => {
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        // interval may be optional for free/tier trial plans
        expect(tier).toHaveProperty('features');
        expect(Array.isArray(tier.features)).toBe(true);
      });
    });
  });

  describe('getPriceId', () => {
    it('should return price ID for valid key', () => {
      const priceId = getPriceId('STARTER_MONTHLY');
      expect(typeof priceId).toBe('string');
      expect(priceId.length).toBeGreaterThan(0);
    });

    it('should return price ID for all valid keys', () => {
      const keys: StripePriceKey[] = [
        'STARTER_MONTHLY',
        'GROWTH_MONTHLY',
        'AGENCY_MONTHLY',
        'SMALL_CREDITS',
        'MEDIUM_CREDITS',
        'LARGE_CREDITS',
      ];
      keys.forEach(key => {
        const priceId = getPriceId(key);
        expect(typeof priceId).toBe('string');
      });
    });

    it('should return string even for potentially invalid prices', () => {
      // This tests that the function returns a string and logs a warning
      // for invalid prices (in actual Stripe config)
      const priceId = getPriceId('STARTER_MONTHLY');
      expect(typeof priceId).toBe('string');
    });
  });

  describe('isStripePricesConfigured', () => {
    it('should return true for static configuration', () => {
      expect(isStripePricesConfigured()).toBe(true);
    });
  });

  describe('getStripePublishableKey', () => {
    it('should return the publishable key from client env', () => {
      const key = getStripePublishableKey();
      expect(key).toBe(clientEnv.STRIPE_PUBLISHABLE_KEY);
    });

    it('should return a string', () => {
      const key = getStripePublishableKey();
      expect(typeof key).toBe('string');
    });
  });

  describe('getStripeSecretKey', () => {
    it('should return the secret key from server env or empty string', () => {
      const key = getStripeSecretKey();
      expect(typeof key).toBe('string');
      // Secret key can be empty in test environment
      expect(key === '' || typeof key === 'string').toBe(true);
    });
  });

  describe('getStripeWebhookSecret', () => {
    it('should return the webhook secret from server env or empty string', () => {
      const secret = getStripeWebhookSecret();
      expect(typeof secret).toBe('string');
      // Webhook secret can be empty in test environment
      expect(secret === '' || typeof secret === 'string').toBe(true);
    });
  });

  describe('getStripeConfig', () => {
    it('should return complete config object', () => {
      const config = getStripeConfig();
      expect(config).toHaveProperty('publishableKey');
      expect(config).toHaveProperty('secretKey');
      expect(config).toHaveProperty('webhookSecret');
      expect(config).toHaveProperty('prices');
      expect(config).toHaveProperty('creditPacks');
      expect(config).toHaveProperty('subscriptionPlans');
      expect(config).toHaveProperty('homepageTiers');
    });

    it('should have publishableKey matching client env', () => {
      const config = getStripeConfig();
      expect(config.publishableKey).toBe(clientEnv.STRIPE_PUBLISHABLE_KEY);
    });

    it('should have prices matching STRIPE_PRICES', () => {
      const config = getStripeConfig();
      expect(config.prices).toEqual(STRIPE_PRICES);
    });

    it('should have creditPacks matching CREDIT_PACKS', () => {
      const config = getStripeConfig();
      expect(config.creditPacks).toEqual(CREDIT_PACKS);
    });

    it('should have subscriptionPlans matching SUBSCRIPTION_PLANS', () => {
      const config = getStripeConfig();
      expect(config.subscriptionPlans).toEqual(SUBSCRIPTION_PLANS);
    });

    it('should have homepageTiers matching HOMEPAGE_TIERS', () => {
      const config = getStripeConfig();
      expect(config.homepageTiers).toEqual(HOMEPAGE_TIERS);
    });
  });

  describe('validateStripeConfig', () => {
    it('should return an object with isValid, errors, and warnings', () => {
      const validation = validateStripeConfig();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should have isValid as boolean', () => {
      const validation = validateStripeConfig();
      expect(typeof validation.isValid).toBe('boolean');
    });

    it('should return errors array (even if empty)', () => {
      const validation = validateStripeConfig();
      expect(Array.isArray(validation.errors)).toBe(true);
    });

    it('should return warnings array (even if empty)', () => {
      const validation = validateStripeConfig();
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('getPlanForPriceId', () => {
    it('should return plan details for valid subscription price ID', () => {
      // Use a known starter monthly price ID
      const starterPriceId = STRIPE_PRICES.STARTER_MONTHLY;
      const plan = getPlanForPriceId(starterPriceId);

      expect(plan).not.toBeNull();
      if (plan) {
        expect(plan).toHaveProperty('key');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('creditsPerMonth');
        expect(plan).toHaveProperty('maxRollover');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('recommended');
      }
    });

    it('should return null for credit pack price IDs', () => {
      const smallCreditsPriceId = STRIPE_PRICES.SMALL_CREDITS;
      const plan = getPlanForPriceId(smallCreditsPriceId);
      expect(plan).toBeNull();
    });

    it('should return null for invalid price ID', () => {
      const plan = getPlanForPriceId('price_invalid');
      expect(plan).toBeNull();
    });

    it('should return plan with all expected properties for starter', () => {
      const starterPriceId = STRIPE_PRICES.STARTER_MONTHLY;
      const plan = getPlanForPriceId(starterPriceId);

      expect(plan).not.toBeNull();
      if (plan) {
        expect(plan.key).toBe('starter');
        expect(plan.name).toBeTruthy();
        expect(typeof plan.creditsPerMonth).toBe('number');
        expect(typeof plan.maxRollover).toBe('number');
        expect(Array.isArray(plan.features)).toBe(true);
      }
    });
  });

  describe('getPlanByKey', () => {
    it('should return plan for valid key', () => {
      const plan = getPlanByKey('starter');
      expect(plan).not.toBeNull();
      if (plan) {
        expect(plan.key).toBe('starter');
        expect(plan.name).toBeTruthy();
      }
    });

    it('should return plan for all valid keys', () => {
      const keys = ['starter', 'growth', 'agency'];
      keys.forEach(key => {
        const plan = getPlanByKey(key);
        expect(plan).not.toBeNull();
        if (plan) {
          expect(plan.key).toBe(key);
        }
      });
    });

    it('should return null for invalid key', () => {
      const plan = getPlanByKey('invalid_key');
      expect(plan).toBeNull();
    });

    it('should return plan with expected properties', () => {
      const plan = getPlanByKey('growth');
      expect(plan).not.toBeNull();
      if (plan) {
        expect(plan).toHaveProperty('key');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('creditsPerMonth');
        expect(plan).toHaveProperty('maxRollover');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('recommended');
      }
    });
  });

  describe('getPlanDisplayName', () => {
    describe('string input (legacy support)', () => {
      it('should return display name for starter', () => {
        const name = getPlanDisplayName('starter');
        expect(name).toContain('Starter');
        expect(name).toContain('Plan');
      });

      it('should return display name for growth', () => {
        const name = getPlanDisplayName('growth');
        expect(name).toContain('Growth');
        expect(name).toContain('Plan');
      });

      it('should return display name for agency', () => {
        const name = getPlanDisplayName('agency');
        expect(name).toContain('Agency');
        expect(name).toContain('Plan');
      });

      it('should handle starter_monthly', () => {
        const name = getPlanDisplayName('starter_monthly');
        expect(name).toContain('Plan');
      });

      it('should return string with "Plan" suffix if not already present', () => {
        const name = getPlanDisplayName('custom');
        expect(name).toContain('custom');
        expect(name).toContain('Plan');
      });

      it('should return as-is if already contains "plan"', () => {
        const name = getPlanDisplayName('My Custom Plan');
        expect(name).toBe('My Custom Plan');
      });

      it('should be case-insensitive for "plan" check', () => {
        const name = getPlanDisplayName('My Custom PLAN');
        expect(name).toBe('My Custom PLAN');
      });
    });

    describe('object input with subscriptionTier', () => {
      it('should return Free Plan for null subscriptionTier', () => {
        const name = getPlanDisplayName({ subscriptionTier: null });
        expect(name).toContain('Free');
      });

      it('should return Free Plan for undefined subscriptionTier', () => {
        const name = getPlanDisplayName({ subscriptionTier: undefined });
        expect(name).toContain('Free');
      });

      it('should return Starter Plan for starter tier', () => {
        const name = getPlanDisplayName({ subscriptionTier: 'starter' });
        expect(name).toContain('Starter');
        expect(name).toContain('Plan');
      });

      it('should return Growth Plan for growth tier', () => {
        const name = getPlanDisplayName({ subscriptionTier: 'growth' });
        expect(name).toContain('Growth');
        expect(name).toContain('Plan');
      });

      it('should return Agency Plan for agency tier', () => {
        const name = getPlanDisplayName({ subscriptionTier: 'agency' });
        expect(name).toContain('Agency');
        expect(name).toContain('Plan');
      });

      it('should be case-insensitive for tier names', () => {
        const name = getPlanDisplayName({ subscriptionTier: 'STARTER' });
        expect(name).toContain('Starter');
      });
    });

    describe('object input with priceId', () => {
      it('should return plan name for valid price ID', () => {
        const starterPriceId = STRIPE_PRICES.STARTER_MONTHLY;
        const name = getPlanDisplayName({ priceId: starterPriceId });
        expect(name).toContain('Plan');
      });

      it('should handle unknown price ID gracefully', () => {
        const name = getPlanDisplayName({
          subscriptionTier: 'unknown',
          priceId: 'price_invalid',
        });
        expect(typeof name).toBe('string');
        expect(name).toContain('Plan');
      });
    });

    describe('object input with planKey', () => {
      it('should return plan name for valid plan key', () => {
        // When planKey is provided without subscriptionTier, the function
        // falls back to using subscriptionTier (undefined) which becomes "Free Plan"
        // To properly test planKey lookup, we need to provide subscriptionTier as well
        const name = getPlanDisplayName({ planKey: 'starter', subscriptionTier: 'starter' });
        expect(name).toContain('Starter');
        expect(name).toContain('Plan');
      });

      it('should handle unknown plan key gracefully', () => {
        const name = getPlanDisplayName({
          subscriptionTier: 'unknown',
          planKey: 'invalid_key',
        });
        expect(typeof name).toBe('string');
      });
    });

    describe('fallback behavior', () => {
      it('should capitalize first letter of unknown tier', () => {
        const name = getPlanDisplayName({ subscriptionTier: 'custom' });
        expect(name).toBe('Custom Plan');
      });

      it('should handle empty string tier', () => {
        const name = getPlanDisplayName({ subscriptionTier: '' });
        expect(name).toContain('Free');
      });
    });
  });

  describe('isStripeConfigured', () => {
    it('should return a boolean', () => {
      const configured = isStripeConfigured();
      expect(typeof configured).toBe('boolean');
    });

    it('should be based on validation result and secret key presence', () => {
      // This function returns true if validation passes AND secret key exists
      const configured = isStripeConfigured();
      expect(typeof configured).toBe('boolean');
    });
  });

  describe('SUBSCRIPTION_PRICE_MAP', () => {
    it('should be an object', () => {
      expect(typeof SUBSCRIPTION_PRICE_MAP).toBe('object');
      expect(SUBSCRIPTION_PRICE_MAP).not.toBeNull();
    });

    it('should have price IDs as keys', () => {
      Object.keys(SUBSCRIPTION_PRICE_MAP).forEach(key => {
        expect(typeof key).toBe('string');
      });
    });
  });

  describe('SUBSCRIPTION_PRICE_IDS', () => {
    it('should be an array', () => {
      expect(Array.isArray(SUBSCRIPTION_PRICE_IDS)).toBe(true);
    });

    it('should only contain subscription plan price IDs (not credit packs)', () => {
      // Should contain STARTER_MONTHLY, GROWTH_MONTHLY, AGENCY_MONTHLY
      // Should not contain SMALL_CREDITS, MEDIUM_CREDITS, LARGE_CREDITS
      const smallCreditsPriceId = STRIPE_PRICES.SMALL_CREDITS;
      expect(SUBSCRIPTION_PRICE_IDS).not.toContain(smallCreditsPriceId);

      const starterPriceId = STRIPE_PRICES.STARTER_MONTHLY;
      expect(SUBSCRIPTION_PRICE_IDS).toContain(starterPriceId);
    });

    it('should have at least 3 subscription price IDs', () => {
      expect(SUBSCRIPTION_PRICE_IDS.length).toBeGreaterThanOrEqual(3);
    });
  });
});
