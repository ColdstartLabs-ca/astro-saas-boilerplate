/**
 * Project Crawl API Route
 * POST /api/projects/:projectId/crawl - Crawl a URL and extract metadata
 *
 * Fetches title and meta description from a given URL for auto-populating
 * project details during onboarding.
 */

import { z } from 'zod';
import { projectService } from '@server/services/project.service';
import { websiteCrawlerService } from '@server/services/website-crawler.service';
import { withAuthAndBody, jsonResponse, errorResponse } from '@pages/api/_utils';

/**
 * Request body schema for crawl endpoint
 */
const crawlRequestSchema = z.object({
  url: z.string().url({ message: 'Invalid URL format' }),
});

/**
 * Response type for crawl endpoint
 */
export interface ICrawlResponse {
  metadata: {
    title: string | null;
    description: string | null;
  };
}

/**
 * POST /api/projects/:projectId/crawl
 *
 * Crawls a URL and extracts metadata (title, description).
 * Used during onboarding to auto-populate project details.
 */
export const POST = withAuthAndBody(crawlRequestSchema, async (userId, body, { params }) => {
  const projectId = params.projectId;

  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  // Verify project ownership
  const project = await projectService.getById(projectId, userId);
  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  // Crawl the URL and extract metadata
  const metadata = await websiteCrawlerService.fetchMetadata(body.url);

  const response: ICrawlResponse = { metadata };
  return jsonResponse(response);
});
