/**
 * ArticleGenerationService Tests
 *
 * Tests for the article generation pipeline including:
 * - Outline generation
 * - Full article generation
 * - Metadata extraction
 * - Credit refund on failure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IArticleOutline, IGenerateArticleInput } from '@shared/types/article.types';

// Mock serverEnv before importing OpenRouterService
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_TEXT_MODEL: 'openai/gpt-4o',
    BASE_URL: 'http://localhost:4321',
    APP_NAME: 'TestApp',
  },
}));

// Mock AI models config
vi.mock('@shared/config/ai-models.config', () => ({
  AI_MODELS: {
    'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', tier: 'all' },
  },
  isValidModel: () => true,
  resolveWriterModel: (model: string) => model || 'openai/gpt-4o',
}));

// Create mock class for OpenRouterService
class MockOpenRouterService {
  chatCompletionWithRetry = vi.fn();
}

// Mock OpenRouterService with the mock class
vi.mock('../openrouter.service', () => ({
  OpenRouterService: MockOpenRouterService,
}));

// Mock openai embeddings service (E10)
vi.mock('../openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: vi.fn(() => false),
    generateEmbeddingForDB: vi.fn(),
    checkSimilarity: vi.fn(),
  },
}));

// Mock QA service (E11)
vi.mock('../qa.service', () => ({
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

// Mock error classifier (E13)
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

// Mock image generation and storage (not under test here)
vi.mock('../image-generation.service', () => ({
  imageGenerationService: {
    generateImages: vi.fn(),
  },
}));

vi.mock('../image-storage.service', () => ({
  persistArticleImages: vi.fn(),
}));

// Mock supabaseAdmin with chainable methods for both update and select paths
const createChainableEq = (resolvedValue: unknown = undefined) => {
  const chain: Record<string, any> = {};
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: resolvedValue, error: null }));
  chain.not = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  return chain;
};

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const chain = createChainableEq(
        table === 'articles'
          ? { attempt_count: 1, credits_used: 1 } // Default to 1 credit (base article cost)
          : table === 'projects'
            ? { qa_config: null }
            : null
      );
      chain.update = vi.fn(() => chain);
      chain.insert = vi.fn(() => chain);
      return chain;
    }),
    rpc: vi.fn(),
  },
}));

// Mock quality gate service to pass by default in basic tests
// We'll use the real implementation in quality gate specific tests
const mockCheckQualityGates = vi.hoisted(() => ({
  mockCheckQualityGates: vi.fn(() => ({
    passed: true,
    details: {
      wordCountCheck: { passed: true, actual: 1000, target: 1500, percentage: 67 },
      headingCheck: { passed: true, h2Count: 3, required: 3 },
      metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
      completionCheck: { passed: true, finishReason: 'stop' },
    },
  })),
}));

vi.mock('@server/services/article-quality-gate.service', () => ({
  articleQualityGateService: {
    checkQualityGates: mockCheckQualityGates.mockCheckQualityGates,
  },
}));

// Import after mocks are set up
const { ArticleGenerationService } = await import('../article-generation.service');
const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

// Get the real quality gate service for specific tests
const { articleQualityGateService: realQualityGateService } =
  await import('../article-quality-gate.service');

describe('ArticleGenerationService', () => {
  let service: ArticleGenerationService;
  let mockOpenRouter: MockOpenRouterService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up supabase rpc mock
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: { new_total_balance: 9 } });

    // Create service instance
    service = new ArticleGenerationService();
    // Get the mock instance from the service
    mockOpenRouter = (service as any).openRouter as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOutline: IArticleOutline = {
    title: 'Test Article Title',
    metaDescription: 'A test meta description for SEO purposes',
    slug: 'test-article-slug',
    sections: [
      {
        heading: 'Introduction',
        keyPoints: ['Point 1', 'Point 2'],
      },
      {
        heading: 'Main Section',
        subheadings: ['Subheading 1'],
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
      },
      {
        heading: 'Conclusion',
        keyPoints: ['Summary point'],
      },
    ],
  };

  const mockArticleContent = `## Introduction

This is the introduction with Point 1 and Point 2. It provides substantial content to meet the quality gate requirements.

${'word '.repeat(200).trim()}

## Main Section

### Subheading 1

This section covers Point 1, Point 2, and Point 3 in detail. It contains enough content to pass the quality gates.

${'word '.repeat(200).trim()}

## Another Section

This section provides additional valuable content. It ensures the article has at least 3 H2 headings as required.

${'word '.repeat(200).trim()}

## Conclusion

Summary point here. This conclusion wraps up the article effectively.

${'word '.repeat(100).trim()}`;

  describe('generateArticle - full pipeline', () => {
    const mockInput: IGenerateArticleInput = {
      keyword: 'test keyword',
      projectId: 'test-project-id',
      model: 'openai/gpt-4o',
      tone: 'professional',
      targetWordCount: 1500,
    };

    it('should generate outline and full article', async () => {
      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(mockOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Mock article generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: mockArticleContent,
        usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing
      await service.generateArticle(articleId, userId, mockInput);

      // Verify OpenRouter was called twice (outline + article)
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should extract word count from markdown content', async () => {
      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      // Should complete without throwing
      await service.generateArticle('test-article-id', 'test-user-id', mockInput);

      // Verify OpenRouter was called
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalled();
    });

    it('should record token usage from both LLM calls', async () => {
      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      await service.generateArticle('test-article-id', 'test-user-id', mockInput);

      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should record generation time', async () => {
      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      const startTime = Date.now();
      await service.generateArticle('test-article-id', 'test-user-id', mockInput);
      const elapsed = Date.now() - startTime;

      // Generation should complete in reasonable time
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Credit refund on failure', () => {
    const mockInput: IGenerateArticleInput = {
      keyword: 'test keyword',
      projectId: 'test-project-id',
    };

    it('should refund credit on outline generation failure', async () => {
      mockOpenRouter.chatCompletionWithRetry.mockRejectedValue(
        new Error('OpenRouter API error after 3 retries')
      );

      // Service handles error but re-throws
      await expect(
        service.generateArticle('test-article-id', 'test-user-id', mockInput)
      ).rejects.toThrow();

      // Verify rpc was called for refund (error was handled)
      expect(supabaseAdmin.rpc).toHaveBeenCalled();
    });

    it('should refund credit on article generation failure', async () => {
      // Outline succeeds, article fails
      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockRejectedValueOnce(new Error('OpenRouter API error after 3 retries'));

      // Service handles error but re-throws
      await expect(
        service.generateArticle('test-article-id', 'test-user-id', mockInput)
      ).rejects.toThrow();

      // Verify rpc was called for refund (error was handled)
      expect(supabaseAdmin.rpc).toHaveBeenCalled();
    });

    it('should set status to failed with error message', async () => {
      mockOpenRouter.chatCompletionWithRetry.mockRejectedValue(
        new Error('OpenRouter timeout after 3 retries')
      );

      // Service handles error but re-throws
      await expect(
        service.generateArticle('test-article-id', 'test-user-id', mockInput)
      ).rejects.toThrow();

      // Verify supabase was called (for failed status update)
      expect(supabaseAdmin.from).toHaveBeenCalled();
    });
  });

  describe('Integration: full workflow simulation', () => {
    it('should handle successful end-to-end generation', async () => {
      const mockInput: IGenerateArticleInput = {
        keyword: 'AI content generation',
        projectId: 'project-123',
        tone: 'professional',
        targetWordCount: 2000,
      };

      // Simulate outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify({
          ...mockOutline,
          title: 'AI Content Generation: Complete Guide',
          metaDescription: 'Learn how AI generates content automatically',
          slug: 'ai-content-generation-guide',
        }),
        usage: { promptTokens: 150, completionTokens: 250, totalTokens: 400 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Simulate article generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: `# Introduction

AI content generation is revolutionizing...

## Benefits

Key benefits include automation, consistency, and scalability.

## Challenges

Common challenges include quality control and originality.

# Conclusion

AI content is here to stay.`,
        usage: { promptTokens: 200, completionTokens: 800, totalTokens: 1000 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Should complete without throwing
      await service.generateArticle('article-123', 'user-456', mockInput);

      // Verify OpenRouter was called twice
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should handle complete failure with proper cleanup', async () => {
      const mockInput: IGenerateArticleInput = {
        keyword: 'test',
        projectId: 'project-123',
      };

      // All calls fail
      mockOpenRouter.chatCompletionWithRetry.mockRejectedValue(new Error('Service unavailable'));

      // Service handles error but re-throws
      await expect(
        service.generateArticle('article-fail', 'user-fail', mockInput)
      ).rejects.toThrow();

      // Verify rpc was called for refund (error was handled)
      expect(supabaseAdmin.rpc).toHaveBeenCalled();
    });

    it('should refund exactly once per failed article (E1: single-refund guarantee)', async () => {
      const mockInput: IGenerateArticleInput = {
        keyword: 'test',
        projectId: 'project-123',
        imagePreset: 'pro', // Valid preset with 1 credit cost
      };

      // Mock the article record to simulate that 2 credits were charged (1 base + 1 for 'pro' image)
      // This simulates what the atomic RPC would have set when creating the article
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        const chain = createChainableEq(
          table === 'articles'
            ? { attempt_count: 1, credits_used: 2 } // Charged 2 credits
            : table === 'projects'
              ? { qa_config: null }
              : null
        );
        chain.update = vi.fn(() => chain);
        chain.insert = vi.fn(() => chain);
        return chain;
      });

      // All calls fail
      mockOpenRouter.chatCompletionWithRetry.mockRejectedValue(new Error('Service unavailable'));

      // Service handles error but re-throws
      await expect(
        service.generateArticle('article-fail-single-refund', 'user-123', mockInput)
      ).rejects.toThrow();

      // Verify refund RPC was called exactly ONCE
      expect(supabaseAdmin.rpc).toHaveBeenCalledTimes(1);

      // Verify correct RPC function (add_purchased_credits) was called
      // The refund should match credits_used (2), not recompute from inputs
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({
          p_user_id: 'user-123',
          p_amount: 2, // Refund matches the charged amount stored in credits_used
          p_reference_id: 'article-fail-single-refund',
        })
      );

      // Verify description indicates generation failure
      const refundCall = (supabaseAdmin.rpc as any).mock.calls[0];
      expect(refundCall[1].p_description).toContain('generation failed');
    });
  });

  describe('Quality gate validation (E4)', () => {
    const mockInput: IGenerateArticleInput = {
      keyword: 'test keyword',
      projectId: 'test-project-id',
      targetWordCount: 1000,
    };

    const longArticleContent = `## Introduction

This is the introduction with substantial content that meets the quality gate requirements. It has enough words to pass the 70% threshold for a 1000 word target.

${'word '.repeat(200).trim()}

## Main Section

This section contains detailed information about the topic. It has multiple paragraphs to ensure adequate content depth and quality. The content is valuable and informative, not filler.

${'word '.repeat(200).trim()}

## Another Section

Additional valuable content that enhances the article and provides useful information to readers. This section is comprehensive and well-written.

${'word '.repeat(200).trim()}

## Conclusion

A well-written conclusion that summarizes the key points and provides closure to the article.

${'word '.repeat(100).trim()}`;

    it('should pass quality gates with good content and save as draft', async () => {
      // Mock quality gate to pass
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 4, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(mockOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Mock article generation with quality content
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: longArticleContent,
        usage: { promptTokens: 50, completionTokens: 500, totalTokens: 550 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing
      await service.generateArticle(articleId, userId, mockInput);

      // Verify OpenRouter was called twice (outline + article)
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(2);
    });

    it('should fail quality gates with short content and retry once', async () => {
      const shortContent = `## Intro

Too short.`;

      // First quality check: fail (short content)
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValueOnce({
        passed: false,
        failureReason: 'Word count 3 is only 0% of target 1000 (minimum 70%)',
        details: {
          wordCountCheck: { passed: false, actual: 3, target: 1000, percentage: 0 },
          headingCheck: { passed: false, h2Count: 1, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Second quality check (after retry): pass
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValueOnce({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 4, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(mockOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // First attempt: short content (fails quality)
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: shortContent,
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Retry attempt: better content (passes quality)
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: longArticleContent,
        usage: { promptTokens: 50, completionTokens: 500, totalTokens: 550 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing after retry
      await service.generateArticle(articleId, userId, mockInput);

      // Verify OpenRouter was called 3 times (outline + article + retry)
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(3);
    });

    it('should fail quality gates and mark as failed_quality after retry fails', async () => {
      const shortContent = `## Intro

Too short.`;

      // Both quality checks: fail (short content)
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: false,
        failureReason: 'Word count 3 is only 0% of target 1000 (minimum 70%)',
        details: {
          wordCountCheck: { passed: false, actual: 3, target: 1000, percentage: 0 },
          headingCheck: { passed: false, h2Count: 1, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(mockOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // First attempt: short content
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: shortContent,
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Retry attempt: also fails quality
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: shortContent,
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing (quality failure doesn't throw)
      await service.generateArticle(articleId, userId, mockInput);

      // Verify OpenRouter was called 3 times (outline + article + retry)
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(3);

      // Verify credit was refunded for quality failure
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({
          p_description: expect.stringContaining('quality gate failed'),
        })
      );
    });

    it('should fail quality gates with truncated completion', async () => {
      // First quality check: fail (truncated)
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValueOnce({
        passed: false,
        failureReason: 'Generation was truncated (finish_reason: max_tokens)',
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 4, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: false, finishReason: 'max_tokens' },
        },
      });

      // Second quality check (after retry): pass
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValueOnce({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 4, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(mockOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Article generation with max_tokens finish reason (truncated)
      const truncatedContent = `## Introduction

Content here...

## Main Section

More content...

## Another Section

Even more content...`;
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: truncatedContent,
        usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
        model: 'openai/gpt-4o',
        finishReason: 'max_tokens', // Indicates truncation
      });

      // Retry with complete content
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: longArticleContent,
        usage: { promptTokens: 50, completionTokens: 500, totalTokens: 550 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing after retry
      await service.generateArticle(articleId, userId, mockInput);

      // Verify OpenRouter was called 3 times (outline + article + retry)
      expect(mockOpenRouter.chatCompletionWithRetry).toHaveBeenCalledTimes(3);
    });

    it('should fail quality gates with missing metadata', async () => {
      // Both quality checks: fail (missing metadata)
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: false,
        failureReason: 'Missing metadata: title',
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 4, required: 3 },
          metadataCheck: {
            passed: false,
            hasTitle: false,
            hasMetaDescription: true,
            hasSlug: true,
          },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      const incompleteOutline: IArticleOutline = {
        title: '',
        metaDescription: 'Has meta',
        slug: 'has-slug',
        sections: mockOutline.sections,
      };

      // Mock outline generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(incompleteOutline),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Article generation
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: longArticleContent,
        usage: { promptTokens: 50, completionTokens: 500, totalTokens: 550 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      // Retry with still incomplete metadata
      mockOpenRouter.chatCompletionWithRetry.mockResolvedValueOnce({
        content: longArticleContent,
        usage: { promptTokens: 50, completionTokens: 500, totalTokens: 550 },
        model: 'openai/gpt-4o',
        finishReason: 'stop',
      });

      const articleId = 'test-article-id';
      const userId = 'test-user-id';

      // Should complete without throwing (quality failure doesn't throw)
      await service.generateArticle(articleId, userId, mockInput);

      // Verify credit was refunded
      expect(supabaseAdmin.rpc).toHaveBeenCalled();
    });
  });

  describe('Auto-delivery gating by article status', () => {
    const mockInput: IGenerateArticleInput = {
      keyword: 'test keyword',
      projectId: 'test-project-id',
      campaignId: 'test-campaign-id',
      targetWordCount: 1000,
    };

    // Mock delivery service
    const mockDeliverArticle = vi.fn().mockResolvedValue({ total: 1, successful: 1, failed: 0 });
    const mockShouldAutoDeliver = vi.fn().mockResolvedValue(true);

    beforeEach(() => {
      // Mock the dynamic import of delivery service
      vi.doMock('@server/services/delivery.service', () => ({
        deliveryService: {
          deliverArticle: mockDeliverArticle,
          shouldAutoDeliver: mockShouldAutoDeliver,
        },
      }));
      mockDeliverArticle.mockClear();
      mockShouldAutoDeliver.mockClear();
    });

    it('should trigger auto-delivery when article passes QA (qa_passed)', async () => {
      // QA passes
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 3, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // Mock QA service to pass
      const { qaService } = await import('../qa.service');
      (qaService.runQAChecks as any).mockResolvedValueOnce({
        passed: true,
        failureReason: undefined,
        results: {
          plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
          factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
          readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
          aiLikelihood: { passed: true, aiScore: 0.2, confidence: 'low' },
        },
      });

      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      await service.generateArticle('article-qa-pass', 'user-1', mockInput);

      // Auto-delivery should have been checked
      expect(mockShouldAutoDeliver).toHaveBeenCalledWith('test-campaign-id');
    });

    it('should trigger auto-delivery when QA is unavailable (draft status)', async () => {
      // QA passes quality gate
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 3, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // QA service throws (unavailable)
      const { qaService } = await import('../qa.service');
      (qaService.runQAChecks as any).mockRejectedValueOnce(new Error('QA service unavailable'));

      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      await service.generateArticle('article-draft', 'user-1', mockInput);

      // Auto-delivery should still be checked (draft is deliverable)
      expect(mockShouldAutoDeliver).toHaveBeenCalledWith('test-campaign-id');
    });

    it('should NOT trigger auto-delivery when article fails QA (qa_failed)', async () => {
      // Quality gate passes but QA fails
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: true,
        details: {
          wordCountCheck: { passed: true, actual: 700, target: 1000, percentage: 70 },
          headingCheck: { passed: true, h2Count: 3, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      // QA service returns failure
      const { qaService } = await import('../qa.service');
      (qaService.runQAChecks as any).mockResolvedValueOnce({
        passed: false,
        failureReason: 'High AI detection score',
        results: {
          plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
          factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
          readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 65 },
          aiLikelihood: { passed: false, aiScore: 0.9, confidence: 'high' },
        },
      });

      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: mockArticleContent,
          usage: { promptTokens: 50, completionTokens: 400, totalTokens: 450 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      await service.generateArticle('article-qa-fail', 'user-1', mockInput);

      // Auto-delivery should NOT have been called
      expect(mockShouldAutoDeliver).not.toHaveBeenCalled();
      expect(mockDeliverArticle).not.toHaveBeenCalled();
    });

    it('should NOT trigger auto-delivery for quality gate failures (failed_quality)', async () => {
      // Both quality checks: fail
      mockCheckQualityGates.mockCheckQualityGates.mockReturnValue({
        passed: false,
        failureReason: 'Word count 3 is only 0% of target 1000 (minimum 70%)',
        details: {
          wordCountCheck: { passed: false, actual: 3, target: 1000, percentage: 0 },
          headingCheck: { passed: false, h2Count: 1, required: 3 },
          metadataCheck: { passed: true, hasTitle: true, hasMetaDescription: true, hasSlug: true },
          completionCheck: { passed: true, finishReason: 'stop' },
        },
      });

      const shortContent = '## Intro\n\nToo short.';

      mockOpenRouter.chatCompletionWithRetry
        .mockResolvedValueOnce({
          content: JSON.stringify(mockOutline),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: shortContent,
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: shortContent,
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
          model: 'openai/gpt-4o',
          finishReason: 'stop',
        });

      await service.generateArticle('article-quality-fail', 'user-1', mockInput);

      // Auto-delivery should NOT have been called (quality gate failure returns early)
      expect(mockShouldAutoDeliver).not.toHaveBeenCalled();
      expect(mockDeliverArticle).not.toHaveBeenCalled();
    });
  });
});
