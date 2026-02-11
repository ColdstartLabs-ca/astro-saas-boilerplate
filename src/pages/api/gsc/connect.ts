/**
 * GSC Connect API Route
 * POST /api/gsc/connect - Initiate Google OAuth flow for GSC
 */

import { gscService } from '@server/services/gsc.service';
import { connectGscSchema } from '@shared/validation/gsc.schema';
import type { IGscConnectResponse } from '@shared/types/opportunity.types';
import { withAuthAndBody, jsonResponse } from '../_utils';

/**
 * POST /api/gsc/connect
 * Generate Google OAuth URL and return it to the client.
 * The client should redirect the user to this URL.
 */
export const POST = withAuthAndBody(connectGscSchema, async (_userId, body) => {
  const authUrl = gscService.getAuthUrl(body.projectId);

  const response: IGscConnectResponse = { authUrl };
  return jsonResponse(response);
});
