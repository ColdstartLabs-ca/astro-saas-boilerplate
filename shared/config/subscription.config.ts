/**
 * Centralized Subscription Configuration
 * Single source of truth for all subscription-related settings
 *
 * IMPORTANT: This file should be the ONLY place where subscription
 * configuration values are defined. All other files should import from here.
 *
 * AutopilotRank - AI SEO Content Platform
 * 1 credit = 1 article generation
 */

import { CREDIT_COSTS } from './credits.config';
import type { ISubscriptionConfig } from './subscription.types';
import { TIMEOUTS } from './timeouts.config';

/**
 * Default subscription configuration
 * Modify this to change subscription behavior for your SaaS application
 */
export const SUBSCRIPTION_CONFIG: ISubscriptionConfig = {
  version: '2.0.0',

  plans: [
    {
      key: 'free',
      name: 'Free',
      stripePriceId: null,
      priceInCents: 0, // $0.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: 3, // 3 trial articles total, no refresh
      maxRollover: 3, // No rollover for trial
      rolloverMultiplier: 1,
      trial: {
        enabled: false,
        durationDays: 0,
        trialCredits: null,
        requirePaymentMethod: false, // No credit card required for trial
        allowMultipleTrials: false,
        autoConvertToPaid: true,
      },
      creditsExpiration: {
        mode: 'never',
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: ['3 trial articles', 'Basic AI models', 'No credit card required'],
      recommended: false,
      description: 'Try AutopilotRank free',
      displayOrder: 0,
      enabled: false, // Free tier is handled via freeUser config
      batchLimit: 1,
      maxProjects: null, // All tiers: unlimited projects
    },
    {
      key: 'starter',
      name: 'Starter',
      stripePriceId: 'price_1SxZp7K2K0pPNfoSMt94q8kP',
      priceInCents: 4900, // $49.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.STARTER_MONTHLY_CREDITS, // 30 articles
      maxRollover: CREDIT_COSTS.STARTER_MONTHLY_CREDITS * 3, // 90 max (3x rollover)
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
        '30 credits/month (1–5 per article)',
        'Credits roll over (up to 90)',
        'Multi-model AI (GPT-4, Claude, Gemini)',
        'Humanizer engine',
        'Unlimited projects',
        'SEO scoring & AI detection',
        'Email support',
      ],
      recommended: false,
      description: 'Perfect for getting started with SEO content',
      displayOrder: 1,
      enabled: true,
      batchLimit: 5,
      maxProjects: null, // All tiers: unlimited projects
    },
    {
      key: 'growth',
      name: 'Growth',
      stripePriceId: 'price_1SxZp9K2K0pPNfoSeOwSLmcp',
      priceInCents: 9900, // $99.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS, // 100 articles
      maxRollover: CREDIT_COSTS.GROWTH_MONTHLY_CREDITS * 3, // 300 max (3x rollover)
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
        '100 credits/month (1–5 per article)',
        'Credits roll over (up to 300)',
        'Everything in Starter',
        'GSC integration',
        'Unlimited projects',
        'Advanced humanizer',
        'Scheduled publishing',
        'Priority support',
      ],
      recommended: true, // Recommended plan
      description: 'For growing content teams',
      displayOrder: 2,
      enabled: true,
      batchLimit: 25,
      maxProjects: null, // All tiers: unlimited projects
    },
    {
      key: 'agency',
      name: 'Agency',
      stripePriceId: 'price_1SxZpAK2K0pPNfoSbxIQNtKL',
      priceInCents: 24900, // $249.00
      currency: 'usd',
      interval: 'month',
      creditsPerCycle: CREDIT_COSTS.AGENCY_MONTHLY_CREDITS, // 500 articles
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
        mode: 'never',
        gracePeriodDays: 0,
        sendExpirationWarning: false,
        warningDaysBefore: 0,
      },
      features: [
        '500 credits/month (1–5 per article)',
        'Everything in Growth',
        'Unlimited projects',
        'White-label reports (coming soon)',
        'Team accounts (up to 5)',
        'API access',
        'Dedicated account manager',
      ],
      recommended: false,
      description: 'For agencies and large teams',
      displayOrder: 3,
      enabled: true,
      batchLimit: 100,
      maxProjects: null, // All tiers: unlimited projects
    },
  ],

  creditPacks: [
    {
      key: 'small',
      name: 'Small Pack',
      credits: CREDIT_COSTS.SMALL_PACK_CREDITS, // 10 articles
      priceInCents: 999, // $9.99
      currency: 'usd',
      stripePriceId: 'price_1SxZpbK2K0pPNfoSOZkDy9td',
      description: '10 articles',
      popular: false,
      enabled: true,
    },
    {
      key: 'medium',
      name: 'Medium Pack',
      credits: CREDIT_COSTS.MEDIUM_PACK_CREDITS, // 25 articles
      priceInCents: 1999, // $19.99
      currency: 'usd',
      stripePriceId: 'price_1SxZpbK2K0pPNfoSQ9VDhGSt',
      description: '25 articles - Best value',
      popular: true,
      enabled: true,
    },
    {
      key: 'large',
      name: 'Large Pack',
      credits: CREDIT_COSTS.LARGE_PACK_CREDITS, // 50 articles
      priceInCents: 3499, // $34.99
      currency: 'usd',
      stripePriceId: 'price_1SxZpcK2K0pPNfoSv4WoPMSI',
      description: '50 articles',
      popular: false,
      enabled: true,
    },
  ],

  creditCosts: {
    modes: {
      api: CREDIT_COSTS.API_CALL, // 1 credit = 1 article
      basic: CREDIT_COSTS.API_CALL * 1, // 1 article
      premium: CREDIT_COSTS.API_CALL * 1, // 1 article (no multiplier in new model)
      enterprise: CREDIT_COSTS.API_CALL * 1, // 1 article (no multiplier in new model)
    },
    featureMultipliers: {
      basic: 1.0,
      premium: 1.0,
      enterprise: 1.0,
    },
    options: {
      priorityProcessing: 0,
      batchPerRequest: 0,
    },
    minimumCost: CREDIT_COSTS.API_CALL, // 1 credit per article
    maximumCost: CREDIT_COSTS.API_CALL * 1, // 1 credit per article
  },

  freeUser: {
    initialCredits: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // 3 trial articles
    monthlyRefresh: false, // Free users don't get monthly refresh
    monthlyCredits: CREDIT_COSTS.DEFAULT_TRIAL_CREDITS,
    maxBalance: CREDIT_COSTS.DEFAULT_FREE_CREDITS, // Free users capped at 3
    batchLimit: 1, // Up to 1 article at a time for free users
  },

  warnings: {
    lowCreditThreshold: CREDIT_COSTS.LOW_CREDIT_WARNING_THRESHOLD, // Warn at 2 articles
    lowCreditPercentage: CREDIT_COSTS.CREDIT_WARNING_PERCENTAGE, // 20%
    showToastOnDashboard: true,
    checkIntervalMs: TIMEOUTS.CACHE_MEDIUM_TTL,
  },

  defaults: {
    defaultCurrency: 'usd',
    defaultInterval: 'month',
    creditsRolloverDefault: true, // Credits roll over by default
    defaultRolloverMultiplier: 3, // Default to 3x monthly credits (not 6x anymore)
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
