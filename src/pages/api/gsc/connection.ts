/**
 * GSC Connection API Route
 * GET /api/gsc/connection?projectId=xxx - Get first active connection for a project
 *
 * Backward-compatible endpoint used by onboarding step.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IGscConnectionSafe } from '@shared/types/opportunity.types';
import { withAuth, jsonResponse, errorResponse } from '../_utils';

function mapConnection(row: Record<string, unknown>): IGscConnectionSafe {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    google_email: row.google_email as string,
    site_url: row.site_url as string | null,
    last_synced_at: row.last_synced_at as string | null,
    status: row.status as IGscConnectionSafe['status'],
    auto_analyze: (row.auto_analyze as boolean) ?? false,
    analyze_frequency: (row.analyze_frequency as IGscConnectionSafe['analyze_frequency']) ?? 'weekly',
    next_analyze_at: row.next_analyze_at as string | null,
    last_analyzed_at: row.last_analyzed_at as string | null,
    created_at: row.created_at as string,
  };
}

export const GET = withAuth(async (userId, { url }) => {
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
  }

  const { data: connection, error } = await supabaseAdmin
    .from('gsc_connections')
    .select(
      'id, project_id, google_email, site_url, last_synced_at, status, auto_analyze, analyze_frequency, next_analyze_at, last_analyzed_at, created_at'
    )
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch GSC connection', 500);
  }

  return jsonResponse({
    connection: connection ? mapConnection(connection) : null,
  });
});

