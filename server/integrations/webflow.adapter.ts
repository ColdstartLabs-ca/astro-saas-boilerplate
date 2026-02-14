/**
 * Webflow CMS REST API Adapter
 *
 * Handles publishing articles to Webflow CMS via the REST API v2.
 * Uses API Token for authentication (Bearer Auth).
 *
 * API Reference: https://developers.webflow.com/reference/rest-api
 */

import { marked } from 'marked';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';
import type {
  IWebflowConfig,
  IWebflowCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * RequestInit type definition for fetch API
 */
interface IRequestInit {
  method?: string;
  headers?: Record<string, string> | { get(name: string): string | null };
  body?: string | FormData | Blob | ArrayBuffer | null;
  signal?: AbortSignal | null;
}

/**
 * Webflow API site response
 */
interface IWebflowSite {
  id: string;
  name: string;
  shortName: string;
  createdOn: string;
}

/**
 * Webflow API sites list response
 */
interface IWebflowSitesResponse {
  sites: IWebflowSite[];
}

/**
 * Webflow API collection response
 */
interface IWebflowCollection {
  id: string;
  name: string;
  slug: string;
  fields: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    required: boolean;
    editable: boolean;
  }>;
}

/**
 * Webflow API collections list response
 */
interface IWebflowCollectionsResponse {
  collections: IWebflowCollection[];
}

/**
 * Webflow API create item response
 */
interface IWebflowCreateItemResponse {
  id: string;
  cmsLocale: string;
  fieldData: Record<string, unknown>;
}

/**
 * Webflow API error response
 */
interface IWebflowErrorResponse {
  message: string;
  code: number;
  details?: {
    field?: string;
    message?: string;
  }[];
}

/**
 * Webflow REST API v2 Adapter
 *
 * Publishes articles as collection items to Webflow CMS.
 * Converts markdown content to HTML before sending.
 */
export class WebflowAdapter implements ICMSAdapter {
  readonly type = 'webflow' as const;

  /**
   * Webflow REST API v2 base URL
   */
  private static readonly API_BASE_URL = 'https://api.webflow.com/v2';

  /**
   * HTTP timeout in milliseconds
   */
  private static readonly TIMEOUT_MS = 30000;

  /**
   * Rate limit: 60 requests per minute
   * Retry delay base in milliseconds
   */
  private static readonly RETRY_DELAY_MS = 1000;

  /**
   * Maximum retry attempts for rate-limited requests
   */
  private static readonly MAX_RETRIES = 3;

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
   * Make an authenticated request to Webflow REST API with retry logic
   */
  private async fetchWebflow<T>(
    apiToken: string,
    endpoint: string,
    options?: IRequestInit,
    retryCount = 0
  ): Promise<T> {
    const url = `${WebflowAdapter.API_BASE_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WebflowAdapter.TIMEOUT_MS);

    try {
      const fetchOptions: IRequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
          ...options?.headers,
        },
        signal: controller.signal,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetch(url, fetchOptions as any);
      clearTimeout(timeoutId);

      // Handle rate limiting (429)
      if (response.status === 429 && retryCount < WebflowAdapter.MAX_RETRIES) {
        const delay = WebflowAdapter.RETRY_DELAY_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWebflow<T>(apiToken, endpoint, options, retryCount + 1);
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as IWebflowErrorResponse;
        const errorDetails = errorData.details?.map(d => d.message).join(', ') || '';
        throw new Error(
          `Webflow API error (${response.status}): ${errorData.message}${errorDetails ? ` - ${errorDetails}` : ''}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test connection to Webflow site
   *
   * Makes a lightweight GET request to list sites and verify token works
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const wfConfig = config as IWebflowConfig;
    const wfCreds = credentials as IWebflowCredentials;

    try {
      // Validate config
      if (!wfConfig.site_id || !wfConfig.collection_id || !wfConfig.field_map) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing site_id, collection_id, or field_map',
        };
      }

      // Validate credentials
      if (!wfCreds.apiToken) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing apiToken',
        };
      }

      // Validate field map has required fields
      const { field_map } = wfConfig;
      if (!field_map.title || !field_map.slug || !field_map.content) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid field_map: must include title, slug, and content field IDs',
        };
      }

      // Make a test request - list sites to verify token
      const sitesResponse = await this.fetchWebflow<IWebflowSitesResponse>(
        wfCreds.apiToken,
        '/sites'
      );

      // Verify the configured site exists
      const siteExists = sitesResponse.sites.some(site => site.id === wfConfig.site_id);
      if (!siteExists) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Site not found: ${wfConfig.site_id}. Verify you have access to this site.`,
        };
      }

      // Verify the collection exists
      const collectionsResponse = await this.fetchWebflow<IWebflowCollectionsResponse>(
        wfCreds.apiToken,
        `/sites/${wfConfig.site_id}/collections`
      );

      const collectionExists = collectionsResponse.collections.some(
        col => col.id === wfConfig.collection_id
      );
      if (!collectionExists) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Collection not found: ${wfConfig.collection_id}. Verify the collection ID is correct.`,
        };
      }

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
   * Publish article to Webflow CMS
   *
   * Creates a new collection item in draft state via Webflow REST API.
   * Converts markdown content to HTML before sending.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const wfConfig = config as IWebflowConfig;
    const wfCreds = credentials as IWebflowCredentials;
    const { article } = context;

    try {
      // Validate required fields
      if (!article.title || !article.content) {
        return {
          success: false,
          error: 'Article missing title or content',
        };
      }

      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(article.content);

      const { field_map, collection_id } = wfConfig;

      // Build field data using the field mapping
      const fieldData: Record<string, unknown> = {
        [field_map.title]: article.title,
        [field_map.slug]: article.slug || this.generateSlug(article.title),
        [field_map.content]: htmlContent,
      };

      // Add optional fields if mapped
      if (field_map.excerpt && article.meta_description) {
        fieldData[field_map.excerpt] = article.meta_description;
      }
      if (field_map.date) {
        fieldData[field_map.date] = new Date().toISOString();
      }

      // Build Webflow collection item payload
      const itemPayload = {
        fieldData,
        isDraft: true, // Create as draft so user can review before publishing
      };

      // Create collection item via Webflow API
      const response = await this.fetchWebflow<IWebflowCreateItemResponse>(
        wfCreds.apiToken,
        `/collections/${collection_id}/items`,
        {
          method: 'POST',
          body: JSON.stringify(itemPayload),
        }
      );

      // Build the URL to the item in Webflow Designer
      // Format: https://webflow.com/design/{site_short_name} (users can find their items there)
      const externalUrl = `https://webflow.com/dashboard/sites/${wfConfig.site_id}`;

      return {
        success: true,
        externalId: response.id,
        externalUrl,
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
   * Generate a URL-safe slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}

/**
 * Singleton instance of Webflow adapter
 */
export const webflowAdapter = new WebflowAdapter();
