/**
 * Ghost CMS Admin API Adapter
 *
 * Handles publishing articles to Ghost blogs via the Admin API.
 * Uses JWT authentication with Admin API Key.
 *
 * API Reference: https://ghost.org/docs/admin-api/
 */

import { BaseAdapter, type IRequestInit, IntegrationError } from './adapters/base.adapter';
import type { IPublishContext, ITestConnectionResult, IPublishResult } from './adapter.interface';
import type {
  IGhostConfig,
  IGhostCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * Ghost Admin API site response
 */
interface IGhostSiteResponse {
  site: {
    title: string;
    url: string;
    version: string;
    description?: string;
  };
}

/**
 * Ghost Admin API post response
 */
interface IGhostPostResponse {
  posts: Array<{
    id: string;
    uuid: string;
    url: string;
    slug: string;
    title: string;
    html: string;
    status: string;
    created_at: string;
    updated_at: string;
    feature_image?: string;
  }>;
}

/**
 * Ghost Admin API error response
 */
interface IGhostErrorResponse {
  errors: Array<{
    message: string;
    context: string;
    type: string;
    details: Record<string, unknown>;
  }>;
}

/**
 * Ghost CMS Admin API Adapter
 *
 * Publishes articles as draft posts to Ghost blogs.
 * Ghost accepts raw HTML directly - no content conversion needed.
 */
export class GhostAdapter extends BaseAdapter {
  readonly type = 'ghost' as const;

  /**
   * Ghost Admin API endpoint paths
   */
  private static readonly API_SITE_PATH = '/ghost/api/admin/site/';
  private static readonly API_POSTS_PATH = '/ghost/api/admin/posts/';

  /**
   * JWT token expiry time in seconds (5 minutes)
   */
  private static readonly TOKEN_EXPIRY_SECONDS = 300;

  /**
   * Generate a JWT token for Ghost Admin API authentication
   *
   * The Admin API key format is: id:secret (both hex strings)
   * We create a short-lived JWT signed with the secret using HS256
   *
   * @param apiKey - Admin API key in format "id:secret"
   * @returns JWT token string
   */
  private generateJWT(apiKey: string): string {
    const [id, secret] = apiKey.split(':');

    if (!id || !secret) {
      throw new Error('Invalid API key format. Expected "id:secret"');
    }

    // Decode hex secret to bytes
    const secretBytes = new Uint8Array(
      secret.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // JWT header
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    // JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + GhostAdapter.TOKEN_EXPIRY_SECONDS,
      aud: '/admin/',
      iss: id,
    };

    // Base64url encode header and payload
    const base64url = (str: string): string => {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const message = `${encodedHeader}.${encodedPayload}`;

    // For sync compatibility, we'll compute synchronously
    // Ghost JWT requires sync generation, so we use a simple approach
    // that works in Cloudflare Workers runtime

    // Note: This synchronous approach uses a workaround for Cloudflare Workers
    // The crypto.subtle.sign is async, but we need sync for JWT
    // We'll use a manual HMAC-SHA256 implementation for sync operation

    return `${message}.${this.signSync(message, secretBytes)}`;
  }

  /**
   * Sign a message with HMAC-SHA256 synchronously
   * Uses a simple implementation compatible with Cloudflare Workers
   */
  private signSync(_message: string, _key: Uint8Array): string {
    // For Cloudflare Workers, we need to use crypto.subtle which is async
    // But JWT generation needs to be sync in this context
    // We'll use a workaround by pre-computing during adapter creation

    // Actually, let's use a different approach - we'll make the JWT generation async
    // But store the result. For now, let's throw if this method is called directly.

    // This shouldn't happen - we'll handle it in generateJWTAsync
    throw new Error('Sync signing not supported - use generateJWTAsync');
  }

  /**
   * Generate a JWT token asynchronously (Cloudflare Workers compatible)
   *
   * @param apiKey - Admin API key in format "id:secret"
   * @returns Promise resolving to JWT token string
   */
  private async generateJWTAsync(apiKey: string): Promise<string> {
    const [id, secret] = apiKey.split(':');

    if (!id || !secret) {
      throw new IntegrationError('Invalid API key format. Expected "id:secret"');
    }

    // Decode hex secret to bytes
    const secretBytes = new Uint8Array(
      secret.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // JWT header
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    // JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + GhostAdapter.TOKEN_EXPIRY_SECONDS,
      aud: '/admin/',
      iss: id,
    };

    // Base64url encode header and payload
    const base64url = (str: string): string => {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const message = `${encodedHeader}.${encodedPayload}`;

    // Sign using Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
    const signatureArray = new Uint8Array(signatureBytes);

    // Convert signature to base64url
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${message}.${signatureBase64}`;
  }

  /**
   * Sign a message with HMAC-SHA256 (async helper)
   * @deprecated Use generateJWTAsync instead
   */
  private async signHMAC(message: string, key: Uint8Array): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
    const signatureArray = new Uint8Array(signatureBytes);

    return btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Make an authenticated request to Ghost Admin API
   */
  private async fetchGhost<T>(
    siteUrl: string,
    apiKey: string,
    endpoint: string,
    options?: IRequestInit
  ): Promise<T> {
    const baseUrl = siteUrl.replace(/\/$/, '');
    const url = new URL(endpoint, baseUrl);

    // Generate JWT token
    const token = await this.generateJWTAsync(apiKey);

    const { controller, cleanup } = this.createTimeoutController();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchOptions: any = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Ghost ${token}`,
          'Accept-Version': 'v5.0',
          ...options?.headers,
        },
        signal: controller.signal,
      };

      const response = await fetch(url.toString(), fetchOptions);

      cleanup();

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as IGhostErrorResponse;
        const errorMessage =
          errorData.errors?.[0]?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new IntegrationError(`Ghost API error: ${errorMessage}`, undefined, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  /**
   * Test connection to Ghost site
   *
   * Makes a GET request to /admin/site/ to verify credentials and get site info
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const ghostConfig = config as IGhostConfig;
    const ghostCreds = credentials as IGhostCredentials;

    try {
      // Validate config
      if (!ghostConfig.site_url) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing site_url',
        };
      }

      // Validate credentials
      if (!ghostCreds.adminApiKey) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing adminApiKey',
        };
      }

      // Validate API key format
      const keyParts = ghostCreds.adminApiKey.split(':');
      if (keyParts.length !== 2 || !keyParts[0] || !keyParts[1]) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid API key format. Expected "id:secret"',
        };
      }

      // Make a test request to get site info
      const _response = await this.fetchGhost<IGhostSiteResponse>(
        ghostConfig.site_url,
        ghostCreds.adminApiKey,
        GhostAdapter.API_SITE_PATH
      );

      return {
        success: true,
        timestamp: new Date().toISOString(),
        // Include site title in success for user feedback
        error: undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Provide more specific error messages
      if (message.includes('Invalid API key format')) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error:
            'Invalid API key format. Please copy the Admin API key from your Ghost admin settings.',
          errorType: 'http_error',
        };
      }

      if (message.includes('fetch failed') || message.includes('ENOTFOUND')) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Unable to reach Ghost site. Please verify the site URL is correct.',
          errorType: 'network_error',
        };
      }

      if (message.includes('abort') || message.includes('timeout')) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Connection timed out. Please check if your Ghost site is accessible.',
          errorType: 'timeout',
        };
      }

      // Ghost authentication errors
      if (message.includes('Unauthorized') || message.includes('Invalid token')) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Authentication failed. Please verify your Admin API key is correct.',
          errorType: 'http_error',
        };
      }

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: message,
        errorType: 'unknown',
      };
    }
  }

  /**
   * Publish article to Ghost
   *
   * Creates a new post via Ghost Admin API.
   * Ghost accepts raw HTML in the html field - no conversion needed.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const ghostConfig = config as IGhostConfig;
    const ghostCreds = credentials as IGhostCredentials;
    const { article } = context;

    try {
      // Validate required fields
      if (!article.title || article.content === undefined || article.content === null) {
        return {
          success: false,
          error: 'Article missing title or content',
        };
      }

      // Convert markdown to HTML (Ghost expects HTML)
      // Ghost Admin API accepts HTML directly in the `html` field
      const htmlContent = await this.convertMarkdownToHtmlAsync(article.content);

      // Build tags from article keywords/categories if available
      const tags = this.buildTags(article);

      // Build Ghost post payload
      // Reference: https://ghost.org/docs/admin-api/#creating-a-post
      const postPayload = {
        posts: [
          {
            title: article.title,
            html: htmlContent,
            // Use meta_description as excerpt
            excerpt: article.meta_description || undefined,
            // Use article slug if available
            slug: article.slug || undefined,
            // Publish as draft by default (user can publish later in Ghost)
            status: 'draft',
            // Add featured image if available
            feature_image: this.getFeatureImage(article),
            // Tags for categorization
            tags: tags.length > 0 ? tags : undefined,
          },
        ],
      };

      // Create post via Ghost Admin API
      const response = await this.fetchGhost<IGhostPostResponse>(
        ghostConfig.site_url,
        ghostCreds.adminApiKey,
        GhostAdapter.API_POSTS_PATH,
        {
          method: 'POST',
          body: JSON.stringify(postPayload),
        }
      );

      const post = response.posts?.[0];
      if (!post) {
        return {
          success: false,
          error: 'Ghost API returned no post data',
        };
      }

      return this.createPublishSuccess(post.id, post.url);
    } catch (error) {
      return this.createPublishError(error);
    }
  }

  /**
   * Convert markdown to HTML asynchronously
   * Ghost adapter needs async version for compatibility
   */
  private async convertMarkdownToHtmlAsync(markdown: string): Promise<string> {
    if (!markdown) return '';

    // Dynamic import to avoid issues in test environments
    // eslint-disable-next-line no-restricted-syntax -- Dynamic imports required for avoiding test environment issues
    const { marked } = await import('marked');
    const result = marked(markdown);
    return typeof result === 'string' ? result : await result;
  }

  /**
   * Build Ghost tags from article metadata
   */
  private buildTags(article: IPublishContext['article']): Array<{ name: string }> {
    const tags: Array<{ name: string }> = [];

    // Add primary keyword as a tag if available
    if (article.primary_keyword) {
      tags.push({ name: article.primary_keyword });
    }

    return tags;
  }

  /**
   * Get feature image URL from article
   */
  private getFeatureImage(article: IPublishContext['article']): string | undefined {
    // Check for article images in the extended article data
    const articleWithImages = article as unknown as {
      article_images?: Array<{ position: number; image_url: string; status: string }>;
    };

    // Get the first completed image as feature image
    const featureImage = articleWithImages.article_images?.find(
      img => img.image_url && img.status === 'completed'
    );

    return featureImage?.image_url;
  }
}

/**
 * Singleton instance of Ghost adapter
 */
export const ghostAdapter = new GhostAdapter();
