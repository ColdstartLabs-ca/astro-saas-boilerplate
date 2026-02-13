/**
 * Onboarding Progress API Route
 * PUT /api/onboarding/progress - Update onboarding progress for authenticated user
 *
 * Request Body:
 * - currentStep: number (1-5)
 * - completedSteps: number[] (steps that have been completed)
 * - skippedSteps: number[] (steps that have been skipped)
 * - isComplete?: boolean (optional, marks onboarding as complete)
 */

import { onboardingService } from '@server/services/onboarding.service';
import { updateOnboardingProgressSchema } from '@shared/validation/onboarding.schema';
import type { IUpdateOnboardingResponse, IOnboardingStatus } from '@shared/types/onboarding.types';
import { withAuthAndBody, jsonResponse } from '../_utils';

/**
 * PUT /api/onboarding/progress
 * Update onboarding progress for the authenticated user
 */
export const PUT = withAuthAndBody(
  updateOnboardingProgressSchema,
  async (userId, validatedInput) => {
    await onboardingService.updateProgress(userId, validatedInput);

    // Fetch the updated status to return
    const status = await onboardingService.getStatus(userId);

    const response: IUpdateOnboardingResponse = {
      onboarding: status as IOnboardingStatus,
    };

    return jsonResponse(response);
  }
);
