/**
 * Onboarding Service
 * Server-side business logic for user onboarding CRUD operations
 *
 * Handles:
 * - Getting or creating onboarding records
 * - Updating onboarding progress
 * - Marking onboarding as complete
 * - Resetting onboarding for testing/admin
 *
 * AutopilotRank - User Onboarding Flow
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  type IUserOnboarding,
  type IOnboardingStatus,
  type IUpdateOnboardingProgressInput,
  OnboardingNotFoundError,
  OnboardingStepError,
} from '@shared/types/onboarding.types';
import { updateOnboardingProgressSchema } from '@shared/validation/onboarding.schema';
import { serverEnv } from '@shared/config/env';

// =============================================================================
// Constants
// =============================================================================

const MIN_STEP = 1;
const MAX_STEP = 5;

// In-memory test data store for test mode
// This avoids database operations when using mock users
const testModeOnboarding = new Map<string, IUserOnboarding>();

// =============================================================================
// Onboarding Service Class
// =============================================================================

export class OnboardingService {
  /**
   * Get onboarding status for a user.
   * Creates a new record if one doesn't exist.
   *
   * @param userId - The user ID to get onboarding status for
   * @returns The onboarding status or null if creation fails
   */
  async getStatus(userId: string): Promise<IOnboardingStatus | null> {
    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const onboarding = testModeOnboarding.get(userId);
      if (onboarding) {
        return {
          isComplete: onboarding.is_complete,
          currentStep: onboarding.current_step,
          completedSteps: onboarding.completed_steps,
          skippedSteps: onboarding.skipped_steps,
        };
      }
      // Create new in-memory record
      const newOnboarding: IUserOnboarding = {
        id: crypto.randomUUID(),
        user_id: userId,
        current_step: 1,
        completed_steps: [],
        skipped_steps: [],
        is_complete: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      testModeOnboarding.set(userId, newOnboarding);
      return {
        isComplete: false,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
      };
    }

    // Try to get existing record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to get onboarding status: ${fetchError.message}`);
    }

    // Return existing record
    if (existing) {
      const onboarding = existing as IUserOnboarding;
      return {
        isComplete: onboarding.is_complete,
        currentStep: onboarding.current_step,
        completedSteps: onboarding.completed_steps,
        skippedSteps: onboarding.skipped_steps,
      };
    }

    // Create new record with defaults
    const { data: _newRecord, error: createError } = await supabaseAdmin
      .from('user_onboarding')
      .insert({
        user_id: userId,
        current_step: 1,
        completed_steps: [],
        skipped_steps: [],
        is_complete: false,
      })
      .select()
      .single();

    if (createError) {
      // If it's a unique constraint violation, another request created it first
      // Try to fetch again
      if (createError.code === '23505') {
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('user_onboarding')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (retryError || !retryData) {
          throw new Error(`Failed to get onboarding status after retry: ${retryError?.message}`);
        }

        const onboarding = retryData as IUserOnboarding;
        return {
          isComplete: onboarding.is_complete,
          currentStep: onboarding.current_step,
          completedSteps: onboarding.completed_steps,
          skippedSteps: onboarding.skipped_steps,
        };
      }

      throw new Error(`Failed to create onboarding record: ${createError.message}`);
    }

    return {
      isComplete: false,
      currentStep: 1,
      completedSteps: [],
      skippedSteps: [],
    };
  }

  /**
   * Update onboarding progress for a user.
   * Creates a new record if one doesn't exist (upsert behavior).
   *
   * @param userId - The user ID to update
   * @param input - The progress update input
   * @throws OnboardingStepError if step validation fails
   */
  async updateProgress(userId: string, input: IUpdateOnboardingProgressInput): Promise<void> {
    // Validate input
    const validated = updateOnboardingProgressSchema.parse(input);

    // Additional validation: ensure no overlap between completed and skipped
    const overlap = validated.completedSteps.filter(step => validated.skippedSteps.includes(step));
    if (overlap.length > 0) {
      throw new OnboardingStepError(
        validated.currentStep,
        `Steps cannot be both completed and skipped: ${overlap.join(', ')}`
      );
    }

    // Validate current step is achievable
    if (!this.isStepAchievable(validated.currentStep, validated.completedSteps, validated.skippedSteps)) {
      throw new OnboardingStepError(
        validated.currentStep,
        'Cannot skip to this step without completing or skipping previous steps'
      );
    }

    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      let existing = testModeOnboarding.get(userId);

      // Create new record if doesn't exist (upsert behavior)
      if (!existing) {
        existing = {
          id: crypto.randomUUID(),
          user_id: userId,
          current_step: 1,
          completed_steps: [],
          skipped_steps: [],
          is_complete: false,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      existing.current_step = validated.currentStep;
      existing.completed_steps = validated.completedSteps;
      existing.skipped_steps = validated.skippedSteps;
      if (validated.isComplete !== undefined) {
        existing.is_complete = validated.isComplete;
        if (validated.isComplete) {
          existing.completed_at = new Date().toISOString();
        }
      }
      existing.updated_at = new Date().toISOString();
      testModeOnboarding.set(userId, existing);
      return;
    }

    // Build upsert object (insert if not exists, update if exists)
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      current_step: validated.currentStep,
      completed_steps: validated.completedSteps,
      skipped_steps: validated.skippedSteps,
      updated_at: new Date().toISOString(),
    };

    if (validated.isComplete !== undefined) {
      upsertData.is_complete = validated.isComplete;
      if (validated.isComplete) {
        upsertData.completed_at = new Date().toISOString();
      }
    }

    // Use upsert to create or update the record
    const { error } = await supabaseAdmin
      .from('user_onboarding')
      .upsert(upsertData, {
        onConflict: 'user_id',
      });

    if (error) {
      throw new Error(`Failed to update onboarding progress: ${error.message}`);
    }
  }

  /**
   * Mark a specific step as complete.
   *
   * @param userId - The user ID
   * @param step - The step number to mark complete
   */
  async completeStep(userId: string, step: number): Promise<IOnboardingStatus> {
    const status = await this.getStatus(userId);
    if (!status) {
      throw new OnboardingNotFoundError(userId);
    }

    // Validate step
    if (step < MIN_STEP || step > MAX_STEP) {
      throw new OnboardingStepError(step, `Step must be between ${MIN_STEP} and ${MAX_STEP}`);
    }

    // Don't add if already completed
    if (status.completedSteps.includes(step)) {
      return status;
    }

    // Remove from skipped if present
    const skippedSteps = status.skippedSteps.filter(s => s !== step);

    // Add to completed
    const completedSteps = [...status.completedSteps, step].sort((a, b) => a - b);

    // Calculate next step
    const nextStep = Math.min(step + 1, MAX_STEP);
    const isComplete = nextStep === MAX_STEP && completedSteps.length >= MAX_STEP - 1;

    await this.updateProgress(userId, {
      currentStep: nextStep,
      completedSteps,
      skippedSteps,
      isComplete,
    });

    return {
      isComplete,
      currentStep: nextStep,
      completedSteps,
      skippedSteps,
    };
  }

  /**
   * Skip a specific step.
   *
   * @param userId - The user ID
   * @param step - The step number to skip
   */
  async skipStep(userId: string, step: number): Promise<IOnboardingStatus> {
    const status = await this.getStatus(userId);
    if (!status) {
      throw new OnboardingNotFoundError(userId);
    }

    // Validate step
    if (step < MIN_STEP || step > MAX_STEP) {
      throw new OnboardingStepError(step, `Step must be between ${MIN_STEP} and ${MAX_STEP}`);
    }

    // Completion step (5) cannot be skipped
    if (step === MAX_STEP) {
      throw new OnboardingStepError(step, 'Cannot skip the completion step');
    }

    // Don't add if already skipped or completed
    if (status.skippedSteps.includes(step) || status.completedSteps.includes(step)) {
      return status;
    }

    // Add to skipped
    const skippedSteps = [...status.skippedSteps, step].sort((a, b) => a - b);

    // Calculate next step
    const nextStep = Math.min(step + 1, MAX_STEP);

    await this.updateProgress(userId, {
      currentStep: nextStep,
      completedSteps: status.completedSteps,
      skippedSteps,
    });

    return {
      isComplete: status.isComplete,
      currentStep: nextStep,
      completedSteps: status.completedSteps,
      skippedSteps,
    };
  }

  /**
   * Mark onboarding as complete with timestamp.
   * Creates a new record if one doesn't exist (upsert behavior).
   *
   * @param userId - The user ID to mark complete
   */
  async markComplete(userId: string): Promise<void> {
    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      let existing = testModeOnboarding.get(userId);

      // Create new record if doesn't exist (upsert behavior)
      if (!existing) {
        existing = {
          id: crypto.randomUUID(),
          user_id: userId,
          current_step: 1,
          completed_steps: [],
          skipped_steps: [],
          is_complete: false,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      existing.is_complete = true;
      existing.completed_at = new Date().toISOString();
      existing.current_step = MAX_STEP;
      existing.updated_at = new Date().toISOString();
      testModeOnboarding.set(userId, existing);
      return;
    }

    // Use upsert to create or update the record
    const { error } = await supabaseAdmin
      .from('user_onboarding')
      .upsert(
        {
          user_id: userId,
          is_complete: true,
          completed_at: new Date().toISOString(),
          current_step: MAX_STEP,
          completed_steps: [1, 2, 3, 4],
          skipped_steps: [],
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (error) {
      throw new Error(`Failed to mark onboarding complete: ${error.message}`);
    }
  }

  /**
   * Reset onboarding for testing/admin purposes.
   *
   * @param userId - The user ID to reset
   */
  async reset(userId: string): Promise<void> {
    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      testModeOnboarding.delete(userId);
      return;
    }

    const { error } = await supabaseAdmin
      .from('user_onboarding')
      .update({
        current_step: 1,
        completed_steps: [],
        skipped_steps: [],
        is_complete: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to reset onboarding: ${error.message}`);
    }
  }

  /**
   * Delete onboarding record completely.
   * Used for cleanup or when a user account is being removed.
   *
   * @param userId - The user ID to delete onboarding for
   */
  async delete(userId: string): Promise<void> {
    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      testModeOnboarding.delete(userId);
      return;
    }

    const { error } = await supabaseAdmin.from('user_onboarding').delete().eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete onboarding: ${error.message}`);
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Check if a step is achievable given completed and skipped steps.
   * A step is achievable if all previous steps are either completed or skipped.
   */
  private isStepAchievable(
    targetStep: number,
    completedSteps: number[],
    skippedSteps: number[]
  ): boolean {
    // Step 1 is always achievable
    if (targetStep === 1) {
      return true;
    }

    // Check all previous steps
    for (let step = 1; step < targetStep; step++) {
      if (!completedSteps.includes(step) && !skippedSteps.includes(step)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the recommended next step for a user based on their progress.
   * Returns the first incomplete required step, or the completion step if all required are done.
   */
  getRecommendedNextStep(completedSteps: number[], _skippedSteps: number[]): number {
    const REQUIRED_STEPS = [1, 3]; // PROJECT_CREATION, KEYWORDS_UPLOAD

    // Find first incomplete required step
    for (const step of REQUIRED_STEPS) {
      if (!completedSteps.includes(step)) {
        return step;
      }
    }

    // All required steps done - return completion step
    return MAX_STEP;
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
