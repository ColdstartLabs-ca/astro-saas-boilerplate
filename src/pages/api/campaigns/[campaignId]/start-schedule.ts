/**
 * Start Schedule API Route
 * POST /api/campaigns/:campaignId/start-schedule - Start scheduled article generation
 */

import { campaignService } from '@server/services/campaign.service';
import { withAuth, jsonResponse } from '../../_utils';

/**
 * POST /api/campaigns/:campaignId/start-schedule
 * Start scheduled article generation for a campaign
 *
 * Validates:
 * - Campaign exists and belongs to user
 * - Campaign has schedule configuration (frequency, batch_size)
 * - Campaign has pending keywords
 * - Campaign is in a state that can start (draft or paused)
 *
 * Returns:
 * - 200: { nextRunAt, pendingKeywords }
 * - 400: Validation error (no schedule config, no pending keywords, invalid state)
 * - 404: Campaign not found
 */
export const POST = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;

  const result = await campaignService.startSchedule(campaignId, userId);

  return jsonResponse({
    nextRunAt: result.nextRunAt,
    pendingKeywords: result.pendingKeywords,
  });
});
