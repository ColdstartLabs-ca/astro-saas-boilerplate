/**
 * Individual Example Article API Route
 * DELETE /api/projects/:projectId/example-articles/:exampleArticleId - Remove example article
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { projectExampleArticleService } from '@server/services/project-example-article.service';

/**
 * DELETE /api/projects/:projectId/example-articles/:exampleArticleId
 * Remove an example article from a project
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const { projectId, exampleArticleId } = params;
  if (!projectId || !exampleArticleId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID and Example Article ID are required', 400);
  }

  try {
    await projectExampleArticleService.delete(projectId, exampleArticleId, userId);
    return jsonResponse({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});
