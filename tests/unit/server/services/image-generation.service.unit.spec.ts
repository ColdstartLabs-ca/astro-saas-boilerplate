/**
 * Image Generation Service Unit Tests
 *
 * Tests for image generation orchestration service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IImageMarker } from '@shared/types/article.types';
import type { ImagePresetKey } from '@shared/config/image-models.config';

// Hoist mock functions so they're available in vi.mock factories
const mockChatCompletionWithRetry = vi.fn();
const mockWithRetry = vi.fn();
const mockGenerateImage = vi.fn();
const mockIsConfigured = vi.fn(() => true);
const mockCreatePrediction = vi.fn();
const mockPollPrediction = vi.fn();

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

// Import after mocks are set up
const { imageGenerationService } = await import('@server/services/image-generation.service');

describe('ImageGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  describe('generateImagesForArticle', () => {
    const mockMarkers: IImageMarker[] = [
      { position: 1, sectionContext: 'Introduction paragraph about coffee' },
      { position: 2, sectionContext: 'Best coffee makers section' },
    ];

    it('should return empty array for no markers', async () => {
      const result = await imageGenerationService.generateImagesForArticle(
        [],
        'blog-hero',
        'coffee'
      );

      expect(result).toEqual([]);
    });

    it('should generate images sequentially with prompts', async () => {
      // Mock LLM prompt generation
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
        'blog-hero',
        'coffee'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('completed');
      expect(result[0].imageUrl).toBe('https://replicate.delivery/image1.jpg');
      expect(result[1].imageUrl).toBe('https://replicate.delivery/image2.jpg');
    });

    it('should return failed status for individual image failures', async () => {
      // Mock LLM prompt generation
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
        'blog-hero',
        'coffee'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('failed');
      expect(result[1].error).toBe('Generation failed');
    });

    it('should include correct metadata in results', async () => {
      // Mock LLM prompt generation
      mockChatCompletionWithRetry.mockResolvedValue({
        content: '{"prompts": ["prompt for coffee image", "prompt for makers"]}',
        model: 'gpt-4o',
        usage: { totalTokens: 100 },
        finishReason: 'stop',
      });

      mockWithRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockGenerateImage.mockResolvedValue('https://replicate.delivery/image1.jpg');

      const result = await imageGenerationService.generateImagesForArticle(
        mockMarkers,
        'blog-hero',
        'coffee'
      );

      expect(result[0]).toMatchObject({
        position: 1,
        imageUrl: 'https://replicate.delivery/image1.jpg',
        model: 'black-forest-labs/flux-schnell',
        presetKey: 'blog-hero',
        status: 'completed',
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
