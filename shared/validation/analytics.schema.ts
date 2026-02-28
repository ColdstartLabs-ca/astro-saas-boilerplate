/**
 * Analytics Validation Schemas
 * Zod schemas for analytics API endpoints.
 */

import { z } from 'zod';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for POST /api/analytics/sync
 */
export const analyticsSyncSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  dateRangeDays: z.union([z.literal(7), z.literal(28), z.literal(90)]).default(28),
});

/**
 * Schema for GET /api/analytics/performance query parameters
 */
export const analyticsPerformanceQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  dateRangeDays: z.coerce
    .number()
    .transform(v => {
      if ([7, 28, 90].includes(v)) return v as 7 | 28 | 90;
      return 28 as const;
    })
    .optional()
    .default(28),
});

// =============================================================================
// Types
// =============================================================================

export type IAnalyticsSyncSchemaInput = z.infer<typeof analyticsSyncSchema>;
export type IAnalyticsPerformanceQuerySchemaInput = z.infer<typeof analyticsPerformanceQuerySchema>;
