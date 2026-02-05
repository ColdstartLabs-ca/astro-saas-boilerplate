/**
 * Credit costs configuration
 * AutopilotRank - 1 credit = 1 article generation
 */

export const CREDIT_COSTS = {
  // Base cost - 1 credit = 1 article
  API_CALL: 1,

  // Free tier default credits (trial articles)
  DEFAULT_FREE_CREDITS: 3, // 3 trial articles on signup
  DEFAULT_TRIAL_CREDITS: 0,

  // Credit pack amounts (article packs)
  SMALL_PACK_CREDITS: 10, // 10 articles
  MEDIUM_PACK_CREDITS: 25, // 25 articles
  LARGE_PACK_CREDITS: 50, // 50 articles

  // Subscription credit amounts (articles per month)
  STARTER_MONTHLY_CREDITS: 30, // Starter plan: 30 articles/mo
  GROWTH_MONTHLY_CREDITS: 100, // Growth plan: 100 articles/mo
  AGENCY_MONTHLY_CREDITS: 500, // Agency plan: 500 articles/mo

  // Warning thresholds
  LOW_CREDIT_WARNING_THRESHOLD: 2, // Warn at 2 articles remaining
  CREDIT_WARNING_PERCENTAGE: 0.2,
} as const;

export type CreditCost = typeof CREDIT_COSTS;
