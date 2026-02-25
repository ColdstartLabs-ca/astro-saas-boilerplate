/**
 * Individual Competitor API Route
 * DELETE /api/projects/:projectId/competitors/:competitorId - Remove competitor
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { projectCompetitorService } from '@server/services/project-competitor.service';

/**
 * DELETE /api/projects/:projectId/competitors/:competitorId
 * Remove a competitor from a project
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const { projectId, competitorId } = params;
  if (!projectId || !competitorId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID and Competitor ID are required', 400);
  }

  try {
    await projectCompetitorService.delete(projectId, competitorId, userId);
    return jsonResponse({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});
