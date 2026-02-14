/**
 * GSC Connections API Routes
 * GET /api/gsc/connections - List connections for a project
 * DELETE /api/gsc/connections - Disconnect a GSC connection
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type {
  IGscConnectionSafe,
  IGscConnectionListResponse,
} from '@shared/types/opportunity.types';
import { withAuth, jsonResponse, errorResponse } from '../../_utils';

/**
 * GET /api/gsc/connections?projectId=xxx
 * List GSC connections for a project (safe versions without tokens)
 */
export const GET = withAuth(async (userId, { url }) => {
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
  }

  const { data: connections, error } = await supabaseAdmin
    .from('gsc_connections')
    .select(
      'id, project_id, google_email, site_url, last_synced_at, status, auto_analyze, analyze_frequency, next_analyze_at, last_analyzed_at, created_at'
    )
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('[GscConnections] Failed to fetch connections:', error.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch connections', 500);
  }

  const safeConnections: IGscConnectionSafe[] = (connections || []).map(conn => ({
    id: conn.id,
    project_id: conn.project_id,
    google_email: conn.google_email,
    site_url: conn.site_url,
    last_synced_at: conn.last_synced_at,
    status: conn.status,
    auto_analyze: conn.auto_analyze ?? false,
    analyze_frequency: conn.analyze_frequency ?? 'weekly',
    next_analyze_at: conn.next_analyze_at,
    last_analyzed_at: conn.last_analyzed_at,
    created_at: conn.created_at,
  }));

  const response: IGscConnectionListResponse = { connections: safeConnections };
  return jsonResponse(response);
});

/**
 * DELETE /api/gsc/connections?connectionId=xxx
 * Delete a GSC connection (verify ownership first)
 */
export const DELETE = withAuth(async (userId, { url }) => {
  const connectionId = url.searchParams.get('connectionId');
  if (!connectionId) {
    return errorResponse('VALIDATION_ERROR', 'connectionId query parameter is required', 400);
  }

  // Verify ownership before deleting
  const { data: connection, error: fetchError } = await supabaseAdmin
    .from('gsc_connections')
    .select('id, user_id')
    .eq('id', connectionId)
    .single();

  if (fetchError || !connection) {
    return errorResponse('NOT_FOUND', 'Connection not found', 404);
  }

  if (connection.user_id !== userId) {
    return errorResponse('FORBIDDEN', 'You do not own this connection', 403);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('gsc_connections')
    .delete()
    .eq('id', connectionId);

  if (deleteError) {
    console.error('[GscConnections] Failed to delete connection:', deleteError.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete connection', 500);
  }

  console.log('[GscConnections] Connection deleted:', connectionId);
  return jsonResponse({ deleted: true });
});
