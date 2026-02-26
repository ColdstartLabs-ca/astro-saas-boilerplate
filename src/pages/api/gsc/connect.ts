/**
 * GSC Connect API Route
 * POST /api/gsc/connect - Initiate Google OAuth flow for GSC
 */

import { gscService } from '@server/services/gsc.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { connectGscSchema } from '@shared/validation/gsc.schema';
import type { IGscConnectResponse } from '@shared/types/opportunity.types';
import { withAuthAndBody, jsonResponse, errorResponse } from '../_utils';

/**
 * POST /api/gsc/connect
 * Generate Google OAuth URL and return it to the client.
 * The client should redirect the user to this URL.
 */
export const POST = withAuthAndBody(connectGscSchema, async (userId, body, context) => {
  // Verify user owns the project before initiating OAuth
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', body.projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  const authUrl = await gscService.getAuthUrl(body.projectId, userId, context.url.origin);
  const response: IGscConnectResponse = { authUrl };
  return jsonResponse(response);
});
