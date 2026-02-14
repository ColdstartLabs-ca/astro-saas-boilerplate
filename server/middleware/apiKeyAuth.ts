/**
 * API Key Authentication Middleware
 *
 * Extracts and validates API keys from Authorization header.
 * Supports rate limiting and scope checking.
 *
 * Usage:
 * 1. Extract key: const result = await extractApiKey(request);
 * 2. Validate key: const auth = await validateApiKey(result.key);
 * 3. Check rate limit: await checkRateLimit(auth.keyId, auth.rateLimit);
 * 4. Check scopes: checkScopes(auth.scopes, requiredScopes);
 */

import { apiKeyService, isValidKeyFormat } from '@server/services/api-key.service';
import { createRateLimiter } from '@server/rateLimit';
import type { ApiKeyScope, IApiKeyAuthResult } from '@shared/types/api-key.types';
import { ApiKeyScopeError, ApiKeyRateLimitError } from '@shared/types/api-key.types';

/**
 * API key prefix
 */
const KEY_PREFIX = 'apr_live_';

/**
 * Rate limit window in milliseconds (1 minute)
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * In-memory store for API key rate limiting
 * Maps keyId -> { timestamps: number[] }
 */
const rateLimitStore = new Map<string, { timestamps: number[] }>();

/**
 * Cleanup rate limit entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [keyId, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > fiveMinutesAgo);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(keyId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Extract API key from Authorization header
 *
 * @param request - The incoming request
 * @returns Object with success status and key (if found)
 */
export function extractApiKey(request: Request): { success: boolean; key?: string; error?: string } {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // Support "Bearer apr_live_xxx" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { success: false, error: 'Invalid Authorization header format. Use: Bearer <api-key>' };
  }

  const key = parts[1];

  // Quick format check before expensive validation
  if (!key.startsWith(KEY_PREFIX)) {
    return { success: false, error: 'Invalid API key format' };
  }

  return { success: true, key };
}

/**
 * Validate an API key and return authentication result
 *
 * @param key - The API key to validate
 * @returns Promise resolving to authentication result
 */
export async function validateApiKey(key: string): Promise<IApiKeyAuthResult> {
  // Validate format
  if (!isValidKeyFormat(key)) {
    return {
      valid: false,
      error: 'Invalid API key format',
    };
  }

  try {
    // Validate key via service (service handles hashing internally)
    const result = await apiKeyService.validateKey(key);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Key validation failed: ${message}`,
    };
  }
}

/**
 * Check rate limit for an API key
 *
 * @param keyId - The API key ID
 * @param limit - Maximum requests per minute
 * @returns Object with success status and rate limit info
 */
export function checkRateLimit(
  keyId: string,
  limit: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create entry
  let entry = rateLimitStore.get(keyId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(keyId, entry);
  }

  // Remove old timestamps
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  // Check limit
  if (entry.timestamps.length >= limit) {
    const oldestTimestamp = entry.timestamps[0];
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS;

    return {
      success: false,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add current timestamp
  entry.timestamps.push(now);

  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    reset: now + RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Check if API key has required scopes
 *
 * @param providedScopes - Scopes the key has
 * @param requiredScopes - Scopes required for the operation
 * @throws ApiKeyScopeError if insufficient scopes
 */
export function checkScopes(providedScopes: ApiKeyScope[], requiredScopes: ApiKeyScope[]): void {
  const hasAllScopes = requiredScopes.every(scope => providedScopes.includes(scope));

  if (!hasAllScopes) {
    throw new ApiKeyScopeError(requiredScopes, providedScopes);
  }
}

/**
 * Higher-order function to create an API key authenticated handler
 *
 * @param requiredScopes - Required scopes for this endpoint
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that validates API key authentication
 *
 * @example
 * ```ts
 * export const GET = withApiKeyAuth(['articles:read'], async (auth, context) => {
 *   const articles = await articleService.list(auth.userId);
 *   return jsonResponse({ articles });
 * });
 * ```
 */
export function withApiKeyAuth<T>(
  requiredScopes: ApiKeyScope[],
  handler: (
    auth: { userId: string; keyId: string; scopes: ApiKeyScope[] },
    context: T
  ) => Promise<Response>
): (context: T) => Promise<Response> {
  return async (context: T) => {
    // Get request from context (works for Astro API routes)
    const request = (context as { request: Request }).request;

    // Extract API key
    const extraction = extractApiKey(request);
    if (!extraction.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: extraction.error,
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key
    const auth = await validateApiKey(extraction.key!);
    if (!auth.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: auth.error || 'Invalid API key',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check scopes
    try {
      checkScopes(auth.scopes!, requiredScopes);
    } catch (error) {
      if (error instanceof ApiKeyScopeError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message,
              required: error.required,
              provided: error.provided,
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Check rate limit
    const rateLimit = checkRateLimit(auth.keyId!, auth.rateLimit!);
    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'API key rate limit exceeded',
            retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(auth.rateLimit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimit.reset / 1000)),
          },
        }
      );
    }

    // Call handler with auth info
    try {
      const response = await handler(
        {
          userId: auth.userId!,
          keyId: auth.keyId!,
          scopes: auth.scopes!,
        },
        context
      );

      // Add rate limit headers to response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', String(auth.rateLimit));
      headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.reset / 1000)));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Handle known errors
      if (error instanceof ApiKeyRateLimitError) {
        const retryAfter = Math.ceil((error.resetTime - Date.now()) / 1000);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: error.message,
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }

      // Re-throw unknown errors
      throw error;
    }
  };
}

/**
 * Create rate limiter factory for custom rate limits
 */
export { createRateLimiter };
