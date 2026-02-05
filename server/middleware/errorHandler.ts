import { createErrorResponse, serializeError } from '@shared/utils/errors';
import { AppError } from '@shared/utils/errors';

/**
 * Type for API route handler functions
 * Works with standard Web API Request/Response (Next.js, Astro, Cloudflare Workers)
 */
export type ApiHandler = (req: Request, context?: { locals?: Record<string, unknown> }) => Promise<Response>;

/**
 * Higher-order function that wraps API handlers with consistent error handling
 *
 * Catches all errors and returns properly formatted error responses.
 * Preserves HTTP status codes from AppError instances.
 *
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (req) => {
 *   // Your handler logic
 *   return new Response(JSON.stringify({ success: true, data: result }), {
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 * });
 * ```
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: Request, context?: { locals?: Record<string, unknown> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      // Handle known AppError instances
      if (error instanceof AppError) {
        const { body, status } = createErrorResponse(
          error.code,
          error.message,
          error.statusCode,
          error.details
        );
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Handle unknown errors
      const message = serializeError(error);
      const { body, status } = createErrorResponse('INTERNAL_ERROR', message, 500);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
