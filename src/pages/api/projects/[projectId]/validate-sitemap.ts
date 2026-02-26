/**
 * Project Validate Sitemap API Route
 * GET /api/projects/:projectId/validate-sitemap - Validate a sitemap URL
 *
 * Performs a HEAD request to verify the sitemap URL is accessible.
 */

import { z } from 'zod';
import { projectService } from '@server/services/project.service';
import { withAuth, jsonResponse, errorResponse } from '@pages/api/_utils';

/**
 * Timeout for sitemap validation (5 seconds)
 */
const VALIDATION_TIMEOUT_MS = 5_000;

/**
 * Response type for validate-sitemap endpoint
 */
export interface IValidateSitemapResponse {
  valid: boolean;
  reason?: 'not_found' | 'timeout' | 'error';
  details?: string;
}

/**
 * GET /api/projects/:projectId/validate-sitemap
 *
 * Validates a sitemap URL by making a HEAD request.
 * Returns whether the URL is accessible.
 */
export const GET = withAuth(async (userId, { url, params }) => {
  const projectId = params.projectId;

  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  // Get URL from query params
  const sitemapUrl = url.searchParams.get('url');

  if (!sitemapUrl) {
    return errorResponse('VALIDATION_ERROR', 'URL parameter is required', 400);
  }

  // Validate URL format
  const urlSchema = z.string().url({ message: 'Invalid URL format' });
  const parseResult = urlSchema.safeParse(sitemapUrl);

  if (!parseResult.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid URL format', 400);
  }

  // Verify project ownership
  const project = await projectService.getById(projectId, userId);
  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  // Perform HEAD request to validate URL
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(sitemapUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result: IValidateSitemapResponse = { valid: true };
      return jsonResponse(result);
    }

    // Non-OK response
    const result: IValidateSitemapResponse = {
      valid: false,
      reason: 'not_found',
      details: `HTTP ${response.status}: ${response.statusText}`,
    };
    return jsonResponse(result);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const result: IValidateSitemapResponse = {
        valid: false,
        reason: 'timeout',
        details: `Request timed out after ${VALIDATION_TIMEOUT_MS / 1000}s`,
      };
      return jsonResponse(result);
    }

    // Handle other errors
    const result: IValidateSitemapResponse = {
      valid: false,
      reason: 'error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return jsonResponse(result);
  }
});
