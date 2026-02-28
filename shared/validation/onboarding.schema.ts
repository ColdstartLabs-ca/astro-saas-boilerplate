/**
 * Onboarding Validation Schemas
 * Single source of truth for onboarding-related Zod schemas.
 * Used by both API routes and server services.
 * AutopilotRank - User Onboarding Flow
 */

import { z } from 'zod';
import { OnboardingStep } from '@shared/types/onboarding.types';
import { LANGUAGES, COUNTRIES } from '@shared/validation/project.schema';

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid onboarding step numbers (1-6)
 * BUG H19 fix: PREFERENCES (step 4) was missing, MAX_STEP was 5 instead of 6
 */
export const VALID_ONBOARDING_STEPS = [
  OnboardingStep.PROJECT_CREATION,
  OnboardingStep.GSC_CONNECTION,
  OnboardingStep.KEYWORDS_UPLOAD,
  OnboardingStep.PREFERENCES,
  OnboardingStep.INTEGRATIONS,
  OnboardingStep.COMPLETION,
] as const;

export const MIN_STEP = 1;
export const MAX_STEP = 6;

/**
 * Language options with human-readable labels for Step 1 form
 */
export const LANGUAGE_OPTIONS = LANGUAGES.map(code => {
  const labels: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    ru: 'Russian',
    hi: 'Hindi',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
    pl: 'Polish',
    cs: 'Czech',
    tr: 'Turkish',
  };
  return { value: code, label: `${labels[code] ?? code} (${code})` };
});

/**
 * Country options with human-readable labels for Step 1 form
 */
export const COUNTRY_OPTIONS = COUNTRIES.map(code => {
  const labels: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    PT: 'Portugal',
    BR: 'Brazil',
    NL: 'Netherlands',
    JP: 'Japan',
    KR: 'South Korea',
    CN: 'China',
    IN: 'India',
    SE: 'Sweden',
    DK: 'Denmark',
    NO: 'Norway',
    FI: 'Finland',
    PL: 'Poland',
    CZ: 'Czech Republic',
    TR: 'Turkey',
    MX: 'Mexico',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
  };
  return { value: code, label: `${labels[code] ?? code} (${code})` };
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that a step number is within valid range
 */
function isValidStep(step: number): boolean {
  return Number.isInteger(step) && step >= MIN_STEP && step <= MAX_STEP;
}

/**
 * Validates that all steps in an array are valid
 * Used internally by the schema
 */
function _isValidStepArray(steps: number[]): boolean {
  return steps.every(isValidStep);
}
void _isValidStepArray; // Prevent unused variable warning

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for a single onboarding step number
 */
export const onboardingStepSchema = z
  .number()
  .int('Step must be an integer')
  .min(MIN_STEP, `Step must be at least ${MIN_STEP}`)
  .max(MAX_STEP, `Step must be at most ${MAX_STEP}`);

/**
 * Schema for an array of onboarding steps
 */
export const onboardingStepsArraySchema = z
  .array(z.number().int().min(MIN_STEP).max(MAX_STEP))
  .max(MAX_STEP, `Cannot have more than ${MAX_STEP} steps`)
  .refine(steps => new Set(steps).size === steps.length, {
    message: 'Steps array cannot contain duplicates',
  });

/**
 * Schema for updating onboarding progress
 */
export const updateOnboardingProgressSchema = z.object({
  currentStep: onboardingStepSchema,
  completedSteps: onboardingStepsArraySchema,
  skippedSteps: onboardingStepsArraySchema,
  isComplete: z.boolean().optional(),
});

/**
 * Schema for marking a step as complete
 */
export const completeStepSchema = z.object({
  step: onboardingStepSchema,
});

/**
 * Schema for skipping a step
 */
export const skipStepSchema = z.object({
  step: onboardingStepSchema,
});

/**
 * Schema for marking onboarding as complete
 */
export const markCompleteSchema = z.object({});

/**
 * Schema for resetting onboarding (admin/testing only)
 */
export const resetOnboardingSchema = z.object({});

/**
 * Schema for onboarding keyword suggestion query params
 */
export const onboardingKeywordSuggestionsQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

// =============================================================================
// Enhanced Step 1 Project Schema
// =============================================================================

/**
 * Schema for enhanced Step 1 project form with website intelligence fields
 * Used by the OnboardingStepProject component
 */
export const enhancedProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  domain: z
    .string()
    .optional()
    .refine(
      val =>
        !val ||
        val.startsWith('localhost') ||
        /^https?:\/\/.+\..+/.test(val) ||
        /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(val),
      'Please enter a valid domain (e.g., example.com)'
    ),
  industry: z.string().optional(),
  // New enhanced fields
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  language: z.enum(LANGUAGES).default('en'),
  country: z.enum(COUNTRIES).default('US'),
  sitemap_url: z.string().url('Please enter a valid URL').max(500).optional().or(z.literal('')),
  blog_url: z.string().url('Please enter a valid URL').max(500).optional().or(z.literal('')),
});

/**
 * Type for enhanced Step 1 project form
 */
export type IEnhancedProjectFormData = z.infer<typeof enhancedProjectSchema>;

// =============================================================================
// Types
// =============================================================================

export type IUpdateOnboardingProgressSchemaInput = z.infer<
  typeof updateOnboardingProgressSchema
>;
export type ICompleteStepSchemaInput = z.infer<typeof completeStepSchema>;
export type ISkipStepSchemaInput = z.infer<typeof skipStepSchema>;
export type IOnboardingKeywordSuggestionsQuerySchemaInput = z.infer<
  typeof onboardingKeywordSuggestionsQuerySchema
>;
