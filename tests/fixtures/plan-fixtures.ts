/**
 * Plan Fixtures for Testing
 *
 * Centralized plan configuration for use in tests.
 * Import these fixtures instead of hardcoding plan values in tests.
 * This makes tests easier to maintain when plan values change.
 *
 * Usage:
 *   import { PLAN_FIXTURES } from '../fixtures/plan-fixtures';
 *
 *   expect(plan.creditsPerCycle).toBe(PLAN_FIXTURES.starter.creditsPerCycle);
 */

import { CREDIT_COSTS } from '../../shared/config/credits.config';
import { getSubscriptionConfig } from '../../shared/config/subscription.config';

const config = getSubscriptionConfig();

/**
 * Plan fixtures with all test-relevant plan data
 */
export const PLAN_FIXTURES = {
  starter: {
    key: 'starter',
    name: 'Starter',
    creditsPerCycle: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30
    maxRollover: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3, // 90
    rolloverMultiplier: 3,
    priceInCents: 4900, // $49.00
    priceDisplay: '$49',
    currency: 'usd',
    interval: 'month',
    periodDisplay: '/mo',
    stripePriceId: 'price_starter_monthly',
    batchLimit: 5,
    description: 'Perfect for getting started',
    features: [
      '30 credits/month',
      'Credits roll over (up to 90)',
      'Configurable usage metering',
      'Usage dashboard',
      'Unlimited projects',
      'Basic reporting',
      'Email support',
    ],
  },
  growth: {
    key: 'growth',
    name: 'Growth',
    creditsPerCycle: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS, // 100
    maxRollover: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS * 3, // 300
    rolloverMultiplier: 3,
    priceInCents: 9900, // $99.00
    priceDisplay: '$99',
    currency: 'usd',
    interval: 'month',
    periodDisplay: '/mo',
    stripePriceId: 'price_growth_monthly',
    batchLimit: 25,
    description: 'For growing content teams',
    recommended: true,
    features: [
      '100 credits/month',
      'Credits roll over (up to 300)',
      'Everything in Starter',
      'Advanced integrations',
      '3 CMS sites',
      'Advanced reporting',
      'Scheduled jobs',
      'Priority support',
    ],
  },
  agency: {
    key: 'agency',
    name: 'Agency',
    creditsPerCycle: CREDIT_COSTS.AGENCY_MONTHLY_CREDITS, // 500
    maxRollover: 0, // No rollover for Agency
    rolloverMultiplier: 0,
    priceInCents: 24900, // $249.00
    priceDisplay: '$249',
    currency: 'usd',
    interval: 'month',
    periodDisplay: '/mo',
    stripePriceId: 'price_agency_monthly',
    batchLimit: 100,
    description: 'For agencies and large teams',
    recommended: false,
    features: [
      '500 credits/month',
      'Everything in Growth',
      'Unlimited CMS sites',
      'White-label reports (coming soon)',
      'Team accounts (up to 5)',
      'API access',
      'Dedicated account manager',
    ],
  },
} as const;

/**
 * Credit pack fixtures for testing
 */
export const CREDIT_PACK_FIXTURES = {
  small: {
    key: 'small',
    name: 'Small Pack',
    credits: CREDIT_COSTS.SMALL_PACK_CREDITS, // 10
    priceInCents: 999, // $9.99
    priceDisplay: '$9.99',
    stripePriceId: 'price_credits_small',
    popular: false,
  },
  medium: {
    key: 'medium',
    name: 'Medium Pack',
    credits: CREDIT_COSTS.MEDIUM_PACK_CREDITS, // 25
    priceInCents: 1999, // $19.99
    priceDisplay: '$19.99',
    stripePriceId: 'price_credits_medium',
    popular: true,
    description: '25 credits - Best value',
  },
  large: {
    key: 'large',
    name: 'Large Pack',
    credits: CREDIT_COSTS.LARGE_PACK_CREDITS, // 50
    priceInCents: 3499, // $34.99
    priceDisplay: '$34.99',
    stripePriceId: 'price_credits_large',
    popular: false,
  },
} as const;

/**
 * Free tier fixture for testing
 */
export const FREE_TIER_FIXTURE = {
  initialCredits: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // 3
  monthlyRefresh: false,
  monthlyCredits: CREDIT_COSTS.DEFAULT_TRIAL_CREDITS, // 3
  maxBalance: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // 3
  batchLimit: 1,
  description: 'Try the app free',
  features: ['3 trial credits', 'Basic AI models', 'No credit card required'],
};

/**
 * Helper to get all enabled plans
 */
export function getEnabledPlans(): typeof PLAN_FIXTURES {
  return PLAN_FIXTURES;
}

/**
 * Helper to get plan by key
 */
export function getPlanByKey<T extends keyof typeof PLAN_FIXTURES>(
  key: T
): (typeof PLAN_FIXTURES)[T] {
  return PLAN_FIXTURES[key];
}

/**
 * Type for plan keys
 */
export type PlanKey = keyof typeof PLAN_FIXTURES;
export type CreditPackKey = keyof typeof CREDIT_PACK_FIXTURES;
