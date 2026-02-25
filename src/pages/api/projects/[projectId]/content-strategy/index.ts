/**
 * Content Strategy API Routes
 * GET /api/projects/:projectId/content-strategy - Get latest strategy
 * POST /api/projects/:projectId/content-strategy - Trigger generation (stub)
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { contentStrategyService } from '@server/services/content-strategy.service';

/**
 * GET /api/projects/:projectId/content-strategy
 * Get the latest content strategy for a project
 */
export const GET = withAuth(async (userId, { params }) => {
  const projectId = params.projectId;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);

  try {
    const contentStrategy = await contentStrategyService.getLatestByProject(projectId, userId);
    return jsonResponse({ contentStrategy });
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});

/**
 * POST /api/projects/:projectId/content-strategy
 * Trigger content strategy generation (creates a pending strategy record)
 */
export const POST = withAuth(async (userId, { params }) => {
  const projectId = params.projectId;
  if (!projectId) return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);

  try {
    const contentStrategy = await contentStrategyService.create(projectId, userId);
    return jsonResponse({ contentStrategy }, 202); // 202 Accepted
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    if (err instanceof Error && err.message.includes('already in progress')) {
      return errorResponse('CONFLICT', err.message, 409);
    }
    throw err;
  }
});
