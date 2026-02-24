/**
 * IndexNow Submission API Route
 *
 * Protected by x-cron-secret header authentication (same as cron routes).
 *
 * GET /api/seo/indexnow
 * Headers: x-cron-secret: <CRON_SECRET>
 * Returns IndexNow configuration status
 *
 * POST /api/seo/indexnow
 * Headers: x-cron-secret: <CRON_SECRET>
 *
 * Submit single URL:
 * { "url": "https://autopilotrank.com/blog/post" }
 *
 * Submit batch:
 * { "urls": ["https://autopilotrank.com/page1", "https://autopilotrank.com/page2"] }
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { submitUrl, submitBatch, getSubmissionStatus } from '@lib/seo/indexnow';
import { serverEnv } from '@shared/config/env';
import { errorResponse, jsonResponse } from '../../_utils';

// =============================================================================
// Auth
// =============================================================================

function validateAuth(request: Request): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === serverEnv.CRON_SECRET && serverEnv.CRON_SECRET !== '';
}

// =============================================================================
// Schemas
// =============================================================================

const singleUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

const batchUrlsSchema = z.object({
  urls: z.array(z.string().url('Invalid URL format')).min(1, 'At least one URL required'),
  options: z
    .object({
      batchSize: z.number().int().min(1).max(10000).optional(),
      delayMs: z.number().int().min(0).max(60000).optional(),
    })
    .optional(),
});

// =============================================================================
// GET - Status
// =============================================================================

export const GET: APIRoute = async ({ request }) => {
  if (!validateAuth(request)) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing x-cron-secret header', 401);
  }

  try {
    const status = await getSubmissionStatus();
    return jsonResponse(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};

// =============================================================================
// POST - Submit URLs
// =============================================================================

export const POST: APIRoute = async ({ request }) => {
  if (!validateAuth(request)) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing x-cron-secret header', 401);
  }

  try {
    const body = await request.json();

    // Try single URL submission first
    const singleUrlResult = singleUrlSchema.safeParse(body);
    if (singleUrlResult.success) {
      const result = await submitUrl(singleUrlResult.data.url);
      return jsonResponse(result, result.success ? 200 : 500);
    }

    // Try batch submission
    const batchResult = batchUrlsSchema.safeParse(body);
    if (batchResult.success) {
      const result = await submitBatch(batchResult.data.urls, batchResult.data.options);
      return jsonResponse(result, result.success ? 200 : 500);
    }

    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid request body. Expected { url: string } or { urls: string[] }',
      400
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};
