/**
 * useOnboardingProgress Hook
 * React hook for updating onboarding progress with React Query
 *
 * Features:
 * - Update progress via PUT /api/onboarding/progress
 * - Complete onboarding via POST /api/onboarding/complete
 * - Optimistic updates to local Zustand store
 * - Toast notifications for operations
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  IOnboardingStatus,
  IUpdateOnboardingProgressInput,
  IUpdateOnboardingResponse,
} from '@shared/types/onboarding.types';
import { OnboardingStep } from '@shared/types/onboarding.types';
import { useUserStore } from '@client/store/userStore';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';
import { useLogger } from '@client/utils/logger';

// =============================================================================
// API Functions
// =============================================================================

/** Optional steps that can be auto-skipped when filling gaps */
const OPTIONAL_STEPS = new Set([OnboardingStep.GSC_CONNECTION, OnboardingStep.INTEGRATIONS]);

/**
 * Ensure all steps before currentStep are accounted for as completed or skipped.
 * The server rejects payloads with gaps (e.g., step 2 missing when moving to step 4).
 * Required steps are auto-completed (you can't reach later steps without them).
 * Optional steps are auto-skipped.
 */
function normalizeProgressInput(
  input: IUpdateOnboardingProgressInput
): IUpdateOnboardingProgressInput {
  const completed = new Set(input.completedSteps);
  const skipped = new Set(input.skippedSteps);

  for (let step = 1; step < input.currentStep; step++) {
    if (!completed.has(step) && !skipped.has(step)) {
      if (OPTIONAL_STEPS.has(step)) {
        skipped.add(step);
      } else {
        completed.add(step);
      }
    }
  }

  return {
    ...input,
    completedSteps: Array.from(completed),
    skippedSteps: Array.from(skipped),
  };
}

/**
 * Update onboarding progress
 */
async function updateProgress(input: IUpdateOnboardingProgressInput): Promise<IOnboardingStatus> {
  const normalized = normalizeProgressInput(input);
  const data = await apiFetch<{ data: IUpdateOnboardingResponse }>('/api/onboarding/progress', {
    method: 'PUT',
    body: JSON.stringify(normalized),
  });
  return data.data.onboarding;
}

/**
 * Complete onboarding
 */
