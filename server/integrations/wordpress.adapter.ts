/**
 * WordPress REST API Adapter
 *
 * Handles publishing articles to WordPress sites via the REST API.
 * Uses Application Passwords for authentication (Basic Auth).
 *
 * API Reference: https://developer.wordpress.org/rest-api/reference/posts/
 */

import { marked } from 'marked';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';

// RequestInit type definition for fetch API (simplified to avoid DOM dependency issues in ESLint)
interface IRequestInit {
  method?: string;
  headers?: Record<string, string> | { get(name: string): string | null };
  body?: string | FormData | Blob | ArrayBuffer | null;
  signal?: AbortSignal | null;
}
import type {
  IWordPressConfig,
  IWordPressCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * WordPress REST API post response
 */
interface IWordPressPostResponse {
  id: number;
  link: string;
  status: string;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
}

/**
 * WordPress error response
 */
interface IWordPressErrorResponse {
  code: string;
  message: string;
  data: { status: number };
}

/**
 * WordPress REST API Adapter
 *
 * Publishes articles as draft posts to WordPress sites.
 * Converts markdown content to HTML before sending.
 */
export class WordPressAdapter implements ICMSAdapter {
  readonly type = 'wordpress' as const;

  /**
   * WordPress REST API endpoint path
   */
  private static readonly API_PATH = '/wp-json/wp/v2/posts';

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
    // Marked may return a Promise in some versions, handle that
    const result = marked(markdown);
    return typeof result === 'string' ? result : String(result);
  }

  /**
   * Build Basic Auth header from credentials
   */
  private buildAuthHeader(username: string, appPassword: string): string {
    const credentials = `${username}:${appPassword}`;
    const encoded = btoa(credentials);
    return `Basic ${encoded}`;
  }

  /**
   * Make an authenticated request to WordPress REST API
   */
  private async fetchWordPress<T>(
    siteUrl: string,
    username: string,
    appPassword: string,
    endpoint: string,
    options?: IRequestInit
  ): Promise<T> {
    const url = new URL(endpoint, siteUrl.replace(/\/$/, ''));
    const authHeader = this.buildAuthHeader(username, appPassword);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WordPressAdapter.TIMEOUT_MS);

    try {
      // Cast to any to avoid ESLint 'RequestInit is not defined' error
      // The type is actually correct at runtime since Node has native fetch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchOptions: any = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          ...options?.headers,
        },
        signal: controller.signal,
      };
      const response = await fetch(url.toString(), fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as IWordPressErrorResponse;
        throw new Error(
          `WordPress API error (${response.status}): ${errorData.message || response.statusText}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test connection to WordPress site
   *
   * Makes a lightweight GET request to check if credentials are valid
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const wpConfig = config as IWordPressConfig;
    const wpCreds = credentials as IWordPressCredentials;

    try {
      // Validate config
      if (!wpConfig.site_url || !wpConfig.username) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing site_url or username',
        };
      }

      // Validate credentials
      if (!wpCreds.appPassword) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing appPassword',
        };
      }

      // Make a test request - try to fetch a single post
      await this.fetchWordPress<IWordPressPostResponse[]>(
        wpConfig.site_url,
        wpConfig.username,
        wpCreds.appPassword,
        `${WordPressAdapter.API_PATH}?per_page=1`
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
   * Publish article to WordPress
   *
   * Creates a new draft post via WordPress REST API.
   * Converts markdown content to HTML before sending.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const wpConfig = config as IWordPressConfig;
    const wpCreds = credentials as IWordPressCredentials;
    const { article } = context;

    try {
      // Validate required fields
      // Note: Empty string content is allowed (article with just title), but undefined/null is not
      if (!article.title || article.content === undefined || article.content === null) {
        return {
          success: false,
          error: 'Article missing title or content',
        };
      }

      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(article.content);

      // Build WordPress post payload
      const postPayload = {
        title: article.title,
        content: htmlContent,
        // Use meta_description as excerpt if available
        excerpt: article.meta_description || '',
        // Use the article slug if available
        slug: article.slug || undefined,
        // Publish as draft so user can review before making public
        status: 'draft',
        // Plain text format (not auto-converted)
        content_format: 'html',
      };

      // Create post via WordPress REST API
      const response = await this.fetchWordPress<IWordPressPostResponse>(
        wpConfig.site_url,
        wpConfig.username,
        wpCreds.appPassword,
        WordPressAdapter.API_PATH,
        {
          method: 'POST',
          body: JSON.stringify(postPayload),
        }
      );

      return {
        success: true,
        externalId: String(response.id),
        externalUrl: response.link,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }
}

/**
 * Singleton instance of WordPress adapter
 */
export const wordpressAdapter = new WordPressAdapter();
