/**
 * Unit tests for KeywordCannibalizationService
 *
 * Tests the keyword cannibalization detection logic:
 * - Layer 1: LLM-based sitemap coverage detection
 * - Layer 2: Cross-campaign embedding similarity checks
 * - GSC fallback suggestions when all keywords are covered
 * - Embedding storage (fire-and-forget)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// Mocks — vi.mock calls are hoisted; use vi.hoisted() for shared mock fns
// =============================================================================

// Use vi.hoisted so the mock fn is available when vi.mock factory runs
const { mockChatCompletionWithRetry } = vi.hoisted(() => ({
  mockChatCompletionWithRetry: vi.fn(),
}));

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock OpenRouterService as a constructable class
vi.mock('@server/services/openrouter.service', () => {
  class MockOpenRouterService {
    chatCompletionWithRetry = mockChatCompletionWithRetry;
  }
  return { OpenRouterService: MockOpenRouterService };
});

vi.mock('@server/services/openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: vi.fn(),
    generateBatchEmbeddings: vi.fn(),
    calculateCosineSimilarity: vi.fn(),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { openaiEmbeddingsService } from '@server/services/openai-embeddings.service';
import { KeywordCannibalizationService } from '@server/services/keyword-cannibalization.service';

// =============================================================================
// Helpers
// =============================================================================

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const CAMPAIGN_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';

/** Build a chainable Supabase .from().select().eq() mock resolving with result */
function mockFromSelect(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  };
}

/** Build a chainable .from().select().eq().eq().single() mock */
function mockFromSelectEqEqSingle(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  };
}

/** Build a chainable .from().update().eq().eq() mock with a .then() handler */
function mockFromUpdateEqEq() {
  const thenMock = vi.fn().mockImplementation((cb: (val: { error: null }) => void) =>
    cb({ error: null })
  );
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ then: thenMock }),
    }),
  });
  return { update: updateMock, _thenMock: thenMock };
}

/** Build a fake IChatCompletionResult */
function makeLLMResponse(content: string) {
  return {
    content,
    model: 'openai/gpt-4o-mini',
    usage: { promptTokens: 10, completionTokens: 50, totalTokens: 60 },
    finishReason: 'stop',
  };
}

/** Sample embedding vector */
function makeEmbedding(seed: number): number[] {
  return [seed, seed + 0.1, seed + 0.2];
}

// =============================================================================
// Tests
// =============================================================================

