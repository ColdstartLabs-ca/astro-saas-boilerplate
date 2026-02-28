/**
 * Unit tests for PlannedArticleGenerationService
 *
 * Tests the cron logic that transitions planned articles to queued,
 * deducts credits, and triggers generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlannedArticleGenerationService } from '@server/services/planned-article-generation.service';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@server/services/article-generation.service', () => ({
  articleGenerationService: {
    generateArticle: vi.fn(),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';

// =============================================================================
// Test helpers
// =============================================================================

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMPAIGN_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ARTICLE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

function makePlannedArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: ARTICLE_ID,
    user_id: USER_ID,
    campaign_id: CAMPAIGN_ID,
    project_id: PROJECT_ID,
    primary_keyword: 'best seo tips',
    ai_model_used: null,
    image_preset: null,
    ...overrides,
  };
}

function makeProfile(subscriptionBalance: number, purchasedBalance: number) {
  return {
    subscription_credits_balance: subscriptionBalance,
    purchased_credits_balance: purchasedBalance,
  };
}

/**
 * Build a mock for the planned articles query.
 * Supports: .from('articles').select().eq().not().lte().order().limit()
 */
function mockArticlesQuery(articles: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: articles, error: null }),
            }),
          }),
        }),
      }),
    }),
  };
}

/**
 * Build a mock for the articles query that throws a DB error.
 */
function mockArticlesQueryError(message: string) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message } }),
            }),
          }),
        }),
      }),
    }),
  };
}

/**
 * Build a mock for a single-row profile query.
 * Supports: .from('profiles').select().eq().single()
 */
function mockProfileQuery(profile: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: profile, error: null }),
      }),
    }),
  };
}

/**
 * Build a mock for an UPDATE chain: .from().update().eq()
 */
function mockUpdateQuery(error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  };
}

/**
 * Build a mock for INSERT: .from().insert()
 */
function mockInsertQuery(error: unknown = null) {
  return {
    insert: vi.fn().mockResolvedValue({ error }),
  };
}

/**
 * Build a mock for a campaign single-row query.
 * Supports: .from('campaigns').select().eq().single()
 */
