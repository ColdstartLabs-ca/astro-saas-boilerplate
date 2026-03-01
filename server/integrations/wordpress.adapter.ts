/**
 * WordPress REST API Adapter
 *
 * Handles publishing articles to WordPress sites via the REST API.
 * Uses Application Passwords for authentication (Basic Auth).
 *
 * API Reference: https://developer.wordpress.org/rest-api/reference/posts/
 */

import { BaseAdapter, type IRequestInit } from './adapters/base.adapter';
import type { IPublishContext, ITestConnectionResult, IPublishResult } from './adapter.interface';
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
export class WordPressAdapter extends BaseAdapter {
  readonly type = 'wordpress' as const;

  /**
   * WordPress REST API endpoint path
   */
  private static readonly API_PATH = '/wp-json/wp/v2/posts';

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

    const { controller, cleanup } = this.createTimeoutController();

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

      cleanup();

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as IWordPressErrorResponse;
        throw new Error(
          `WordPress API error (${response.status}): ${errorData.message || response.statusText}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      cleanup();
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

      return this.createTestConnectionSuccess();
    } catch (error) {
      return this.createTestConnectionError(error);
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
      const htmlContent = this.convertMarkdownToHtml(article.content);

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

      return this.createPublishSuccess(String(response.id), response.link);
    } catch (error) {
      return this.createPublishError(error);
    }
  }
}

/**
 * Singleton instance of WordPress adapter
 */
export const wordpressAdapter = new WordPressAdapter();
