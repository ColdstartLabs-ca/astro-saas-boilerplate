/**
 * Standalone Sitemap Validation API Route
 * GET /api/validate-sitemap?url=X
 *
 * Auth-required but not tied to a specific project.
 * Used during onboarding Step 1 to validate sitemap URL before project creation.
 */

import { z } from 'zod';
import { withAuth, jsonResponse, errorResponse } from '@pages/api/_utils';
import { createLogger } from '@server/monitoring/logger';

const VALIDATION_TIMEOUT_MS = 5_000;

const urlSchema = z.string().url({ message: 'Invalid URL format' });

export const GET = withAuth(async (userId, context) => {
  const logger = createLogger(context.request, 'validate-sitemap', { userId });

  const url = new URL(context.request.url).searchParams.get('url');
  if (!url) {
    return errorResponse('VALIDATION_ERROR', 'url query parameter is required', 400);
  }

  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  logger.info('[validate-sitemap] Validating sitemap URL', { url });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    const valid = response.ok;
    const reason = valid ? undefined : ('not_found' as const);

    logger.info('[validate-sitemap] Validation result', { url, status: response.status, valid });

    return jsonResponse({ valid, reason });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('[validate-sitemap] Validation timed out', { url });
      return jsonResponse({ valid: false, reason: 'timeout' as const });
    }

    logger.error('[validate-sitemap] Validation error', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ valid: false, reason: 'error' as const });
  }
});
