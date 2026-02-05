import { z } from 'zod';
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
        mockUserId = token.replace('test_token_mock_user_', '');
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
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
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
