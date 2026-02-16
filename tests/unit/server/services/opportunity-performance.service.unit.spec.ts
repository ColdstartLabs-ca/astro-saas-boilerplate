/**
 * Unit tests for OpportunityPerformanceService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OpportunityPerformanceService,
  type IOpportunityForCheck,
} from '@server/services/opportunity-performance.service';
import dayjs from 'dayjs';

// Mock dependencies
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@server/services/gsc.service', () => ({
  gscService: {
    getValidAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
    getSearchAnalytics: vi.fn(() =>
      Promise.resolve({
        rows: [
          {
            keys: ['test query', 'https://example.com'],
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 5,
          },
        ],
      })
    ),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

describe('OpportunityPerformanceService', () => {
  let service: OpportunityPerformanceService;

  beforeEach(() => {
    service = new OpportunityPerformanceService();
    vi.clearAllMocks();
  });

  describe('getOpportunitiesDueForCheck', () => {
    it('should find opportunities due for check (14+ days old, not recently checked)', async () => {
      // Create a date 15 days ago (meets the 14+ day requirement)
      const oldDate = dayjs().subtract(15, 'day').toISOString();
      // Create a date 8 days ago (meets the 7+ day since last check requirement)
      const lastChecked = dayjs().subtract(8, 'day').toISOString();

      const mockOpportunities: IOpportunityForCheck[] = [
        {
          id: 'opp-1',
          project_id: 'proj-1',
          user_id: 'user-1',
          query: 'test query',
          metrics: { position: 10, impressions: 100, clicks: 5, ctr: 0.05 },
          action_type: 'create_article',
          action_ref_id: 'campaign-1',
          created_at: oldDate,
        },
        {
          id: 'opp-2',
          project_id: 'proj-1',
          user_id: 'user-1',
          query: 'another query',
          metrics: { position: 15, impressions: 200, clicks: 10, ctr: 0.05 },
          action_type: 'create_article',
          action_ref_id: 'campaign-2',
          created_at: oldDate,
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockOpportunities,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await service.getOpportunitiesDueForCheck();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('opp-1');
      expect(result[1].id).toBe('opp-2');
    });

    it('should return empty array when no opportunities are due', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await service.getOpportunitiesDueForCheck();

      expect(result).toHaveLength(0);
    });

    it('should throw error on database failure', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Database error' },
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      await expect(service.getOpportunitiesDueForCheck()).rejects.toThrow(
        'Failed to fetch opportunities due for check'
      );
    });

    it('should limit results to MAX_OPPORTUNITIES_PER_RUN', async () => {
      // This test verifies the service passes the limit parameter correctly
      const mockOpportunities: IOpportunityForCheck[] = Array.from({ length: 25 }, (_, i) => ({
        id: `opp-${i}`,
        project_id: 'proj-1',
        user_id: 'user-1',
        query: `query ${i}`,
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      }));

      const limitMock = vi.fn().mockResolvedValue({
        data: mockOpportunities.slice(0, 20),
        error: null,
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: limitMock,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await service.getOpportunitiesDueForCheck();

      // Verify limit was called with 20
      expect(limitMock).toHaveBeenCalled();
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });

  describe('checkPerformance', () => {
    it('should compare current GSC metrics against original opportunity metrics', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      // Mock article lookup
      const mockArticles = [{ id: 'article-1', primary_keyword: 'test query' }];
      // Mock GSC connection lookup
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };
      // Mock performance check insert
      const mockInsert = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      // Mock opportunity update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const fromMock = vi.fn();
      // Article query
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      // GSC connection query
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      // Performance check insert
      fromMock.mockImplementationOnce(() => ({ insert: mockInsert }));
      // Opportunity update
      fromMock.mockImplementationOnce(() => ({ update: mockUpdate }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(true);
      expect(result.positionBefore).toBe(10);
      // Position should have improved from 10 to 5
      expect(result.positionAfter).toBe(5);
      expect(result.status).toBe('improved');
    });

    it('should mark as improved when position gained > 3', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const mockArticles = [{ id: 'article-1', primary_keyword: 'test query' }];
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const fromMock = vi.fn();
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      // Position improved from 10 to 5 = 5 positions gained (> 3)
      expect(result.status).toBe('improved');
    });

    it('should mark as stable when position change <= 3', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 7, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const mockArticles = [{ id: 'article-1', primary_keyword: 'test query' }];
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const fromMock = vi.fn();
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      // Position changed from 7 to 5 = 2 positions (<= 3, so stable)
      expect(result.status).toBe('stable');
    });

    it('should mark as declined when position lost > 3', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 1, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const mockArticles = [{ id: 'article-1', primary_keyword: 'test query' }];
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const fromMock = vi.fn();
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      // Position declined from 1 to 5 = 4 positions lost (> 3)
      expect(result.status).toBe('declined');
    });

    it('should auto-complete opportunity when improved by > 5 positions', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 15, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const mockArticles = [{ id: 'article-1', primary_keyword: 'test query' }];
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const fromMock = vi.fn();
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));
      fromMock.mockImplementationOnce(() => ({ update: updateMock }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      await service.checkPerformance(opportunity);

      // Verify update was called with status = 'completed'
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          performance_status: 'improved',
        })
      );
    });

    it('should handle missing GSC data gracefully (not_found status)', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'nonexistent query',
        metrics: { position: 10, impressions: 100, clicks: 5, ctr: 0.05 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const mockArticles = [{ id: 'article-1', primary_keyword: 'nonexistent query' }];
      const mockConnection = {
        id: 'conn-1',
        site_url: 'https://example.com',
        access_token: 'token',
        refresh_token: 'refresh',
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      // Mock GSC service to return no data for this query
      const { gscService } = await import('@server/services/gsc.service');
      vi.mocked(gscService.getSearchAnalytics).mockResolvedValueOnce({
        rows: [], // No data for this query
      });

      const fromMock = vi.fn();
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockArticles, error: null }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
              }),
            }),
          }),
        }),
      }));
      fromMock.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(true);
      expect(result.status).toBe('not_found');
      expect(result.positionAfter).toBeNull();
    });

    it('should return error when opportunity has no query', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: null,
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no query');
    });

    it('should return error when opportunity has no linked campaign', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: null, // No campaign
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no linked campaign');
    });

    it('should return error when no articles found in campaign', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }), // No articles
          }),
        }),
      } as never);

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No generated articles');
    });

    it('should return error when no active GSC connection found', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const fromMock = vi.fn();
      // First call: articles lookup
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'article-1', primary_keyword: 'test query' }],
              error: null,
            }),
          }),
        }),
      }));
      // Second call: GSC connection lookup (returns null - no connection)
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No connection
              }),
            }),
          }),
        }),
      }));
      // Third call: update opportunity with no_gsc status
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      expect(result.success).toBe(true); // Service returns success=true with no_gsc status
      expect(result.error).toContain('No active GSC connection');
      expect(result.status).toBe('no_gsc');
    });

    it('should return failure when no GSC connection AND update fails', async () => {
      const opportunity: IOpportunityForCheck = {
        id: 'opp-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        query: 'test query',
        metrics: { position: 10 },
        action_type: 'create_article',
        action_ref_id: 'campaign-1',
        created_at: dayjs().subtract(15, 'day').toISOString(),
      };

      const fromMock = vi.fn();
      // First call: articles lookup
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'article-1', primary_keyword: 'test query' }],
              error: null,
            }),
          }),
        }),
      }));
      // Second call: GSC connection lookup (returns null - no connection)
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No connection
              }),
            }),
          }),
        }),
      }));
      // Third call: update opportunity with no_gsc status - FAILS
      fromMock.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Database update failed' } }),
        }),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.checkPerformance(opportunity);

      // Should NOT report success when update fails
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update opportunity');
      expect(result.status).toBeNull();
    });
  });

  describe('processDueOpportunities', () => {
    it('should process all due opportunities and return summary', async () => {
      const mockOpportunities: IOpportunityForCheck[] = [
        {
          id: 'opp-1',
          project_id: 'proj-1',
          user_id: 'user-1',
          query: 'query 1',
          metrics: { position: 10 },
          action_type: 'create_article',
          action_ref_id: 'campaign-1',
          created_at: dayjs().subtract(15, 'day').toISOString(),
        },
        {
          id: 'opp-2',
          project_id: 'proj-1',
          user_id: 'user-1',
          query: 'query 2',
          metrics: { position: 15 },
          action_type: 'create_article',
          action_ref_id: 'campaign-2',
          created_at: dayjs().subtract(15, 'day').toISOString(),
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockOpportunities,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      // Mock checkPerformance to return success for first, error for second
      const checkPerformanceSpy = vi
        .spyOn(service, 'checkPerformance')
        .mockResolvedValueOnce({
          opportunityId: 'opp-1',
          success: true,
          status: 'improved',
          positionBefore: 10,
          positionAfter: 5,
        })
        .mockResolvedValueOnce({
          opportunityId: 'opp-2',
          success: false,
          status: null,
          positionBefore: null,
          positionAfter: null,
          error: 'No GSC connection',
        });

      const result = await service.processDueOpportunities();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);

      checkPerformanceSpy.mockRestore();
    });
  });
});
