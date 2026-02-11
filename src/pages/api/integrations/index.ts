/**
 * Integrations API Routes
 * GET /api/integrations - List user's integrations
 * POST /api/integrations - Create a new integration
 */

import { z } from 'zod';
import { integrationService } from '@server/services/integration.service';
import { withAuth, withAuthAndBody, jsonResponse, handleApiError } from '@pages/api/_utils';
import type {
  IIntegrationsListResponse,
  ICreateIntegrationResponse,
} from '@shared/types/integration.types';

/**
 * Validation schema for creating a WordPress integration
 */
const createWordPressSchema = z.object({
  type: z.literal('wordpress'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  siteUrl: z.string().url('Invalid site URL'),
  username: z.string().min(1, 'Username is required'),
  appPassword: z.string().min(1, 'Application password is required'),
});

/**
 * Validation schema for creating a webhook integration
 */
const createWebhookSchema = z.object({
  type: z.literal('webhook'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Invalid webhook URL'),
  secret: z.string().optional(),
});

/**
 * Discriminated union for creating integrations
 */
const createIntegrationSchema = z.discriminatedUnion('type', [
  createWordPressSchema,
  createWebhookSchema,
]);

/**
 * GET /api/integrations
 * List all integrations for the authenticated user
 *
 * Never returns encrypted_credentials in the response
 */
export const GET = withAuth(async userId => {
  const integrations = await integrationService.list(userId);

  const response: IIntegrationsListResponse = { integrations };
  return jsonResponse(response);
});

/**
 * POST /api/integrations
 * Create a new integration
 *
 * Validates input, encrypts credentials, creates the integration,
 * and automatically tests the connection.
 */
export const POST = withAuthAndBody(createIntegrationSchema, async (userId, input) => {
  const result = await integrationService.create(userId, input);

  const response: ICreateIntegrationResponse = result;
  return jsonResponse(response, 201);
});

/**
 * Handle errors
 */
export const onError = handleApiError;
