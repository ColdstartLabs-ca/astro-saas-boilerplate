/**
 * Integration Validate API Route
 * POST /api/integrations/validate - Validate integration credentials before saving
 *
 * Tests webhook URLs by making an actual HTTP request to verify the endpoint exists.
 */

import { webhookAdapter } from '@server/integrations/webhook.adapter';
import { withAuth, jsonResponse, handleApiError } from '@pages/api/_utils';
import { z } from 'zod';
import type { ITestConnectionResult } from '@shared/types/integration.types';

/**
 * Validation schema for webhook validation request
 */
const validateWebhookSchema = z.object({
  type: z.literal('webhook'),
  url: z.string().url({ message: 'Invalid URL format' }),
  secret: z.string().optional(),
});

/**
 * POST /api/integrations/validate
 *
 * Validates integration credentials by making a test connection.
 * This allows testing before saving the integration.
 */
export const POST = withAuth(async (userId, { request }) => {
  const body = await request.json();

  // Validate request body
  const parseResult = validateWebhookSchema.safeParse(body);

  if (!parseResult.success) {
    return jsonResponse(
      {
        success: false,
        error: 'Invalid request',
        details: parseResult.error.issues,
      },
      400
    );
  }

  const { url, secret } = parseResult.data;

  // Test the webhook endpoint
  const result: ITestConnectionResult = await webhookAdapter.testConnection(
    { url },
    { secret: secret || '' }
  );

  // Enhance error messages for better UX
  if (!result.success && result.error) {
    const enhancedResult = enhanceErrorMessage(result);
    return jsonResponse({ success: false, result: enhancedResult });
  }

  return jsonResponse({ success: true, result });
});

/**
 * Enhance error messages to be more user-friendly
 */
function enhanceErrorMessage(result: ITestConnectionResult): ITestConnectionResult {
  const error = result.error || '';

  // Network errors - endpoint doesn't exist or is unreachable
  if (
    error.includes('fetch failed') ||
    error.includes('ENOTFOUND') ||
    error.includes('ECONNREFUSED') ||
    error.includes('NetworkError') ||
    error.includes('Failed to fetch')
  ) {
    return {
      ...result,
      error:
        'Unable to reach the webhook endpoint. Please verify the URL is correct and the server is accessible.',
      errorType: 'network_error',
    };
  }

  // Timeout errors
  if (error.includes('abort') || error.includes('timeout') || error.includes('Timeout')) {
    return {
      ...result,
      error:
        'The webhook endpoint took too long to respond. Please check if the server is responding.',
      errorType: 'timeout',
    };
  }

  // SSL/TLS errors
  if (error.includes('SSL') || error.includes('TLS') || error.includes('certificate')) {
    return {
      ...result,
      error: 'SSL/TLS certificate error. Please ensure the endpoint has a valid HTTPS certificate.',
      errorType: 'ssl_error',
    };
  }

  // Return with error type for HTTP errors
  if (error.includes('Webhook returned')) {
    return {
      ...result,
      errorType: 'http_error',
    };
  }

  return {
    ...result,
    errorType: 'unknown',
  };
}

/**
 * Handle errors
 */
export const onError = handleApiError;
