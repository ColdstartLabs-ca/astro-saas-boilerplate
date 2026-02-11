/**
 * Integration Test API Route
 * POST /api/integrations/:integrationId/test - Test integration connection
 */

import { integrationService } from '@server/services/integration.service';
import { withAuth, jsonResponse, handleApiError } from '@pages/api/_utils';
import type { ITestIntegrationResponse } from '@shared/types/integration.types';

/**
 * POST /api/integrations/:integrationId/test
 *
 * Test the connection to an integration.
 *
 * Decrypts credentials and calls the adapter's testConnection method.
 * Updates the integration status and last_tested_at timestamp.
 */
export const POST = withAuth(async (userId, { params }) => {
  const integrationId = params.integrationId as string;

  const result = await integrationService.testConnection(integrationId, userId);

  const response: ITestIntegrationResponse = { result };
  return jsonResponse(response);
});

/**
 * Handle errors
 */
export const onError = handleApiError;
