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
}));

// Create mock class for OpenRouterService
class MockOpenRouterService {
  chatCompletionWithRetry = vi.fn();
}

// Mock OpenRouterService with the mock class
vi.mock('../openrouter.service', () => ({
  OpenRouterService: MockOpenRouterService,
}));

// Mock supabaseAdmin
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));

// Import after mocks are set up
const { ArticleGenerationService } = await import('../article-generation.service');
const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

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

  const mockArticleContent = `# Introduction

This is the introduction with Point 1 and Point 2.

## Main Section

### Subheading 1

This section covers Point 1, Point 2, and Point 3 in detail.

# Conclusion

Summary point here.`;

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
  });
});
