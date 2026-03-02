/**
 * Credit costs configuration
 * AutopilotRank - 1 credit = 1 article generation
 *
 * Note: Credit costs for writer/image presets are now centralized in
 * @shared/constants/credit-costs.constants.ts
 */

export {
  // Writer preset costs (base cost per article)
  WRITER_CREDIT_COSTS,

  // Image preset costs (addon cost per article)
  IMAGE_CREDIT_COSTS,

  // Calculation helper
  calculateArticleCreditCost,
  MIN_ARTICLE_COST,
  MAX_ARTICLE_COST,

  // Subscription credit allocations
  SUBSCRIPTION_CREDITS,

  // Credit pack sizes
  CREDIT_PACKS,

  // Free tier credits
  FREE_TIER_CREDITS,

  // Warning thresholds
  LOW_CREDIT_WARNING_THRESHOLD,
  CREDIT_WARNING_PERCENTAGE,
} from '@shared/constants';

// =============================================================================
// Deprecated - Legacy exports for backward compatibility
// =============================================================================

/** @deprecated Use calculateArticleCreditCost from @shared/constants instead */
export const CREDIT_COSTS = {
  // Base cost - 1 credit = 1 article
  API_CALL: 1,

  // Image generation costs (per article)
  // Standard/enhanced presets are bundled (no extra cost)
  // Premium presets cost 1 additional credit
  IMAGE_GENERATION_FREE: 0, // budget, balanced
  IMAGE_GENERATION_PREMIUM: 1, // pro, ultra

  // Free tier default credits (trial articles)
  DEFAULT_FREE_CREDITS: 3, // 3 trial articles on signup
  DEFAULT_TRIAL_CREDITS: 0,

  // Credit pack amounts (article packs)
  SMALL_PACK_CREDITS: 10, // 10 credits
  MEDIUM_PACK_CREDITS: 25, // 25 credits
  LARGE_PACK_CREDITS: 50, // 50 credits

  // Subscription credit amounts (articles per month)
  STARTER_MONTHLY_CREDITS: 30, // Starter plan: 30 credits/mo
  GROWTH_MONTHLY_CREDITS: 100, // Growth plan: 100 credits/mo
  AGENCY_MONTHLY_CREDITS: 500, // Agency plan: 500 credits/mo

  // Warning thresholds
  LOW_CREDIT_WARNING_THRESHOLD: 2, // Warn at 2 articles remaining
  CREDIT_WARNING_PERCENTAGE: 0.2,
} as const;

export type CreditCost = typeof CREDIT_COSTS;
