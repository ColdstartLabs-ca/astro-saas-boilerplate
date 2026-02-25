/**
 * Individual Audience API Route
 * DELETE /api/projects/:projectId/audiences/:audienceId - Remove audience
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { projectAudienceService } from '@server/services/project-audience.service';

/**
 * DELETE /api/projects/:projectId/audiences/:audienceId
 * Remove a target audience from a project
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const { projectId, audienceId } = params;
  if (!projectId || !audienceId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID and Audience ID are required', 400);
  }

  try {
    await projectAudienceService.delete(projectId, audienceId, userId);
    return jsonResponse({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});
