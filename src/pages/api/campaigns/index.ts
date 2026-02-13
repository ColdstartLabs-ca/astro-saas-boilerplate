/**
 * Campaigns API Routes
 * GET /api/campaigns?projectId=X - List campaigns for a project
 * POST /api/campaigns - Create a new campaign
 */

import { campaignService } from '@server/services/campaign.service';
import type { ICampaignListResponse, ICampaignResponse } from '@shared/types/campaign.types';
import { createCampaignSchema } from '@shared/validation/campaign.schema';
import { withAuth, withAuthAndBody, jsonResponse, errorResponse } from '../_utils';

/**
 * GET /api/campaigns?projectId=X
 * List campaigns for a specific project
 */
export const GET = withAuth(async (userId, { url }) => {
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
  }

  try {
    const campaigns = await campaignService.listByProject(userId, projectId);
    const response: ICampaignListResponse = { campaigns };
    return jsonResponse(response);
  } catch (err) {
    // Project not found (e.g. deleted) - return empty list instead of 500
    if (err instanceof Error && err.message.includes('not found')) {
      const response: ICampaignListResponse = { campaigns: [] };
      return jsonResponse(response);
    }
    throw err;
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export const POST = withAuthAndBody(createCampaignSchema, async (userId, input) => {
  const campaign = await campaignService.create(userId, input);

  const response: ICampaignResponse = { campaign };
  return jsonResponse(response, 201);
});
