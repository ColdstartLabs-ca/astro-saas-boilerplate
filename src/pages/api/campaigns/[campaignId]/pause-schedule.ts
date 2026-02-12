/**
 * Pause Schedule API Route
 * POST /api/campaigns/:campaignId/pause-schedule - Pause scheduled article generation
 */

import { campaignService } from '@server/services/campaign.service';
import { withAuth, jsonResponse } from '../../_utils';

/**
 * POST /api/campaigns/:campaignId/pause-schedule
 * Pause scheduled article generation for a campaign
 *
 * Validates:
 * - Campaign exists and belongs to user
 * - Campaign is in 'scheduled' or 'active' state
 *
 * Returns:
 * - 200: { paused: true }
 * - 400: Validation error (invalid state)
 * - 404: Campaign not found
 */
export const POST = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;

  const result = await campaignService.pauseSchedule(campaignId, userId);

  return jsonResponse(result);
});
