import { withErrorHandler } from '../middleware/errorHandler';
import { container } from '../di/container';

/**
 * Base Controller class for all API controllers
 *
 * Provides common functionality:
 * - Error handling wrapper
 * - Service resolution via DI container
 * - Abstract handle method for subclasses to implement
 *
 * Works with standard Web API Request/Response (Next.js, Astro, Cloudflare Workers)
 *
 * @example
 * ```ts
 * export class MyController extends BaseController {
 *   protected async handle(req: Request, context?: { locals?: AstroLocals }): Promise<Response> {
 *     // Your controller logic here
 *     return this.json({ success: true });
 *   }
 * }
 *
 * // In Astro route:
 * const controller = new MyController();
 * export const POST: APIRoute = async ({ request, locals }) => {
 *   return controller.execute(request, { locals });
 * };
 * ```
 */
export abstract class BaseController {
  /**
   * Handle the incoming request
   * Subclasses must implement this method with their logic
   */
  protected abstract handle(req: Request, context?: { locals?: Record<string, unknown> }): Promise<Response>;

  /**
   * Execute the controller with error handling
   * This is the method that should be called from route handlers
   */
  public async execute(req: Request, context?: { locals?: Record<string, unknown> }): Promise<Response> {
    const wrappedHandler = withErrorHandler(this.handle.bind(this));
    return wrappedHandler(req, context);
  }

  /**
   * Resolve a service from the DI container
   *
   * @example
   * ```ts
   * const creditsService = this.resolve<ISubscriptionCredits>('ISubscriptionCredits');
   * ```
   */
  protected resolve<T>(token: string): T {
    return container.resolve<T>(token);
  }

  /**
   * Get the authenticated user ID from the X-User-Id header
   * This header is set by the middleware for authenticated requests
   *
   * @throws AuthError if X-User-Id header is missing
   */
  protected getUserId(req: Request): string {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      throw new Error('X-User-Id header is missing - this endpoint requires authentication');
    }
    return userId;
  }

  /**
   * Get query parameter by name
   *
   * @param req - The Request object
   * @param name - The query parameter name
   * @returns The query parameter value or null if not found
   */
  protected getQueryParam(req: Request, name: string): string | null {
    const url = new URL(req.url);
    return url.searchParams.get(name);
  }

  /**
   * Get required query parameter
   *
   * @param req - The Request object
   * @param name - The query parameter name
   * @returns The query parameter value
   * @throws Error if the query parameter is missing
   */
  protected getRequiredQueryParam(req: Request, name: string): string {
    const value = this.getQueryParam(req, name);
    if (!value) {
      throw new Error(`Missing required query parameter: ${name}`);
    }
    return value;
  }

  /**
   * Get the request path (pathname without query string)
   *
   * @param req - The Request object
   * @returns The path
   */
  protected getPath(req: Request): string {
    const url = new URL(req.url);
    return url.pathname;
  }

  /**
   * Get the request body as JSON
   *
   * @param req - The Request object
   * @returns The parsed JSON body
   */
  protected async getBody<T = unknown>(req: Request): Promise<T> {
    const text = await req.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  /**
   * Check if the request is a GET request
   */
  protected isGet(req: Request): boolean {
    return req.method === 'GET';
  }

  /**
   * Check if the request is a POST request
   */
  protected isPost(req: Request): boolean {
    return req.method === 'POST';
  }

  /**
   * Check if the request is a PUT request
   */
  protected isPut(req: Request): boolean {
    return req.method === 'PUT';
  }

  /**
   * Check if the request is a DELETE request
   */
  protected isDelete(req: Request): boolean {
    return req.method === 'DELETE';
  }

  /**
   * Check if the request is a PATCH request
   */
  protected isPatch(req: Request): boolean {
    return req.method === 'PATCH';
  }

  /**
   * Create a JSON response
   *
   * @param data - The data to return
   * @param status - Optional status code (default: 200)
   */
  protected json<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Create an error response
   *
   * @param code - Error code
   * @param message - Error message
   * @param status - HTTP status code
   * @param details - Optional error details
   */
  protected error(
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
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
