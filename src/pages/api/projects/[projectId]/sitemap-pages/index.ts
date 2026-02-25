/**
 * Sitemap Pages API Routes
 * GET /api/projects/:projectId/sitemap-pages - List parsed pages with pagination
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { sitemapPageService } from '@server/services/sitemap-page.service';

/**
 * GET /api/projects/:projectId/sitemap-pages
 * List sitemap pages for a project with pagination
 */
export const GET = withAuth(async (userId, { params, url }) => {
  const projectId = params.projectId;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);

  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  // Validate pagination params
  if (isNaN(limit) || limit < 1 || limit > 500) {
    return errorResponse('VALIDATION_ERROR', 'Limit must be between 1 and 500', 400);
  }
  if (isNaN(offset) || offset < 0) {
    return errorResponse('VALIDATION_ERROR', 'Offset must be a non-negative integer', 400);
  }

  try {
    const result = await sitemapPageService.listByProject(projectId, userId, { limit, offset });
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});
