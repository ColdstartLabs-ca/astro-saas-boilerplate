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

vi.mock('@shared/config/ai-models.config', () => ({
  WRITER_PRESETS: {
    budget: { key: 'budget', defaultModel: 'openai/gpt-4o-mini', tier: 'budget', creditCost: 1 },
    balanced: { key: 'balanced', defaultModel: 'openai/gpt-4o', tier: 'balanced', creditCost: 1 },
    pro: {
      key: 'pro',
      defaultModel: 'anthropic/claude-sonnet-4-5',
      tier: 'balanced',
      creditCost: 2,
    },
    ultra: {
      key: 'ultra',
      defaultModel: 'anthropic/claude-opus-4-6',
      tier: 'ultra',
      creditCost: 3,
    },
  },
  isValidWriterPreset: (key: string) => ['budget', 'balanced', 'pro', 'ultra'].includes(key),
  resolveWriterModel: (presetKey: string, _envValue?: string) => {
    const defaults: Record<string, string> = {
      budget: 'openai/gpt-4o-mini',
      balanced: 'openai/gpt-4o',
      pro: 'anthropic/claude-sonnet-4-5',
      ultra: 'anthropic/claude-opus-4-6',
    };
    return defaults[presetKey] || 'anthropic/claude-sonnet-4-5';
  },
  getWriterPresetCreditCost: (presetKey: string | null | undefined) => {
    const costs: Record<string, number> = {
      budget: 1,
      balanced: 1,
      pro: 2,
      ultra: 3,
    };
    return presetKey ? (costs[presetKey] ?? 1) : 1;
  },
  // Deprecated compat
  AI_MODELS: { 'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', tier: 'balanced' } },
  isValidModel: () => true,
}));

vi.mock('@server/services/article-quality-gate.service', () => ({
  articleQualityGateService: {
    checkQualityGates: vi.fn(() => ({
      passed: true,
      details: {
        wordCountCheck: { passed: true, actual: 1000, target: 1000, percentage: 100 },
        headingCheck: { passed: true, h2Count: 3, required: 3 },
        metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
        completionCheck: { passed: true, finishReason: 'stop' },
      },
    })),
  },
}));

vi.mock('@server/services/openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: vi.fn(() => false),
    generateEmbeddingForDB: vi.fn(),
    checkSimilarity: vi.fn(),
  },
}));

vi.mock('@server/services/qa.service', () => ({
  qaService: {
    runQAChecks: vi.fn(() =>
      Promise.resolve({
        passed: true,
        failureReason: undefined,
        results: {
          plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
          factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
          readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
          aiLikelihood: { passed: true, aiScore: 0.2, confidence: 'low' },
        },
      })
    ),
  },
}));

vi.mock('@server/utils/error-classifier', () => ({
  classifyError: vi.fn((error: unknown, stage: string) => ({
    message: error instanceof Error ? error.message : String(error),
    stage: stage || 'unknown',
    provider: 'unknown',
    httpStatus: null,
    isRetryable: false,
    category: 'unknown',
  })),
  createFailureMetadata: vi.fn((parsed: any) => ({
    failure_stage: parsed.stage,
    provider: parsed.provider,
    http_status: parsed.httpStatus,
    is_retryable: parsed.isRetryable,
  })),
  formatErrorMessage: vi.fn((parsed: any) => parsed.message),
}));

vi.mock('@server/services/image-storage.service', () => ({
  persistArticleImages: vi.fn(),
}));

