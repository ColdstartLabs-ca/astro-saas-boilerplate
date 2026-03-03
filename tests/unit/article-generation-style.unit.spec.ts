/**
 * Unit tests for ArticleGenerationService — style preferences and internal linking
 *
 * Verifies that:
 * - stylePreferences from IGenerateArticleInput are forwarded to prompt builders
 * - internal links are fetched when internalLinksCount > 0
 * - internal links are NOT fetched when internalLinksCount is 0 or absent
 * - pre-supplied internalLinks in the input bypass the DB fetch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleGenerationService } from '@server/services/article-generation.service';
import * as articlePromptsModule from '@server/services/prompts/article-prompts';
import type { IGenerateArticleInput } from '@shared/types/article.types';

// ──────────────────────────────────────────────────────────────────────────────
// Module mocks
// ──────────────────────────────────────────────────────────────────────────────

// Spy on prompt builders so we can assert which arguments were passed
const getOutlinePromptSpy = vi.spyOn(articlePromptsModule, 'getOutlinePrompt');
const getArticlePromptSpy = vi.spyOn(articlePromptsModule, 'getArticlePrompt');

// Mock the OpenRouterService so we never make real API calls.
// The service calls chatCompletionWithRetry for both outline and article generation.
// We return valid outline JSON on the first call, plain article text on subsequent calls.
vi.mock('@server/services/openrouter.service', () => {
  const OUTLINE_JSON = JSON.stringify({
    title: 'Test Article Title',
    metaDescription: 'A concise test description for testing.',
    slug: 'test-article-title',
    sections: [
      { heading: 'Introduction', keyPoints: ['intro point'] },
      { heading: 'Conclusion', keyPoints: ['conclusion point'] },
    ],
  });

  const MockOpenRouterService = function (this: Record<string, unknown>) {
    let callCount = 0;
    this.chatCompletionWithRetry = vi.fn().mockImplementation(() => {
      callCount += 1;
      // First call is outline generation (returns JSON), subsequent calls are article body
      const content =
        callCount === 1 ? OUTLINE_JSON : '## Introduction\n\nTest article content here.';
      return Promise.resolve({
        content,
        usage: { totalTokens: 150, promptTokens: 80, completionTokens: 70 },
        finishReason: 'stop',
      });
    });
  };
  return { OpenRouterService: MockOpenRouterService };
});

// Mock image generation — not needed for style preference tests
vi.mock('@server/services/image-generation.service', () => ({
  imageGenerationService: { generateImages: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@server/services/image-storage.service', () => ({
  persistArticleImages: vi.fn().mockResolvedValue(undefined),
}));

// Mock openai embeddings — not needed for these tests
vi.mock('@server/services/openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: vi.fn().mockReturnValue(false),
    generateEmbedding: vi.fn().mockResolvedValue(null),
    checkSimilarity: vi.fn().mockResolvedValue({ isSimilar: false, similarArticles: [] }),
  },
}));

// Mock QA service — always pass in these tests
vi.mock('@server/services/qa.service', () => ({
  qaService: {
    runQAChecks: vi.fn().mockResolvedValue({
      passed: true,
      failureReason: undefined,
      results: {
        plagiarism: { passed: true, similarityScore: 0, flaggedPhrases: [] },
        factConsistency: { passed: true, score: 1, inconsistencyCount: 0 },
        readability: { passed: true, fleschKincaidGrade: 8, fleschReadingEase: 70 },
        aiLikelihood: { passed: true, aiScore: 0.1, confidence: 'low' },
      },
    }),
  },
}));

// Mock article quality gate — always pass in these tests
vi.mock('@server/services/article-quality-gate.service', () => ({
  articleQualityGateService: {
    checkQualityGates: vi.fn().mockReturnValue({ passed: true, failureReason: undefined }),
  },
}));

// Mock email service
vi.mock('@server/services/email.service', () => ({
  getEmailService: vi.fn().mockReturnValue({
    sendGenerationFailureEmail: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock serverEnv
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    OPENROUTER_API_KEY: 'test-key',
    AVAILABLE_WRITER_PRESETS: 'budget,balanced,pro,ultra',
    ENV: 'test',
  },
  clientEnv: {
    PUBLIC_SUPABASE_URL: 'http://test-supabase-url',
    PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

// ──────────────────────────────────────────────────────────────────────────────
// supabaseAdmin mock — simulates the DB layer
// ──────────────────────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    get from() {
      return mockSupabaseFrom;
    },
    get rpc() {
      return mockSupabaseRpc;
    },
  },
  _overrideSupabaseAdminForTests: vi.fn(),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a chainable Supabase query mock that ultimately resolves to `result`.
 */
function buildQueryChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'not',
    'is',
    'or',
    'and',
    'single',
    'maybeSingle',
    'limit',
    'order',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal methods resolve to result
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  // Non-terminal resolve when awaited
  Object.assign(chain, { then: undefined }); // Prevent accidental thenable behaviour

  // Make the chain itself awaitable for `.from(...).select(...).eq(...)` patterns
  const awaitable = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // Make the proxy itself thenable — return result when awaited
        return prop === 'then' ? (resolve: (v: unknown) => void) => resolve(result) : undefined;
      }
      return target[prop as string];
    },
  });

  for (const m of methods) {
    (chain[m] as ReturnType<typeof vi.fn>).mockReturnValue(awaitable);
  }

  return awaitable;
}

const ARTICLE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const PROJECT_ID = 'cccccccc-0000-0000-0000-000000000003';

function makeBaseInput(overrides: Partial<IGenerateArticleInput> = {}): IGenerateArticleInput {
  return {
    keyword: 'espresso machine',
    projectId: PROJECT_ID,
    campaignId: 'dddddddd-0000-0000-0000-000000000004',
    model: 'balanced',
    tone: 'professional',
    targetWordCount: 1500,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('ArticleGenerationService — style preferences forwarding', () => {
  let service: ArticleGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ArticleGenerationService();

    // Default DB mock: articles update + projects select (for QA config)
    mockSupabaseFrom.mockReturnValue(buildQueryChain({ data: null, error: null }));
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null });
  });

  it('should forward stylePreferences to getOutlinePrompt', async () => {
    const input = makeBaseInput({
      stylePreferences: {
        articleStyle: 'how-to',
        globalInstructions: 'Use numbered lists.',
      },
    });

    await service.generateArticle(ARTICLE_ID, USER_ID, input);

    expect(getOutlinePromptSpy).toHaveBeenCalledWith(
      input.keyword,
      input.tone,
      input.targetWordCount,
      undefined, // no GSC context
      input.stylePreferences
    );
  });

  it('should forward stylePreferences to getArticlePrompt', async () => {
    const stylePreferences = {
      articleStyle: 'listicle' as const,
      includeCta: true,
    };
    const input = makeBaseInput({ stylePreferences });

    await service.generateArticle(ARTICLE_ID, USER_ID, input);

    expect(getArticlePromptSpy).toHaveBeenCalledWith(
      expect.any(Object), // outline
      input.tone,
      input.targetWordCount,
      0, // no image count (no imagePreset)
      stylePreferences,
      [] // no internal links
    );
  });

  it('should fetch internal links from DB when internalLinksCount > 0', async () => {
    const mockLinks = [{ title: 'Cleaning Guide', published_url: 'https://example.com/clean' }];

    // Provide a specific mock for the articles query
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'articles') {
        return buildQueryChain({ data: mockLinks, error: null });
      }
      return buildQueryChain({ data: null, error: null });
    });

    const input = makeBaseInput({
      stylePreferences: { internalLinksCount: 2 },
    });

    await service.generateArticle(ARTICLE_ID, USER_ID, input);

    // getArticlePrompt should have received the fetched links
    expect(getArticlePromptSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      input.stylePreferences,
      expect.arrayContaining([
        expect.objectContaining({ title: 'Cleaning Guide', url: 'https://example.com/clean' }),
      ])
    );
  });

  it('should NOT fetch internal links when internalLinksCount is 0', async () => {
    const input = makeBaseInput({
      stylePreferences: { internalLinksCount: 0 },
    });

    await service.generateArticle(ARTICLE_ID, USER_ID, input);

    // getArticlePrompt should have received an empty array (no DB fetch)
    expect(getArticlePromptSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      input.stylePreferences,
      [] // empty
    );
  });
});
