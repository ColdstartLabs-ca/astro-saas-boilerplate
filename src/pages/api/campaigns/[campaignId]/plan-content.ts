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
 * Body (optional):
 * - mode: 'replace' (default) | 'merge'
 *   - replace: deletes existing planned articles and reschedules all pending keywords
 *   - merge: keeps existing articles, only schedules keywords not yet planned
 *
 * Returns:
 * - 200: { planned: number, startDate: string | null, endDate: string | null, message?: string }
 * - 400: Invalid campaignId (not a UUID)
 * - 401: Unauthenticated
 * - 404: Campaign not found or not owned by user
 * - 500: Internal server error
 */
export const POST = withAuth(async (userId, context) => {
  const campaignId = context.params.campaignId as string;

  if (!UUID_REGEX.test(campaignId)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid campaign ID format', 400);
  }

  let mode: 'replace' | 'merge' = 'replace';
  try {
    const body = await context.request.json();
    if (body?.mode === 'merge') mode = 'merge';
  } catch {
    // No body or invalid JSON — default to replace
  }

  try {
    const result = await contentPlanningService.planContent(campaignId, userId, mode);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof CampaignNotFoundError) {
      return errorResponse('NOT_FOUND', 'Campaign not found', 404);
    }
    throw err;
  }
});
