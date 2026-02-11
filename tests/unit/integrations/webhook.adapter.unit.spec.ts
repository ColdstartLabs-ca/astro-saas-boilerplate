/**
 * Unit tests for Webhook Adapter
 *
 * Tests for webhook adapter including:
 * - HMAC signature generation
 * - testConnection() method
 * - publish() method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global fetch BEFORE importing the adapter
const mockFetch = (global.fetch = vi.fn());

import { WebhookAdapter } from '@server/integrations/webhook.adapter';
import type { IWebhookConfig, IWebhookCredentials } from '@shared/types/integration.types';
import type { IPublishContext } from '@server/integrations/adapter.interface';

describe('WebhookAdapter', () => {
  let adapter: WebhookAdapter;

  beforeEach(() => {
    adapter = new WebhookAdapter();
    mockFetch.mockClear();
  });

  const mockConfig: IWebhookConfig = {
    url: 'https://example.com/webhook',
  };

  const mockCredentials: IWebhookCredentials = {
    secret: 'webhook-secret-key',
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
    campaign: {
      id: 'campaign-123',
      name: 'Test Campaign',
      user_id: 'user-123',
      project_id: null,
      status: 'active',
      ai_model: 'gpt-4',
      tone: 'professional',
      target_word_count: 1500,
      settings: {},
      image_preset: null,
      generation_run_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    project: {
      id: 'project-123',
      name: 'Test Project',
      domain: 'example.com',
      user_id: 'user-123',
      industry: null,
      cms_type: 'wordpress',
      cms_credentials: {},
      content_preferences: {},
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  };

  describe('type property', () => {
    it('should have type "webhook"', () => {
      expect(adapter.type).toBe('webhook');
    });
  });

  describe('testConnection', () => {
    it('should return success when webhook is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should include HMAC signature header when secret is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.testConnection(mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(callArgs[1]?.headers).toHaveProperty('X-Signature-256');

      const signatureHeader = callArgs[1]?.headers?.['X-Signature-256'];
      expect(signatureHeader).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should not include signature header when secret is not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const result = await adapter.testConnection(mockConfig, {});

      expect(result.success).toBe(true);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(callArgs[1]?.headers?.['X-Signature-256']).toBeUndefined();
    });

    it('should return error when url is missing', async () => {
      const invalidConfig = {} as IWebhookConfig;

      const result = await adapter.testConnection(invalidConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing url');
    });

    it('should return error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should return error on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const result = await adapter.testConnection(mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });
  });

  describe('publish', () => {
    it('should publish article successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'Success',
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('200');
    });

    it('should include full article payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.event).toBe('article.published');
      expect(payload.article.id).toBe('article-123');
      expect(payload.article.title).toBe('Test Article');
      expect(payload.article.content).toBe('# Test Content\n\nThis is a **test** article.');
      expect(payload.article.slug).toBe('test-article');
      expect(payload.article.meta_description).toBe('A test article for unit testing');
      expect(payload.article.primary_keyword).toBe('test');
      expect(payload.article.word_count).toBe(100);
      expect(payload.article.seo_score).toBe(85);
    });

    it('should include campaign data in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.campaign).not.toBeNull();
      expect(payload.campaign?.id).toBe('campaign-123');
      expect(payload.campaign?.name).toBe('Test Campaign');
    });

    it('should include project data in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.project).not.toBeNull();
      expect(payload.project?.id).toBe('project-123');
      expect(payload.project?.name).toBe('Test Project');
      expect(payload.project?.domain).toBe('example.com');
    });

    it('should include HTML content in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.article.content_html).toContain('<h1>Test Content</h1>');
      expect(payload.article.content_html).toContain('<strong>test</strong>');
    });

    it('should include timestamp in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });

    it('should include HMAC signature in header when secret is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(callArgs[1]?.headers?.['X-Signature-256']).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should return error when article content is missing', async () => {
      const invalidContext = {
        ...mockPublishContext,
        article: { ...mockPublishContext.article, content: null },
      };

      const result = await adapter.publish(invalidContext, mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing content');
    });

    it('should handle webhook error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle missing campaign', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const contextWithoutCampaign = {
        ...mockPublishContext,
        campaign: null,
      };

      await adapter.publish(contextWithoutCampaign, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.campaign).toBeNull();
    });

    it('should handle missing project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const contextWithoutProject = {
        ...mockPublishContext,
        project: null,
      };

      await adapter.publish(contextWithoutProject, mockConfig, mockCredentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(callArgs[1]?.body as string);

      expect(payload.project).toBeNull();
    });
  });

  describe('HMAC signature generation', () => {
    it('should generate valid HMAC-SHA256 signature', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const secret = 'test-secret-key';
      const config = mockConfig;
      const credentials = { secret };

      await adapter.publish(mockPublishContext, config, credentials);

      const callArgs = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const signatureHeader = callArgs[1]?.headers?.['X-Signature-256'];

      expect(signatureHeader).toBeDefined();
      expect(signatureHeader).toMatch(/^sha256=[a-f0-9]{64}$/);

      // Signature should be deterministic for same payload and secret
      const payloadString = callArgs[1]?.body as string;
      const payloadBuffer = new TextEncoder().encode(payloadString);
      const keyBuffer = new TextEncoder().encode(secret);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadBuffer);
      const expectedSignature = `sha256=${Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      expect(signatureHeader).toBe(expectedSignature);
    });

    it('should produce different signatures for different payloads', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'OK',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => 'OK',
        });

      await adapter.publish(mockPublishContext, mockConfig, mockCredentials);

      const contextWithDifferentTitle = {
        ...mockPublishContext,
        article: {
          ...mockPublishContext.article,
          title: 'Different Title',
        },
      };

      await adapter.publish(contextWithDifferentTitle, mockConfig, mockCredentials);

      const signature1 = (mockFetch.mock.calls[0] as unknown as [string, RequestInit])[1]
        ?.headers?.['X-Signature-256'];
      const signature2 = (mockFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
        ?.headers?.['X-Signature-256'];

      expect(signature1).not.toBe(signature2);
    });
  });
});
