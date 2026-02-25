/**
 * Project Target Audiences API Routes
 * GET /api/projects/:projectId/audiences - List audiences
 * POST /api/projects/:projectId/audiences - Add audience(s)
 */

import { withAuth, jsonResponse, errorResponse } from '../../../_utils';
import { projectAudienceService } from '@server/services/project-audience.service';
import { z } from 'zod';

/**
 * GET /api/projects/:projectId/audiences
 * List all target audiences for a project
 */
export const GET = withAuth(async (userId, { params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  try {
    const audiences = await projectAudienceService.listByProject(projectId, userId);
    return jsonResponse({ audiences });
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});

/**
 * POST /api/projects/:projectId/audiences
 * Add target audiences to a project (idempotent - skips duplicates)
 */
export const POST = withAuth(async (userId, { request, params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  try {
    const result = await projectAudienceService.createMany(projectId, userId, body);
    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', err.errors[0]?.message || 'Validation failed', 400);
    }
    if (err instanceof Error && err.message.includes('Cannot add')) {
      return errorResponse('VALIDATION_ERROR', err.message, 400);
    }
    throw err;
  }
});
