/**
 * Base CMS Adapter
 *
 * Abstract base class for CMS integration adapters providing common functionality:
 * - Timeout handling
 * - Markdown to HTML conversion
 * - Error wrapping utilities
 * - Request configuration helpers
 */

import { markdownToHtml } from '@server/utils/markdown';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from '../adapter.interface';
import type {
  IIntegrationConfig,
  IIntegrationCredentials,
  IntegrationType,
} from '@shared/types/integration.types';

/**
 * RequestInit type definition for fetch API
 * Simplified to avoid DOM dependency issues in ESLint
 */
export interface IRequestInit {
  method?: string;
  headers?: Record<string, string> | { get(name: string): string | null };
  body?: string | FormData | Blob | ArrayBuffer | null;
  signal?: AbortSignal | null;
}

/**
 * Options for creating a timeout signal
 */
export interface ITimeoutOptions {
  timeoutMs?: number;
}

/**
 * Result of a timeout-controlled fetch operation
 */
export type FetchResult<T> = {
  data: T;
  response: Response;
};

/**
 * Custom error class for integration-related errors
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/**
 * Abstract base class for CMS adapters
 *
 * Provides common functionality shared across all CMS integration adapters.
 * Concrete implementations must implement the abstract methods.
 */
export abstract class BaseAdapter implements ICMSAdapter {
  /**
   * HTTP timeout in milliseconds
   */
  protected static readonly TIMEOUT_MS = 30000;

  /**
   * Get the adapter type identifier
   * Must be implemented by concrete adapters
   */
  abstract readonly type: IntegrationType;

  /**
   * Convert markdown to HTML
   *
   * Uses the shared markdown utility for consistent conversion
   * across all adapters.
   *
   * @param markdown - Markdown text to convert
   * @returns HTML string
   */
  protected convertMarkdownToHtml(markdown: string): string {
    return markdownToHtml(markdown);
  }

  /**
   * Create an AbortController with timeout
   *
   * @param timeoutMs - Optional custom timeout (defaults to TIMEOUT_MS)
   * @returns Object with controller, timeoutId, and cleanup function
   */
  protected createTimeoutController(timeoutMs?: number): {
    controller: AbortController;
    timeoutId: ReturnType<typeof setTimeout>;
    cleanup: () => void;
  } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? BaseAdapter.TIMEOUT_MS);

    return {
      controller,
      timeoutId,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  /**
   * Wrap an error in an IntegrationError
   *
   * @param error - Original error
   * @param context - Context string for error message
   * @returns IntegrationError instance
   */
  protected wrapError(error: unknown, context: string): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Check for timeout/abort errors
    if (message.includes('abort') || message.includes('timeout')) {
      return new IntegrationError(
        `${context}: Request timed out after ${BaseAdapter.TIMEOUT_MS}ms`,
        'TIMEOUT',
        undefined,
        error
      );
    }

    // Check for network errors
    if (
      message.includes('fetch failed') ||
      message.includes('ENOTFOUND') ||
      message.includes('ECONNREFUSED') ||
      message.includes('NetworkError')
    ) {
      return new IntegrationError(
        `${context}: Network error - unable to reach destination`,
        'NETWORK_ERROR',
        undefined,
        error
      );
    }

    return new IntegrationError(`${context}: ${message}`, 'UNKNOWN', undefined, error);
  }

  /**
   * Create a standardized error result for testConnection
   *
   * @param error - Error to format
   * @returns Formatted test connection result
   */
  protected createTestConnectionError(error: unknown): ITestConnectionResult {
    const integrationError = this.wrapError(error, 'Connection test failed');
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: integrationError.message,
    };
  }

  /**
   * Create a standardized success result for testConnection
   *
   * @returns Formatted test connection result
   */
  protected createTestConnectionSuccess(): ITestConnectionResult {
    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a standardized error result for publish
   *
   * @param error - Error to format
   * @returns Formatted publish result
   */
  protected createPublishError(error: unknown): IPublishResult {
    const integrationError = this.wrapError(error, 'Publish failed');
    return {
      success: false,
      error: integrationError.message,
    };
  }

  /**
   * Create a standardized success result for publish
   *
   * @param externalId - External ID of the published content
   * @param externalUrl - Optional URL to the published content
   * @returns Formatted publish result
   */
  protected createPublishSuccess(externalId: string, externalUrl?: string): IPublishResult {
    return {
      success: true,
      externalId,
      externalUrl,
    };
  }

  /**
   * Execute a fetch operation with timeout handling
   *
   * @param url - URL to fetch
   * @param options - Fetch options
   * @param timeoutMs - Optional custom timeout
   * @returns Promise resolving to the response
   * @throws IntegrationError on timeout or network error
   */
  protected async fetchWithTimeout(
    url: string,
    options?: IRequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    const { controller, cleanup } = this.createTimeoutController(timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      } as unknown as globalThis.RequestInit);
      return response;
    } catch (error) {
      throw this.wrapError(error, 'Fetch failed');
    } finally {
      cleanup();
    }
  }

  /**
   * Test the connection to the CMS
   * Must be implemented by concrete adapters
   */
  abstract testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult>;

  /**
   * Publish an article to the CMS
   * Must be implemented by concrete adapters
   */
  abstract publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult>;
}
