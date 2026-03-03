/**
 * Campaign Schedule Service Unit Tests
 * Tests for campaign schedule management methods
 *
 * Updated for Campaign Autopilot Simplification (issue #36):
 * - Campaigns have 3 statuses: scheduled | paused | completed
 * - startSchedule delegates to resumeSchedule (campaigns auto-activate on creation)
 * - pauseSchedule: only 'scheduled' campaigns can be paused
 * - resumeSchedule: only 'paused' campaigns can be resumed
 * - processScheduledBatch: uses generation_run_id as processing lock
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from '../campaign.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
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
    status: 'paused',
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
    // Outrank feature parity fields
    article_style: null,
    internal_links_count: 3,
    global_instructions: null,
    auto_publish: false,
    include_youtube: false,
    include_cta: false,
    include_infographics: false,
    include_emojis: false,
    image_style: null,
    ...overrides,
  });

  beforeEach(() => {
    campaignService = new CampaignService();
    vi.clearAllMocks();
    mockCalculateNextRunAt.mockReturnValue('2024-02-15T10:00:00.000Z');
  });

  // startSchedule is now an alias for resumeSchedule (since campaigns auto-activate on creation)
  describe('startSchedule (delegates to resumeSchedule)', () => {
    it('should set status to scheduled and return nextRunAt for a paused campaign', async () => {
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
              count: 5,
              error: null,
            })),
          })),
        })),
      });

      // Mock update (from resumeSchedule)
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
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

      // getPendingKeywordCount mock
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

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        'Cannot resume schedule: campaign has no schedule configuration'
      );
    });

    it('should reject campaign in completed state', async () => {
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

      // getPendingKeywordCount mock
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

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot resume schedule: campaign status is 'completed'"
      );
    });

    it('should reject campaign in scheduled state (already running)', async () => {
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

      // getPendingKeywordCount mock
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

      await expect(campaignService.startSchedule(mockCampaignId, mockUserId)).rejects.toThrow(
        "Cannot resume schedule: campaign status is 'scheduled'"
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

    it('should reject campaign not in scheduled state (paused)', async () => {
      const mockCampaign = createMockCampaign({
        status: 'paused',
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
        "Cannot pause schedule: campaign status is 'paused'"
      );
    });

    it('should reject campaign not in scheduled state (completed)', async () => {
      const mockCampaign = createMockCampaign({
        status: 'completed',
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
        "Cannot pause schedule: campaign status is 'completed'"
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

// =============================================================================
// processScheduledBatch Tests (BUG H7)
// =============================================================================

// Mock articleGenerationService for processScheduledBatch tests
vi.mock('@server/services/article-generation.service', () => ({
  articleGenerationService: {
    generateArticle: vi.fn(),
  },
}));

import { CampaignSchedulingService } from '../campaign-scheduling.service';
import { articleGenerationService } from '@server/services/article-generation.service';

describe('CampaignSchedulingService - processScheduledBatch (BUG H7)', () => {
  let schedulingService: CampaignSchedulingService;
  const campaignId = 'campaign-batch-test';

  // Campaign stays 'scheduled' throughout processing — lock via generation_run_id
  const mockScheduledCampaign = {
    id: campaignId,
    user_id: 'user-123',
    project_id: 'project-123',
    status: 'scheduled',
    ai_model: 'pro',
    tone: 'professional',
    target_word_count: 1500,
    settings: {},
    image_preset: null,
    schedule_frequency: 'daily',
    schedule_batch_size: 2,
    next_run_at: '2024-01-01T09:00:00Z',
    last_run_at: null,
    schedule_timezone: 'UTC',
    schedule_hour: 9,
    article_style: null,
    internal_links_count: 3,
    global_instructions: null,
    auto_publish: false,
    include_youtube: false,
    include_cta: false,
    include_infographics: false,
    include_emojis: false,
    image_style: null,
    generation_run_id: null,
    name: 'Batch Test Campaign',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockKeywords = [{ id: 'kw-1', keyword: 'test keyword 1' }];

  beforeEach(() => {
    schedulingService = new CampaignSchedulingService();
    vi.resetAllMocks();
    mockCalculateNextRunAt.mockReturnValue('2024-02-15T10:00:00.000Z');
  });

  it('should pause campaign when all batch articles fail (BUG H7 fix)', async () => {
    // Call 1: claim campaign via generation_run_id lock
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({ data: mockScheduledCampaign, error: null })),
              })),
            })),
          })),
        })),
      })),
    });

    // Call 2: get pending keywords
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({ data: mockKeywords, error: null })),
            })),
          })),
        })),
      })),
    });

    // Call 3: create_articles_with_credits RPC (success)
    (supabaseAdmin as unknown as { rpc: vi.Mock }).rpc = vi.fn(() => ({
      error: null,
    }));

    // Call 4: update keywords to 'queued'
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        in: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 5: update keyword status to 'generating'
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 6: find article for keyword
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: { id: 'article-1' }, error: null })),
            })),
          })),
        })),
      })),
    });

    // Make generateArticle FAIL for all keywords
    (articleGenerationService.generateArticle as vi.Mock).mockRejectedValue(
      new Error('AI API error')
    );

    // Call 7: update keyword status to 'failed' (after generation error)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 8: update campaign to paused (all-fail path — BUG H7 fix)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    const result = await schedulingService.processScheduledBatch(campaignId);

    expect(result.paused).toBe(true);
    expect(result.pauseReason).toBe('batch_generation_failed');
    expect(result.articlesQueued).toBe(1);
    expect(result.nextRunAt).toBeUndefined();
  });

  it('should reschedule campaign when at least one article succeeds', async () => {
    // Call 1: claim campaign via generation_run_id lock
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({ data: mockScheduledCampaign, error: null })),
              })),
            })),
          })),
        })),
      })),
    });

    // Call 2: get pending keywords
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({ data: mockKeywords, error: null })),
            })),
          })),
        })),
      })),
    });

    // Call 3: create_articles_with_credits RPC
    (supabaseAdmin as unknown as { rpc: vi.Mock }).rpc = vi.fn(() => ({
      error: null,
    }));

    // Call 4: update keywords to 'queued'
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        in: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 4b: articles select for scheduled_publish_at assignment
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
    });

    // Call 5: update keyword status to 'generating'
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 6: find article for keyword
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: { id: 'article-1' }, error: null })),
            })),
          })),
        })),
      })),
    });

    // generateArticle SUCCEEDS
    (articleGenerationService.generateArticle as vi.Mock).mockResolvedValue(undefined);

    // Call 7: update keyword status to 'generated' (after success)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    // Call 8: check if campaign was paused during processing
    // Campaign stays 'scheduled' throughout (no status change to 'active')
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { status: 'scheduled' }, error: null })),
        })),
      })),
    });

    // Call 9: update campaign with nextRunAt and clear generation_run_id
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    const result = await schedulingService.processScheduledBatch(campaignId);

    expect(result.paused).toBeUndefined();
    expect(result.nextRunAt).toBe('2024-02-15T10:00:00.000Z');
    expect(result.articlesQueued).toBe(1);
  });
});
