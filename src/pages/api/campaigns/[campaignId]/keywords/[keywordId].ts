/**
 * Delete Keyword API Route
 * DELETE /api/campaigns/:campaignId/keywords/:keywordId - Remove a keyword from a campaign
 */

import { campaignService } from '@server/services/campaign.service';
import { withAuth } from '../../../_utils';

/**
 * DELETE /api/campaigns/:campaignId/keywords/:keywordId
 * Remove a keyword from a campaign
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const keywordId = params.keywordId as string;
  await campaignService.removeKeyword(keywordId, userId);

  return new Response(null, { status: 204 });
});
