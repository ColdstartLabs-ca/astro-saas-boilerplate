/**
 * Image Generation Service Unit Tests
 *
 * Tests for image generation orchestration service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { imageGenerationService } from '@server/services/image-generation.service';
import { getReplicateService } from '@server/services/replicate.service';
import { OpenRouterService } from './openrouter.service';
import type { IImageMarker, IImageResult } from '@shared/types/article.types';
import type { ImagePresetKey } from '@shared/config/image-models.config';

// Mock dependencies
vi.mock('@server/services/replicate.service');
vi.mock('@server/services/openrouter.service');

describe('ImageGenerationService', () => {
  const mockReplicateService = {
    isConfigured: vi.fn(() => true),
    createPrediction: vi.fn(),
    pollPrediction: vi.fn(),
    generateImage: vi.fn(),
    withRetry: vi.fn(),
  };

  const mockOpenRouterService = {
    chatCompletionWithRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getReplicateService).mockReturnValue(mockReplicateService as never);
    vi.mocked(OpenRouterService).mockReturnValue(mockOpenRouterService as never);
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

    it('should generate images in parallel via Promise.allSettled', async () => {
      mockReplicateService.withRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockReplicateService.generateImage.mockResolvedValueOnce(
        'https://replicate.delivery/image1.jpg'
      );
      mockReplicateService.generateImage.mockResolvedValueOnce(
        'https://replicate.delivery/image2.jpg'
      );

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
      mockReplicateService.withRetry.mockRejectedValueOnce(
        new Error('Generation failed')
      );

      mockReplicateService.generateImage.mockResolvedValueOnce(
        'https://replicate.delivery/image1.jpg'
      );

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
      mockReplicateService.withRetry.mockImplementation(async (fn: () => Promise<string>) => {
        return await fn();
      });

      mockReplicateService.generateImage.mockResolvedValue('https://replicate.delivery/image1.jpg');

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
      mockOpenRouterService.chatCompletionWithRetry.mockResolvedValue({
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
      expect(mockOpenRouterService.chatCompletionWithRetry).toHaveBeenCalledWith(
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
      mockOpenRouterService.chatCompletionWithRetry.mockRejectedValue(
        new Error('LLM error')
      );

      const result = await (imageGenerationService as any).generateImagePrompts(
        mockMarkers,
        'coffee',
        'modern blog style'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Professional blog article image');
      expect(result[1]).toContain('Introduction to coffee culture');
    });
  });
});
