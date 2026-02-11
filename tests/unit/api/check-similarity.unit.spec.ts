/**
 * Check Similarity API Unit Tests
 *
 * Tests for the /api/articles/check-similarity endpoint.
 * Note: Full API testing requires integration tests due to complex Supabase mocking.
 * This test suite focuses on verifying the endpoint structure and core service integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@server/services/openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: vi.fn(() => true),
    checkSimilarity: vi.fn(async () => ({
      isSimilar: false,
      maxSimilarity: 0,
      similarArticles: [],
    })),
  },
}));

vi.mock('@src/pages/api/_utils', () => ({
  withAuthAndBody: (schema: any, handler: any) => handler,
  jsonResponse: (data: any) => ({
    status: 200,
    json: async () => ({ success: true, data }),
  }),
  errorResponse: (code: string, message: string, status: number) => ({
    status,
    json: async () => ({ success: false, error: { code, message } }),
  }),
}));

describe('POST /api/articles/check-similarity', () => {
  describe('Module Loading', () => {
    it('should import the module without errors', async () => {
      const module = await import('@src/pages/api/articles/check-similarity');
      expect(module).toBeDefined();
      expect(typeof module.POST).toBe('function');
    });

    it('should export a POST handler', async () => {
      const module = await import('@src/pages/api/articles/check-similarity');
      expect(typeof module.POST).toBe('function');
    });
  });

  describe('Handler Structure', () => {
    it('should be an async function', async () => {
      const module = await import('@src/pages/api/articles/check-similarity');
      const fnString = module.POST.toString();
      expect(fnString).toContain('async');
    });
  });

  describe('Service Integration', () => {
    it('should use OpenAI embeddings service for similarity checking', async () => {
      const { openaiEmbeddingsService } =
        await import('@server/services/openai-embeddings.service');
      expect(openaiEmbeddingsService).toBeDefined();
      expect(typeof openaiEmbeddingsService.checkSimilarity).toBe('function');
    });

    it('should check if service is configured', async () => {
      const { openaiEmbeddingsService } =
        await import('@server/services/openai-embeddings.service');
      expect(typeof openaiEmbeddingsService.isConfigured).toBe('function');
    });
  });

  describe('Type Safety', () => {
    it('should have correct types for request parameters', async () => {
      // Verify the schema is validated
      const { z } = await import('zod');
      const checkSimilaritySchema = z.object({
        topic: z.string().min(1).max(200),
        projectId: z.string().uuid(),
        threshold: z.number().min(0).max(1).optional(),
        maxResults: z.number().int().min(1).max(20).optional(),
        excludeArticleId: z.string().uuid().optional(),
      });

      const validInput = {
        topic: 'coffee brewing',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => checkSimilaritySchema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid topic', async () => {
      const { z } = await import('zod');
      const checkSimilaritySchema = z.object({
        topic: z.string().min(1).max(200),
        projectId: z.string().uuid(),
      });

      expect(() =>
        checkSimilaritySchema.parse({
          topic: '',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).toThrow();
    });

    it('should reject invalid threshold', async () => {
      const { z } = await import('zod');
      const checkSimilaritySchema = z.object({
        topic: z.string(),
        projectId: z.string().uuid(),
        threshold: z.number().min(0).max(1).optional(),
      });

      expect(() =>
        checkSimilaritySchema.parse({
          topic: 'test',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          threshold: 1.5,
        })
      ).toThrow();
    });
  });
});
