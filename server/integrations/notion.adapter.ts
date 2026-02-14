/**
 * Notion API Adapter
 *
 * Handles publishing articles as Notion pages in a selected database.
 * Uses Internal Integration Token approach (user creates integration in Notion settings).
 *
 * API Reference: https://developers.notion.com/reference/intro
 */

import { marked } from 'marked';
import type {
  ICMSAdapter,
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from './adapter.interface';
import type {
  INotionConfig,
  INotionCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';
import { htmlToNotionBlocks, type INotionBlock } from './notion-blocks';

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
 * Notion API user response
 */
interface INotionUser {
  object: 'user';
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: string;
  bot: {
    owner: {
      type: string;
      workspace: boolean;
    };
  };
}

/**
 * Notion API error response
 */
interface INotionErrorResponse {
  code: string;
  message: string;
}

/**
 * Notion API page response
 */
interface INotionPageResponse {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  public_url: string | null;
  parent: {
    type: string;
    database_id?: string;
  };
  properties: Record<string, unknown>;
}

/**
 * Notion API database response
 */
interface INotionDatabaseResponse {
  object: 'database';
  id: string;
  title: Array<{ plain_text: string }>;
  properties: Record<string, { type: string }>;
}

/**
 * Rate limit queue item
 */
interface IRateLimitQueueItem {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Notion API Adapter
 *
 * Publishes articles as pages in a Notion database.
 * Converts markdown content to Notion blocks before sending.
 *
 * Rate limits: 3 requests per second
 */
export class NotionAdapter implements ICMSAdapter {
  readonly type = 'notion' as const;

  /**
   * Notion API base URL
   */
  private static readonly API_BASE = 'https://api.notion.com/v1';

  /**
   * Notion API version
   */
  private static readonly NOTION_VERSION = '2022-06-28';

  /**
   * HTTP timeout in milliseconds
   */
  private static readonly TIMEOUT_MS = 30000;

  /**
   * Rate limit: minimum time between requests (ms)
   * Notion limit is 3 req/sec, so ~333ms between requests
   */
  private static readonly RATE_LIMIT_MS = 350;

  /**
   * Rate limit queue and processing state
   */
  private static rateLimitQueue: IRateLimitQueueItem[] = [];
  private static isProcessingQueue = false;
  private static lastRequestTime = 0;

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
   * Build Authorization header for Notion API
   */
  private buildAuthHeader(integrationToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${integrationToken}`,
      'Notion-Version': NotionAdapter.NOTION_VERSION,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Process rate limit queue
   * Ensures requests are spaced at least RATE_LIMIT_MS apart
   */
  private static async processQueue(): Promise<void> {
    if (NotionAdapter.isProcessingQueue) return;
    NotionAdapter.isProcessingQueue = true;

    while (NotionAdapter.rateLimitQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - NotionAdapter.lastRequestTime;
      const waitTime = Math.max(0, NotionAdapter.RATE_LIMIT_MS - timeSinceLastRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const item = NotionAdapter.rateLimitQueue.shift();
      if (item) {
        NotionAdapter.lastRequestTime = Date.now();
        try {
          const result = await item.execute();
          item.resolve(result);
        } catch (error) {
          item.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    NotionAdapter.isProcessingQueue = false;
  }

  /**
   * Queue a rate-limited request
   */
  private queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      NotionAdapter.rateLimitQueue.push({
        execute: execute as () => Promise<unknown>,
        resolve: value => resolve(value as T),
        reject,
      });
      NotionAdapter.processQueue();
    });
  }

  /**
   * Make an authenticated request to Notion API with rate limiting
   */
  private async fetchNotion<T>(
    integrationToken: string,
    endpoint: string,
    options?: IRequestInit
  ): Promise<T> {
    return this.queueRequest(async () => {
      const url = `${NotionAdapter.API_BASE}${endpoint}`;
      const headers = this.buildAuthHeader(integrationToken);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NotionAdapter.TIMEOUT_MS);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchOptions: any = {
          ...options,
          headers: {
            ...headers,
            ...options?.headers,
          },
          signal: controller.signal,
        };

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as INotionErrorResponse;
          throw new Error(
            `Notion API error (${response.status}): ${errorData.message || response.statusText}`
          );
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  /**
   * Test connection to Notion API
   *
   * Verifies the integration token by fetching the bot user info
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const notionConfig = config as INotionConfig;
    const notionCreds = credentials as INotionCredentials;

    try {
      // Validate credentials
      if (!notionCreds.integrationToken) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing integrationToken',
        };
      }

      // Validate config if database_id is provided
      if (notionConfig.database_id) {
        // Test database access
        const database = await this.fetchNotion<INotionDatabaseResponse>(
          notionCreds.integrationToken,
          `/databases/${notionConfig.database_id}`
        );

        // Check if database has a title property
        const hasTitleProperty = Object.values(database.properties).some(
          prop => prop.type === 'title'
        );

        if (!hasTitleProperty) {
          return {
            success: false,
            timestamp: new Date().toISOString(),
            error: 'Database does not have a Title property. Please select a database with a Title property.',
          };
        }
      } else {
        // Just verify the token works
        await this.fetchNotion<INotionUser>(
          notionCreds.integrationToken,
          '/users/me'
        );
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
   * Publish article to Notion database
   *
   * Creates a new page in the configured database with the article content.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const notionConfig = config as INotionConfig;
    const notionCreds = credentials as INotionCredentials;
    const { article } = context;

    try {
      // Validate required fields
      if (!article.title) {
        return {
          success: false,
          error: 'Article missing title',
        };
      }

      if (!article.content) {
        return {
          success: false,
          error: 'Article missing content',
        };
      }

      if (!notionConfig.database_id) {
        return {
          success: false,
          error: 'Integration missing database_id configuration',
        };
      }

      // Convert markdown to HTML, then to Notion blocks
      const htmlContent = this.markdownToHtml(article.content);
      const blocks = htmlToNotionBlocks(htmlContent);

      // Split blocks into chunks of 100 (Notion API limit)
      const BLOCK_CHUNK_SIZE = 100;
      const blockChunks: INotionBlock[][] = [];
      for (let i = 0; i < blocks.length; i += BLOCK_CHUNK_SIZE) {
        blockChunks.push(blocks.slice(i, i + BLOCK_CHUNK_SIZE));
      }

      // Create page payload
      const pagePayload = {
        parent: {
          type: 'database_id',
          database_id: notionConfig.database_id,
        },
        properties: {
          // Title is required - use the database's title property name
          // We'll use 'Name' as the default, but Notion databases can have different names
          // The actual property name needs to match the database schema
          Title: {
            title: [
              {
                type: 'text',
                text: {
                  content: article.title,
                },
              },
            ],
          },
        },
        // Add first chunk of blocks during page creation
        children: blockChunks.length > 0 ? blockChunks[0] : undefined,
      };

      // Create page via Notion API
      const response = await this.fetchNotion<INotionPageResponse>(
        notionCreds.integrationToken,
        '/pages',
        {
          method: 'POST',
          body: JSON.stringify(pagePayload),
        }
      );

      const pageId = response.id;
      const pageUrl = response.url;

      // Append remaining block chunks if any
      for (let i = 1; i < blockChunks.length; i++) {
        await this.appendBlocks(
          notionCreds.integrationToken,
          pageId,
          blockChunks[i]
        );
      }

      return {
        success: true,
        externalId: pageId,
        externalUrl: pageUrl,
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
   * Append blocks to an existing page
   */
  private async appendBlocks(
    integrationToken: string,
    pageId: string,
    blocks: INotionBlock[]
  ): Promise<void> {
    await this.fetchNotion(
      integrationToken,
      `/blocks/${pageId}/children`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          children: blocks,
        }),
      }
    );
  }

  /**
   * List databases accessible to the integration
   * Useful for setup flow where user selects target database
   */
  async listDatabases(integrationToken: string): Promise<Array<{ id: string; title: string }>> {
    const response = await this.fetchNotion<{
      results: Array<{
        object: 'database';
        id: string;
        title: Array<{ plain_text: string }>;
      }>;
      has_more: boolean;
      next_cursor: string | null;
    }>(
      integrationToken,
      '/search?filter={"property":"object","value":"database"}'
    );

    return response.results.map(db => ({
      id: db.id,
      title: db.title.map(t => t.plain_text).join('') || 'Untitled',
    }));
  }

  /**
   * Get database info including properties
   * Useful for validating database has required fields
   */
  async getDatabaseInfo(
    integrationToken: string,
    databaseId: string
  ): Promise<{ id: string; title: string; properties: Record<string, { type: string }> }> {
    const response = await this.fetchNotion<INotionDatabaseResponse>(
      integrationToken,
      `/databases/${databaseId}`
    );

    return {
      id: response.id,
      title: response.title.map(t => t.plain_text).join('') || 'Untitled',
      properties: response.properties,
    };
  }
}

/**
 * Singleton instance of Notion adapter
 */
export const notionAdapter = new NotionAdapter();
