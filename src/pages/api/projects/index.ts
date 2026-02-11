/**
 * Projects API Routes
 * GET /api/projects - List user's projects
 * POST /api/projects - Create a new project
 */

import { projectService } from '@server/services/project.service';
import type { IProjectsResponse, IProjectResponse } from '@shared/types/project.types';
import { withAuth, jsonResponse } from '../_utils';

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export const GET = withAuth(async (userId) => {
  const projects = await projectService.listByUser(userId);

  const response: IProjectsResponse = { projects };
  return jsonResponse(response);
});

/**
 * POST /api/projects
 * Create a new project for the authenticated user
 */
export const POST = withAuth(async (userId, { request }) => {
  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  const project = await projectService.create(userId, body);

  const response: IProjectResponse = { project };
  return jsonResponse(response, 201);
});
