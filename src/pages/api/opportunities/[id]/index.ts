/**
 * Opportunity Detail API Routes
 * GET  /api/opportunities/[id] — Fetch single opportunity by ID
 * PATCH /api/opportunities/[id] — Update opportunity status/action
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { updateOpportunitySchema } from '@shared/validation/opportunity.schema';
import { OpportunityNotFoundError } from '@shared/types/opportunity.types';
import type { IOpportunity, IOpportunityResponse } from '@shared/types/opportunity.types';
import { withAuth, withAuthAndBody, jsonResponse } from '../../_utils';

// =============================================================================
// GET /api/opportunities/[id]
// =============================================================================

/**
 * GET /api/opportunities/[id]
 * Fetch a single opportunity by ID, verifying ownership.
 */
export const GET = withAuth(async (userId, { params }) => {
  const opportunityId = params.id;
  if (!opportunityId) {
    throw new OpportunityNotFoundError('missing');
  }

  const { data, error } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new OpportunityNotFoundError(opportunityId);
  }

  const response: IOpportunityResponse = {
    opportunity: data as IOpportunity,
  };

  return jsonResponse(response);
});

// =============================================================================
// PATCH /api/opportunities/[id]
// =============================================================================

/**
 * PATCH /api/opportunities/[id]
 * Update an opportunity's status or action_type.
 */
export const PATCH = withAuthAndBody(updateOpportunitySchema, async (userId, body, context) => {
  const opportunityId = context.params.id;
  if (!opportunityId) {
    throw new OpportunityNotFoundError('missing');
  }

  // Fetch the opportunity and verify ownership
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    throw new OpportunityNotFoundError(opportunityId);
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    updatePayload.status = body.status;
  }
  if (body.action_type !== undefined) {
    updatePayload.action_type = body.action_type;
  }

  // Perform update
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('opportunities')
    .update(updatePayload)
    .eq('id', opportunityId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('[OpportunityDetail] Failed to update opportunity:', updateError?.message);
    throw new Error('Failed to update opportunity');
  }

  const response: IOpportunityResponse = {
    opportunity: updated as IOpportunity,
  };

  return jsonResponse(response);
});
