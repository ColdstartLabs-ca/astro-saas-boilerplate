/**
 * GSC Connection Detail API Route
 * PUT /api/gsc/connections/:id - Update connection (set site_url)
 * PATCH /api/gsc/connections/:id - Update connection scheduling settings
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  updateGscConnectionSchema,
  updateGscConnectionScheduleSchema,
} from '@shared/validation/gsc.schema';
import type { IGscConnectionSafe } from '@shared/types/opportunity.types';
import type { APIContext } from 'astro';
import { withAuthAndBody, jsonResponse, errorResponse, withAuth } from '../../../_utils';

/**
 * Helper to map database row to IGscConnectionSafe
 */
function mapToConnectionSafe(row: Record<string, unknown>): IGscConnectionSafe {
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
    .select(
      'id, project_id, google_email, site_url, last_synced_at, status, auto_analyze, analyze_frequency, next_analyze_at, last_analyzed_at, created_at'
    )
    .single();

  if (updateError || !updated) {
    console.error('[GscConnections] Failed to update connection:', updateError?.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to update connection', 500);
  }

  const connection = mapToConnectionSafe(updated);

  console.log('[GscConnections] Connection updated:', connectionId, 'site_url:', body.siteUrl);
  return jsonResponse({ connection });
});

/**
 * PATCH /api/gsc/connections/:id
 * Update a GSC connection's scheduling settings (auto_analyze, analyze_frequency).
 * Verifies user ownership before updating.
 */
export const PATCH = withAuthAndBody(
  updateGscConnectionScheduleSchema,
  async (
    userId: string,
    body: { autoAnalyze?: boolean; analyzeFrequency?: 'daily' | 'weekly' | 'biweekly' },
    { params }: APIContext
  ) => {
    const connectionId = params.id as string;
    if (!connectionId) {
      return errorResponse('VALIDATION_ERROR', 'Connection ID is required', 400);
    }

    // Verify ownership before updating
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('gsc_connections')
      .select('id, user_id, auto_analyze, analyze_frequency')
      .eq('id', connectionId)
      .single();

    if (fetchError || !existing) {
      return errorResponse('NOT_FOUND', 'Connection not found', 404);
    }

    if (existing.user_id !== userId) {
      return errorResponse('FORBIDDEN', 'You do not own this connection', 403);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.autoAnalyze !== undefined) {
      updateData.auto_analyze = body.autoAnalyze;

      // When enabling auto-analyze, set next_analyze_at to now so it runs soon
      // When disabling, clear next_analyze_at
      if (body.autoAnalyze) {
        updateData.next_analyze_at = new Date().toISOString();
      } else {
        updateData.next_analyze_at = null;
      }
    }

    if (body.analyzeFrequency !== undefined) {
      updateData.analyze_frequency = body.analyzeFrequency;
    }

    // Update the connection
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('gsc_connections')
      .update(updateData)
      .eq('id', connectionId)
      .select(
        'id, project_id, google_email, site_url, last_synced_at, status, auto_analyze, analyze_frequency, next_analyze_at, last_analyzed_at, created_at'
      )
      .single();

    if (updateError || !updated) {
      console.error('[GscConnections] Failed to update schedule:', updateError?.message);
      return errorResponse('INTERNAL_ERROR', 'Failed to update schedule', 500);
    }

    const connection = mapToConnectionSafe(updated);

    console.log(
      '[GscConnections] Schedule updated:',
      connectionId,
      'auto_analyze:',
      body.autoAnalyze,
      'frequency:',
      body.analyzeFrequency
    );
    return jsonResponse({ connection });
  }
);

/**
 * GET /api/gsc/connections/:id
 * Get a single GSC connection by ID.
 */
export const GET = withAuth(async (userId: string, { params }: APIContext) => {
  const connectionId = params.id as string;
  if (!connectionId) {
    return errorResponse('VALIDATION_ERROR', 'Connection ID is required', 400);
  }

  const { data: connection, error } = await supabaseAdmin
    .from('gsc_connections')
    .select(
      'id, project_id, google_email, site_url, last_synced_at, status, auto_analyze, analyze_frequency, next_analyze_at, last_analyzed_at, created_at'
    )
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    return errorResponse('NOT_FOUND', 'Connection not found', 404);
  }

  return jsonResponse({ connection: mapToConnectionSafe(connection) });
});
