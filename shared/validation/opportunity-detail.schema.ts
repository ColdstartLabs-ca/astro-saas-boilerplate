/**
 * Opportunity Detail Validation Schemas
 * Schemas for opportunity detail panel actions (create article, etc.)
 */

import { z } from 'zod';

/**
 * Schema for creating an article from an opportunity
 */
export const createArticleFromOpportunitySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

// =============================================================================
// Types
// =============================================================================

export type ICreateArticleFromOpportunityInput = z.infer<typeof createArticleFromOpportunitySchema>;
