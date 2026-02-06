/**
 * Campaign Detail API Routes
 * GET /api/campaigns/:campaignId - Get campaign detail with keywords and stats
 * PUT /api/campaigns/:campaignId - Update campaign settings
 * DELETE /api/campaigns/:campaignId - Delete campaign
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals, jsonResponse, errorResponse } from '../../_utils';
import { campaignService } from '@server/services/campaign.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
import type { ICampaignDetailResponse, ICampaignResponse } from '@shared/types/campaign.types';
import { z } from 'zod';

/**
 * Validation schema for campaign update
 */
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
});

/**
 * GET /api/campaigns/:campaignId
 * Get campaign detail with keywords and article stats
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
    const detail = await campaignService.getDetail(campaignId, userId);

    if (!detail) {
      return errorResponse('NOT_FOUND', 'Campaign not found', 404);
    }

    const response: ICampaignDetailResponse = detail;
    return jsonResponse(response);
  } catch (error) {
    console.error('Error getting campaign detail:', error);

    if (error instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to get campaign detail', 500);
  }
};

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign settings
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const campaignId = params.campaignId as string;
    const body = await request.json();
    const input = updateCampaignSchema.parse(body);

    const campaign = await campaignService.update(campaignId, userId, input);

    const response: ICampaignResponse = { campaign };
    return jsonResponse(response);
  } catch (error) {
    console.error('Error updating campaign:', error);

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

    return errorResponse('INTERNAL_ERROR', 'Failed to update campaign', 500);
  }
};

/**
 * DELETE /api/campaigns/:campaignId
 * Delete campaign (cascades to keywords and articles)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const campaignId = params.campaignId as string;
    await campaignService.delete(campaignId, userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete campaign', 500);
  }
};
