/**
 * Delete Keyword API Route
 * DELETE /api/campaigns/:campaignId/keywords/:keywordId - Remove a keyword from a campaign
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals, errorResponse } from '../../../_utils';
import { campaignService } from '@server/services/campaign.service';

/**
 * DELETE /api/campaigns/:campaignId/keywords/:keywordId
 * Remove a keyword from a campaign
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    const keywordId = params.keywordId as string;
    await campaignService.removeKeyword(keywordId, userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error removing keyword:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to remove keyword', 500);
  }
};
