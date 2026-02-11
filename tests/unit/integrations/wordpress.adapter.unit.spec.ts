/**
 * Unit tests for WordPress Adapter
 *
 * Tests for WordPress REST API adapter including:
 * - Markdown to HTML conversion
 * - Basic Auth header generation
 * - testConnection() method
 * - publish() method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global fetch BEFORE importing the adapter
const mockFetch = (global.fetch = vi.fn());

import { WordPressAdapter } from '@server/integrations/wordpress.adapter';
import type { IWordPressConfig, IWordPressCredentials } from '@shared/types/integration.types';
import type { IPublishContext } from '@server/integrations/adapter.interface';

describe('WordPressAdapter', () => {
  let adapter: WordPressAdapter;

  beforeEach(() => {
    adapter = new WordPressAdapter();
    mockFetch.mockClear();
  });

  const mockConfig: IWordPressConfig = {
    site_url: 'https://example.com',
    username: 'admin',
  };

  const mockCredentials: IWordPressCredentials = {
    appPassword: 'abcd 1234 efgh 5678 ijkl 8900',
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
    it('should have type "wordpress"', () => {
      expect(adapter.type).toBe('wordpress');
    });
  });

  describe('testConnection', () => {
    it('should return success when credentials are valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(callArgs[0]).toContain('/wp-json/wp/v2/posts');
      expect(callArgs[1]?.headers).toHaveProperty('Authorization');
    });

    it('should use Basic Auth header with correct format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await adapter.testConnection(mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const authHeader = callArgs[1]?.headers?.Authorization;

      expect(authHeader).toMatch(/^Basic /);
      const base64Part = authHeader.replace('Basic ', '');
      expect(base64Part).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });

    it('should return error when site_url is missing', async () => {
      const invalidConfig = { username: 'admin' } as IWordPressConfig;

      const result = await adapter.testConnection(invalidConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing site_url');
    });

    it('should return error when credentials are missing', async () => {
      const invalidCredentials = {} as IWordPressCredentials;

      const result = await adapter.testConnection(mockConfig, invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing appPassword');
    });

    it('should return error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should return error on WordPress API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          code: 'rest_forbidden',
          message: 'Invalid credentials',
          data: { status: 401 },
        }),
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('publish', () => {
    it('should publish article successfully', async () => {
      const mockResponse = {
        id: 123,
        link: 'https://example.com/test-article',
        status: 'draft',
        slug: 'test-article',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('123');
      expect(result.externalUrl).toBe('https://example.com/test-article');
    });

    it('should convert markdown to HTML in content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.content).toContain('<h1>Test Content</h1>');
      expect(body.content).toContain('<strong>test</strong>');
      expect(body.content).not.toContain('# Test Content');
    });

    it('should include article slug in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.slug).toBe('test-article');
    });

    it('should use meta_description as excerpt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.excerpt).toBe('A test article for unit testing');
    });

    it('should publish as draft status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.status).toBe('draft');
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

    it('should handle WordPress API error during publish', async () => {
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
  });

  describe('markdown to HTML conversion', () => {
    it('should convert markdown headings to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
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

      expect(body.content).toContain('<h1>Heading 1</h1>');
      expect(body.content).toContain('<h2>Heading 2</h2>');
      expect(body.content).toContain('<h3>Heading 3</h3>');
    });

    it('should convert markdown bold and italic to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
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

      expect(body.content).toContain('<strong>bold</strong>');
      expect(body.content).toContain('<em>italic</em>');
    });

    it('should convert markdown links to HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
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

      expect(body.content).toContain('<a href="https://example.com">Link text</a>');
    });

    it('should handle empty markdown content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: '',
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      // When content is empty string, the adapter still processes it and makes fetch call
      // The markdownToHtml function handles empty string correctly
      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(callArgs).toBeDefined();
      expect(callArgs[0]).toContain('https://example.com');

      // Check body exists and has content
      expect(callArgs[1]).toBeDefined();
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.content).toBe('');
    });

    it('should handle markdown with soft line breaks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, link: 'https://example.com/test' }),
      });

      const context = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          content: 'Line 1  \nLine 2', // Two spaces + newline creates soft break
        },
      };

      await adapter.publish(context, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.content).toContain('<br');
    });
  });
});
