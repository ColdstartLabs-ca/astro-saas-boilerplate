/**
 * Opportunity Analysis Configuration
 * Thresholds, priority weights, and AI prompt for GSC data analysis.
 */

import type { OpportunityType } from '@shared/types/opportunity.types';

// =============================================================================
// Detection Thresholds
// =============================================================================

/**
 * Thresholds used by the rule-based opportunity detector to classify queries.
 */
export const OPPORTUNITY_THRESHOLDS = {
  /** Queries ranking 8-20 with decent impressions — easy wins */
  LOW_HANGING_FRUIT: { minPosition: 8, maxPosition: 20, minImpressions: 100 },
  /** CTR significantly below average for the position range */
  LOW_CTR: { ctrPercentOfAvg: 0.5 },
  /** Position dropped more than this threshold (if previousPosition available) */
  DECLINING_POSITION: { positionDropThreshold: 5 },
  /** High impressions but no page — unaddressed search demand */
  CONTENT_GAP: { minImpressions: 50 },
  /** Very low impressions despite ranking — needs content expansion */
  THIN_CONTENT: { maxImpressions: 10 },
} as const;

// =============================================================================
// Priority Scoring
// =============================================================================

/**
 * Weights for computing an opportunity's priority score (0-100).
 * All weights must sum to 1.0.
 */
export const PRIORITY_WEIGHTS = {
  impressions: 0.3,
  position: 0.25,
  ctr_gap: 0.2,
  type_bonus: 0.25,
} as const;

/**
 * Base priority bonus per opportunity type.
 * Higher values = higher default priority for that type.
 */
export const TYPE_PRIORITY_BONUS: Record<OpportunityType, number> = {
  content_gap: 85,
  low_hanging_fruit: 90,
  declining_position: 80,
  low_ctr: 60,
  cannibalization: 50,
  topic_cluster: 40,
  thin_content: 30,
};

// =============================================================================
// Expected CTR by Position
// =============================================================================

/**
 * Average expected CTR by position range (industry benchmarks).
 * Used to determine if a query has low CTR relative to its ranking.
 */
export const EXPECTED_CTR_BY_POSITION: Record<string, number> = {
  '1-3': 0.15,
  '4-7': 0.06,
  '8-10': 0.03,
  '11-20': 0.015,
  '21+': 0.005,
};

/**
 * Get the expected average CTR for a given position.
 */
export function getExpectedCtrForPosition(position: number): number {
  if (position <= 3) return EXPECTED_CTR_BY_POSITION['1-3'];
  if (position <= 7) return EXPECTED_CTR_BY_POSITION['4-7'];
  if (position <= 10) return EXPECTED_CTR_BY_POSITION['8-10'];
  if (position <= 20) return EXPECTED_CTR_BY_POSITION['11-20'];
  return EXPECTED_CTR_BY_POSITION['21+'];
}

// =============================================================================
// AI Analysis Prompt
// =============================================================================

/**
 * System prompt for OpenRouter to enrich raw opportunities with
 * actionable titles and descriptions.
 */
export const ANALYSIS_PROMPT = `You are an expert SEO analyst. Given a list of detected SEO opportunities from Google Search Console data, generate concise, actionable titles and descriptions for each one.

For each opportunity, you will receive:
- type: the opportunity classification (content_gap, low_hanging_fruit, low_ctr, declining_position, thin_content, cannibalization, topic_cluster)
- query: the search query (if applicable)
- page_url: the affected page URL (if applicable)
- metrics: position, CTR, impressions, clicks

Return a JSON array where each element has:
- "index": the 0-based index matching the input array
- "title": a short, actionable title (max 80 chars). Start with a verb. Examples: "Create article targeting...", "Improve CTR for...", "Refresh declining content on..."
- "description": 1-2 sentences explaining what the opportunity is and what specific action to take. Be concrete — reference the query, position, or metrics when relevant.
- "category": either "content" or "technical"
- "estimated_impact": "high", "medium", or "low" based on potential traffic gain

Rules:
- Titles must be unique and specific to each opportunity
- Descriptions should be actionable, not generic
- For content_gap: suggest creating new content targeting the query
- For low_hanging_fruit: suggest optimizing existing content or creating targeted content to move into top positions
- For low_ctr: suggest improving title tags and meta descriptions
- For declining_position: suggest refreshing and updating the content
- For thin_content: suggest expanding the content with more depth
- For cannibalization: suggest consolidating competing pages
- For topic_cluster: suggest creating a content hub

Return ONLY valid JSON. No markdown, no explanation.`;
