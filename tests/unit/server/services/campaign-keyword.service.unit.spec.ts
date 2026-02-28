/**
 * Unit tests for CampaignKeywordService — addKeywords cannibalization integration
 *
 * Tests verify that:
 * - Covered keywords are filtered out and not inserted
 * - Uncovered keywords are inserted normally
 * - Cross-campaign warnings are returned
 * - GSC suggestions are returned when all keywords are covered
 * - Embeddings are stored fire-and-forget after insertion
 * - The service fails open when cannibalization check throws
 * - Test mode bypasses the cannibalization check
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// Mocks — vi.mock calls are hoisted; use vi.hoisted() for shared mock fns
// =============================================================================

const { mockCheckCannibalization, mockStoreKeywordEmbeddings } = vi.hoisted(() => ({
  mockCheckCannibalization: vi.fn(),
  mockStoreKeywordEmbeddings: vi.fn(),
}));

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@server/services/keyword-cannibalization.service', () => ({
  keywordCannibalizationService: {
    checkCannibalization: mockCheckCannibalization,
    storeKeywordEmbeddings: mockStoreKeywordEmbeddings,
  },
}));

vi.mock('@shared/config/env', () => ({
  serverEnv: {
    ENV: 'production', // non-test mode by default
  },
}));

vi.mock('@server/services/campaign-lifecycle.service', () => ({
  testModeCampaigns: new Map(),
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { CampaignKeywordService } from '@server/services/campaign-keyword.service';
import { serverEnv } from '@shared/config/env';
import { testModeCampaigns } from '@server/services/campaign-lifecycle.service';

// =============================================================================
// Helpers
// =============================================================================

const CAMPAIGN_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';
const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

/** Build a chainable .from().select().eq().eq().single() mock */
function mockCampaignSelect(result: { data: unknown; error: unknown }) {
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

/** Build a chainable .from().select().eq() mock for keywords */
function mockKeywordsSelect(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  };
}

