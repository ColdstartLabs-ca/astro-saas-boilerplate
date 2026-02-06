/**
 * Campaign Keywords API Routes
 * GET /api/campaigns/:campaignId/keywords - List keywords for a campaign
 * POST /api/campaigns/:campaignId/keywords - Add keywords to a campaign
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals, jsonResponse, errorResponse } from '../../_utils';
import { campaignService } from '@server/services/campaign.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
import type { IKeywordsResponse, IAddKeywordsResponse } from '@shared/types/campaign.types';
import { z } from 'zod';

/**
 * Validation schema for adding keywords
 */
const addKeywordsSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed'),
});

/**
 * GET /api/campaigns/:campaignId/keywords
 * List keywords for a campaign
 */
export const GET: APIRoute = async ({ params, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const campaignId = params.campaignId as string;
    const keywords = await campaignService.getKeywords(campaignId, userId);

    const response: IKeywordsResponse = { keywords };
    return jsonResponse(response);
  } catch (error) {
    console.error('Error listing keywords:', error);

    if (error instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to list keywords', 500);
  }
};

/**
 * POST /api/campaigns/:campaignId/keywords
 * Add keywords to a campaign
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const campaignId = params.campaignId as string;
    const body = await request.json();
    const input = addKeywordsSchema.parse(body);

    const result = await campaignService.addKeywords(campaignId, userId, input.keywords);

    const response: IAddKeywordsResponse = result;
    return jsonResponse(response);
  } catch (error) {
    console.error('Error adding keywords:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(
        'VALIDATION_ERROR',
        error.errors[0]?.message ?? 'Validation failed',
        400
      );
    }

    if (error instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to add keywords', 500);
  }
};
