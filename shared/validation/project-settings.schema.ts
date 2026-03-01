/**
 * Project Settings Validation Schemas
 * Zod schemas for project settings form validation
 */

import { z } from 'zod';
import { LANGUAGES, COUNTRIES } from '@shared/validation/project.schema';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for article settings tab (language and country)
 */
export const articleSettingsSchema = z.object({
  language: z.enum(LANGUAGES, {
    errorMap: () => ({ message: 'Please select a language' }),
  }),
  country: z.enum(COUNTRIES, {
    errorMap: () => ({ message: 'Please select a country' }),
  }),
});

/**
 * Type for article settings form
 */
export type IArticleSettingsFormData = z.infer<typeof articleSettingsSchema>;