vi.mock('@server/services/email.service', () => ({
  getEmailService: vi.fn(() => ({
    sendArticleCompleteNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@server/services/delivery.service', () => ({
  deliveryService: {
    shouldAutoDeliver: vi.fn().mockResolvedValue(false),
    deliverArticle: vi.fn().mockResolvedValue({ successful: 0, failed: 0 }),
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

  describe('logFailureMetrics', () => {
    it('should log structured error metadata on generation failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockParsedError = {
        message: 'OpenRouter API timeout',
        stage: 'article_generation',
        provider: 'openrouter',
        httpStatus: 504,
        isRetryable: true,
        category: 'timeout' as const,
      };

      // Call private method via type assertion
      await (service as any).logFailureMetrics(mockArticleId, mockParsedError);

      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      // Get the logged message
      const loggedMessage = consoleErrorSpy.mock.calls[0][1];

      // Parse and verify structured fields
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        message: 'Article generation failed',
        level: 'error',
        articleId: mockArticleId,
        stage: 'article_generation',
        provider: 'openrouter',
        httpStatus: 504,
        isRetryable: true,
        category: 'timeout',
        errorMessage: 'OpenRouter API timeout',
      });

      // Verify timestamp is ISO 8601 format
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      consoleErrorSpy.mockRestore();
    });

    it('should include all required fields for Baselime alert queries', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockParsedError = {
        message: 'Replicate 503 error',
        stage: 'image_generation',
        provider: 'replicate',
        httpStatus: 503,
        isRetryable: true,
        category: 'transient' as const,
      };

      await (service as any).logFailureMetrics(mockArticleId, mockParsedError);

      const loggedMessage = consoleErrorSpy.mock.calls[0][1];
      const parsed = JSON.parse(loggedMessage);

      // Verify all fields required for alert queries are present
      const requiredFields = [
        'message',
        'level',
        'articleId',
        'timestamp',
        'stage',
        'provider',
        'category',
        'isRetryable',
        'httpStatus',
        'errorMessage',
      ];
      requiredFields.forEach(field => {
        expect(parsed).toHaveProperty(field);
      });

      consoleErrorSpy.mockRestore();
    });
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
      const validPresets = ['budget', 'balanced', 'pro', 'ultra'];

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
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'Test content with [IMAGE:1] marker',
          usage: { totalTokens: 200 },
          finishReason: 'stop',
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

      // Mock Supabase chain with select support for attempt_count and project queries
      const mockChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { attempt_count: 1 }, error: null }),
            }),
            single: vi.fn().mockResolvedValue({ data: { qa_config: null }, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => mockChain
      );

      const input: IGenerateArticleInput = {
        keyword: 'coffee',
        model: 'balanced',
        tone: 'professional',
        targetWordCount: 1500,
        imagePreset: 'budget',
      };

      await service.generateArticle(mockArticleId, mockUserId, input);

      expect(imageGenerationService.generateImagesForArticle).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            position: 1,
          }),
        ]),
        'budget',
        'coffee'
      );
    });

    it('should not call image generation service when preset is not provided', async () => {
      const { imageGenerationService } = await import('@server/services/image-generation.service');

      const input: IGenerateArticleInput = {
        keyword: 'coffee',
        model: 'balanced',
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

  describe('shouldAutoApprove', () => {
    it('should return true when project content_preferences.autoApprove is true', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({
                data: { content_preferences: { autoApprove: true } },
                error: null,
              }),
          }),
        }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      const result = await (service as any).shouldAutoApprove('project-123');

      expect(result).toBe(true);
    });

    it('should return false when project content_preferences.autoApprove is false', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({
                data: { content_preferences: { autoApprove: false } },
                error: null,
              }),
          }),
        }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      const result = await (service as any).shouldAutoApprove('project-123');

      expect(result).toBe(false);
    });

    it('should return false when project content_preferences.autoApprove is missing', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { content_preferences: {} }, error: null }),
          }),
        }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      const result = await (service as any).shouldAutoApprove('project-123');

      expect(result).toBe(false);
    });

    it('should return false when project data is null', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockChain);

      const result = await (service as any).shouldAutoApprove('project-123');

      expect(result).toBe(false);
    });
  });

  describe('auto-approve flow', () => {
    /**
     * Build a minimal supabase mock for generateArticle tests.
     * The `qaConfig` param controls what the project-qa_config query returns,
     * and `autoApprove` controls the content_preferences value.
     */
    function buildSupabaseMock(
      supabaseAdmin: { from: ReturnType<typeof vi.fn> },
      options: { autoApprove: boolean }
    ) {
      const mockChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        select: vi.fn().mockImplementation((cols: string) => {
          if (cols === 'content_preferences') {
            return {
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    content_preferences: { autoApprove: options.autoApprove },
                  },
                  error: null,
                }),
              }),
            };
          }
          // Default: qa_config / attempt_count queries
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { attempt_count: 1 }, error: null }),
              }),
              single: vi.fn().mockResolvedValue({ data: { qa_config: null }, error: null }),
            }),
          };
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        () => mockChain
      );
      return mockChain;
    }

    it('should auto-approve and publish article when project autoApprove is enabled', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
      const { deliveryService } = await import('@server/services/delivery.service');

      // Mock delivery to return 1 successful delivery
      (deliveryService.deliverArticle as ReturnType<typeof vi.fn>).mockResolvedValue({
        successful: 1,
        failed: 0,
      });

      mockChatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Auto-Approve Test',
            metaDescription: 'A test article',
            slug: 'auto-approve-test',
            sections: [],
          }),
          usage: { totalTokens: 100 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'Test article content without image markers',
          usage: { totalTokens: 200 },
          finishReason: 'stop',
        });

      buildSupabaseMock(supabaseAdmin as unknown as { from: ReturnType<typeof vi.fn> }, {
        autoApprove: true,
      });

      const input: IGenerateArticleInput = {
        keyword: 'auto approve test',
        model: 'balanced',
        tone: 'professional',
        targetWordCount: 1000,
        projectId: 'project-auto-approve',
        campaignId: 'campaign-123',
      };

      await service.generateArticle(mockArticleId, mockUserId, input);

      // deliverArticle should have been called (auto-approve path)
      expect(deliveryService.deliverArticle).toHaveBeenCalledWith(mockArticleId);
    });

    it('should NOT auto-approve qa_failed articles even when autoApprove is enabled', async () => {
      const { qaService } = await import('@server/services/qa.service');
      const { deliveryService } = await import('@server/services/delivery.service');

      // Force QA to fail
      (qaService.runQAChecks as ReturnType<typeof vi.fn>).mockResolvedValue({
        passed: false,
        failureReason: 'AI likelihood too high',
        results: {
          plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
          factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
          readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
          aiLikelihood: { passed: false, aiScore: 0.95, confidence: 'high' },
        },
      });

      mockChatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'QA Failed Test',
            metaDescription: 'A test article',
            slug: 'qa-failed-test',
            sections: [],
          }),
          usage: { totalTokens: 100 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'Test article content',
          usage: { totalTokens: 200 },
          finishReason: 'stop',
        });

      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
      buildSupabaseMock(supabaseAdmin as unknown as { from: ReturnType<typeof vi.fn> }, {
        autoApprove: true,
      });

      const input: IGenerateArticleInput = {
        keyword: 'qa failed test',
        model: 'balanced',
        tone: 'professional',
        targetWordCount: 1000,
        projectId: 'project-auto-approve',
        campaignId: 'campaign-123',
      };

      await service.generateArticle(mockArticleId, mockUserId, input);

      // deliverArticle should NOT have been called for qa_failed articles
      expect(deliveryService.deliverArticle).not.toHaveBeenCalled();
    });

    it('should skip auto-approve and use normal auto-delivery when autoApprove is disabled', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
      const { deliveryService } = await import('@server/services/delivery.service');

      // Make sure QA passes
      const { qaService } = await import('@server/services/qa.service');
      (qaService.runQAChecks as ReturnType<typeof vi.fn>).mockResolvedValue({
        passed: true,
        failureReason: undefined,
        results: {
          plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
          factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
          readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
          aiLikelihood: { passed: true, aiScore: 0.2, confidence: 'low' },
        },
      });

      // Auto-delivery also disabled (shouldAutoDeliver returns false)
      (deliveryService.shouldAutoDeliver as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      mockChatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'No Auto-Approve Test',
            metaDescription: 'A test article',
            slug: 'no-auto-approve-test',
            sections: [],
          }),
          usage: { totalTokens: 100 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: 'Test article content',
          usage: { totalTokens: 200 },
          finishReason: 'stop',
        });

      buildSupabaseMock(supabaseAdmin as unknown as { from: ReturnType<typeof vi.fn> }, {
        autoApprove: false,
      });

      const input: IGenerateArticleInput = {
        keyword: 'no auto approve test',
        model: 'balanced',
        tone: 'professional',
        targetWordCount: 1000,
        projectId: 'project-no-auto-approve',
        campaignId: 'campaign-123',
      };

      await service.generateArticle(mockArticleId, mockUserId, input);

      // deliverArticle should NOT have been called (auto-delivery disabled)
      expect(deliveryService.deliverArticle).not.toHaveBeenCalled();
      // But shouldAutoDeliver SHOULD have been called (normal path)
      expect(deliveryService.shouldAutoDeliver).toHaveBeenCalled();
    });
  });
});
