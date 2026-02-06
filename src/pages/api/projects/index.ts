/**
 * Projects API Routes
 * GET /api/projects - List user's projects
 * POST /api/projects - Create a new project
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../_utils';
import { projectService } from '@server/services/project.service';
import { ProjectLimitError } from '@shared/types/project.types';
import type { IProjectsResponse, IProjectResponse } from '@shared/types/project.types';

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export const GET: APIRoute = async ({ locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const projects = await projectService.listByUser(userId);

    const response: IProjectsResponse = { projects };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing projects:', error);
    return new Response(JSON.stringify({ error: 'Failed to list projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/projects
 * Create a new project for the authenticated user
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};

    const project = await projectService.create(userId, body);

    const response: IProjectResponse = { project };
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating project:', error);

    // Handle project limit error
    if (error instanceof ProjectLimitError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'PROJECT_LIMIT_EXCEEDED',
          currentCount: error.currentCount,
          maxProjects: error.maxProjects,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to create project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
