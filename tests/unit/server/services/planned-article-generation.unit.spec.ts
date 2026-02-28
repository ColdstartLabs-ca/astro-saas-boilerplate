/**
 * Unit tests for PlannedArticleGenerationService
 *
 * Focus: atomic promotion via RPC, concurrency-safe behavior, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlannedArticleGenerationService } from '@server/services/planned-article-generation.service';

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@server/services/article-generation.service', () => ({
  articleGenerationService: {
    generateArticle: vi.fn(),
  },
}));

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';

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
    ai_model_used: 'pro',
    image_preset: null,
    ...overrides,
  };
}

function mockPlannedArticlesQuery(articles: unknown[] | null, error: { message: string } | null = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: articles, error }),
            }),
          }),
        }),
      }),
    }),
  };
}

function mockCampaignQuery(campaign: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: campaign, error: null }),
      }),
    }),
  };
}

function mockSingleArticleQuery(article: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: article, error }),
        }),
      }),
    }),
  };
}

describe('PlannedArticleGenerationService', () => {
  let service: PlannedArticleGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlannedArticleGenerationService();
  });

  describe('processPlannedArticles', () => {
    it('returns zero counts when no planned articles are due', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockPlannedArticlesQuery([]) as never);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 0, queued: 0, skippedInsufficientCredits: 0 });
      expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    it('throws when planned articles query fails', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockPlannedArticlesQuery(null, { message: 'Connection timeout' }) as never
      );

      await expect(service.processPlannedArticles()).rejects.toThrow(
        'Failed to fetch planned articles: Connection timeout'
      );
    });

    it('promotes and generates when RPC promotion succeeds', async () => {
      const article = makePlannedArticle({ ai_model_used: 'pro' });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockPlannedArticlesQuery([article]) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [{ article_id: ARTICLE_ID }], error: null } as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 1, queued: 1, skippedInsufficientCredits: 0 });
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('promote_planned_article_with_credits', {
        p_article_id: ARTICLE_ID,
        p_user_id: USER_ID,
        p_credits_needed: 2,
        p_description: 'Planned article auto-generation: best seo tips',
      });
      expect(articleGenerationService.generateArticle).toHaveBeenCalledWith(
        ARTICLE_ID,
        USER_ID,
        expect.objectContaining({
          keyword: 'best seo tips',
          projectId: PROJECT_ID,
          campaignId: CAMPAIGN_ID,
          model: 'pro',
        })
      );
    });

    it('counts insufficient credits as skipped', async () => {
      const article = makePlannedArticle();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockPlannedArticlesQuery([article]) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Insufficient credits. Required: 2, Available: 0' },
      } as never);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 1, queued: 0, skippedInsufficientCredits: 1 });
      expect(articleGenerationService.generateArticle).not.toHaveBeenCalled();
    });

    it('skips silently when article was already promoted by another worker', async () => {
      const article = makePlannedArticle();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockPlannedArticlesQuery([article]) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [], error: null } as never);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 1, queued: 0, skippedInsufficientCredits: 0 });
      expect(articleGenerationService.generateArticle).not.toHaveBeenCalled();
    });

    it('resolves campaign model when ai_model_used is missing', async () => {
      const article = makePlannedArticle({ ai_model_used: null, image_preset: 'balanced' });
      const fromMock = vi.fn();
      fromMock.mockReturnValueOnce(mockPlannedArticlesQuery([article]) as never);
      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ ai_model: 'balanced', image_preset: 'balanced' }) as never
      );
      fromMock.mockReturnValueOnce(mockCampaignQuery({ ai_model: 'balanced' }) as never);

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [{ article_id: ARTICLE_ID }], error: null } as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      await service.processPlannedArticles();

      expect(articleGenerationService.generateArticle).toHaveBeenCalledWith(
        ARTICLE_ID,
        USER_ID,
        expect.objectContaining({ model: 'balanced' })
      );
    });

    it('continues processing other articles when one promotion fails unexpectedly', async () => {
      const article1 = makePlannedArticle({ id: 'article-1', primary_keyword: 'kw1' });
      const article2 = makePlannedArticle({ id: 'article-2', primary_keyword: 'kw2' });

      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockPlannedArticlesQuery([article1, article2]) as never
      );

      vi.mocked(supabaseAdmin.rpc)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB unavailable' } } as never)
        .mockResolvedValueOnce({ data: [{ article_id: 'article-2' }], error: null } as never);

      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.processPlannedArticles();

      expect(result).toEqual({ processed: 2, queued: 1, skippedInsufficientCredits: 0 });
      expect(articleGenerationService.generateArticle).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateSingleArticle', () => {
    it('throws when article is not found or not owned', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSingleArticleQuery(null, { message: 'Not found' }) as never
      );

      await expect(service.generateSingleArticle(ARTICLE_ID, USER_ID)).rejects.toThrow(
        'Article not found or access denied'
      );
    });

    it('throws when article is not in planned status', async () => {
      const article = makePlannedArticle({ status: 'queued' });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockSingleArticleQuery(article) as never);

      await expect(service.generateSingleArticle(ARTICLE_ID, USER_ID)).rejects.toThrow(
        'Article is not in planned status (current: queued)'
      );
    });

    it('throws when RPC reports insufficient credits', async () => {
      const article = makePlannedArticle({ status: 'planned', ai_model_used: 'pro' });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockSingleArticleQuery(article) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Insufficient credits. Required: 2, Available: 0' },
      } as never);

      await expect(service.generateSingleArticle(ARTICLE_ID, USER_ID)).rejects.toThrow(
        'Insufficient credits'
      );
    });

    it('throws when article was already promoted by another process', async () => {
      const article = makePlannedArticle({ status: 'planned', ai_model_used: 'pro' });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockSingleArticleQuery(article) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [], error: null } as never);

      await expect(service.generateSingleArticle(ARTICLE_ID, USER_ID)).rejects.toThrow(
        'Article is not in planned status (current: queued)'
      );
    });

    it('promotes and generates article successfully', async () => {
      const article = makePlannedArticle({ status: 'planned', ai_model_used: 'pro' });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockSingleArticleQuery(article) as never);
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: [{ article_id: ARTICLE_ID }], error: null } as never);
      vi.mocked(articleGenerationService.generateArticle).mockResolvedValue(undefined);

      const result = await service.generateSingleArticle(ARTICLE_ID, USER_ID);

      expect(result).toEqual({ queued: true, creditsDeducted: 2 });
      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('promote_planned_article_with_credits', {
        p_article_id: ARTICLE_ID,
        p_user_id: USER_ID,
        p_credits_needed: 2,
        p_description: 'Manual generation: best seo tips',
      });
      expect(articleGenerationService.generateArticle).toHaveBeenCalledWith(
        ARTICLE_ID,
        USER_ID,
        expect.objectContaining({ keyword: 'best seo tips', model: 'pro' })
      );
    });
  });
});
