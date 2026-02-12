/**
 * GSC Connection Detail API Route
 * PUT /api/gsc/connections/:id - Update connection (set site_url)
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { updateGscConnectionSchema } from '@shared/validation/gsc.schema';
import type { IGscConnectionSafe } from '@shared/types/opportunity.types';
import type { APIContext } from 'astro';
import { withAuthAndBody, jsonResponse, errorResponse } from '../../../_utils';

/**
 * PUT /api/gsc/connections/:id
 * Update a GSC connection's site_url.
 * Verifies user ownership before updating.
 */
export const PUT = withAuthAndBody(
  updateGscConnectionSchema,
  async (userId: string, body: { siteUrl: string }, { params }: APIContext) => {
  const connectionId = params.id as string;
  if (!connectionId) {
    return errorResponse('VALIDATION_ERROR', 'Connection ID is required', 400);
  }

  // Verify ownership before updating
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('gsc_connections')
    .select('id, user_id')
    .eq('id', connectionId)
    .single();

  if (fetchError || !existing) {
    return errorResponse('NOT_FOUND', 'Connection not found', 404);
  }

  if (existing.user_id !== userId) {
    return errorResponse('FORBIDDEN', 'You do not own this connection', 403);
  }

  // Update the site_url
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('gsc_connections')
    .update({
      site_url: body.siteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select('id, project_id, google_email, site_url, last_synced_at, status, created_at')
    .single();

  if (updateError || !updated) {
    console.error('[GscConnections] Failed to update connection:', updateError?.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to update connection', 500);
  }

  const connection: IGscConnectionSafe = {
    id: updated.id,
    project_id: updated.project_id,
    google_email: updated.google_email,
    site_url: updated.site_url,
    last_synced_at: updated.last_synced_at,
    status: updated.status,
    created_at: updated.created_at,
  };

  console.log('[GscConnections] Connection updated:', connectionId, 'site_url:', body.siteUrl);
  return jsonResponse({ connection });
});
