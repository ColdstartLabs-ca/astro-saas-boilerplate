/**
 * Analytics Sync API Route
 * POST /api/analytics/sync — Sync GSC performance data for all published articles in a project
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate request body (projectId, dateRangeDays)
 * 3. Call analyticsPerformanceService.syncPerformanceData
 * 4. Return { synced, skipped } counts
 *
 * Errors:
 * - 401: Not authenticated
 * - 400: Invalid request body
 * - 404: No active GSC connection (GscConnectionError → caught by withAuth error handler)
 * - 500: Unexpected error
 */

import { analyticsPerformanceService } from '@server/services/analytics-performance.service';
import { analyticsSyncSchema } from '@shared/validation/analytics.schema';
import { withAuthAndBody, jsonResponse } from '../../_utils';

/**
 * POST /api/analytics/sync
 * Sync GSC performance data for all published articles in a project.
 * GscConnectionError is automatically handled by withAuth error handler → 404.
 */
export const POST = withAuthAndBody(analyticsSyncSchema, async (userId, body) => {
  const { projectId, dateRangeDays } = body;

  const result = await analyticsPerformanceService.syncPerformanceData(
    userId,
    projectId,
    dateRangeDays
  );

  return jsonResponse(result);
});
