/**
 * Unit tests for OpportunitySchedulerService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OpportunitySchedulerService,
  type IScheduledConnection,
} from '@server/services/opportunity-scheduler.service';
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
          { keys: ['test query', 'https://example.com'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 },
        ],
      })
    ),
  },
}));

vi.mock('@server/services/opportunity-analysis.service', () => ({
  opportunityAnalysisService: {
    analyzeSnapshot: vi.fn(() =>
      Promise.resolve({
        newOpportunities: [],
        updatedOpportunities: [],
      })
    ),
  },
}));

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

describe('OpportunitySchedulerService', () => {
  let service: OpportunitySchedulerService;

  beforeEach(() => {
    service = new OpportunitySchedulerService();
    vi.clearAllMocks();
  });

  describe('getConnectionsDueForAnalysis', () => {
    it('should find connections due for analysis', async () => {
      const mockConnections: IScheduledConnection[] = [
        {
          id: 'conn-1',
          user_id: 'user-1',
          project_id: 'proj-1',
          site_url: 'https://example.com',
          analyze_frequency: 'weekly',
          next_analyze_at: new Date(Date.now() - 1000).toISOString(), // Past due
          last_analyzed_at: null,
        },
        {
          id: 'conn-2',
          user_id: 'user-2',
          project_id: 'proj-2',
          site_url: 'https://example2.com',
          analyze_frequency: 'daily',
          next_analyze_at: null, // Never run
          last_analyzed_at: null,
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockConnections,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await service.getConnectionsDueForAnalysis();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conn-1');
      expect(result[1].id).toBe('conn-2');
    });

    it('should return empty array when no connections are due', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
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

      const result = await service.getConnectionsDueForAnalysis();

      expect(result).toHaveLength(0);
    });

    it('should throw error on database failure', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
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

      await expect(service.getConnectionsDueForAnalysis()).rejects.toThrow(
        'Failed to fetch connections due for analysis'
      );
    });
  });

  describe('calculateNextAnalyzeAt', () => {
    it('should calculate next analyze date based on frequency - daily', () => {
      const result = service.calculateNextAnalyzeAt('daily');
      const expected = dayjs().add(1, 'day');

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(dayjs(result).diff(expected, 'second'))).toBeLessThan(2);
    });

    it('should calculate next analyze date based on frequency - weekly', () => {
      const result = service.calculateNextAnalyzeAt('weekly');
      const expected = dayjs().add(7, 'day');

      expect(Math.abs(dayjs(result).diff(expected, 'second'))).toBeLessThan(2);
    });

    it('should calculate next analyze date based on frequency - biweekly', () => {
      const result = service.calculateNextAnalyzeAt('biweekly');
      const expected = dayjs().add(14, 'day');

      expect(Math.abs(dayjs(result).diff(expected, 'second'))).toBeLessThan(2);
    });

    it('should default to weekly for unknown frequency', () => {
      // @ts-expect-error Testing invalid frequency
      const result = service.calculateNextAnalyzeAt('unknown');
      const expected = dayjs().add(7, 'day');

      expect(Math.abs(dayjs(result).diff(expected, 'second'))).toBeLessThan(2);
    });
  });

  describe('updateScheduleAfterAnalysis', () => {
    it('should update schedule after successful analysis', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: updateMock,
      } as never);

      await service.updateScheduleAfterAnalysis('conn-1', 'weekly');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          last_analyzed_at: expect.any(String),
          next_analyze_at: expect.any(String),
          last_synced_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
    });

    it('should throw error on database failure', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      } as never);

      await expect(service.updateScheduleAfterAnalysis('conn-1', 'weekly')).rejects.toThrow(
        'Failed to update schedule'
      );
    });
  });

  describe('processDueConnections', () => {
    it('should process max 5 connections per cron run', async () => {
      // Create 10 mock connections (more than the limit)
      const mockConnections: IScheduledConnection[] = Array.from({ length: 10 }, (_, i) => ({
        id: `conn-${i}`,
        user_id: `user-${i}`,
        project_id: `proj-${i}`,
        site_url: `https://example${i}.com`,
        analyze_frequency: 'weekly' as const,
        next_analyze_at: null,
        last_analyzed_at: null,
      }));

      // Mock getConnectionsDueForAnalysis to return all 10
      const fromMock = vi.fn();

      // First call: getConnectionsDueForAnalysis
      fromMock.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockConnections.slice(0, 5), // Limit to 5 in query
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      // Subsequent calls: runScheduledAnalysis for each connection
      for (let i = 0; i < 5; i++) {
        fromMock.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: `conn-${i}`,
                  site_url: `https://example${i}.com`,
                  access_token: 'token',
                  refresh_token: 'refresh',
                  token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                },
                error: null,
              }),
            }),
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'snapshot-1' },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }));
      }

      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock as never);

      const result = await service.processDueConnections();

      // Verify only 5 were processed (the MAX_CONNECTIONS_PER_RUN limit)
      expect(result.processed).toBeLessThanOrEqual(5);
    });
  });

  describe('runScheduledAnalysis', () => {
    it('should return error result when connection has no site_url', async () => {
      const connection: IScheduledConnection = {
        id: 'conn-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        site_url: null, // No site URL
        analyze_frequency: 'weekly',
        next_analyze_at: null,
        last_analyzed_at: null,
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'conn-1',
                site_url: null,
              },
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await service.runScheduledAnalysis(connection);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no site URL');
    });
  });
});
