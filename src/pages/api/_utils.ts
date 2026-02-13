import { z } from 'zod';
import type { APIRoute, APIContext } from 'astro';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { serverEnv } from '@shared/config/env';
import type { ILocals } from '../../types/api';

/**
 * Base API utilities for Astro endpoints
 */

/**
 * Get authenticated user from Authorization header
 * Supports both real auth and test mode
 */
export async function authenticateUserFromHeader(
  request: Request
): Promise<{ user: { id: string; email?: string } | null; error?: Response }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing authorization header',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  if (serverEnv.ENV === 'test') {
    // Test mode mock authentication
    if (token.startsWith('test_token_')) {
      let mockUserId: string;
      if (token.startsWith('test_token_mock_user_')) {
        // Token format: test_token_mock_user_{userId} or test_token_mock_user_{userId}_sub_{status}_{tier}
        // Extract just the UUID part (first segment after 'test_token_mock_user_')
        const tokenWithoutPrefix = token.replace('test_token_mock_user_', '');
        // Split by '_' and take the first 36 characters (UUID length) to handle tokens with extra metadata
        mockUserId = tokenWithoutPrefix.split('_')[0];
      } else {
        mockUserId = token.replace('test_token_', '');
      }
      return {
        user: {
          id: mockUserId,
          email: `test-${mockUserId}@example.com`,
        },
      };
    }
    return {
      user: null,
      error: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid test token',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Real authentication
  const result = await supabaseAdmin.auth.getUser(token);
  return {
    user: result.data.user,
    error: result.error
      ? new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid authentication token',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      : undefined,
  };
}

/**
 * Create a JSON response
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Parse and validate request body
 */
export async function getBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Get user ID from Astro locals (set by middleware)
 */
export function getUserIdFromLocals(locals: ILocals): string {
  const userId = (locals as { userId?: string }).userId;
  if (!userId) {
    throw new Error('User not authenticated - userId missing from locals');
  }
  return userId;
}

// =============================================================================
// Route Handler Factories
// =============================================================================

type AuthenticatedHandler = (userId: string, context: APIContext) => Promise<Response>;

/**
 * Wraps an API route with authentication and standard error handling.
 * Eliminates repeated auth check + try/catch + ZodError handling boilerplate.
 *
 * @example
 * ```ts
 * export const GET = withAuth(async (userId, { url }) => {
 *   const projectId = url.searchParams.get('projectId');
 *   const campaigns = await campaignService.listByProject(userId, projectId);
 *   return jsonResponse({ campaigns });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler): APIRoute {
  return async context => {
    let userId: string;
    try {
      userId = getUserIdFromLocals(context.locals as ILocals);
    } catch {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    try {
      return await handler(userId, context);
    } catch (error) {
      return handleApiError(error, `${context.request.method} ${context.url.pathname}`);
    }
  };
}

/**
 * Wraps an API route with authentication + Zod body validation.
 * For POST/PUT/PATCH routes that need parsed + validated request bodies.
 *
 * @example
 * ```ts
 * export const POST = withAuthAndBody(createCampaignSchema, async (userId, body, ctx) => {
 *   const campaign = await campaignService.create(userId, body);
 *   return jsonResponse({ campaign }, 201);
 * });
 * ```
 */
export function withAuthAndBody<T extends z.ZodType>(
  schema: T,
  handler: (userId: string, body: z.infer<T>, context: APIContext) => Promise<Response>
): APIRoute {
  return withAuth(async (userId, context) => {
    const body = await getBody(context.request, schema);
    return handler(userId, body, context);
  });
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Unified API error handler. Handles ZodError, known domain errors, and generic errors.
 * Use in catch blocks or let withAuth handle it automatically.
 *
 * Recognized error types:
 * - ZodError → 400 VALIDATION_ERROR
 * - CampaignNotFoundError → 404 NOT_FOUND
 * - NoPendingKeywordsError → 400 VALIDATION_ERROR
 * - InsufficientCreditsError → 402 INSUFFICIENT_CREDITS
 * - ProjectLimitError → 403 FORBIDDEN
 * - IntegrationNotFoundError → 404 NOT_FOUND
 * - OnboardingNotFoundError → 404 NOT_FOUND
 * - OnboardingStepError → 400 VALIDATION_ERROR
 * - EncryptionKeyError → 500 INTERNAL_ERROR
 * - DecryptionError → 500 INTERNAL_ERROR
 * - Everything else → 500 INTERNAL_ERROR
 */
export function handleApiError(error: unknown, context?: string): Response {
  if (error instanceof z.ZodError) {
    return errorResponse('VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation failed', 400);
  }

  // Domain errors - check by name to avoid importing every error class
  if (error instanceof Error) {
    switch (error.name) {
      case 'CampaignNotFoundError':
        return errorResponse('NOT_FOUND', error.message, 404);
      case 'NoPendingKeywordsError':
        return errorResponse('NO_PENDING_KEYWORDS', error.message, 400);
      case 'ScheduleValidationError':
        return errorResponse('VALIDATION_ERROR', error.message, 400);
      case 'InsufficientCreditsError':
        return errorResponse('INSUFFICIENT_CREDITS', error.message, 402);
      case 'ProjectLimitError':
        return errorResponse('FORBIDDEN', error.message, 403);
      case 'OpportunityNotFoundError':
        return errorResponse('NOT_FOUND', error.message, 404);
      case 'GscConnectionError':
        return errorResponse('NOT_FOUND', error.message, 404);
      case 'IntegrationNotFoundError':
        return errorResponse('NOT_FOUND', error.message, 404);
      case 'OnboardingNotFoundError':
        return errorResponse('NOT_FOUND', error.message, 404);
      case 'OnboardingStepError':
        return errorResponse('VALIDATION_ERROR', error.message, 400);
      case 'EncryptionKeyError':
      case 'DecryptionError':
        return errorResponse('INTERNAL_ERROR', error.message, 500);
    }
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error(`[API] ${context ?? 'unknown'}:`, error);
  return errorResponse('INTERNAL_ERROR', message, 500);
}

// =============================================================================
// Background Task Helpers
// =============================================================================

interface ILocalsWithRuntime {
  runtime?: {
    ctx?: {
      waitUntil?: (promise: Promise<unknown>) => void;
    };
  };
}

/**
 * Execute a promise in the background using Cloudflare's waitUntil if available,
 * otherwise fire-and-forget with error logging.
 */
export function fireAndForget(locals: unknown, promise: Promise<unknown>): void {
  const ctx = (locals as ILocalsWithRuntime).runtime?.ctx;
  if (ctx?.waitUntil) {
    ctx.waitUntil(promise);
  } else {
    promise.catch(err => console.error('[fireAndForget] Background task failed:', err));
  }
}
