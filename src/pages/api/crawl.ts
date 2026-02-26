/**
 * Standalone Website Crawl API Route
 * POST /api/crawl - Crawl a URL and extract metadata
 *
 * Auth-required but not tied to a specific project.
 * Used during onboarding Step 1 to auto-populate project details
 * before a project has been created.
 */

import { z } from 'zod';
import { websiteCrawlerService } from '@server/services/website-crawler.service';
import { withAuthAndBody, jsonResponse } from '@pages/api/_utils';
import { createLogger } from '@server/monitoring/logger';

const crawlRequestSchema = z.object({
  url: z.string().url({ message: 'Invalid URL format' }),
});

export interface ICrawlResult {
  metadata: {
    title: string | null;
    description: string | null;
  };
}

/**
 * POST /api/crawl
 *
 * Crawls a URL and extracts metadata (title, description).
 * Used during onboarding to auto-populate project details before project creation.
 */
export const POST = withAuthAndBody(crawlRequestSchema, async (userId, body, { request }) => {
  const logger = createLogger(request, 'crawl-api', { userId });
  logger.info('[crawl] Crawling website for metadata', { url: body.url });

  const metadata = await websiteCrawlerService.fetchMetadata(body.url);

  logger.info('[crawl] Crawl complete', {
    url: body.url,
    hasTitle: !!metadata.title,
    hasDescription: !!metadata.description,
  });

  const result: ICrawlResult = { metadata };
  return jsonResponse(result);
});
