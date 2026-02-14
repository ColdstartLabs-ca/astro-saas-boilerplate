/**
 * GSC (Google Search Console) Validation Schemas
 * Single source of truth for GSC-related Zod schemas.
 * Used by API routes for request validation.
 */

import { z } from 'zod';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for initiating GSC OAuth connection
 */
export const connectGscSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

/**
 * Schema for updating a GSC connection (setting the site URL)
 */
export const updateGscConnectionSchema = z.object({
  siteUrl: z.string().url('Invalid site URL'),
});

/**
 * Schema for updating GSC connection scheduling settings
 */
export const updateGscConnectionScheduleSchema = z.object({
  autoAnalyze: z.boolean().optional(),
  analyzeFrequency: z.enum(['daily', 'weekly', 'biweekly']).optional(),
});

/**
 * Schema for GSC OAuth callback query parameters
 */
export const gscCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

// =============================================================================
// Types
// =============================================================================

export type IConnectGscInput = z.infer<typeof connectGscSchema>;
export type IUpdateGscConnectionInput = z.infer<typeof updateGscConnectionSchema>;
export type IUpdateGscConnectionScheduleInput = z.infer<typeof updateGscConnectionScheduleSchema>;
export type IGscCallbackInput = z.infer<typeof gscCallbackSchema>;
