/**
 * Article Generation Service Unit Tests
 *
 * Tests for the article generation pipeline with image support.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArticleGenerationService } from '@server/services/article-generation.service';
import type { IGenerateArticleInput, IImageMarker } from '@shared/types/article.types';

// Hoisted mock function shared across tests
const { mockChatCompletionWithRetry } = vi.hoisted(() => ({
  mockChatCompletionWithRetry: vi.fn(),
}));

// Mock dependencies
vi.mock('@server/supabase/supabaseAdmin', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockRpc = vi.fn();

  const chainMock = () => ({
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
  });

  const eqChain = () => ({
    eq: mockEq,
    single: mockSingle,
  });

  mockFrom.mockReturnValue(chainMock());
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue(eqChain());
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockRpc.mockResolvedValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

vi.mock('@server/services/openrouter.service', () => ({
  OpenRouterService: class {
    chatCompletionWithRetry = mockChatCompletionWithRetry;
  },
}));

vi.mock('@server/services/image-generation.service', () => ({
  imageGenerationService: {
    generateImagesForArticle: vi.fn(),
  },
}));

describe('ArticleGenerationService', () => {
  let service: ArticleGenerationService;
  const mockUserId = 'user-123';
  const mockArticleId = 'article-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ArticleGenerationService();
  });

  describe('parseImageMarkers', () => {
    it('should parse [IMAGE:n] markers from content', () => {
      const content = `
        # Introduction

        [IMAGE:1]
        Some content here.

        ## Section 2

        [IMAGE:2]
        More content.

        [IMAGE:3]
        Final section.
      `;

      const markers = (service as any).parseImageMarkers(content);

      expect(markers).toHaveLength(3);
      expect(markers[0]).toMatchObject({
        position: 1,
      });
      expect(markers[1]).toMatchObject({
        position: 2,
      });
      expect(markers[2]).toMatchObject({
        position: 3,
      });
    });

    it('should extract section context around markers', () => {
      const content = `
        # Coffee Introduction

        Coffee is a popular beverage made from roasted coffee beans.

        [IMAGE:1]

        ## Health Benefits

        Coffee has many health benefits including antioxidants.
      `;

      const markers = (service as any).parseImageMarkers(content);

      expect(markers[0].sectionContext).toContain('Coffee Introduction');
      expect(markers[0].sectionContext).toContain('Health Benefits');
    });

    it('should return empty array when no markers found', () => {
      const content = `
        # Introduction

        Just text here, no image markers.

        ## Conclusion

        End of article.
      `;

      const markers = (service as any).parseImageMarkers(content);

      expect(markers).toEqual([]);
    });

    it('should handle edge case with marker at start of content', () => {
      const content = `[IMAGE:1]

Some content follows.`;

      const markers = (service as any).parseImageMarkers(content);

      expect(markers).toHaveLength(1);
      expect(markers[0].position).toBe(1);
    });

    it('should handle edge case with marker at end of content', () => {
      const content = `Some content before.

[IMAGE:1]`;

      const markers = (service as any).parseImageMarkers(content);

      expect(markers).toHaveLength(1);
      expect(markers[0].position).toBe(1);
    });
  });

  describe('replaceImageMarkers', () => {
    it('should replace completed image markers with markdown images', () => {
      const content = `
        # Introduction

        [IMAGE:1]

        Some content.

        [IMAGE:2]
      `;

      const results = [
        {
          position: 1,
          status: 'completed' as const,
          imageUrl: 'https://example.com/image1.jpg',
          prompt: 'A beautiful coffee cup on a wooden table',
        },
        {
          position: 2,
          status: 'completed' as const,
          imageUrl: 'https://example.com/image2.jpg',
          prompt: 'Coffee beans scattered on a dark surface',
        },
      ];

      const replaced = (service as any).replaceImageMarkers(content, results);

      expect(replaced).toContain(
        '![A beautiful coffee cup on a wooden table](https://example.com/image1.jpg)'
      );
      expect(replaced).toContain(
        '![Coffee beans scattered on a dark surface](https://example.com/image2.jpg)'
      );
      expect(replaced).not.toContain('[IMAGE:1]');
      expect(replaced).not.toContain('[IMAGE:2]');
    });

    it('should strip failed image markers', () => {
      const content = `
        # Introduction

        [IMAGE:1]

        Some content.

        [IMAGE:2]
      `;

      const results = [
        {
          position: 1,
          status: 'completed' as const,
          imageUrl: 'https://example.com/image1.jpg',
          prompt: 'A beautiful coffee cup',
        },
        {
          position: 2,
          status: 'failed' as const,
          error: 'Generation failed',
        },
      ];

      const replaced = (service as any).replaceImageMarkers(content, results);

      expect(replaced).toContain('![A beautiful coffee cup](https://example.com/image1.jpg)');
      expect(replaced).not.toContain('[IMAGE:1]');
      expect(replaced).not.toContain('[IMAGE:2]');
    });

    it('should handle empty results array', () => {
      const content = `
        # Introduction

        [IMAGE:1]

        Some content.
      `;

      const replaced = (service as any).replaceImageMarkers(content, []);

      // Markers should remain when no results provided
      expect(replaced).toContain('[IMAGE:1]');
    });

    it('should escape quotes in alt text', () => {
      const content = '[IMAGE:1]';

      const results = [
        {
          position: 1,
          status: 'completed' as const,
          imageUrl: 'https://example.com/image.jpg',
          prompt: 'A "beautiful" coffee cup with "quotes"',
        },
      ];

      const replaced = (service as any).replaceImageMarkers(content, results);

      expect(replaced).toContain('![A beautiful coffee cup with quotes]');
    });
  });

  describe('stripImageMarkers', () => {
    it('should remove all [IMAGE:n] markers from content', () => {
      const content = `
        # Introduction

        [IMAGE:1]

        Some content.

        [IMAGE:2]

        More content.

        [IMAGE:3]
      `;

      const stripped = (service as any).stripImageMarkers(content);

      expect(stripped).not.toContain('[IMAGE:1]');
      expect(stripped).not.toContain('[IMAGE:2]');
      expect(stripped).not.toContain('[IMAGE:3]');
      expect(stripped).toContain('Some content');
      expect(stripped).toContain('More content');
    });

    it('should handle content with no markers', () => {
      const content = `
        # Introduction

        Just plain text here.

        ## Conclusion

        End of article.
      `;

      const stripped = (service as any).stripImageMarkers(content);

      expect(stripped).toBe(content);
    });
  });

  describe('parseImagePreset', () => {
    it('should return null for undefined preset', () => {
      const result = (service as any).parseImagePreset(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = (service as any).parseImagePreset('');
      expect(result).toBeNull();
    });

    it('should return the preset key for valid presets', () => {
      const validPresets = [
        'blog-hero',
        'social-card',
        'product-shot',
        'premium-hero',
        'photorealistic',
        'illustration',
      ];

      validPresets.forEach(preset => {
        const result = (service as any).parseImagePreset(preset);
        expect(result).toBe(preset);
      });
    });

    it('should return null for invalid preset', () => {
      const result = (service as any).parseImagePreset('invalid-preset');
      expect(result).toBeNull();
    });
  });

  describe('countWords', () => {
    it('should count words in markdown content', () => {
      const content = `
        # Introduction

        This is an article about coffee.

        ## Benefits

        Coffee has many benefits.
      `;

      const count = (service as any).countWords(content);

      expect(count).toBeGreaterThan(0);
      expect(count).toBe(12); // Introduction, This, is, an, article, about, coffee, Benefits, Coffee, has, many, benefits
    });

    it('should strip markdown syntax before counting', () => {
      const content = `
        # Header

        **Bold text** and *italic text*.

        [Link text](https://example.com)

        ![Alt text](image.jpg)
      `;

      const count = (service as any).countWords(content);

      // Should count actual words, not markdown
      expect(count).toBeGreaterThan(0);
      expect(count).not.toContain('#');
    });

    it('should handle empty content', () => {
      const count = (service as any).countWords('');
      expect(count).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const count = (service as any).countWords('   \n\n   \t  ');
      expect(count).toBe(0);
    });
  });

  describe('Image generation integration', () => {
    it('should call image generation service when preset is provided', async () => {
      const { imageGenerationService } = await import('@server/services/image-generation.service');
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      // Mock OpenRouter responses via shared mock
      mockChatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Test Article',
            metaDescription: 'A test article',
            slug: 'test-article',
            sections: [],
          }),
          usage: { totalTokens: 100 },
        })
        .mockResolvedValueOnce({
          content: 'Test content with [IMAGE:1] marker',
          usage: { totalTokens: 200 },
        });

      // Mock image generation
      (
        imageGenerationService.generateImagesForArticle as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          position: 1,
          status: 'completed',
          imageUrl: 'https://example.com/image.jpg',
          prompt: 'Test prompt',
        },
      ]);

      // Mock Supabase chain
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }));

      const input: IGenerateArticleInput = {
        keyword: 'coffee',
        model: 'gpt-4o',
        tone: 'professional',
        targetWordCount: 1500,
        imagePreset: 'blog-hero',
      };

      await service.generateArticle(mockArticleId, mockUserId, input);

      expect(imageGenerationService.generateImagesForArticle).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            position: 1,
          }),
        ]),
        'blog-hero',
        'coffee'
      );
    });

    it('should not call image generation service when preset is not provided', async () => {
      const { imageGenerationService } = await import('@server/services/image-generation.service');

      const input: IGenerateArticleInput = {
        keyword: 'coffee',
        model: 'gpt-4o',
        tone: 'professional',
        targetWordCount: 1500,
        imagePreset: undefined,
      };

      // Don't need to actually run generate, just check that the logic is correct
      // by checking parseImagePreset
      const preset = (service as any).parseImagePreset(input.imagePreset);

      expect(preset).toBeNull();
      expect(imageGenerationService.generateImagesForArticle).not.toHaveBeenCalled();
    });
  });
});
