/**
 * Image Generation Service Unit Tests
 *
 * Tests for image generation orchestration service including:
 * - Image reuse via semantic similarity (new in image-semantic-reuse)
 * - Fresh generation via Replicate
 * - Graceful degradation when embedding fails
 * - Rate-limit delay handling (skipped for reused images)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IImageMarker } from '@shared/types/article.types';

// Hoist mock functions so they're available in vi.mock factories
const mockChatCompletionWithRetry = vi.fn();
const mockWithRetry = vi.fn();
const mockGenerateImage = vi.fn();
const mockIsConfigured = vi.fn(() => true);
const mockCreatePrediction = vi.fn();
const mockPollPrediction = vi.fn();
const mockEmbedBatch = vi.fn();
const mockFindSimilarImage = vi.fn();

// Mock dependencies with hoisted functions
vi.mock('@server/services/openrouter.service', () => ({
  OpenRouterService: class {
    chatCompletionWithRetry = mockChatCompletionWithRetry;
  },
}));

vi.mock('@server/services/replicate.service', () => ({
  getReplicateService: vi.fn(() => ({
    isConfigured: mockIsConfigured,
    createPrediction: mockCreatePrediction,
    pollPrediction: mockPollPrediction,
    generateImage: mockGenerateImage,
    withRetry: mockWithRetry,
  })),
}));

vi.mock('@server/services/embedding.service', () => ({
  EmbeddingService: class {
    embedBatch = mockEmbedBatch;
  },
  embeddingService: { embedBatch: mockEmbedBatch },
}));

vi.mock('@server/services/image-similarity.service', () => ({
  ImageSimilarityService: class {
    findSimilarImage = mockFindSimilarImage;
  },
  imageSimilarityService: { findSimilarImage: mockFindSimilarImage },
  SIMILARITY_THRESHOLD: 0.9,
}));

// Import after mocks are set up
const { imageGenerationService } = await import('@server/services/image-generation.service');

describe('ImageGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    // Default: no similar images found, embeddings return nulls
    mockFindSimilarImage.mockResolvedValue(null);
    mockEmbedBatch.mockResolvedValue([null]);
  });

  describe('generateImagesForArticle', () => {
    const mockMarkers: IImageMarker[] = [
      { position: 1, sectionContext: 'Introduction paragraph about coffee' },
      { position: 2, sectionContext: 'Best coffee makers section' },
    ];

    it('should return empty array for no markers', async () => {
      const result = await imageGenerationService.generateImagesForArticle([], 'budget', 'coffee');

      expect(result).toEqual([]);
    });

    it('should generate images sequentially with prompts when no similarity match', async () => {
      // Both embeddings return null → no similarity check → straight to Replicate
      mockEmbedBatch.mockResolvedValue([null, null]);
      mockFindSimilarImage.mockResolvedValue(null);

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["prompt for image 1", "prompt for image 2"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockGenerateImage.mockResolvedValueOnce('https://replicate.delivery/image1.jpg');
      mockGenerateImage.mockResolvedValueOnce('https://replicate.delivery/image2.jpg');

      const result = await imageGenerationService.generateImagesForArticle(
        mockMarkers,
        'budget',
        'coffee'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('completed');
      expect(result[0].imageUrl).toBe('https://replicate.delivery/image1.jpg');
      expect(result[1].imageUrl).toBe('https://replicate.delivery/image2.jpg');
      expect(result[0].wasReused).toBe(false);
      expect(result[1].wasReused).toBe(false);
    });

    it('reuses image when similarity match found — no Replicate call', async () => {
      const fakeEmbedding = new Array(1536).fill(0.5);
      mockEmbedBatch.mockResolvedValue([fakeEmbedding]);
      mockFindSimilarImage.mockResolvedValue({
        id: 'existing-image-id',
        imageUrl: 'https://stored.com/existing.webp',
        prompt: 'original prompt text',
        similarity: 0.95,
      });

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["prompt for image 1"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 50 },
        finishReason: 'stop',
      });

      const singleMarker: IImageMarker[] = [{ position: 1, sectionContext: 'Intro about SEO' }];

      const result = await imageGenerationService.generateImagesForArticle(
        singleMarker,
        'balanced',
        'seo tips'
      );

      expect(result).toHaveLength(1);
      expect(result[0].wasReused).toBe(true);
      expect(result[0].reusedFromImageId).toBe('existing-image-id');
      expect(result[0].imageUrl).toBe('https://stored.com/existing.webp');
      expect(result[0].status).toBe('completed');
      expect(result[0].promptEmbedding).toEqual(fakeEmbedding);

      // Replicate should NOT have been called
      expect(mockGenerateImage).not.toHaveBeenCalled();
    });

    it('falls back to Replicate when no similarity match', async () => {
      const fakeEmbedding = new Array(1536).fill(0.3);
      mockEmbedBatch.mockResolvedValue([fakeEmbedding]);
      mockFindSimilarImage.mockResolvedValue(null);

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["fresh image prompt"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 50 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => fn());
      mockGenerateImage.mockResolvedValue('https://replicate.delivery/fresh.jpg');

      const singleMarker: IImageMarker[] = [{ position: 1, sectionContext: 'Some section' }];

      const result = await imageGenerationService.generateImagesForArticle(
        singleMarker,
        'balanced',
        'keyword'
      );

      expect(result).toHaveLength(1);
      expect(result[0].wasReused).toBe(false);
      expect(result[0].reusedFromImageId).toBeNull();
      expect(result[0].imageUrl).toBe('https://replicate.delivery/fresh.jpg');
      expect(result[0].promptEmbedding).toEqual(fakeEmbedding);
      expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    });

    it('handles embed failure gracefully — falls through to Replicate (wasReused=false)', async () => {
      // Embedding returns null for all prompts → no similarity check → straight to Replicate
      mockEmbedBatch.mockResolvedValue([null, null]);
      mockFindSimilarImage.mockResolvedValue(null); // called with null, returns null immediately

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["p1", "p2"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => fn());
      mockGenerateImage.mockResolvedValue('https://replicate.delivery/img.jpg');

      const result = await imageGenerationService.generateImagesForArticle(
        mockMarkers,
        'budget',
        'coffee'
      );

      expect(result).toHaveLength(2);
      expect(result[0].wasReused).toBe(false);
      expect(result[1].wasReused).toBe(false);
      expect(result[0].promptEmbedding).toBeNull();
      expect(result[1].promptEmbedding).toBeNull();
      // Replicate was still called
      expect(mockGenerateImage).toHaveBeenCalledTimes(2);
    });

    it('skips rate-limit delay for reused images (only applies to Replicate calls)', async () => {
      // Two markers: first is reused, second is fresh
      mockEmbedBatch.mockResolvedValue([
        new Array(1536).fill(0.8), // first: has embedding → reused
        null, // second: no embedding → fresh Replicate call
      ]);

      mockFindSimilarImage
        .mockResolvedValueOnce({
          // first image: match found
          id: 'img-reuse-id',
          imageUrl: 'https://cdn.example.com/reused.webp',
          prompt: 'match prompt',
          similarity: 0.93,
        })
        .mockResolvedValueOnce(null); // second image: no match (called with null embedding)

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["p1", "p2"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 50 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => fn());
      mockGenerateImage.mockResolvedValue('https://replicate.delivery/second.jpg');

      const sleepSpy = vi
        .spyOn(imageGenerationService as any, 'sleep')
        .mockResolvedValue(undefined);

      const result = await imageGenerationService.generateImagesForArticle(
        mockMarkers,
        'balanced',
        'seo'
      );

      expect(result).toHaveLength(2);
      expect(result[0].wasReused).toBe(true);
      expect(result[1].wasReused).toBe(false);

      // sleep should NOT be called since the second image is the FIRST Replicate call (index 0 = no delay)
      expect(sleepSpy).not.toHaveBeenCalled();

      sleepSpy.mockRestore();
    });

    it('should return failed status for individual image failures', async () => {
      mockEmbedBatch.mockResolvedValue([null, null]);
      mockFindSimilarImage.mockResolvedValue(null);

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["prompt 1", "prompt 2"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockGenerateImage.mockResolvedValueOnce('https://replicate.delivery/image1.jpg');
      mockGenerateImage.mockRejectedValueOnce(new Error('Generation failed'));

      const result = await imageGenerationService.generateImagesForArticle(
        mockMarkers,
        'budget',
        'coffee'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('failed');
      expect(result[1].error).toBe('Generation failed');
    });

    it('should include correct metadata in results', async () => {
      mockEmbedBatch.mockResolvedValue([null]);
      mockFindSimilarImage.mockResolvedValue(null);

      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["prompt for coffee image"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockGenerateImage.mockResolvedValue('https://replicate.delivery/image1.jpg');

      const singleMarker: IImageMarker[] = [
        { position: 1, sectionContext: 'Introduction paragraph about coffee' },
      ];

      const result = await imageGenerationService.generateImagesForArticle(
        singleMarker,
        'budget',
        'coffee'
      );

      expect(result[0]).toMatchObject({
        position: 1,
        imageUrl: 'https://replicate.delivery/image1.jpg',
        model: 'prunaai/z-image-turbo',
        presetKey: 'budget',
        status: 'completed',
        wasReused: false,
        reusedFromImageId: null,
        promptEmbedding: null,
      });
    });
  });

  describe('generateImagePrompts', () => {
    const mockMarkers: IImageMarker[] = [
      { position: 1, sectionContext: 'Introduction to coffee culture' },
      { position: 2, sectionContext: 'Different brewing methods' },
    ];

    it('should generate contextual prompts via LLM', async () => {
      mockChatCompletionWithRetry.mockResolvedValue({
        content: '["prompt 1", "prompt 2"]',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      const result = await (imageGenerationService as any).generateImagePrompts(
        mockMarkers,
        'coffee',
        'modern blog style'
      );

      expect(result).toEqual(['prompt 1', 'prompt 2']);
      expect(mockChatCompletionWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
            }),
          ]),
        })
      );
    });

    it('should fallback to basic prompts on LLM failure', async () => {
      mockChatCompletionWithRetry.mockRejectedValue(new Error('LLM error'));

      const result = await (imageGenerationService as any).generateImagePrompts(
        mockMarkers,
        'coffee',
        'modern blog style'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Professional blog article image');
      expect(result[0]).toContain('Introduction to coffee culture');
      expect(result[1]).toContain('Different brewing methods');
    });
  });
});
