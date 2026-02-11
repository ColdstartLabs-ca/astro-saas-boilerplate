/**
 * Opportunities API Routes
 * GET  /api/opportunities?projectId=X&... — List opportunities with filters
 * PATCH /api/opportunities?opportunityId=X — Update opportunity status/action
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  listOpportunitiesSchema,
  updateOpportunitySchema,
} from '@shared/validation/opportunity.schema';
import { OpportunityNotFoundError } from '@shared/types/opportunity.types';
import type {
  IOpportunityListResponse,
  IOpportunityResponse,
  IOpportunity,
} from '@shared/types/opportunity.types';
import { withAuth, withAuthAndBody, jsonResponse, errorResponse } from '../_utils';

// =============================================================================
// GET /api/opportunities
// =============================================================================

/**
 * GET /api/opportunities?projectId=X&category=content&status=open&type=low_hanging_fruit&search=keyword&page=1&limit=20&sortBy=priority_score&sortOrder=desc
 * List opportunities for a project with filtering, search, and pagination.
 */
export const GET = withAuth(async (userId, { url }) => {
  // Parse and validate query params
  const rawParams = {
    projectId: url.searchParams.get('projectId'),
    category: url.searchParams.get('category') || undefined,
    status: url.searchParams.get('status') || undefined,
    type: url.searchParams.get('type') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || '1',
    limit: url.searchParams.get('limit') || '20',
    sortBy: url.searchParams.get('sortBy') || 'priority_score',
    sortOrder: url.searchParams.get('sortOrder') || 'desc',
  };

  const params = listOpportunitiesSchema.parse(rawParams);

  // Verify project ownership
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', params.projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return errorResponse('NOT_FOUND', 'Project not found or access denied', 404);
  }

  // Build query
  let query = supabaseAdmin
    .from('opportunities')
    .select('*', { count: 'exact' })
    .eq('project_id', params.projectId)
    .eq('user_id', userId);

  // Apply filters
  if (params.category) {
    query = query.eq('category', params.category);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.type) {
    query = query.eq('type', params.type);
  }
  if (params.search) {
    // Search in title, description, and query fields
    query = query.or(
      `title.ilike.%${params.search}%,description.ilike.%${params.search}%,query.ilike.%${params.search}%`
    );
  }

  // Sorting
  const ascending = params.sortOrder === 'asc';
  query = query.order(params.sortBy, { ascending });

  // Pagination
  const offset = (params.page - 1) * params.limit;
  query = query.range(offset, offset + params.limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[OpportunitiesIndex] Failed to list opportunities:', error.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch opportunities', 500);
  }

  const response: IOpportunityListResponse = {
    opportunities: (data as IOpportunity[]) ?? [],
    total: count ?? 0,
  };

  return jsonResponse(response);
});

// =============================================================================
// PATCH /api/opportunities?opportunityId=X
// =============================================================================

/**
 * PATCH /api/opportunities?opportunityId=X
 * Update an opportunity's status or action_type.
 */
export const PATCH = withAuthAndBody(updateOpportunitySchema, async (userId, body, context) => {
  const opportunityId = context.url.searchParams.get('opportunityId');
  if (!opportunityId) {
    return errorResponse('VALIDATION_ERROR', 'opportunityId query parameter is required', 400);
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
    console.error('[OpportunitiesIndex] Failed to update opportunity:', updateError?.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to update opportunity', 500);
  }

  const response: IOpportunityResponse = {
    opportunity: updated as IOpportunity,
  };

  return jsonResponse(response);
});
