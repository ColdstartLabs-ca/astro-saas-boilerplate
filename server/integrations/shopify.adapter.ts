/**
 * Shopify GraphQL API Adapter
 *
 * Handles publishing articles to Shopify blogs via the Admin GraphQL API.
 * Uses Custom App access tokens for authentication.
 *
 * API Reference: https://shopify.dev/docs/api/admin-graphql
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
  IShopifyConfig,
  IShopifyCredentials,
  IIntegrationConfig,
  IIntegrationCredentials,
} from '@shared/types/integration.types';

/**
 * Shopify GraphQL API response for shop query
 */
interface IShopifyShopResponse {
  data?: {
    shop?: {
      name: string;
      url: string;
    };
  };
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

/**
 * Shopify GraphQL API response for blogs query
 */
interface IShopifyBlogsResponse {
  data?: {
    blogs?: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
        };
      }>;
    };
  };
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

/**
 * Shopify GraphQL API response for articleCreate mutation
 */
interface IShopifyArticleCreateResponse {
  data?: {
    articleCreate?: {
      article?: {
        id: string;
        title: string;
        handle: string;
        onlineStoreUrl?: string;
      };
      userErrors?: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

/**
 * Shopify GraphQL API Adapter
 *
 * Publishes articles as blog posts to Shopify stores.
 * Converts markdown content to HTML before sending.
 */
export class ShopifyAdapter implements ICMSAdapter {
  readonly type = 'shopify' as const;

  /**
   * GraphQL endpoint path (appended to store URL)
   */
  private static readonly GRAPHQL_PATH = '/admin/api/2024-01/graphql.json';

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
   * Normalize store URL to remove trailing slash and ensure HTTPS
   */
  private normalizeStoreUrl(storeUrl: string): string {
    let url = storeUrl.trim();
    // Remove trailing slash
    url = url.replace(/\/+$/, '');
    // Ensure HTTPS
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = `https://${url}`;
    }
    return url;
  }

  /**
   * Build the GraphQL API URL for a Shopify store
   */
  private getGraphqlUrl(storeUrl: string): string {
    const normalizedUrl = this.normalizeStoreUrl(storeUrl);
    return `${normalizedUrl}${ShopifyAdapter.GRAPHQL_PATH}`;
  }

  /**
   * Make a GraphQL request to Shopify Admin API
   */
  private async fetchGraphQL<T>(
    storeUrl: string,
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const url = this.getGraphqlUrl(storeUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ShopifyAdapter.TIMEOUT_MS);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Shopify API error (${response.status}): ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Extract error message from GraphQL response
   */
  private extractGraphQLError(
    response: IShopifyShopResponse | IShopifyBlogsResponse | IShopifyArticleCreateResponse
  ): string {
    if (response.errors && response.errors.length > 0) {
      return response.errors.map(e => e.message).join('; ');
    }
    return 'Unknown GraphQL error';
  }

  /**
   * Get the list of blogs from the Shopify store
   */
  async listBlogs(
    config: IShopifyConfig,
    credentials: IShopifyCredentials
  ): Promise<Array<{ id: string; title: string; handle: string }>> {
    const query = `
      query {
        blogs(first: 10) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const response = await this.fetchGraphQL<IShopifyBlogsResponse>(
      config.store_url,
      credentials.accessToken,
      query
    );

    if (response.errors || !response.data?.blogs) {
      throw new Error(this.extractGraphQLError(response));
    }

    return response.data.blogs.edges.map(edge => edge.node);
  }

  /**
   * Test connection to Shopify store
   *
   * Queries shop details to verify credentials are valid
   */
  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    const shopifyConfig = config as IShopifyConfig;
    const shopifyCreds = credentials as IShopifyCredentials;

    try {
      // Validate config
      if (!shopifyConfig.store_url) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid configuration: missing store_url',
        };
      }

      // Validate credentials
      if (!shopifyCreds.accessToken) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Invalid credentials: missing accessToken',
        };
      }

      // Query shop details to verify credentials
      const query = `
        query {
          shop {
            name
            url
          }
        }
      `;

      const response = await this.fetchGraphQL<IShopifyShopResponse>(
        shopifyConfig.store_url,
        shopifyCreds.accessToken,
        query
      );

      if (response.errors || !response.data?.shop) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Shopify API error: ${this.extractGraphQLError(response)}`,
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
   * Get the default blog ID (first blog in the store)
   */
  private async getDefaultBlogId(
    config: IShopifyConfig,
    credentials: IShopifyCredentials
  ): Promise<string | undefined> {
    try {
      const blogs = await this.listBlogs(config, credentials);
      return blogs.length > 0 ? blogs[0].id : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Publish article to Shopify
   *
   * Creates a new blog article via Shopify GraphQL API.
   * Converts markdown content to HTML before sending.
   */
  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    const shopifyConfig = config as IShopifyConfig;
    const shopifyCreds = credentials as IShopifyCredentials;
    const { article } = context;

    try {
      // Validate required fields
      if (!article.title || !article.content) {
        return {
          success: false,
          error: 'Article missing title or content',
        };
      }

      // Get blog ID (use configured one or default to first blog)
      let blogId = shopifyConfig.blog_id;
      if (!blogId) {
        blogId = await this.getDefaultBlogId(shopifyConfig, shopifyCreds);
        if (!blogId) {
          return {
            success: false,
            error: 'No blog found in Shopify store. Please create a blog first.',
          };
        }
      }

      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(article.content);

      // Build article input for mutation
      const articleInput = {
        title: article.title,
        bodyHtml: htmlContent,
        handle: article.slug || undefined,
        summary: article.meta_description || undefined,
        // Tags would be included if available in article
        tags: article.primary_keyword ? [article.primary_keyword] : undefined,
        // Published status - set to false (draft) so user can review
        isPublished: false,
      };

      // GraphQL mutation for creating an article
      const mutation = `
        mutation articleCreate($article: ArticleCreateInput!, $blogId: ID!) {
          articleCreate(article: $article, blogId: $blogId) {
            article {
              id
              title
              handle
              onlineStoreUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await this.fetchGraphQL<IShopifyArticleCreateResponse>(
        shopifyConfig.store_url,
        shopifyCreds.accessToken,
        mutation,
        {
          article: articleInput,
          blogId: blogId,
        }
      );

      // Check for errors
      if (response.errors) {
        return {
          success: false,
          error: `Shopify API error: ${this.extractGraphQLError(response)}`,
        };
      }

      const articleCreate = response.data?.articleCreate;
      if (!articleCreate) {
        return {
          success: false,
          error: 'Unexpected response from Shopify: missing articleCreate data',
        };
      }

      // Check for user errors
      if (articleCreate.userErrors && articleCreate.userErrors.length > 0) {
        const errorMessages = articleCreate.userErrors.map(e => `${e.field.join('.')}: ${e.message}`).join('; ');
        return {
          success: false,
          error: `Shopify validation error: ${errorMessages}`,
        };
      }

      // Check for successful article creation
      if (!articleCreate.article) {
        return {
          success: false,
          error: 'Failed to create article: no article returned',
        };
      }

      const createdArticle = articleCreate.article;

      // Build the article URL
      // Shopify returns onlineStoreUrl if the article is published, otherwise we construct it
      let articleUrl = createdArticle.onlineStoreUrl;
      if (!articleUrl) {
        // Construct URL from store URL and blog handle
        const storeUrl = this.normalizeStoreUrl(shopifyConfig.store_url);
        articleUrl = `${storeUrl}/admin/blogs/${blogId}/articles/${createdArticle.id}`;
      }

      return {
        success: true,
        externalId: createdArticle.id,
        externalUrl: articleUrl,
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
 * Singleton instance of Shopify adapter
 */
export const shopifyAdapter = new ShopifyAdapter();
