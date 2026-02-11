/**
 * Campaign Detail API Routes
 * GET /api/campaigns/:campaignId - Get campaign detail with keywords and stats
 * PUT /api/campaigns/:campaignId - Update campaign settings
 * DELETE /api/campaigns/:campaignId - Delete campaign
 */

import { campaignService } from '@server/services/campaign.service';
import type { ICampaignDetailResponse, ICampaignResponse } from '@shared/types/campaign.types';
import { updateCampaignSchema } from '@shared/validation/campaign.schema';
import { withAuth, withAuthAndBody, jsonResponse, errorResponse } from '../../_utils';

/**
 * GET /api/campaigns/:campaignId
 * Get campaign detail with keywords and article stats
 */
export const GET = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;
  const detail = await campaignService.getDetail(campaignId, userId);

  if (!detail) {
    return errorResponse('NOT_FOUND', 'Campaign not found', 404);
  }

  const response: ICampaignDetailResponse = detail;
  return jsonResponse(response);
});

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign settings
 */
export const PUT = withAuthAndBody(updateCampaignSchema, async (userId, input, { params }) => {
  const campaignId = params.campaignId as string;
  const campaign = await campaignService.update(campaignId, userId, input);

  const response: ICampaignResponse = { campaign };
  return jsonResponse(response);
});

/**
 * DELETE /api/campaigns/:campaignId
 * Delete campaign (cascades to keywords and articles)
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;
  await campaignService.delete(campaignId, userId);

  return new Response(null, { status: 204 });
});
