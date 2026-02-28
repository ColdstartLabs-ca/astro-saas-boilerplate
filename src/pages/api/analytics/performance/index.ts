/**
 * Analytics Performance API Route
 * GET /api/analytics/performance?projectId=X&dateRangeDays=28
 *
 * Returns structured performance data for all published articles in a project:
 * - Per-article rows with GSC metrics and top queries
 * - Campaign-level aggregates
 * - Summary totals
 *
 * Errors:
 * - 401: Not authenticated
 * - 400: Invalid / missing query parameters
 * - 500: Unexpected error
 */

import { analyticsPerformanceService } from '@server/services/analytics-performance.service';
import { analyticsPerformanceQuerySchema } from '@shared/validation/analytics.schema';
import { withAuth, jsonResponse } from '../../_utils';

/**
 * GET /api/analytics/performance?projectId=X&dateRangeDays=28
 * Fetch aggregated performance data for all published articles in a project.
 */
export const GET = withAuth(async (userId, { url }) => {
  const rawDateRangeDays = url.searchParams.get('dateRangeDays');

  const params = analyticsPerformanceQuerySchema.parse({
    projectId: url.searchParams.get('projectId'),
    dateRangeDays: rawDateRangeDays !== null ? Number(rawDateRangeDays) : undefined,
  });

  const data = await analyticsPerformanceService.getPerformanceData(
    userId,
    params.projectId,
    params.dateRangeDays
  );

  return jsonResponse(data);
});
