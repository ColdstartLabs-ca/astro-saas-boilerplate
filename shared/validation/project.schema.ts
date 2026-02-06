/**
 * Project Validation Schemas
 * Zod schemas for project creation and editing
 */

import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

/**
 * CMS platform options
 */
export const CMS_PLATFORMS = ['wordpress', 'webflow', 'shopify', 'other'] as const;
export type CMSPlatform = (typeof CMS_PLATFORMS)[number];  

/**
 * Industry options
 */
export const INDUSTRIES = [
  'tech',
  'health',
  'finance',
  'ecommerce',
  'education',
  'lifestyle',
  'realestate',
  'legal',
  'marketing',
  'other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

/**
 * Tone options
 */
export const TONES = ['professional', 'casual', 'witty', 'academic'] as const;
export type Tone = (typeof TONES)[number];

/**
 * Frequency options
 */
export const FREQUENCIES = ['daily', '3x_week', 'weekly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

// =============================================================================
// Content Preferences Schema
// =============================================================================

export const contentPreferencesSchema = z.object({
  tone: z.enum(TONES, {
    errorMap: () => ({ message: 'Please select a tone' }),
  }),
  frequency: z.enum(FREQUENCIES, {
    errorMap: () => ({ message: 'Please select a frequency' }),
  }),
  targetWordCount: z.number().int().min(100).max(10000).optional(),
});

export type IContentPreferences = z.infer<typeof contentPreferencesSchema>;

// =============================================================================
// Full Project Onboarding Schema
// =============================================================================

/**
 * Complete schema for project onboarding form
 * This matches the flat form structure used in React Hook Form
 */
export const projectOnboardingSchema = z.object({
  // Step 1: Basic Info
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be 100 characters or less'),
  domain: z
    .string()
    .max(255, 'Domain URL is too long')
    .refine(
      val =>
        !val || /^https?:\/\/.+/.test(val) || /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(val),
      'Please enter a valid domain (e.g., example.com)'
    )
    .optional(),
  industry: z.enum(INDUSTRIES, {
    errorMap: () => ({ message: 'Please select an industry' }),
  }),

  // Step 2: Platform Selection
  cmsType: z.enum(CMS_PLATFORMS, {
    errorMap: () => ({ message: 'Please select a platform' }),
  }),

  // Step 3: Content Preferences
  tone: z.enum(TONES, {
    errorMap: () => ({ message: 'Please select a tone' }),
  }),
  frequency: z.enum(FREQUENCIES, {
    errorMap: () => ({ message: 'Please select a frequency' }),
  }),
  targetWordCount: z
    .string()
    .min(1, 'Word count is required')
    .refine(
      val => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 100 && num <= 10000;
      },
      { message: 'Word count must be between 100 and 10,000' }
    ),
});

/**
 * Form input type (flat structure for RHF)
 */
export type IProjectOnboardingInput = z.infer<typeof projectOnboardingSchema>;

/**
 * Transforms form input to API-compatible format
 */
export function transformProjectOnboardingInput(
  data: IProjectOnboardingInput
): ICreateProjectFromOnboarding {
  // Auto-prepend https:// to domain if not present
  let processedDomain = data.domain;
  if (processedDomain && !/^https?:\/\//i.test(processedDomain)) {
    processedDomain = `https://${processedDomain}`;
  }

  return {
    name: data.name,
    domain: processedDomain || undefined,
    industry: data.industry,
    cms_type: data.cmsType,
    content_preferences: {
      tone: data.tone,
      frequency: data.frequency,
      targetWordCount: parseInt(data.targetWordCount, 10),
    },
  };
}

// =============================================================================
// API-compatible types
// =============================================================================

export interface ICreateProjectFromOnboarding {
  name: string;
  domain?: string;
  industry?: Industry;
  cms_type: CMSPlatform;
  content_preferences: IContentPreferences;
}
