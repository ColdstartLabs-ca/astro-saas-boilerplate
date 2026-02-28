/**
 * Plan Content API Route
 * POST /api/campaigns/:campaignId/plan-content - Create planned article stubs from pending keywords
 */

import { contentPlanningService } from '@server/services/content-planning.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
import { withAuth, jsonResponse, errorResponse } from '../../_utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/campaigns/:campaignId/plan-content
 * Create planned article stubs from a campaign's pending keywords.
 *
 * Distributes keywords across future dates using the campaign's schedule_frequency.
 * Deletes any previously planned articles before re-planning.
 * Planned articles have status='planned', no content, and no credits spent.
 *
 * Returns:
 * - 200: { planned: number, startDate: string | null, endDate: string | null, message?: string }
 * - 400: Invalid campaignId (not a UUID)
 * - 401: Unauthenticated
 * - 404: Campaign not found or not owned by user
 * - 500: Internal server error
 */
export const POST = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;

  if (!UUID_REGEX.test(campaignId)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid campaign ID format', 400);
  }

  try {
    const result = await contentPlanningService.planContent(campaignId, userId);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', 'Campaign not found', 404);
    }
    throw err;
  }
});
