/**
 * API Keys Settings Routes
 * GET /api/settings/api-keys - List user's API keys
 * POST /api/settings/api-keys - Create a new API key
 * DELETE /api/settings/api-keys?keyId=xxx - Delete an API key
 */

import { z } from 'zod';
import { apiKeyService } from '@server/services/api-key.service';
import { withAuth, withAuthAndBody, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';
import type {
  IApiKeysListResponse,
  ICreateApiKeyResponse,
} from '@shared/types/api-key.types';

/**
 * API key scope enum for validation
 */
const apiKeyScopeSchema = z.enum([
  'articles:read',
  'articles:write',
  'campaigns:read',
  'campaigns:write',
  'integrations:read',
]);

/**
 * Validation schema for creating an API key
 */
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  scopes: z.array(apiKeyScopeSchema).optional(),
  expires_at: z.string().datetime({ message: 'Invalid expiration date format' }).optional(),
  rate_limit: z.number().int().min(1).max(1000).optional(),
});

/**
 * Validation schema for deleting an API key
 */
const deleteApiKeySchema = z.object({
  keyId: z.string().uuid('Invalid API key ID'),
});

/**
 * GET /api/settings/api-keys
 * List all API keys for the authenticated user
 *
 * Never returns key_hash in the response
 */
export const GET = withAuth(async userId => {
  const keys = await apiKeyService.list(userId);

  const response: IApiKeysListResponse = { keys };
  return jsonResponse(response);
});

/**
 * POST /api/settings/api-keys
 * Create a new API key
 *
 * Validates input, generates key, stores hash, and returns full key ONCE.
 * The full key cannot be retrieved again - user must save it.
 */
export const POST = withAuthAndBody(createApiKeySchema, async (userId, input) => {
  const key = await apiKeyService.create(userId, input);

  const response: ICreateApiKeyResponse = {
    key,
    warning: 'This is the only time you will see this API key. Please store it securely.',
  };
  return jsonResponse(response, 201);
});

/**
 * DELETE /api/settings/api-keys?keyId=xxx
 * Delete an API key
 */
export const DELETE = withAuth(async (userId, context) => {
  const url = new URL(context.request.url);
  const keyId = url.searchParams.get('keyId');

  if (!keyId) {
    return errorResponse('VALIDATION_ERROR', 'keyId query parameter is required', 400);
  }

  // Validate UUID format
  const parsed = deleteApiKeySchema.safeParse({ keyId });
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Invalid API key ID format', 400);
  }

  await apiKeyService.delete(keyId, userId);

  return new Response(null, { status: 204 });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
