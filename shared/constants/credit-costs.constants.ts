/**
 * Credit Cost Constants
 *
 * Centralized credit costs for all operations.
 * All costs are in credits per operation.
 */

// =============================================================================
// Writer Preset Credit Costs (BASE cost per article)
// =============================================================================

/**
 * Credit costs for AI writer presets.
 * These are BASE costs - the article starts at this cost.
 */
export const WRITER_CREDIT_COSTS = {
  /** Fast, cost-effective text generation */
  budget: 1,

  /** Strong all-round writing quality */
  balanced: 1,

  /** Professional-grade AI writing */
  pro: 2,

  /** Premium writing with nuance and depth */
  ultra: 3,
} as const;

export type WriterPresetCreditCostKey = keyof typeof WRITER_CREDIT_COSTS;

// =============================================================================
// Image Preset Credit Costs (ADDON cost per article)
// =============================================================================

/**
 * Credit costs for AI image presets.
 * These are ADDON costs - added to the writer base cost.
 */
export const IMAGE_CREDIT_COSTS = {
  /** Fast, good-quality images */
  budget: 0,

  /** Higher quality, slower generation */
  balanced: 1,

  /** Professional editorial-quality images */
  pro: 1,

  /** Best quality, photorealistic imagery */
  ultra: 2,
} as const;

export type ImagePresetCreditCostKey = keyof typeof IMAGE_CREDIT_COSTS;

// =============================================================================
// Total Article Credit Costs
// =============================================================================

/**
 * Calculate total credit cost for an article.
 * Formula: writer base cost + image addon cost
 */
export function calculateArticleCreditCost(
  writerPreset: WriterPresetCreditCostKey | string | null | undefined,
  imagePreset: ImagePresetCreditCostKey | string | null | undefined
): number {
  const writerCost = WRITER_CREDIT_COSTS[writerPreset as WriterPresetCreditCostKey] ?? 1;
  const imageCost = IMAGE_CREDIT_COSTS[imagePreset as ImagePresetCreditCostKey] ?? 0;
  return writerCost + imageCost;
}

/**
 * Get the minimum possible article cost (budget writer + no images).
 */
export const MIN_ARTICLE_COST = WRITER_CREDIT_COSTS.budget; // 1

/**
 * Get the maximum possible article cost (ultra writer + ultra images).
 */
export const MAX_ARTICLE_COST = WRITER_CREDIT_COSTS.ultra + IMAGE_CREDIT_COSTS.ultra; // 5

// =============================================================================
// Subscription Credit Allocations
// =============================================================================

/**
 * Monthly credit allocations for subscription tiers.
 */
export const SUBSCRIPTION_CREDITS = {
  starter: 30,
  growth: 100,
  agency: 500,
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_CREDITS;

// =============================================================================
// Credit Pack Sizes
// =============================================================================

/**
 * One-time credit pack amounts.
 */
export const CREDIT_PACKS = {
  small: 10,
  medium: 25,
  large: 50,
} as const;

// =============================================================================
// Free Tier Credits
// =============================================================================

/** Trial credits given to new users */
export const FREE_TIER_CREDITS = 3;

// =============================================================================
// Warning Thresholds
// =============================================================================

/** Warn user when credits fall below this threshold */
export const LOW_CREDIT_WARNING_THRESHOLD = 2;

/** Warn user when credits used percentage exceeds this */
export const CREDIT_WARNING_PERCENTAGE = 0.2;

/**
 * Low credit email threshold as a percentage of plan allocation.
 * Send low-credit alert email when remaining credits fall below this percentage.
 * Example: 0.20 means send alert when credits < 20% of plan allocation.
 */
export const LOW_CREDIT_EMAIL_THRESHOLD_PERCENT = 0.2;

// =============================================================================
// Enrichment Credit Costs (ADDON costs per article)
// =============================================================================

/**
 * Credit costs for optional article enrichment features.
 * These are ADDON costs added on top of the base article cost.
 */
export const ENRICHMENT_CREDIT_COSTS = {
  /** Citation enrichment: web search + LLM fact verification */
  CITATION_ENRICHMENT: 1,
} as const;

// =============================================================================
// AI Detection Credit Costs
// =============================================================================

/**
 * Credit cost for external AI detection scan (Originality.ai).
 * Heuristic analysis is free; external provider costs 1 credit per scan.
 */
export const AI_DETECTION_CREDIT_COST = 1;
