/**
 * Individual Project API Routes
 * GET /api/projects/:projectId - Get a single project
 * PUT /api/projects/:projectId - Update a project
 * DELETE /api/projects/:projectId - Delete a project
 */

import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '@server/middleware/getAuthenticatedUser';
import { projectService } from '@server/services/project.service';
import type { IProjectResponse, IDeleteProjectResponse } from '@shared/types/project.types';

/**
 * GET /api/projects/:projectId
 * Get a single project by ID
 */
export const GET: APIRoute = async ({ request, params }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projectId = params.projectId;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Project ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const project = await projectService.getById(projectId, user.id);

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: IProjectResponse = { project };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting project:', error);
    return new Response(JSON.stringify({ error: 'Failed to get project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PUT /api/projects/:projectId
 * Update a project
 */
export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projectId = params.projectId;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Project ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};

    const project = await projectService.update(projectId, user.id, body);

    const response: IProjectResponse = { project };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating project:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to update project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE /api/projects/:projectId
 * Delete a project
 */
export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projectId = params.projectId;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Project ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await projectService.delete(projectId, user.id);

    const response: IDeleteProjectResponse = { success: true };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting project:', error);

    return new Response(JSON.stringify({ error: 'Failed to delete project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
