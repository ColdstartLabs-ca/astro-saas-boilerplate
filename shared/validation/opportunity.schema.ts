/**
 * Opportunity Validation Schemas
 * Single source of truth for opportunity-related Zod schemas.
 * Used by API routes for request validation.
 */

import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

export const OPPORTUNITY_STATUSES = ['open', 'in_progress', 'completed', 'dismissed'] as const;
export const OPPORTUNITY_TYPES = [
  'content_gap',
  'low_hanging_fruit',
  'topic_cluster',
  'low_ctr',
  'declining_position',
  'thin_content',
  'cannibalization',
] as const;
export const OPPORTUNITY_CATEGORIES = ['content', 'technical'] as const;
export const OPPORTUNITY_ACTION_TYPES = ['create_article', 'optimize_page', 'fix_issue'] as const;
export const OPPORTUNITY_IMPACTS = ['high', 'medium', 'low'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export const OPPORTUNITY_SORT_FIELDS = [
  'priority_score',
  'created_at',
  'updated_at',
  'type',
  'status',
] as const;

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for triggering opportunity analysis
 */
export const analyzeOpportunitiesSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

/**
 * Schema for updating an opportunity (PATCH)
 */
export const updateOpportunitySchema = z.object({
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  action_type: z.enum(OPPORTUNITY_ACTION_TYPES).optional(),
});

/**
 * Schema for list opportunities query parameters
 */
export const listOpportunitiesSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  status: z.enum(OPPORTUNITY_STATUSES).optional(),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(OPPORTUNITY_SORT_FIELDS).default('priority_score'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

// =============================================================================
// Types
// =============================================================================

export type IAnalyzeOpportunitiesSchemaInput = z.infer<typeof analyzeOpportunitiesSchema>;
export type IUpdateOpportunitySchemaInput = z.infer<typeof updateOpportunitySchema>;
export type IListOpportunitiesSchemaInput = z.infer<typeof listOpportunitiesSchema>;
