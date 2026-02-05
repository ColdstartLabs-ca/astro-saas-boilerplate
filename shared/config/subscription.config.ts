/**
 * Centralized Subscription Configuration
 * Single source of truth for all subscription-related settings
 *
 * IMPORTANT: This file should be the ONLY place where subscription
 * configuration values are defined. All other files should import from here.
 */

import { CREDIT_COSTS } from './credits.config';
import type { ISubscriptionConfig } from './subscription.types';
import { TIMEOUTS } from './timeouts.config';

/**
 * Default subscription configuration
 * Modify this to change subscription behavior for your SaaS application
 */
export const SUBSCRIPTION_CONFIG: ISubscriptionConfig = {
  version: '1.0.0',

  plans: [
    {
      key: 'free',
      name: 'Free',
      stripePriceId: null,
      priceInCents: 0, // $0.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: 10, // 10 credits total, no refresh
      maxRollover: 60, // 6 months worth (10 * 6)
      rolloverMultiplier: 6,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: true,
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never', // Credits roll over with cap
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '10 credits per month',
        'Credits roll over (up to 60)',
        'Basic API access',
        'Community support',
        'Single request at a time',
      ],
      recommended: false,
      description: 'Perfect for getting started',
      displayOrder: 0,
      enabled: false, // Free tier is handled via freeUser config, not as a subscription plan
      batchLimit: 1, // Single request only for free tier
    },
    {
      key: 'starter',
      name: 'Starter',
      stripePriceId: 'price_1Sq14eALMLhQocpf5CXIwYSv',
      priceInCents: 900, // $9.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: 100, // 100 credits per month
      maxRollover: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3, // 300 credits max (3x rollover)
      rolloverMultiplier: 3,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: true,
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never', // Credits roll over with cap
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '100 credits per month',
        'Credits roll over (up to 300)',
        'Email support',
        'All API features included',
        'Batch up to 5 requests',
      ],
      recommended: false,
      description: 'Perfect for getting started',
      displayOrder: 1,
      enabled: true,
      batchLimit: 5, // Allow batch up to 5 requests
    },
    {
      key: 'hobby',
      name: 'Hobby',
      stripePriceId: 'price_1SZmVyALMLhQocpf0H7n5ls8',
      priceInCents: 1900, // $19.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.HOBBY_MONTHLY_CREDITS,
      maxRollover: CREDIT_COSTS.HOBBY_MONTHLY_CREDITS * 6, // 1200 credits max
      rolloverMultiplier: 6,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: true,
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never', // Credits roll over with cap
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '200 credits per month',
        'Credits roll over (up to 1,200)',
        'Email support',
        'All features included',
        'Batch up to 10 requests',
      ],
      recommended: false,
      description: 'For personal projects',
      displayOrder: 2,
      enabled: true,
      batchLimit: 10, // Up to 10 requests in batch
    },
    {
      key: 'pro',
      name: 'Professional',
      stripePriceId: 'price_1SZmVzALMLhQocpfPyRX2W8D',
      priceInCents: 4900, // $49.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.PRO_MONTHLY_CREDITS,
      maxRollover: CREDIT_COSTS.PRO_MONTHLY_CREDITS * 6, // 6000 credits max
      rolloverMultiplier: 6,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: true,
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never', // Credits roll over with cap
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '1000 credits per month',
        'Credits roll over (up to 6,000)',
        'Priority support',
        'All features included',
        'Early access to new features',
        'Batch up to 50 requests',
      ],
      recommended: true,
      description: 'For professionals',
      displayOrder: 3,
      enabled: true,
      batchLimit: 50, // Up to 50 requests in batch
    },
    {
      key: 'business',
      name: 'Business',
      stripePriceId: 'price_1SZmVzALMLhQocpfqPk9spg4',
      priceInCents: 14900, // $149.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.BUSINESS_MONTHLY_CREDITS,
      maxRollover: 0, // No rollover - use it or lose it
      rolloverMultiplier: 0,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: true,
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never', // Credits roll over with cap
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '5000 credits per month',
        'No credit rollover (use monthly allocation)',
        '24/7 priority support',
        'All features included',
        'Dedicated account manager',
        'Custom integrations',
        'Batch up to 500 requests',
      ],
      recommended: false,
      description: 'For teams and agencies',
      displayOrder: 4,
      enabled: true,
      batchLimit: 500, // Up to 500 requests in batch
    },
  ],

  creditPacks: [
    {
      key: 'small',
      name: 'Small Pack',
      credits: CREDIT_COSTS.SMALL_PACK_CREDITS,
      priceInCents: 499, // $4.99
      currency: 'usd',
      stripePriceId: 'price_1SbAASALMLhQocpfGUg3wLXM',
      description: '50 credits',
      popular: false,
      enabled: true,
    },
    {
      key: 'medium',
      name: 'Medium Pack',
      credits: CREDIT_COSTS.MEDIUM_PACK_CREDITS,
      priceInCents: 1499, // $14.99
      currency: 'usd',
      stripePriceId: 'price_1SbAASALMLhQocpf7nw3wRj7',
      description: '200 credits - Best value',
      popular: true,
      enabled: true,
    },
    {
      key: 'large',
      name: 'Large Pack',
      credits: CREDIT_COSTS.LARGE_PACK_CREDITS,
      priceInCents: 3999, // $39.99
      currency: 'usd',
      stripePriceId: 'price_1SbAASALMLhQocpfCrD7P7TW',
      description: '600 credits',
      popular: false,
      enabled: true,
    },
  ],

  creditCosts: {
    modes: {
      api: CREDIT_COSTS.API_CALL, // Base API call cost (1 credit)
      basic: CREDIT_COSTS.API_CALL * 1, // Basic mode (1 credit)
      premium: CREDIT_COSTS.API_CALL * 2, // Premium mode (2 credits)
      enterprise: CREDIT_COSTS.API_CALL * 5, // Enterprise mode (5 credits)
    },
    // Option multipliers for different features
    featureMultipliers: {
      basic: 1.0,
      premium: 2.0,
      enterprise: 5.0,
    },
    // Options
    options: {
      priorityProcessing: 1, // Future feature
      batchPerRequest: 0, // No extra cost per batch request
    },
    minimumCost: CREDIT_COSTS.API_CALL, // At least 1 credit per operation
    maximumCost: CREDIT_COSTS.API_CALL * 10, // Safety cap
  },

  freeUser: {
    initialCredits: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // One-time credits on signup
    monthlyRefresh: false, // Free users don't get monthly refresh
    monthlyCredits: CREDIT_COSTS.DEFAULT_TRIAL_CREDITS, // Only for paid subscriptions
    maxBalance: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // Free users capped at initial credits
    batchLimit: 1, // Up to 1 request at a time for free users
  },

  warnings: {
    lowCreditThreshold: CREDIT_COSTS.LOW_CREDIT_WARNING_THRESHOLD, // Warn when balance falls below this
    lowCreditPercentage: CREDIT_COSTS.CREDIT_WARNING_PERCENTAGE, // Also warn at 20% of monthly allowance
    showToastOnDashboard: true, // Show toast notification
    checkIntervalMs: TIMEOUTS.CACHE_MEDIUM_TTL, // Check every 5 minutes
  },

  defaults: {
    defaultCurrency: 'usd',
    defaultInterval: 'month',
    creditsRolloverDefault: true, // Credits roll over by default
    defaultRolloverMultiplier: 6, // Default to 6x monthly credits
  },
} as const;

/**
 * Get the complete subscription configuration
 * Returns the subscription config - use this instead of directly accessing SUBSCRIPTION_CONFIG
 */
export function getSubscriptionConfig(): ISubscriptionConfig {
  return SUBSCRIPTION_CONFIG;
}

/**
 * Get trial configuration for a specific price ID
 * Returns null if trial is not enabled for the plan
 */
export function getTrialConfig(priceId: string): ISubscriptionConfig['plans'][0]['trial'] | null {
  const plan = getSubscriptionConfig().plans.find(p => p.stripePriceId === priceId);
  return plan?.trial?.enabled ? plan.trial : null;
}

/**
 * Get plan configuration by price ID
 */
export function getPlanConfig(priceId: string): ISubscriptionConfig['plans'][0] | null {
  return getSubscriptionConfig().plans.find(p => p.stripePriceId === priceId) || null;
}

/**
 * Check if a plan has trial enabled
 */
export function isTrialEnabled(priceId: string): boolean {
  const config = getTrialConfig(priceId);
  return config ? config.enabled : false;
}
