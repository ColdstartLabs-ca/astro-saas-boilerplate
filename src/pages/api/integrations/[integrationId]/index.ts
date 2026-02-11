/**
 * Integration Detail API Routes
 * GET /api/integrations/:integrationId - Get integration details
 * PUT /api/integrations/:integrationId - Update integration
 * DELETE /api/integrations/:integrationId - Delete integration
 */

import { z } from 'zod';
import { integrationService } from '@server/services/integration.service';
import {
  withAuth,
  withAuthAndBody,
  jsonResponse,
  errorResponse,
  handleApiError,
} from '@pages/api/_utils';
import type { IIntegrationResponse } from '@shared/types/integration.types';

/**
 * Validation schema for updating an integration
 */
const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  appPassword: z.string().min(1).optional(),
  secret: z.string().optional(),
});

/**
 * GET /api/integrations/:integrationId
 * Get integration details (without credentials)
 */
export const GET = withAuth(async (userId, { params }) => {
  const integrationId = params.integrationId as string;

  const integration = await integrationService.getById(integrationId, userId);

  if (!integration) {
    return errorResponse('NOT_FOUND', 'Integration not found', 404);
  }

  const response: IIntegrationResponse = integration;
  return jsonResponse(response);
});

/**
 * PUT /api/integrations/:integrationId
 * Update integration name or credentials
 *
 * If credentials are provided, they are re-encrypted.
 * Does not test connection automatically (use /test endpoint).
 */
export const PUT = withAuthAndBody(updateIntegrationSchema, async (userId, input, { params }) => {
  const integrationId = params.integrationId as string;

  const integration = await integrationService.update(integrationId, userId, input);

  const response: IIntegrationResponse = integration;
  return jsonResponse(response);
});

/**
 * DELETE /api/integrations/:integrationId
 * Delete an integration
 *
 * Soft checks for active campaigns (logs but doesn't prevent deletion).
 * Cascade deletes campaign_integrations and integration_deliveries.
 */
export const DELETE = withAuth(async (userId, { params }) => {
  const integrationId = params.integrationId as string;

  await integrationService.delete(integrationId, userId);

  return new Response(null, { status: 204 });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
