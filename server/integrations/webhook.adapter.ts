/**
 * Webhook Adapter
 *
 * Handles delivering article notifications to external webhook URLs.
 * Sends full article JSON payload with optional HMAC-SHA256 signature.
 */

import { marked } from 'marked';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';
import type {
  IWebhookConfig,
  IWebhookCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * Webhook payload structure
 * Matches the format specified in the PRD
 */
interface IWebhookPayload {
  event: 'article.published';
  test: boolean;
  timestamp: string;
  article: {
    id: string;
    title: string | null;
    content: string;
    content_html: string;
    slug: string | null;
    meta_description: string | null;
    primary_keyword: string;
    word_count: number | null;
    seo_score: number | null;
    images: Array<{ position: number; url: string }>;
  };
  campaign: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
    domain: string | null;
  } | null;
}

/**
 * Webhook Adapter
 *
 * Delivers article publication events to external webhook URLs.
 * Optionally signs payloads with HMAC-SHA256 for verification.
 */
export class WebhookAdapter implements ICMSAdapter {
  readonly type = 'webhook' as const;

  /**
   * HTTP timeout in milliseconds
   */
  private static readonly TIMEOUT_MS = 30000;

  /**
   * Signature header name
   */
  private static readonly SIGNATURE_HEADER = 'X-Signature-256';

  /**
   * Convert markdown to HTML
   */
  private markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    const result = marked(markdown);
    return typeof result === 'string' ? result : String(result);
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   *
   * @param payload - JSON string to sign
   * @param secret - Secret key for HMAC
   * @returns Hex-encoded signature with "sha256=" prefix
   */
  private async generateSignature(payload: string, secret: string): Promise<string> {
    if (!secret) return '';

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    // Import the secret key for HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw', // key format
      keyData, // key data
      { name: 'HMAC', hash: 'SHA-256' }, // algorithm
      false, // extractable
      ['sign'] // key usages
    );

    // Generate signature
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);

    // Convert to hex string with sha256= prefix
    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `sha256=${hexSignature}`;
  }

  /**
   * Deliver payload to webhook URL
   */
  private async deliverWebhook(
    url: string,
    payload: IWebhookPayload,
    secret?: string
  ): Promise<Response> {
    const payloadString = JSON.stringify(payload);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AutopilotRank-Webhook/1.0',
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = await this.generateSignature(payloadString, secret);
      headers[WebhookAdapter.SIGNATURE_HEADER] = signature;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WebhookAdapter.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test connection to webhook endpoint
   *
   * Sends a minimal test payload to verify the endpoint is accessible
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const webhookConfig = config as IWebhookConfig;
    const webhookCreds = credentials as IWebhookCredentials;

    try {
      // Validate config
      if (!webhookConfig.url) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing url',
        };
      }

      // Send test payload
      const testPayload: IWebhookPayload = {
        event: 'article.published',
        test: true,
        timestamp: new Date().toISOString(),
        article: {
          id: 'test-00000000-0000-0000-0000-000000000000',
          title: 'Test Article',
          content: '# Test Content\n\nThis is a test webhook delivery.',
          content_html: '<h1>Test Content</h1>\n<p>This is a test webhook delivery.</p>',
          slug: 'test-article',
          meta_description: 'Test webhook delivery',
          primary_keyword: 'test',
          word_count: 10,
          seo_score: 100,
          images: [],
        },
        campaign: null,
        project: null,
      };

      const response = await this.deliverWebhook(
        webhookConfig.url,
        testPayload,
        webhookCreds.secret || webhookConfig.secret
      );

      // Accept 2xx status codes as success
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Webhook endpoint returned status ${response.status}. Your endpoint should return a 2xx status code. Response: ${responseText.substring(0, 100)}`,
        };
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Enhance error messages for common issues
      if (
        message.includes('fetch failed') ||
        message.includes('ENOTFOUND') ||
        message.includes('ECONNREFUSED') ||
        message.includes('NetworkError')
      ) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error:
            'Unable to reach the webhook endpoint. Please verify the URL is correct and the server is accessible from the internet.',
        };
      }

      if (message.includes('abort') || message.includes('timeout')) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error:
            'The webhook endpoint took too long to respond (timeout after 30 seconds). Please check if the server is responding.',
        };
      }

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: message,
      };
    }
  }

  /**
   * Publish article to webhook
   *
   * Sends full article payload to webhook URL with optional signature
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const webhookConfig = config as IWebhookConfig;
    const webhookCreds = credentials as IWebhookCredentials;
    const { article, campaign, project } = context;

    try {
      // Validate required fields
      if (!article.content) {
        return {
          success: false,
          error: 'Article missing content',
        };
      }

      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(article.content);

      // Build webhook payload
      const payload: IWebhookPayload = {
        event: 'article.published',
        test: false,
        timestamp: new Date().toISOString(),
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          content_html: htmlContent,
          slug: article.slug,
          meta_description: article.meta_description,
          primary_keyword: article.primary_keyword,
          word_count: article.word_count,
          seo_score: article.seo_score,
          images:
            (
              article as unknown as {
                article_images?: Array<{ position: number; image_url: string; status: string }>;
              }
            ).article_images
              ?.filter(img => img.image_url && img.status === 'completed')
              .map(img => ({ position: img.position, url: img.image_url })) ?? [],
        },
        campaign: campaign
          ? {
              id: campaign.id,
              name: campaign.name,
            }
          : null,
        project: project
          ? {
              id: project.id,
              name: project.name,
              domain: project.domain,
            }
          : null,
      };

      // Deliver webhook
      const response = await this.deliverWebhook(
        webhookConfig.url,
        payload,
        webhookCreds.secret || webhookConfig.secret
      );

      // Accept 2xx status codes as success
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        return {
          success: false,
          error: `Webhook returned ${response.status}: ${responseText.substring(0, 200)}`,
        };
      }

      // Return success with response status as external ID
      return {
        success: true,
        externalId: String(response.status),
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
 * Singleton instance of Webhook adapter
 */
export const webhookAdapter = new WebhookAdapter();