/** Build a chainable .from().insert() mock */
function mockInsert(result: { error: unknown }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('CampaignKeywordService — addKeywords cannibalization integration', () => {
  let service: CampaignKeywordService;

  beforeEach(() => {
    service = new CampaignKeywordService();
    vi.clearAllMocks();
    // Default: storeKeywordEmbeddings resolves successfully
    mockStoreKeywordEmbeddings.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // Helper: set up standard DB mocks for a 3-call sequence:
  // 1. campaigns select (ownership check)
  // 2. keywords select (existing keywords)
  // 3. keywords insert
  // ---------------------------------------------------------------------------
  function setupDbMocks(
    existingKeywords: string[] = [],
    insertError: unknown = null
  ) {
    vi.mocked(supabaseAdmin.from)
      // Call 1: campaigns ownership check — returns project_id
      .mockReturnValueOnce(
        mockCampaignSelect({
          data: { id: CAMPAIGN_ID, project_id: PROJECT_ID },
          error: null,
        }) as never
      )
      // Call 2: existing keywords query
      .mockReturnValueOnce(
        mockKeywordsSelect({
          data: existingKeywords.map(k => ({ keyword_normalized: k })),
          error: null,
        }) as never
      )
      // Call 3: insert
      .mockReturnValueOnce(mockInsert({ error: insertError }) as never);
  }

  // ---------------------------------------------------------------------------
  // 1. Filter out covered keywords
  // ---------------------------------------------------------------------------

  it('should filter out covered keywords and only insert uncovered ones', async () => {
    // DB mocks
    setupDbMocks();

    // CAS returns 2 covered, 1 uncovered
    mockCheckCannibalization.mockResolvedValueOnce({
      alreadyCovered: [
        {
          keyword: 'covered kw 1',
          coveredByUrl: 'https://example.com/page1',
          coveredByTitle: 'Page 1',
          reason: 'Same intent',
        },
        {
          keyword: 'covered kw 2',
          coveredByUrl: 'https://example.com/page2',
          coveredByTitle: 'Page 2',
          reason: 'Duplicate topic',
        },
      ],
      uncovered: ['new kw'],
      warnings: [],
      suggestedKeywords: undefined,
      checked: true,
    });

    const result = await service.addKeywords(
      CAMPAIGN_ID,
      USER_ID,
      ['covered kw 1', 'covered kw 2', 'new kw']
    );

    // Only 1 keyword inserted
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.alreadyCovered).toHaveLength(2);
    expect(result.alreadyCovered[0].keyword).toBe('covered kw 1');
    expect(result.alreadyCovered[1].keyword).toBe('covered kw 2');
    expect(result.cannibalizationChecked).toBe(true);

    // Verify insert was called with only the uncovered keyword
    const insertMock = vi.mocked(supabaseAdmin.from).mock.results[2]?.value;
    expect(insertMock?.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ keyword: 'new kw' }),
      ])
    );
    expect(insertMock?.insert).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ keyword: 'covered kw 1' }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Include cannibalizationWarnings in response
  // ---------------------------------------------------------------------------

  it('should include cannibalizationWarnings in the response', async () => {
    setupDbMocks();

    const warning = {
      newKeyword: 'seo tips',
      existingKeyword: 'seo advice',
      existingCampaignName: 'Other Campaign',
      existingCampaignId: '99999999-9999-9999-9999-999999999999',
      similarity: 0.92,
      similarityPercent: 92,
    };

    mockCheckCannibalization.mockResolvedValueOnce({
      alreadyCovered: [],
      uncovered: ['seo tips'],
      warnings: [warning],
      suggestedKeywords: undefined,
      checked: true,
    });

    const result = await service.addKeywords(CAMPAIGN_ID, USER_ID, ['seo tips']);

    expect(result.cannibalizationWarnings).toHaveLength(1);
    expect(result.cannibalizationWarnings[0].newKeyword).toBe('seo tips');
    expect(result.cannibalizationWarnings[0].similarityPercent).toBe(92);
    expect(result.added).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Include suggestedKeywords when all keywords are covered
  // ---------------------------------------------------------------------------

  it('should include suggestedKeywords when all keywords are covered', async () => {
    // No insert call needed when nothing is uncovered — only 2 from() calls
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(
        mockCampaignSelect({
          data: { id: CAMPAIGN_ID, project_id: PROJECT_ID },
          error: null,
        }) as never
      )
      .mockReturnValueOnce(
        mockKeywordsSelect({ data: [], error: null }) as never
      );
    // No insert mock needed — keywordRows will be empty

    mockCheckCannibalization.mockResolvedValueOnce({
      alreadyCovered: [
        {
          keyword: 'best laptops',
          coveredByUrl: 'https://example.com/laptops',
          coveredByTitle: 'Top Laptops Guide',
          reason: 'Exact match',
        },
      ],
      uncovered: [],
      warnings: [],
      suggestedKeywords: ['gaming laptops 2026', 'budget laptops under 500'],
      checked: true,
    });

    const result = await service.addKeywords(CAMPAIGN_ID, USER_ID, ['best laptops']);

    expect(result.added).toBe(0);
    expect(result.alreadyCovered).toHaveLength(1);
    expect(result.suggestedKeywords).toEqual([
      'gaming laptops 2026',
      'budget laptops under 500',
    ]);
    expect(result.cannibalizationChecked).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Fail-open: cannibalization check throws → insert all uniqueNew, checked=false
  // ---------------------------------------------------------------------------

  it('should insert all unique keywords and return cannibalizationChecked:false when service throws', async () => {
    setupDbMocks();

    mockCheckCannibalization.mockRejectedValueOnce(new Error('OpenRouter timeout'));

    const result = await service.addKeywords(
      CAMPAIGN_ID,
      USER_ID,
      ['kw one', 'kw two']
    );

    // Fail-open: both keywords inserted
    expect(result.added).toBe(2);
    expect(result.duplicates).toBe(0);
    expect(result.alreadyCovered).toEqual([]);
    expect(result.cannibalizationWarnings).toEqual([]);
    expect(result.cannibalizationChecked).toBe(false);

    // Verify insert was called with both keywords
    const insertMock = vi.mocked(supabaseAdmin.from).mock.results[2]?.value;
    expect(insertMock?.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ keyword: 'kw one' }),
        expect.objectContaining({ keyword: 'kw two' }),
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Fire-and-forget storeKeywordEmbeddings called with uncovered keywords
  // ---------------------------------------------------------------------------

  it('should fire-and-forget storeKeywordEmbeddings with uncovered keywords after insert', async () => {
    setupDbMocks();

    mockCheckCannibalization.mockResolvedValueOnce({
      alreadyCovered: [],
      uncovered: ['kw alpha', 'kw beta'],
      warnings: [],
      suggestedKeywords: undefined,
      checked: true,
    });

    await service.addKeywords(CAMPAIGN_ID, USER_ID, ['kw alpha', 'kw beta']);

    // Allow microtasks to flush (fire-and-forget uses void + .catch)
    await Promise.resolve();

    expect(mockStoreKeywordEmbeddings).toHaveBeenCalledWith(
      ['kw alpha', 'kw beta'],
      CAMPAIGN_ID
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Test mode: mock_user_ bypasses CAS, returns checked:false
  // ---------------------------------------------------------------------------

  it('test mode: should return cannibalizationChecked:false without calling CAS for mock_user_', async () => {
    // Override ENV to 'test'
    vi.mocked(serverEnv).ENV = 'test';

    const mockCampaignId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const mockUserId = 'mock_user_abc';

    // Seed in-memory campaigns store
    (testModeCampaigns as Map<string, { user_id: string; keywords: unknown[] }>).set(
      mockCampaignId,
      { user_id: mockUserId, keywords: [] }
    );

    const result = await service.addKeywords(mockCampaignId, mockUserId, ['test keyword']);

    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.alreadyCovered).toEqual([]);
    expect(result.cannibalizationWarnings).toEqual([]);
    expect(result.suggestedKeywords).toBeUndefined();
    expect(result.cannibalizationChecked).toBe(false);

    // CAS must NOT have been called in test mode
    expect(mockCheckCannibalization).not.toHaveBeenCalled();
    expect(mockStoreKeywordEmbeddings).not.toHaveBeenCalled();

    // Restore
    vi.mocked(serverEnv).ENV = 'production';
    testModeCampaigns.clear();
  });
});
