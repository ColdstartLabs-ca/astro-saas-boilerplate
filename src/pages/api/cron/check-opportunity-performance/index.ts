/**
 * Cron: Check Opportunity Performance
 * POST /api/cron/check-opportunity-performance
 *
 * Checks GSC rankings for opportunities where action has been taken.
 * Runs weekly to track performance changes after article creation.
 *
 * Authenticates via x-cron-secret header.
 *
 * Flow:
 * 1. Verify cron secret
 * 2. Find opportunities due for check (14+ days old, not checked in 7 days)
 * 3. Fetch current GSC metrics for each opportunity's query
 * 4. Compare against original metrics
 * 5. Update performance_status and optionally auto-complete
 */

import type { APIRoute } from 'astro';
import { opportunityPerformanceService } from '@server/services/opportunity-performance.service';
import { serverEnv } from '@shared/config/env';

/**
 * Verify cron secret for authentication
 */
function verifyCronSecret(request: Request): { valid: boolean; error?: Response } {
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== serverEnv.CRON_SECRET) {
    console.error('[CRON:check-opportunity-performance] Unauthorized - invalid cron secret');
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
 * POST /api/cron/check-opportunity-performance
 * Process performance checks for opportunities where action has been taken
 */
export const POST: APIRoute = async ({ request }) => {
  console.log('[CRON:check-opportunity-performance] Starting performance check...');

  // Verify cron secret
  const auth = verifyCronSecret(request);
  if (!auth.valid && auth.error) {
    return auth.error;
  }

  try {
    const result = await opportunityPerformanceService.processDueOpportunities();

    console.log(
      `[CRON:check-opportunity-performance] Complete: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed`
    );

    return jsonResponse({
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results.map(r => ({
        opportunityId: r.opportunityId,
        success: r.success,
        status: r.status,
        positionBefore: r.positionBefore,
        positionAfter: r.positionAfter,
        error: r.error,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRON:check-opportunity-performance] Failed:', errorMessage);

    return errorResponse('INTERNAL_ERROR', errorMessage, 500);
  }
};
