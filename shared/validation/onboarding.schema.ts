/**
 * Onboarding Validation Schemas
 * Single source of truth for onboarding-related Zod schemas.
 * Used by both API routes and server services.
 * AutopilotRank - User Onboarding Flow
 */

import { z } from 'zod';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid onboarding step numbers (1-5)
 */
export const VALID_ONBOARDING_STEPS = [
  OnboardingStep.PROJECT_CREATION,
  OnboardingStep.GSC_CONNECTION,
  OnboardingStep.KEYWORDS_UPLOAD,
  OnboardingStep.INTEGRATIONS,
  OnboardingStep.COMPLETION,
] as const;

export const MIN_STEP = 1;
export const MAX_STEP = 5;

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

// =============================================================================
// Types
// =============================================================================

export type IUpdateOnboardingProgressSchemaInput = z.infer<
  typeof updateOnboardingProgressSchema
>;
export type ICompleteStepSchemaInput = z.infer<typeof completeStepSchema>;
export type ISkipStepSchemaInput = z.infer<typeof skipStepSchema>;