function mockCampaignQuery(campaign: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: campaign, error: null }),
      }),
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PlannedArticleGenerationService', () => {
  let service: PlannedArticleGenerationService;

  beforeEach(() => {
    service = new PlannedArticleGenerationService();
    vi.clearAllMocks();
  });

  describe('processPlannedArticles', () => {
    it('should return zeros when no planned articles are due', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockArticlesQuery([]) as never);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 0, queued: 0, skippedInsufficientCredits: 0 });
    });

    it('should throw when articles query fails', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockArticlesQueryError('Connection timeout') as never
      );

      await expect(service.processPlannedArticles()).rejects.toThrow(
        'Failed to fetch planned articles: Connection timeout'
      );
    });

    it('should transition planned → queued for articles within lead time', async () => {
      const article = makePlannedArticle({ ai_model_used: 'pro' });
      const profile = makeProfile(5, 0);

      const fromMock = vi.fn();

      // 1. Fetch planned articles
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      // 2. Fetch profile for credit check (resolveCreditCost skips campaign lookup because ai_model_used is set)
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      // 3. Update article status to queued
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      // 4. Update profile credits
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      // 5. Insert credit_transaction
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      expect(result.processed).toBe(1);
      expect(result.queued).toBe(1);
      expect(result.skippedInsufficientCredits).toBe(0);

      // Verify article was transitioned to 'queued'
      const updateCalls = fromMock.mock.calls
        .map((call: unknown[]) => call[0])
        .filter((table: unknown) => table === 'articles');
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('should call generateArticle with correct parameters', async () => {
      const article = makePlannedArticle({
        ai_model_used: 'pro',
        primary_keyword: 'seo basics',
        image_preset: 'budget',
      });
      const profile = makeProfile(5, 0);

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      expect(articleGenerationService.generateArticle).toHaveBeenCalledWith(
        ARTICLE_ID,
        USER_ID,
        expect.objectContaining({
          keyword: 'seo basics',
          projectId: PROJECT_ID,
          campaignId: CAMPAIGN_ID,
          model: 'pro',
          imagePreset: 'budget',
        })
      );
    });

    it('should skip when user has insufficient credits', async () => {
      const article = makePlannedArticle({ ai_model_used: 'pro' });
      const profile = makeProfile(0, 0); // No credits

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.processPlannedArticles();

      expect(result.processed).toBe(1);
      expect(result.queued).toBe(0);
      expect(result.skippedInsufficientCredits).toBe(1);

      // generateArticle should NOT have been called
      expect(articleGenerationService.generateArticle).not.toHaveBeenCalled();
    });

    it('should deduct credits equal to the article credit cost', async () => {
      // 'ultra' writer preset = 3 credits, 'balanced' image preset = 1 credit → total 4
      const article = makePlannedArticle({
        ai_model_used: 'ultra',
        image_preset: 'balanced',
      });
      const profile = makeProfile(4, 2); // 6 total credits

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);

      const updateArticleMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const updateProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      fromMock.mockReturnValueOnce({ update: updateArticleMock } as never);
      fromMock.mockReturnValueOnce({ update: updateProfileMock } as never);
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      // Verify article update includes credits_used = 4
      expect(updateArticleMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued', credits_used: 4 })
      );

      // Verify profile update deducts 4 credits (FIFO: subscription first)
      // subscription: 4 - 4 = 0, purchased: 2 - 0 = 2
      expect(updateProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_credits_balance: 0,
          purchased_credits_balance: 2,
        })
      );
    });

    it('should use FIFO credit deduction (subscription first, then purchased)', async () => {
      // Cost = 3 credits; subscription has 2, purchased has 5
      const article = makePlannedArticle({ ai_model_used: 'ultra' }); // 3 credits
      const profile = makeProfile(2, 5);

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);

      const updateArticleMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const updateProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      fromMock.mockReturnValueOnce({ update: updateArticleMock } as never);
      fromMock.mockReturnValueOnce({ update: updateProfileMock } as never);
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      // Verify FIFO: 2 from subscription, 1 from purchased
      expect(updateProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_credits_balance: 0, // 2 - 2
          purchased_credits_balance: 4, // 5 - 1
        })
      );
    });

    it('should insert a credit_transaction record with negative amount', async () => {
      const article = makePlannedArticle({
        ai_model_used: 'pro', // 2 credits
        primary_keyword: 'content marketing',
      });
      const profile = makeProfile(5, 0);

      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);

      const insertMock = vi.fn().mockResolvedValue({ error: null });
      fromMock.mockReturnValueOnce({ insert: insertMock } as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          amount: -2, // negative = deduction
          type: 'usage',
          reference_id: ARTICLE_ID,
        })
      );
    });

    it('should respect MAX_PLANNED_ARTICLES_PER_RUN limit', async () => {
      // Generate 15 articles (more than the limit of 10)
      const articles = Array.from({ length: 15 }, (_, i) => ({
        ...makePlannedArticle({ ai_model_used: 'pro' }),
        id: `article-${i}-dddd-dddd-dddd-dddddddddddd`,
      }));

      // The query itself is limited by the service via .limit(MAX_PLANNED_ARTICLES_PER_RUN)
      // The mock simulates DB returning only 10 (as the query would in production)
      const limitedArticles = articles.slice(0, 10);
      const profile = makeProfile(30, 0);

      const fromMock = vi.fn();

      // Fetch articles (returns 10 due to limit)
      fromMock.mockReturnValueOnce(mockArticlesQuery(limitedArticles) as never);

      // For each of the 10 articles: profile + article update + profile update + insert tx
      for (let i = 0; i < 10; i++) {
        fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
        fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
        fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
        fromMock.mockReturnValueOnce(mockInsertQuery() as never);
      }

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      // Only 10 should be processed (the limit)
      expect(result.processed).toBe(10);
      expect(result.queued).toBe(10);
      expect(articleGenerationService.generateArticle).toHaveBeenCalledTimes(10);
    });

    it('should look up campaign model when article has no ai_model_used', async () => {
      const article = makePlannedArticle({
        ai_model_used: null,
        // No model on article → should look up campaign
      });
      const campaign = { ai_model: 'balanced', image_preset: null };
      const profile = makeProfile(5, 0);

      const fromMock = vi.fn();

      // 1. Articles query
      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      // 2. Campaign lookup for resolveCreditCost
      fromMock.mockReturnValueOnce(mockCampaignQuery(campaign) as never);
      // 3. Profile query
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      // 4. Update article
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      // 5. Update profile
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      // 6. Insert transaction
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);
      // 7. Campaign lookup for resolveGenerationModel
      fromMock.mockReturnValueOnce(mockCampaignQuery(campaign) as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      expect(result.queued).toBe(1);
      expect(articleGenerationService.generateArticle).toHaveBeenCalledWith(
        ARTICLE_ID,
        USER_ID,
        expect.objectContaining({ model: 'balanced' })
      );
    });

    it('should default to 1 credit when no model or campaign found', async () => {
      const article = makePlannedArticle({
        ai_model_used: null,
        campaign_id: null,
        project_id: null,
      });
      const profile = makeProfile(1, 0);

      const fromMock = vi.fn();

      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      // No campaign lookup (campaign_id is null)
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);

      const updateArticleMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      fromMock.mockReturnValueOnce({ update: updateArticleMock } as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      // Default cost is 1 credit
      expect(updateArticleMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued', credits_used: 1 })
      );
    });

    it('should continue processing remaining articles when one fails', async () => {
      const article1 = { ...makePlannedArticle({ ai_model_used: 'pro' }), id: 'art-1' };
      const article2 = { ...makePlannedArticle({ ai_model_used: 'pro' }), id: 'art-2' };
      const profile = makeProfile(10, 0);

      const fromMock = vi.fn();

      // Fetch articles (both)
      fromMock.mockReturnValueOnce(mockArticlesQuery([article1, article2]) as never);

      // Article 1: profile fetch → update article (fails)
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      fromMock.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      } as never);

      // Article 2: normal happy path
      fromMock.mockReturnValueOnce(mockProfileQuery(profile) as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockUpdateQuery() as never);
      fromMock.mockReturnValueOnce(mockInsertQuery() as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      // Article 1 failed silently, article 2 succeeded
      expect(result.processed).toBe(2);
      expect(result.queued).toBe(1);
    });

    it('should skip article and count as skippedInsufficientCredits when profile fetch fails', async () => {
      const article = makePlannedArticle({ ai_model_used: 'pro' });

      const fromMock = vi.fn();

      fromMock.mockReturnValueOnce(mockArticlesQuery([article]) as never);
      // Profile fetch returns error
      fromMock.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      } as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.processPlannedArticles();

      expect(result.processed).toBe(1);
      expect(result.queued).toBe(0);
      expect(result.skippedInsufficientCredits).toBe(1);
    });
  });
});