describe('KeywordCannibalizationService', () => {
  let service: KeywordCannibalizationService;

  beforeEach(() => {
    service = new KeywordCannibalizationService();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // checkCannibalization — empty input
  // ---------------------------------------------------------------------------

  describe('checkCannibalization', () => {
    it('should return checked:true with empty arrays for empty keyword input', async () => {
      const result = await service.checkCannibalization(PROJECT_ID, CAMPAIGN_ID, [], USER_ID);

      expect(result.checked).toBe(true);
      expect(result.alreadyCovered).toEqual([]);
      expect(result.uncovered).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.suggestedKeywords).toBeUndefined();
    });

    it('should return warning for within-batch similarity exceeding threshold', async () => {
      const keywords = ['best seo tools', 'top seo software'];

      // No sitemap pages → all uncovered
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: [], error: null }) as never
      );

      // Embeddings service is configured
      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(true);

      // Generate embeddings for both keywords (both have nearly same vector)
      const emb0 = makeEmbedding(0.5);
      const emb1 = makeEmbedding(0.5);
      vi.mocked(openaiEmbeddingsService.generateBatchEmbeddings).mockResolvedValueOnce([
        emb0,
        emb1,
      ]);

      // calculateCosineSimilarity returns high similarity for the pair
      vi.mocked(openaiEmbeddingsService.calculateCosineSimilarity).mockReturnValue(0.95);

      // RPC returns no cross-campaign matches
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [], error: null } as never);

      const result = await service.checkCannibalization(
        PROJECT_ID,
        CAMPAIGN_ID,
        keywords,
        USER_ID
      );

      expect(result.checked).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].newKeyword).toBe('best seo tools');
      expect(result.warnings[0].existingKeyword).toBe('top seo software');
      expect(result.warnings[0].similarityPercent).toBe(95);
    });

    it('should continue on RPC error and return partial warnings without throwing', async () => {
      const keywords = ['seo tips'];

      // No sitemap pages
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: [], error: null }) as never
      );

      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(true);
      vi.mocked(openaiEmbeddingsService.generateBatchEmbeddings).mockResolvedValueOnce([
        makeEmbedding(0.1),
      ]);

      // RPC returns an error
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      } as never);

      const result = await service.checkCannibalization(
        PROJECT_ID,
        CAMPAIGN_ID,
        keywords,
        USER_ID
      );

      expect(result.checked).toBe(true);
      // No pairwise warnings (only 1 keyword), RPC error skipped gracefully
      expect(result.warnings).toHaveLength(0);
    });

    it('should skip GSC when no active connection exists', async () => {
      const keywords = ['covered keyword'];

      // Sitemap pages exist
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({
          data: [{ url: 'https://example.com/page', title: 'My Page' }],
          error: null,
        }) as never
      );

      // LLM says covered
      mockChatCompletionWithRetry.mockResolvedValueOnce(
        makeLLMResponse(
          JSON.stringify({
            covered: [
              {
                keyword: 'covered keyword',
                coveredByUrl: 'https://example.com/page',
                coveredByTitle: 'My Page',
                reason: 'Same topic',
              },
            ],
            uncovered: [],
          })
        )
      );

      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(false);

      // No active GSC connection
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelectEqEqSingle({ data: null, error: { message: 'No rows' } }) as never
      );

      const result = await service.checkCannibalization(
        PROJECT_ID,
        CAMPAIGN_ID,
        keywords,
        USER_ID
      );

      // GSC returns empty array (no connection found) → suggestedKeywords is [] or undefined
      expect(result.suggestedKeywords == null || result.suggestedKeywords.length === 0).toBe(true);
      expect(result.checked).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // checkSitemapCoverage
  // ---------------------------------------------------------------------------

  describe('checkSitemapCoverage', () => {
    it('should return all uncovered when no sitemap pages exist', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: [], error: null }) as never
      );

      const result = await service.checkSitemapCoverage(PROJECT_ID, ['seo tips', 'link building']);

      expect(result.covered).toEqual([]);
      expect(result.uncovered).toEqual(['seo tips', 'link building']);
    });

    it('should return all uncovered when sitemap_pages query returns null data', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: null, error: null }) as never
      );

      const result = await service.checkSitemapCoverage(PROJECT_ID, ['keyword one']);

      expect(result.covered).toEqual([]);
      expect(result.uncovered).toEqual(['keyword one']);
    });

    it('should identify covered keywords via LLM', async () => {
      const sitemapPages = [
        { url: 'https://example.com/coffee', title: 'Best Coffee Makers 2024' },
        { url: 'https://example.com/tea', title: 'Tea Guide' },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: sitemapPages, error: null }) as never
      );

      mockChatCompletionWithRetry.mockResolvedValueOnce(
        makeLLMResponse(
          JSON.stringify({
            covered: [
              {
                keyword: 'best coffee machines',
                coveredByUrl: 'https://example.com/coffee',
                coveredByTitle: 'Best Coffee Makers 2024',
                reason: 'Same search intent — coffee machines vs coffee makers',
              },
            ],
            uncovered: ['tea brewing tips'],
          })
        )
      );

      const result = await service.checkSitemapCoverage(PROJECT_ID, [
        'best coffee machines',
        'tea brewing tips',
      ]);

      expect(result.covered).toHaveLength(1);
      expect(result.covered[0].keyword).toBe('best coffee machines');
      expect(result.covered[0].coveredByUrl).toBe('https://example.com/coffee');
      expect(result.covered[0].coveredByTitle).toBe('Best Coffee Makers 2024');
      expect(result.covered[0].reason).toContain('coffee');
      expect(result.uncovered).toEqual(['tea brewing tips']);
    });

    it('should handle LLM JSON parse error gracefully — return all uncovered, no throw', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({
          data: [{ url: 'https://example.com/page', title: 'Some Page' }],
          error: null,
        }) as never
      );

      // LLM returns invalid JSON
      mockChatCompletionWithRetry.mockResolvedValueOnce(
        makeLLMResponse('This is not valid JSON at all!')
      );

      const keywords = ['keyword one', 'keyword two'];
      const result = await service.checkSitemapCoverage(PROJECT_ID, keywords);

      // Should not throw — fail-open: all uncovered
      expect(result.covered).toEqual([]);
      expect(result.uncovered).toEqual(keywords);
    });

    it('should chunk large sitemaps — 300 pages triggers chatCompletionWithRetry twice', async () => {
      // Create 300 sitemap pages (exceeds SITEMAP_CHUNK_SIZE = 200)
      const sitemapPages = Array.from({ length: 300 }, (_, i) => ({
        url: `https://example.com/page-${i}`,
        title: `Page ${i}`,
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: sitemapPages, error: null }) as never
      );

      // First chunk: covers one keyword
      mockChatCompletionWithRetry
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              covered: [
                {
                  keyword: 'covered in chunk 1',
                  coveredByUrl: 'https://example.com/page-1',
                  coveredByTitle: 'Page 1',
                  reason: 'Matches page 1',
                },
              ],
              uncovered: ['uncovered keyword'],
            })
          )
        )
        // Second chunk: nothing new covered
        .mockResolvedValueOnce(
          makeLLMResponse(
            JSON.stringify({
              covered: [],
              uncovered: ['uncovered keyword'],
            })
          )
        );

      const result = await service.checkSitemapCoverage(PROJECT_ID, [
        'covered in chunk 1',
        'uncovered keyword',
      ]);

      // chatCompletionWithRetry must have been called twice (two chunks)
      expect(mockChatCompletionWithRetry).toHaveBeenCalledTimes(2);
      expect(result.covered).toHaveLength(1);
      expect(result.covered[0].keyword).toBe('covered in chunk 1');
      expect(result.uncovered).toContain('uncovered keyword');
    });

    it('should treat all keywords as uncovered when LLM chunk throws', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({
          data: [{ url: 'https://example.com/page', title: 'A Page' }],
          error: null,
        }) as never
      );

      mockChatCompletionWithRetry.mockRejectedValueOnce(new Error('LLM timeout'));

      const keywords = ['some keyword'];
      const result = await service.checkSitemapCoverage(PROJECT_ID, keywords);

      // fail-open: all uncovered
      expect(result.covered).toEqual([]);
      expect(result.uncovered).toEqual(keywords);
    });

    it('should return empty covered/uncovered for empty keyword input', async () => {
      const result = await service.checkSitemapCoverage(PROJECT_ID, []);

      expect(result.covered).toEqual([]);
      expect(result.uncovered).toEqual([]);
      // supabase.from should NOT be called for empty input
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });

    it('should throw when sitemap_pages query errors', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        mockFromSelect({ data: null, error: { message: 'DB connection failed' } }) as never
      );

      await expect(
        service.checkSitemapCoverage(PROJECT_ID, ['some keyword'])
      ).rejects.toThrow('Failed to fetch sitemap pages');
    });
  });

  // ---------------------------------------------------------------------------
  // storeKeywordEmbeddings
  // ---------------------------------------------------------------------------

  describe('storeKeywordEmbeddings', () => {
    it('should skip when embeddings service is not configured', async () => {
      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(false);

      await service.storeKeywordEmbeddings(['keyword one', 'keyword two'], CAMPAIGN_ID);

      expect(openaiEmbeddingsService.generateBatchEmbeddings).not.toHaveBeenCalled();
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });

    it('should skip when keyword list is empty', async () => {
      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(true);

      await service.storeKeywordEmbeddings([], CAMPAIGN_ID);

      expect(openaiEmbeddingsService.generateBatchEmbeddings).not.toHaveBeenCalled();
    });

    it('should call update for each keyword when embeddings are generated', async () => {
      const keywords = ['seo tips', 'link building'];
      const embeddings = [makeEmbedding(0.1), makeEmbedding(0.5)];

      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(true);
      vi.mocked(openaiEmbeddingsService.generateBatchEmbeddings).mockResolvedValueOnce(embeddings);

      const updateMock = mockFromUpdateEqEq();
      vi.mocked(supabaseAdmin.from).mockReturnValue(updateMock as never);

      await service.storeKeywordEmbeddings(keywords, CAMPAIGN_ID);

      // from('keywords') called once per keyword
      expect(supabaseAdmin.from).toHaveBeenCalledTimes(keywords.length);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('keywords');
      expect(updateMock.update).toHaveBeenCalledTimes(keywords.length);
    });

    it('should continue without throwing when a batch embedding fails', async () => {
      const keywords = ['good keyword', 'another keyword'];

      vi.mocked(openaiEmbeddingsService.isConfigured).mockReturnValue(true);
      // generateBatchEmbeddings throws
      vi.mocked(openaiEmbeddingsService.generateBatchEmbeddings).mockRejectedValueOnce(
        new Error('API error')
      );

      // Should not throw
      await expect(
        service.storeKeywordEmbeddings(keywords, CAMPAIGN_ID)
      ).resolves.toBeUndefined();

      // No updates attempted when embedding generation fails (empty arrays are skipped)
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
    });
  });
});
