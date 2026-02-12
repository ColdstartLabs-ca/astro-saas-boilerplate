/**
 * Resume Schedule API Route
 * POST /api/campaigns/:campaignId/resume-schedule - Resume paused scheduled generation
 */

import { campaignService } from '@server/services/campaign.service';
import { withAuth, jsonResponse } from '../../_utils';

/**
 * POST /api/campaigns/:campaignId/resume-schedule
 * Resume paused scheduled article generation for a campaign
 *
 * Validates:
 * - Campaign exists and belongs to user
 * - Campaign is in 'paused' state
 * - Campaign has schedule configuration
 *
 * Returns:
 * - 200: { nextRunAt }
 * - 400: Validation error (not paused, no schedule config)
 * - 404: Campaign not found
 */
export const POST = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;

  const result = await campaignService.resumeSchedule(campaignId, userId);

  return jsonResponse(result);
});
