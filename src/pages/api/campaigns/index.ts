/**
 * Campaigns API Routes
 * GET /api/campaigns?projectId=X - List campaigns for a project
 * POST /api/campaigns - Create a new campaign
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals, jsonResponse, errorResponse } from '../_utils';
import { campaignService } from '@server/services/campaign.service';
import type { ICampaignListResponse, ICampaignResponse } from '@shared/types/campaign.types';
import { z } from 'zod';

/**
 * Validation schema for campaign creation
 */
const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less'),
  projectId: z.string().uuid('Invalid project ID'),
  keywords: z
    .array(z.string().min(1).max(200))
    .min(1, 'At least one keyword is required')
    .max(500, 'Maximum 500 keywords allowed'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
});

/**
 * GET /api/campaigns?projectId=X
 * List campaigns for a specific project
 */
export const GET: APIRoute = async ({ url, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return errorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
    }

    const campaigns = await campaignService.listByProject(userId, projectId);

    const response: ICampaignListResponse = { campaigns };
    return jsonResponse(response);
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list campaigns', 500);
  }
};

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const body = await request.json();
    const input = createCampaignSchema.parse(body);

    const campaign = await campaignService.create(userId, input);

    const response: ICampaignResponse = { campaign };
    return jsonResponse(response, 201);
  } catch (error) {
    console.error('Error creating campaign:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(
        'VALIDATION_ERROR',
        error.errors[0]?.message ?? 'Validation failed',
        400
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to create campaign';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};
