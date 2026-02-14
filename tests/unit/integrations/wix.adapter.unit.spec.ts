/**
 * Unit tests for Wix Adapter
 *
 * Tests for Wix Blog REST API adapter including:
 * - Markdown to HTML conversion
 * - testConnection() method
 * - publish() method
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global fetch BEFORE importing the adapter
const mockFetch = (global.fetch = vi.fn());

import { WixAdapter } from '@server/integrations/wix.adapter';
import type { IWixConfig, IWixCredentials } from '@shared/types/integration.types';
import type { IPublishContext } from '@server/integrations/adapter.interface';

describe('WixAdapter', () => {
  let adapter: WixAdapter;

  beforeEach(() => {
    adapter = new WixAdapter();
    mockFetch.mockClear();
  });

  const mockConfig: IWixConfig = {
    site_id: 'test-site-id-123',
  };

  const mockCredentials: IWixCredentials = {
    apiKey: 'test-api-key-456',
    accountId: 'test-account-id-789',
  };

  const mockPublishContext: IPublishContext = {
    article: {
      id: 'article-123',
      title: 'Test Article',
      content: '# Test Content\n\nThis is a **test** article.',
      slug: 'test-article',
      meta_description: 'A test article for unit testing',
      primary_keyword: 'test',
      word_count: 100,
      seo_score: 85,
      created_at: '2024-01-01T00:00:00Z',
      campaign_id: null,
      user_id: 'user-123',
      project_id: null,
      status: 'draft',
      ai_model_used: null,
      ai_detection_score: null,
      credits_used: 0,
      generation_error: null,
      rejection_reason: null,
      outline: null,
      token_count: null,
      generation_time_ms: null,
      generated_at: null,
      published_at: null,
      published_url: null,
      updated_at: '2024-01-01T00:00:00Z',
      image_preset: null,
      image_count: 0,
      last_attempt_at: null,
      attempt_count: 0,
      topic_fingerprint: null,
      similarity_score: null,
      similar_to_article_id: null,
      qa_results: null,
    },
    campaign: null,
    project: null,
  };

  describe('type property', () => {
    it('should have type "wix"', () => {
      expect(adapter.type).toBe('wix');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [], metadata: { total: 0 } }),
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(callArgs[0]).toContain('wixapis.com/blog/v3/posts');
      expect(callArgs[1]?.headers).toHaveProperty('Authorization');
      expect(callArgs[1]?.headers).toHaveProperty('wix-account-id');
    });

    it('should include correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [], metadata: { total: 0 } }),
      });

      await adapter.testConnection(mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const headers = callArgs[1]?.headers as Record<string, string>;

      expect(headers?.Authorization).toBe('test-api-key-456');
      expect(headers?.['wix-account-id']).toBe('test-account-id-789');
      expect(headers?.['Content-Type']).toBe('application/json');
    });

    it('should return error when site_id is missing', async () => {
      const invalidConfig = {} as IWixConfig;

      const result = await adapter.testConnection(invalidConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing site_id');
    });

    it('should return error when apiKey is missing', async () => {
      const invalidCredentials = { accountId: 'test-account' } as IWixCredentials;

      const result = await adapter.testConnection(mockConfig, invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing apiKey or accountId');
    });

    it('should return error when accountId is missing', async () => {
      const invalidCredentials = { apiKey: 'test-key' } as IWixCredentials;

      const result = await adapter.testConnection(mockConfig, invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing apiKey or accountId');
    });

    it('should return error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should return error on Wix API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Invalid API key',
          details: {
            applicationError: {
              code: 'UNAUTHORIZED',
              description: 'The API key is invalid',
            },
          },
        }),
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
      expect(result.error).toContain('The API key is invalid');
    });
  });

  describe('publish', () => {
    it('should create blog post', async () => {
      const mockResponse = {
        post: {
          id: 'wix-post-123',
          slug: 'test-article',
          url: {
            base: 'https://mysite.wixsite.com/blog',
            path: 'test-article',
          },
          status: 'UNPUBLISHED',
          title: 'Test Article',
          content: '<h1>Test Content</h1>',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('wix-post-123');
      expect(result.externalUrl).toBe('https://mysite.wixsite.com/blog/test-article');
    });

    it('should convert markdown to HTML in content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.content).toContain('<h1>Test Content</h1>');
      expect(body.post.content).toContain('<strong>test</strong>');
      expect(body.post.content).not.toContain('# Test Content');
    });

    it('should include article slug in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.slug).toBe('test-article');
    });

    it('should use meta_description as excerpt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.excerpt).toBe('A test article for unit testing');
    });

    it('should publish as UNPUBLISHED status (draft)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.status).toBe('UNPUBLISHED');
    });

    it('should generate slug from title when slug is missing', async () => {
      const contextWithoutSlug = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          slug: null,
          title: 'My Test Article!',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'my-test-article', url: { base: 'https://test.com', path: 'my-test-article' } },
        }),
      });

      await adapter.publish(contextWithoutSlug, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.slug).toBe('my-test-article');
    });

    it('should return error when article missing title', async () => {
      const invalidArticle = {
        ...mockPublishContext,
        article: { ...mockPublishContext.article, title: null },
      };

      const result = await adapter.publish(invalidArticle, mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Article missing title or content');
    });

    it('should return error when article missing content', async () => {
      const invalidArticle = {
        ...mockPublishContext,
        article: { ...mockPublishContext.article, content: null },
      };

      const result = await adapter.publish(invalidArticle, mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Article missing title or content');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Internal server error',
        }),
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle posts without URL', async () => {
      const mockResponse = {
        post: {
          id: 'wix-post-123',
          slug: 'test-article',
          url: {},
          status: 'UNPUBLISHED',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('wix-post-123');
      expect(result.externalUrl).toBeUndefined();
    });
  });

  describe('markdown to HTML conversion', () => {
    it('should convert markdown headings to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: '# Heading 1\n\n## Heading 2\n\n### Heading 3',
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.content).toContain('<h1>Heading 1</h1>');
      expect(body.post.content).toContain('<h2>Heading 2</h2>');
      expect(body.post.content).toContain('<h3>Heading 3</h3>');
    });

    it('should convert markdown bold and italic to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: 'This is **bold** and *italic* and ***both***.',
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.content).toContain('<strong>bold</strong>');
      expect(body.post.content).toContain('<em>italic</em>');
    });

    it('should convert markdown links to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: '[Link text](https://example.com)',
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.post.content).toContain('<a href="https://example.com">Link text</a>');
    });

    it('should handle empty markdown content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: { id: '1', slug: 'test', url: { base: 'https://test.com', path: 'test' } },
        }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: '',
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(callArgs).toBeDefined();
      expect(callArgs[0]).toContain('wixapis.com');

      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.post.content).toBe('');
    });
  });
});