async function completeOnboarding(): Promise<IOnboardingStatus> {
  const data = await apiFetch<{ data: IUpdateOnboardingResponse }>('/api/onboarding/complete', {
    method: 'POST',
  });
  return data.data.onboarding;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseOnboardingProgressReturn {
  /** Update progress and move to a new step */
  updateProgress: (input: IUpdateOnboardingProgressInput) => Promise<IOnboardingStatus>;
  /** Mark onboarding as complete */
  markComplete: () => Promise<IOnboardingStatus>;
  /** Move to the next step */
  goToNextStep: () => Promise<void>;
  /** Move to a specific step */
  goToStep: (step: number) => Promise<void>;
  /** Whether any mutation is in progress */
  isUpdating: boolean;
  /** Error from the last mutation */
  error: Error | null;
}

/**
 * Hook for updating onboarding progress
 *
 * This hook provides mutations for updating onboarding progress with:
 * - Automatic optimistic updates to the Zustand store
 * - Server sync via API calls
 * - Toast notifications for success/failure
 *
 * @example
 * ```tsx
 * const { updateProgress, markComplete, goToNextStep, isUpdating } = useOnboardingProgress();
 *
 * // After completing a step
 * await goToNextStep();
 *
 * // When all steps are done
 * await markComplete();
 * ```
 */
export function useOnboardingProgress(): IUseOnboardingProgressReturn {
  const logger = useLogger('useOnboardingProgress');
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const {
    currentStep,
    completedSteps,
    skippedSteps,
    setCurrentStep,
    markStepComplete,
    initializeFromServer,
  } = useOnboardingStore();
  const t = getTranslations('dashboard');

  // Convert Set to array for API calls
  // Note: This helper is available for future use but currently inlined in callbacks
  const _toProgressInput = useCallback(
    (
      step: number,
      options?: {
        markCurrentComplete?: boolean;
        isComplete?: boolean;
      }
    ): IUpdateOnboardingProgressInput => {
      const newCompletedSteps = new Set(completedSteps);
      if (options?.markCurrentComplete) {
        newCompletedSteps.add(currentStep);
      }

      return {
        currentStep: step,
        completedSteps: Array.from(newCompletedSteps),
        skippedSteps: Array.from(skippedSteps),
        isComplete: options?.isComplete ?? false,
      };
    },
    [completedSteps, skippedSteps, currentStep]
  );

  // Update progress mutation
  const updateMutation = useMutation({
    mutationFn: updateProgress,
    onMutate: async variables => {
      // Optimistic update to store
      logger.info('Optimistically updating progress', { variables });
      initializeFromServer({
        currentStep: variables.currentStep,
        completedSteps: variables.completedSteps,
        skippedSteps: variables.skippedSteps,
      });
    },
    onSuccess: data => {
      // Update query cache (must match shape returned by fetchOnboardingStatus)
      queryClient.setQueryData(['onboarding-status', user?.id], data);
    },
    onError: (error, variables) => {
      logger.error('Failed to update progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        variables,
      });
    },
  });

  // Complete onboarding mutation
  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onMutate: async () => {
      logger.info('Optimistically completing onboarding');
    },
    onSuccess: data => {
      // Update query cache (must match shape returned by fetchOnboardingStatus)
      queryClient.setQueryData(['onboarding-status', user?.id], data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
      // Invalidate projects cache so OverviewView sees newly created project
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
    },
    onError: error => {
      logger.error('Failed to complete onboarding', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Wrapped mutations with toast notifications
  const updateProgressWithToast = useMutationWithToast(updateMutation, {
    successMessage: t('onboarding.progressSaved') || 'Progress saved',
    errorMessage: t('onboarding.progressError') || 'Failed to save progress',
    loggerContext: 'Failed to update onboarding progress',
  });

  const markCompleteWithToast = useMutationWithToast(completeMutation, {
    successMessage: t('onboarding.completeSuccess') || 'Onboarding complete!',
    errorMessage: t('onboarding.completeError') || 'Failed to complete onboarding',
    loggerContext: 'Failed to complete onboarding',
  });

  // Go to next step
  const goToNextStep = useCallback(async () => {
    const nextStep = currentStep + 1;
    if (nextStep > 5) {
      logger.warn('Already at final step');
      return;
    }

    // Mark current step as complete and move to next
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(currentStep);

    // Optimistic update
    setCurrentStep(nextStep);
    markStepComplete(currentStep);

    // Sync with server
    await updateProgressWithToast({
      currentStep: nextStep,
      completedSteps: Array.from(newCompletedSteps),
      skippedSteps: Array.from(skippedSteps),
    });
  }, [
    currentStep,
    completedSteps,
    skippedSteps,
    setCurrentStep,
    markStepComplete,
    updateProgressWithToast,
    logger,
  ]);

  // Go to specific step
  const goToStep = useCallback(
    async (step: number) => {
      if (step < 1 || step > 5) {
        logger.warn(`Invalid step: ${step}`);
        return;
      }

      // Optimistic update
      setCurrentStep(step);

      // Sync with server
      await updateProgressWithToast({
        currentStep: step,
        completedSteps: Array.from(completedSteps),
        skippedSteps: Array.from(skippedSteps),
      });
    },
    [completedSteps, skippedSteps, setCurrentStep, updateProgressWithToast, logger]
  );

  return {
    updateProgress: updateProgressWithToast,
    markComplete: markCompleteWithToast,
    goToNextStep,
    goToStep,
    isUpdating: updateMutation.isPending || completeMutation.isPending,
    error: (updateMutation.error ?? completeMutation.error) as Error | null,
  };
}
