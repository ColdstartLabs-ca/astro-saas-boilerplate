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
 * Frequency options
 */
export const FREQUENCIES = ['daily', '3x_week', 'weekly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/**
 * ISO 639-1 language codes (common subset)
 */
export const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'ja',
  'ko',
  'zh',
  'ar',
  'ru',
  'hi',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'cs',
  'tr',
] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * ISO 3166-1 alpha-2 country codes (common subset)
 */
export const COUNTRIES = [
  'US',
  'GB',
  'CA',
  'AU',
  'DE',
  'FR',
  'ES',
  'IT',
  'PT',
  'BR',
  'NL',
  'JP',
  'KR',
  'CN',
  'IN',
  'SE',
  'DK',
  'NO',
  'FI',
  'PL',
  'CZ',
  'TR',
  'MX',
  'AR',
  'CL',
  'CO',
] as const;
export type Country = (typeof COUNTRIES)[number];

// =============================================================================
// Content Preferences Schema
// =============================================================================

export const contentPreferencesSchema = z.object({
  frequency: z.enum(FREQUENCIES, {
    errorMap: () => ({ message: 'Please select a frequency' }),
  }),
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
  frequency: z.enum(FREQUENCIES, {
    errorMap: () => ({ message: 'Please select a frequency' }),
  }),
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
      frequency: data.frequency,
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

// =============================================================================
// Outrank Feature Parity - Extended Project Schemas
// =============================================================================

/**
 * Schema for creating a project with Outrank fields
 * Used by API routes for project creation
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be 100 characters or less')
    .trim(),
  domain: z
    .string()
    .max(255, 'Domain URL is too long')
    .refine(
      val =>
        !val || /^https?:\/\/.+/.test(val) || /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(val),
      'Please enter a valid domain (e.g., example.com)'
    )
    .optional()
    .or(z.literal('')),
  industry: z.enum(INDUSTRIES).optional(),
  cms_type: z.enum(CMS_PLATFORMS).optional().default('other'),
  content_preferences: contentPreferencesSchema.optional(),
  // Outrank feature parity fields
  language: z.string().min(2).max(5).optional().default('en'),
  country: z
    .string()
    .min(2)
    .max(2)
    .transform(val => val.toUpperCase())
    .optional()
    .default('US'),
  description: z.string().max(2000).optional().or(z.literal('')),
  sitemap_url: z.string().url().max(500).optional().or(z.literal('')),
  blog_url: z.string().url().max(500).optional().or(z.literal('')),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
});

/**
 * Schema for updating a project with Outrank fields
 * Used by API routes for project updates
 */
export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  domain: z
    .string()
    .max(255, 'Domain URL is too long')
    .refine(
      val =>
        !val || /^https?:\/\/.+/.test(val) || /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(val),
      'Please enter a valid domain (e.g., example.com)'
    )
    .optional()
    .or(z.literal('')),
  industry: z.enum(INDUSTRIES).optional(),
  cms_type: z.enum(CMS_PLATFORMS).optional(),
  content_preferences: contentPreferencesSchema.optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
  // Outrank feature parity fields
  language: z.string().min(2).max(5).optional(),
  country: z
    .string()
    .min(2)
    .max(2)
    .transform(val => val.toUpperCase())
    .optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  sitemap_url: z.string().url().max(500).optional().or(z.literal('')),
  blog_url: z.string().url().max(500).optional().or(z.literal('')),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
});

/**
 * Types inferred from the schemas
 */
export type ICreateProjectSchemaInput = z.infer<typeof createProjectSchema>;
export type IUpdateProjectSchemaInput = z.infer<typeof updateProjectSchema>;
