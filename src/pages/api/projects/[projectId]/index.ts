/**
 * Individual Project API Routes
 * GET /api/projects/:projectId - Get a single project
 * PUT /api/projects/:projectId - Update a project
 * DELETE /api/projects/:projectId - Delete a project
 */

import { projectService } from '@server/services/project.service';
import type { IProjectResponse, IDeleteProjectResponse } from '@shared/types/project.types';
import { withAuth, jsonResponse, errorResponse } from '../../_utils';

/**
 * GET /api/projects/:projectId
 * Get a single project by ID
 */
export const GET = withAuth(async (userId, { params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  const project = await projectService.getById(projectId, userId);

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  const response: IProjectResponse = { project };
  return jsonResponse(response);
});

/**
 * PUT /api/projects/:projectId
 * Update a project
 */
export const PUT = withAuth(async (userId, { request, params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  try {
    const project = await projectService.update(projectId, userId, body);
    const response: IProjectResponse = { project };
    return jsonResponse(response);
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});

/**
 * PATCH /api/projects/:projectId
 * Partial update of a project (alias for PUT)
 */
export const PATCH = withAuth(async (userId, { request, params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  try {
    const project = await projectService.update(projectId, userId, body);
    const response: IProjectResponse = { project };
    return jsonResponse(response);
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete a project
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const projectId = params.projectId;
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  try {
    await projectService.delete(projectId, userId);
  } catch (err) {
    if (err instanceof Error && err.message === 'Project not found') {
      return errorResponse('NOT_FOUND', 'Project not found', 404);
    }
    throw err;
  }

  const response: IDeleteProjectResponse = { success: true };
  return jsonResponse(response);
});
