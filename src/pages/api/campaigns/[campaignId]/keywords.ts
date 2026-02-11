/**
 * Campaign Keywords API Routes
 * GET /api/campaigns/:campaignId/keywords - List keywords for a campaign
 * POST /api/campaigns/:campaignId/keywords - Add keywords to a campaign
 */

import { campaignService } from '@server/services/campaign.service';
import type { IKeywordsResponse, IAddKeywordsResponse } from '@shared/types/campaign.types';
import { addKeywordsSchema } from '@shared/validation/campaign.schema';
import { withAuth, withAuthAndBody, jsonResponse } from '../../_utils';

/**
 * GET /api/campaigns/:campaignId/keywords
 * List keywords for a campaign
 */
export const GET = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;
  const keywords = await campaignService.getKeywords(campaignId, userId);

  const response: IKeywordsResponse = { keywords };
  return jsonResponse(response);
});

/**
 * POST /api/campaigns/:campaignId/keywords
 * Add keywords to a campaign
 */
export const POST = withAuthAndBody(addKeywordsSchema, async (userId, input, { params }) => {
  const campaignId = params.campaignId as string;
  const result = await campaignService.addKeywords(campaignId, userId, input.keywords);

  const response: IAddKeywordsResponse = result;
  return jsonResponse(response);
});
