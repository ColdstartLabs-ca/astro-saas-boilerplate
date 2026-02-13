/**
 * Onboarding Status API Route
 * GET /api/onboarding/status - Get current onboarding status for authenticated user
 *
 * Returns:
 * - Onboarding status with current step, completed/skipped steps
 * - Creates new onboarding record if none exists
 */

import { onboardingService } from '@server/services/onboarding.service';
import type { IOnboardingStatus, IOnboardingStatusResponse } from '@shared/types/onboarding.types';
import { withAuth, jsonResponse } from '../_utils';

/**
 * Default onboarding status for new users
 */
const DEFAULT_STATUS: IOnboardingStatus = {
  isComplete: false,
  currentStep: 1,
  completedSteps: [],
  skippedSteps: [],
};

/**
 * GET /api/onboarding/status
 * Get the current onboarding status for the authenticated user
 */
export const GET = withAuth(async (userId) => {
  const status = await onboardingService.getStatus(userId);

  const response: IOnboardingStatusResponse = {
    onboarding: status ?? DEFAULT_STATUS,
  };

  return jsonResponse(response);
});
