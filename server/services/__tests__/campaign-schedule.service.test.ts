/**
 * Campaign Schedule Service Unit Tests
 * Tests for campaign schedule management methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from '../campaign.service';
import { CampaignNotFoundError, NoPendingKeywordsError } from '@shared/types/campaign.types';
import type { ICampaign } from '@shared/types/campaign.types';

// Mock Supabase admin client
// The mock chain must support .eq().eq() for queries like:
// .select().eq('id', campaignId).eq('user_id', userId).single()
vi.mock('@server/supabase/supabaseAdmin', () => {
  // Create a recursive chain builder that allows .eq().eq() chaining
  const createEqChain = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const eqFn = vi.fn(() => chain);
    const orderFn = vi.fn(() => chain);
    const singleFn = vi.fn();
    const selectFn = vi.fn(() => chain);

    chain.eq = eqFn;
    chain.order = orderFn;
    chain.single = singleFn;
    chain.select = selectFn;

    return { eq: eqFn, order: orderFn, single: singleFn, select: selectFn };
  };

  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => createEqChain()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(),
              })),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  };
});

// Mock the scheduling config
vi.mock('@shared/config/scheduling.config', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    calculateNextRunAt: vi.fn(() => '2024-02-15T10:00:00.000Z'),
    DEFAULT_SCHEDULE_TIMEZONE: 'UTC',
    DEFAULT_SCHEDULE_HOUR: 9,
  };
});

// Import after mocking
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { calculateNextRunAt } from '@shared/config/scheduling.config';

const mockSupabaseAdmin = supabaseAdmin as unknown as {
  from: vi.Mock;
};

const mockCalculateNextRunAt = calculateNextRunAt as vi.Mock;

describe('CampaignService - Schedule Management', () => {
  let campaignService: CampaignService;
  const mockUserId = 'user-123';
  const mockCampaignId = 'campaign-abc';

  const createMockCampaign = (overrides: Partial<ICampaign> = {}): ICampaign => ({
    id: mockCampaignId,
    user_id: mockUserId,
    project_id: 'project-123',
    name: 'Test Campaign',
    status: 'draft',
    ai_model: 'pro',
    tone: 'professional',
    target_word_count: 1500,
    settings: {},
    image_preset: null,
    generation_run_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    schedule_frequency: 'daily',
    schedule_batch_size: 2,
    next_run_at: null,
    last_run_at: null,
    schedule_timezone: 'UTC',
    schedule_hour: 9,
    ...overrides,
  });

  beforeEach(() => {
    campaignService = new CampaignService();
    vi.clearAllMocks();
    mockCalculateNextRunAt.mockReturnValue('2024-02-15T10:00:00.000Z');
  });

  describe('startSchedule', () => {
    it('should set status to scheduled and return nextRunAt', async () => {
      const mockCampaign = createMockCampaign({
        status: 'draft',
        schedule_frequency: 'daily',
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock getPendingKeywordCount
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 5,
              error: null,
            })),
          })),
        })),
      });

      // Mock update
      const mockUpdateSingle = vi.fn(() => ({
        data: { ...mockCampaign, status: 'scheduled', next_run_at: '2024-02-15T10:00:00.000Z' },
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockUpdateSingle,
              })),
            })),
          })),
        })),
      });

      const result = await campaignService.startSchedule(mockCampaignId, mockUserId);

      expect(result.nextRunAt).toBe('2024-02-15T10:00:00.000Z');
      expect(result.pendingKeywords).toBe(5);
      expect(mockCalculateNextRunAt).toHaveBeenCalledWith('daily', 'UTC', 9);
    });

    it('should reject campaign without schedule config', async () => {
      const mockCampaign = createMockCampaign({
        status: 'draft',
        schedule_frequency: null,
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        'Cannot start schedule: campaign has no schedule configuration'
      );
    });

    it('should reject campaign with no pending keywords', async () => {
      const mockCampaign = createMockCampaign({
        status: 'draft',
        schedule_frequency: 'daily',
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock getPendingKeywordCount - returns 0
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 0,
              error: null,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        NoPendingKeywordsError
      );
    });

    it('should reject campaign in invalid state (active)', async () => {
      const mockCampaign = createMockCampaign({
        status: 'active',
        schedule_frequency: 'daily',
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot start schedule: campaign status is 'active'"
      );
    });

    it('should reject campaign in invalid state (completed)', async () => {
      const mockCampaign = createMockCampaign({
        status: 'completed',
        schedule_frequency: 'daily',
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot start schedule: campaign status is 'completed'"
      );
    });

    it('should reject campaign in invalid state (scheduled)', async () => {
      const mockCampaign = createMockCampaign({
        status: 'scheduled',
        schedule_frequency: 'daily',
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot start schedule: campaign status is 'scheduled'"
      );
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const mockSingle = vi.fn(() => ({
        data: null,
        error: { code: 'PGRST116' },
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        CampaignNotFoundError
      );
    });

    it('should accept campaign in paused state', async () => {
      const mockCampaign = createMockCampaign({
        status: 'paused',
        schedule_frequency: 'daily',
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock getPendingKeywordCount
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 3,
              error: null,
            })),
          })),
        })),
      });

      // Mock update
      const mockUpdateSingle = vi.fn(() => ({
        data: { ...mockCampaign, status: 'scheduled', next_run_at: '2024-02-15T10:00:00.000Z' },
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockUpdateSingle,
              })),
            })),
          })),
        })),
      });

      const result = await campaignService.startSchedule(mockCampaignId, mockUserId);

      expect(result.nextRunAt).toBe('2024-02-15T10:00:00.000Z');
      expect(result.pendingKeywords).toBe(3);
    });
  });

  describe('pauseSchedule', () => {
    it('should clear next_run_at and set status to paused', async () => {
      const mockCampaign = createMockCampaign({
        status: 'scheduled',
        schedule_frequency: 'daily',
        next_run_at: '2024-02-15T10:00:00.000Z',
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock update
      const mockUpdateResult = vi.fn(() => ({
        data: { ...mockCampaign, status: 'paused', next_run_at: null },
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
            })),
          })),
        })),
      });

      const result = await campaignService.pauseSchedule(mockCampaignId, mockUserId);

      expect(result.paused).toBe(true);
    });

    it('should reject campaign not in scheduled or active state', async () => {
      const mockCampaign = createMockCampaign({
        status: 'draft',
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.pauseSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot pause schedule: campaign status is 'draft'"
      );
    });

    it('should accept campaign in active state', async () => {
      const mockCampaign = createMockCampaign({
        status: 'active',
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock update
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
            })),
          })),
        })),
      });

      const result = await campaignService.pauseSchedule(mockCampaignId, mockUserId);

      expect(result.paused).toBe(true);
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const mockSingle = vi.fn(() => ({
        data: null,
        error: { code: 'PGRST116' },
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.pauseSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        CampaignNotFoundError
      );
    });
  });

  describe('resumeSchedule', () => {
    it('should recalculate next_run_at and set status to scheduled', async () => {
      const mockCampaign = createMockCampaign({
        status: 'paused',
        schedule_frequency: 'daily',
        next_run_at: null,
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock update
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
            })),
          })),
        })),
      });

      const result = await campaignService.resumeSchedule(mockCampaignId, mockUserId);

      expect(result.nextRunAt).toBe('2024-02-15T10:00:00.000Z');
      expect(mockCalculateNextRunAt).toHaveBeenCalledWith('daily', 'UTC', 9);
    });

    it('should reject campaign not in paused state', async () => {
      const mockCampaign = createMockCampaign({
        status: 'scheduled',
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.resumeSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot resume schedule: campaign status is 'scheduled'"
      );
    });

    it('should reject campaign without schedule config', async () => {
      const mockCampaign = createMockCampaign({
        status: 'paused',
        schedule_frequency: null,
      });

      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.resumeSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        'Cannot resume schedule: campaign has no schedule configuration'
      );
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const mockSingle = vi.fn(() => ({
        data: null,
        error: { code: 'PGRST116' },
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      await expect(campaignService.resumeSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        CampaignNotFoundError
      );
    });

    it('should use custom timezone and hour from campaign', async () => {
      const mockCampaign = createMockCampaign({
        status: 'paused',
        schedule_frequency: 'weekly',
        schedule_timezone: 'America/New_York',
        schedule_hour: 14,
      });

      // Mock getById
      const mockSingle = vi.fn(() => ({
        data: mockCampaign,
        error: null,
      }));
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
        })),
      });

      // Mock update
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
            })),
          })),
        })),
      });

      await campaignService.resumeSchedule(mockCampaignId, mockUserId);

      expect(mockCalculateNextRunAt).toHaveBeenCalledWith('weekly', 'America/New_York', 14);
    });
  });
});
