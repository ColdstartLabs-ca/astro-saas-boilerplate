/**
 * Unit tests for ContentPlanningService
 *
 * Tests the core planning logic: fetching pending keywords, deleting old planned articles,
 * inserting new planned article stubs, and distributing them across dates by frequency.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentPlanningService } from '@server/services/content-planning.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';

// Mock supabase admin
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// =============================================================================
// Helpers
// =============================================================================

const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const PROJECT_ID = '33333333-3333-3333-3333-333333333333';

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: CAMPAIGN_ID,
    user_id: USER_ID,
    project_id: PROJECT_ID,
    schedule_frequency: 'daily',
    schedule_hour: 9,
    schedule_timezone: 'UTC',
    ...overrides,
  };
}

function makeKeyword(id: string, keyword: string) {
  return { id, keyword };
}

/**
 * Build a deeply-chainable Supabase mock that resolves with `result` at the final `.single()` call.
 * Supports: .from().select().eq().eq().single()
 */
function mockCampaignQuery(result: { data: unknown; error: unknown }) {
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

/**
 * Build a chainable Supabase mock for keyword SELECT with .eq().eq().order()
 */
function mockKeywordsQuery(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  };
}

/**
 * Build a chainable Supabase mock for DELETE with .eq().eq()
 */
function mockDeleteQuery(result: { error: unknown }) {
  return {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

/**
 * Build a chainable Supabase mock for INSERT
 */
function mockInsertQuery(result: { error: unknown }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ContentPlanningService', () => {
  let service: ContentPlanningService;

  beforeEach(() => {
    service = new ContentPlanningService();
    vi.clearAllMocks();
  });

  describe('planContent', () => {
    it('should return 0 when no pending keywords', async () => {
      const fromMock = vi.fn();

      // First call: campaign fetch
      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      // Second call: keywords fetch (empty)
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: [], error: null }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.planContent(CAMPAIGN_ID, USER_ID);

      expect(result).toEqual({
        planned: 0,
        startDate: null,
        endDate: null,
        message: 'No pending keywords',
      });
    });

    it('should create planned articles from campaign keywords', async () => {
      const keywords = [
        makeKeyword('kw-1', 'best seo tips'),
        makeKeyword('kw-2', 'keyword research guide'),
        makeKeyword('kw-3', 'content marketing strategy'),
      ];

      const fromMock = vi.fn();
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({ insert: insertMock });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.planContent(CAMPAIGN_ID, USER_ID);

      expect(result.planned).toBe(3);
      expect(result.startDate).not.toBeNull();
      expect(result.endDate).not.toBeNull();
      expect(result.message).toBeUndefined();

      // Verify articles were inserted
      expect(insertMock).toHaveBeenCalledOnce();
      const insertedArticles = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect(insertedArticles).toHaveLength(3);

      // Verify all articles have status='planned' and no credits
      insertedArticles.forEach(article => {
        expect(article.status).toBe('planned');
        expect(article.credits_used).toBe(0);
        expect(article.content).toBeNull();
        expect(article.campaign_id).toBe(CAMPAIGN_ID);
        expect(article.user_id).toBe(USER_ID);
        expect(article.project_id).toBe(PROJECT_ID);
      });

      // Verify keywords are used as titles and primary_keyword
      expect(insertedArticles[0].primary_keyword).toBe('best seo tips');
      expect(insertedArticles[0].title).toBe('best seo tips');
      expect(insertedArticles[1].primary_keyword).toBe('keyword research guide');
      expect(insertedArticles[2].primary_keyword).toBe('content marketing strategy');
    });

    it('should space articles using campaign daily frequency — dates 1 day apart', async () => {
      const keywords = [
        makeKeyword('kw-1', 'first keyword'),
        makeKeyword('kw-2', 'second keyword'),
      ];

      const fromMock = vi.fn();
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ data: makeCampaign({ schedule_frequency: 'daily' }), error: null })
      );
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({ insert: insertMock });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.planContent(CAMPAIGN_ID, USER_ID);

      const insertedArticles = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect(insertedArticles).toHaveLength(2);

      const date1 = new Date(insertedArticles[0].scheduled_publish_at as string);
      const date2 = new Date(insertedArticles[1].scheduled_publish_at as string);

      // Daily frequency = 24h interval = ~86400000ms apart (allow ±60s tolerance)
      const diffMs = date2.getTime() - date1.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(Math.abs(diffMs - oneDayMs)).toBeLessThan(60 * 1000);
    });

    it('should space articles using weekly frequency — dates ~7 days apart', async () => {
      const keywords = [
        makeKeyword('kw-1', 'first keyword'),
        makeKeyword('kw-2', 'second keyword'),
      ];

      const fromMock = vi.fn();
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ data: makeCampaign({ schedule_frequency: 'weekly' }), error: null })
      );
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({ insert: insertMock });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.planContent(CAMPAIGN_ID, USER_ID);

      const insertedArticles = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
      const date1 = new Date(insertedArticles[0].scheduled_publish_at as string);
      const date2 = new Date(insertedArticles[1].scheduled_publish_at as string);

      // Weekly frequency = 168h interval = 7 days
      const diffMs = date2.getTime() - date1.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(diffMs - sevenDaysMs)).toBeLessThan(60 * 1000);
    });

    it('should delete existing planned articles before re-planning', async () => {
      const keywords = [makeKeyword('kw-1', 'seo basics')];

      const fromMock = vi.fn();
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce({ delete: deleteMock });
      fromMock.mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.planContent(CAMPAIGN_ID, USER_ID);

      // DELETE must have been called (third from() call)
      expect(fromMock).toHaveBeenCalledTimes(4);
      expect(deleteMock).toHaveBeenCalledOnce();
    });

    it('should default to daily frequency when campaign has none', async () => {
      const keywords = [
        makeKeyword('kw-1', 'first keyword'),
        makeKeyword('kw-2', 'second keyword'),
      ];

      const fromMock = vi.fn();
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      // Campaign with null schedule_frequency
      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ data: makeCampaign({ schedule_frequency: null }), error: null })
      );
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({ insert: insertMock });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.planContent(CAMPAIGN_ID, USER_ID);

      const insertedArticles = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect(insertedArticles).toHaveLength(2);

      const date1 = new Date(insertedArticles[0].scheduled_publish_at as string);
      const date2 = new Date(insertedArticles[1].scheduled_publish_at as string);

      // Defaults to 'daily' = 24h apart (allow ±60s tolerance)
      const diffMs = date2.getTime() - date1.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(Math.abs(diffMs - oneDayMs)).toBeLessThan(60 * 1000);
    });

    it('should throw CampaignNotFoundError when campaign does not exist', async () => {
      const fromMock = vi.fn();

      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ data: null, error: { message: 'No rows returned' } })
      );

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await expect(service.planContent(CAMPAIGN_ID, USER_ID)).rejects.toThrow(
        CampaignNotFoundError
      );
    });

    it('should throw CampaignNotFoundError when campaign is owned by a different user', async () => {
      const fromMock = vi.fn();

      // Supabase returns no data when user_id does not match (due to .eq('user_id', userId))
      fromMock.mockReturnValueOnce(
        mockCampaignQuery({ data: null, error: { message: 'PGRST116' } })
      );

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await expect(service.planContent(CAMPAIGN_ID, 'different-user-id')).rejects.toThrow(
        CampaignNotFoundError
      );
    });

    it('should throw when keyword fetch fails', async () => {
      const fromMock = vi.fn();

      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      fromMock.mockReturnValueOnce(
        mockKeywordsQuery({ data: null, error: { message: 'DB connection failed' } })
      );

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await expect(service.planContent(CAMPAIGN_ID, USER_ID)).rejects.toThrow(
        'Failed to fetch pending keywords'
      );
    });

    it('should throw when article insert fails', async () => {
      const keywords = [makeKeyword('kw-1', 'seo basics')];
      const fromMock = vi.fn();

      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Insert constraint violated' } }),
      });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await expect(service.planContent(CAMPAIGN_ID, USER_ID)).rejects.toThrow(
        'Failed to insert planned articles'
      );
    });

    it('should schedule articles starting from tomorrow, not today', async () => {
      const keywords = [makeKeyword('kw-1', 'tomorrow keyword')];
      const fromMock = vi.fn();
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      fromMock.mockReturnValueOnce(mockCampaignQuery({ data: makeCampaign(), error: null }));
      fromMock.mockReturnValueOnce(mockKeywordsQuery({ data: keywords, error: null }));
      fromMock.mockReturnValueOnce(mockDeleteQuery({ error: null }));
      fromMock.mockReturnValueOnce({ insert: insertMock });

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.planContent(CAMPAIGN_ID, USER_ID);

      const insertedArticles = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
      const scheduledDate = new Date(insertedArticles[0].scheduled_publish_at as string);
      const now = new Date();

      // Scheduled date must be in the future (after now)
      expect(scheduledDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });
});
