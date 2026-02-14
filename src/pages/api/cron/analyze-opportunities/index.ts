/**
 * Cron: Analyze Opportunities
 * POST /api/cron/analyze-opportunities
 *
 * Processes scheduled GSC opportunity analysis for connections with auto_analyze enabled.
 * Authenticates via x-cron-secret header.
 *
 * Flow:
 * 1. Verify cron secret
 * 2. Find connections due for analysis (max 5 per run)
 * 3. Run analysis for each connection
 * 4. Return summary
 */

import type { APIRoute } from 'astro';
import { opportunitySchedulerService } from '@server/services/opportunity-scheduler.service';
import { serverEnv } from '@shared/config/env';

/**
 * Verify cron secret for authentication
 */
function verifyCronSecret(request: Request): { valid: boolean; error?: Response } {
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== serverEnv.CRON_SECRET) {
    console.error('[CRON:analyze-opportunities] Unauthorized - invalid cron secret');
    return {
      valid: false,
      error: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { valid: true };
}

/**
 * Create a JSON response
 */
function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response
 */
function errorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
      },
    }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /api/cron/analyze-opportunities
 * Process scheduled opportunity analysis
 */
export const POST: APIRoute = async ({ request }) => {
  console.log('[CRON:analyze-opportunities] Starting scheduled analysis...');

  // Verify cron secret
  const auth = verifyCronSecret(request);
  if (!auth.valid && auth.error) {
    return auth.error;
  }

  try {
    const result = await opportunitySchedulerService.processDueConnections();

    console.log(
      `[CRON:analyze-opportunities] Complete: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed`
    );

    return jsonResponse({
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRON:analyze-opportunities] Failed:', errorMessage);

    return errorResponse('INTERNAL_ERROR', errorMessage, 500);
  }
};
