/**
 * Onboarding Complete API Route
 * POST /api/onboarding/complete - Mark onboarding as complete for authenticated user
 *
 * Sets is_complete = true and completed_at = now
 */

import { onboardingService } from '@server/services/onboarding.service';
import { withAuth, jsonResponse } from '../_utils';

/**
 * Response type for the complete endpoint
 */
interface ICompleteOnboardingResponse {
  success: boolean;
  completedAt: string;
}

/**
 * POST /api/onboarding/complete
 * Mark onboarding as complete for the authenticated user
 */
export const POST = withAuth(async (userId) => {
  await onboardingService.markComplete(userId);

  const response: ICompleteOnboardingResponse = {
    success: true,
    completedAt: new Date().toISOString(),
  };

  return jsonResponse(response);
});
