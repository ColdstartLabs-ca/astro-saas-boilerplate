/**
 * Wix Blog REST API Adapter
 *
 * Handles publishing articles to Wix sites via the Wix Blog API.
 * Uses API Key authentication for server-to-server communication.
 *
 * API Reference: https://dev.wix.com/docs/rest/business-solutions/blog
 */

import { marked } from 'marked';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';
import type {
  IWixConfig,
  IWixCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * Wix Blog API post response
 */
interface IWixPostResponse {
  post: {
    id: string;
    slug: string;
    url: {
      base: string;
      path: string;
    };
    status: string;
    title: string;
    content: string;
    createdDate: string;
    updatedDate: string;
  };
}

/**
 * Wix API error response
 */
interface IWixErrorResponse {
  message: string;
  details?: {
    applicationError?: {
      code: string;
      description: string;
    };
  };
}

/**
 * Wix Blog REST API Adapter
 *
 * Publishes articles as draft posts to Wix sites.
 * Converts markdown content to HTML before sending.
 */
export class WixAdapter implements ICMSAdapter {
  readonly type = 'wix' as const;

  /**
   * Wix Blog API base URL
   */
  private static readonly API_BASE_URL = 'https://www.wixapis.com/blog/v3';

  /**
   * HTTP timeout in milliseconds
   */
  private static readonly TIMEOUT_MS = 30000;

  /**
   * Convert markdown to HTML using marked library
   * This is Cloudflare Workers compatible
   */
  private markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    const result = marked(markdown);
    return typeof result === 'string' ? result : String(result);
  }

  /**
   * Make an authenticated request to Wix Blog API
   */
  private async fetchWix<T>(
    apiKey: string,
    accountId: string,
    endpoint: string,
    options?: IRequestInit
  ): Promise<T> {
    const url = `${WixAdapter.API_BASE_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WixAdapter.TIMEOUT_MS);

    try {
      // Build headers, handling both Record and Headers-like objects
      const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-account-id': accountId,
      };

      // Merge additional headers if they're a Record type
      if (options?.headers && typeof options.headers === 'object' && !('get' in options.headers)) {
        Object.assign(baseHeaders, options.headers);
      }

      const fetchOptions: IFetchOptions = {
        ...options,
        headers: baseHeaders,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as IWixErrorResponse;
        const errorMessage =
          errorData.details?.applicationError?.description ||
          errorData.message ||
          response.statusText;
        throw new Error(`Wix API error (${response.status}): ${errorMessage}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test connection to Wix site
   *
   * Makes a lightweight GET request to check if credentials are valid
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const wixConfig = config as IWixConfig;
    const wixCreds = credentials as IWixCredentials;

    try {
      // Validate config
      if (!wixConfig.site_id) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing site_id',
        };
      }

      // Validate credentials
      if (!wixCreds.apiKey || !wixCreds.accountId) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing apiKey or accountId',
        };
      }

      // Make a test request - try to fetch posts with limit 1
      await this.fetchWix<IPostsListResponse>(
        wixCreds.apiKey,
        wixCreds.accountId,
        '/posts?paging.limit=1'
      );

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: message,
      };
    }
  }

  /**
   * Publish article to Wix
   *
   * Creates a new draft post via Wix Blog API.
   * Converts markdown content to HTML before sending.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const _wixConfig = config as IWixConfig;
    const wixCreds = credentials as IWixCredentials;
    const { article } = context;

    try {
      // Validate required fields
      if (!article.title || article.content === undefined || article.content === null) {
        return {
          success: false,
          error: 'Article missing title or content',
        };
      }

      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(article.content);

      // Build Wix post payload
      const postPayload = {
        post: {
          title: article.title,
          content: htmlContent,
          // Use the article slug if available, otherwise generate from title
          slug: article.slug || this.generateSlug(article.title),
          // Publish as draft so user can review before making public
          status: 'UNPUBLISHED',
          // Optional excerpt from meta_description
          excerpt: article.meta_description || '',
        },
      };

      // Create post via Wix Blog API
      const response = await this.fetchWix<IWixPostResponse>(
        wixCreds.apiKey,
        wixCreds.accountId,
        '/posts',
        {
          method: 'POST',
          body: JSON.stringify(postPayload),
        }
      );

      // Build the post URL
      const postUrl = response.post.url?.base
        ? `${response.post.url.base}/${response.post.url.path || response.post.slug}`
        : undefined;

      return {
        success: true,
        externalId: response.post.id,
        externalUrl: postUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Generate a URL-safe slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  }
}

/**
 * RequestInit type definition for fetch API (simplified to avoid DOM dependency issues in ESLint)
 */
interface IRequestInit {
  method?: string;
  headers?: Record<string, string> | { get(name: string): string | null };
  body?: string | FormData | Blob | ArrayBuffer | null;
  signal?: AbortSignal | null;
}

/**
 * Fetch options type
 */
interface IFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer | null;
  signal?: AbortSignal | null;
}

/**
 * Wix posts list response
 */
interface IPostsListResponse {
  posts: Array<{
    id: string;
    title: string;
  }>;
  metadata: {
    total: number;
  };
}

/**
 * Singleton instance of Wix adapter
 */
export const wixAdapter = new WixAdapter();
