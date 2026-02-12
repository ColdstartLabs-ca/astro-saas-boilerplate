/**
 * GSC Connection Sites API Route
 * GET /api/gsc/connections/:id/sites - List verified GSC sites for a connection
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import type { IGscConnection } from '@shared/types/opportunity.types';
import { withAuth, jsonResponse, errorResponse } from '../../../_utils';

/**
 * GET /api/gsc/connections/:id/sites
 * Fetch verified Google Search Console sites for the given connection.
 * Handles token refresh if needed.
 */
export const GET = withAuth(async (userId, { params }) => {
  const connectionId = params.id as string;
  if (!connectionId) {
    return errorResponse('VALIDATION_ERROR', 'Connection ID is required', 400);
  }

  // Fetch connection with ownership check
  const { data: connection, error: fetchError } = await supabaseAdmin
    .from('gsc_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !connection) {
    return errorResponse('NOT_FOUND', 'Connection not found', 404);
  }

  if (connection.status !== 'active') {
    return errorResponse('VALIDATION_ERROR', 'Connection is not active', 400);
  }

  // Get a valid access token (refreshes if expired)
  const accessToken = await gscService.getValidAccessToken(connection as IGscConnection);

  // Fetch sites from GSC API
  const sites = await gscService.getSites(accessToken);

  return jsonResponse({ sites });
});
