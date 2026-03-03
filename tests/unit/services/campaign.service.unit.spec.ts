import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { campaignService } from '@server/services/campaign.service';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
import { supabaseAdmin as actualSupabaseAdmin } from '@server/supabase/supabaseAdmin';
import { AppError } from '@shared/utils/errors';

// Mock supabaseAdmin - must use factory function
vi.mock('@server/supabase/supabaseAdmin', () => {
  // Create mock functions that will be chained
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();
  const mockRpc = vi.fn();

  // Build chain: from -> select/insert/update/delete -> eq -> single/order
  const chainMock = (fn: ReturnType<typeof vi.fn>) => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    single: mockSingle,
    order: mockOrder,
  });

  const eqChain = () => ({
    single: mockSingle,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq, // Allow chaining multiple .eq() calls
    select: mockSelect,
    order: mockOrder,
    in: mockIn,
  });
  const selectChain = () => ({ eq: mockEq, single: mockSingle, order: mockOrder, in: mockIn });
  const insertChain = () => ({ select: mockSelect });
  const updateChain = () => ({ eq: mockEq });
  const deleteChain = () => ({ eq: mockEq, in: mockIn });

  mockFrom.mockReturnValue(chainMock(mockFrom));
  mockSelect.mockReturnValue(selectChain());
  mockInsert.mockReturnValue(insertChain());
  mockUpdate.mockReturnValue(updateChain());
  mockDelete.mockReturnValue(deleteChain());
  mockEq.mockReturnValue(eqChain());
  mockIn.mockReturnValue(eqChain());
  mockSingle.mockReturnValue({ data: null, error: null });
  mockOrder.mockReturnValue(selectChain());
  mockRpc.mockResolvedValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

describe('CampaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockUserId = '01234567-89ab-cdef-0123-456789abcdef';
  const mockProjectId = '11111111-1111-1111-1111-111111111111';
  const mockCampaignId = '22222222-2222-2222-2222-222222222222';
  const mockKeywordId = '33333333-3333-3333-3333-333333333333';

  const mockCampaign = {
    id: mockCampaignId,
    user_id: mockUserId,
    project_id: mockProjectId,
    name: 'Test Campaign',
    status: 'scheduled',
    ai_model: 'pro',
    tone: 'professional',
    target_word_count: 1500,
    settings: {},
    schedule_frequency: 'daily',
    schedule_batch_size: 1,
    next_run_at: '2024-01-02T09:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockKeyword = {
    id: mockKeywordId,
    campaign_id: mockCampaignId,
    keyword: 'best coffee maker',
    search_volume: 1000,
    difficulty: 'medium',
    status: 'pending',
    priority: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('listByProject', () => {
    it('should list campaigns with stats for a project', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: get campaigns with stats
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        ...mockCampaign,
                        keywords: [{ count: 5 }],
                        articles: [{ count: 2 }],
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Third call: get generated articles count
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
      });

      const campaigns = await campaignService.listByProject(mockUserId, mockProjectId);

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0]).toMatchObject({
        id: mockCampaignId,
        name: 'Test Campaign',
        keyword_count: 5,
        article_count: 2,
        completed_count: 0, // No generated articles
      });
    });

    it('should throw error if project not found or access denied', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      } as unknown);

      await expect(campaignService.listByProject(mockUserId, mockProjectId)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should calculate completed_count from generated articles', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Check project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Get campaigns with stats
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        ...mockCampaign,
                        keywords: [{ count: 5 }],
                        articles: [{ count: 2 }],
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Get generated articles count
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { campaign_id: mockCampaignId },
                    { campaign_id: mockCampaignId },
                    { campaign_id: mockCampaignId },
                  ],
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
      });

      const campaigns = await campaignService.listByProject(mockUserId, mockProjectId);

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].completed_count).toBe(3); // 3 generated articles
    });

    it('should return completed_count of 0 when no generated articles exist', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [{ ...mockCampaign, keywords: [{ count: 5 }], articles: [{ count: 0 }] }],
                    error: null,
                  }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // No generated articles
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
      });

      const campaigns = await campaignService.listByProject(mockUserId, mockProjectId);

      expect(campaigns[0].completed_count).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return campaign for valid ID and owner', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
            }),
          }),
        }),
      } as unknown);

      const campaign = await campaignService.getById(mockCampaignId, mockUserId);

      expect(campaign).toMatchObject({
        id: mockCampaignId,
        name: 'Test Campaign',
      });
    });

    it('should return null for non-existent campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as unknown);

      const campaign = await campaignService.getById('non-existent', mockUserId);

      expect(campaign).toBeNull();
    });

    it('should return null for campaign owned by different user', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as unknown);

      const campaign = await campaignService.getById(mockCampaignId, 'other-user');

      expect(campaign).toBeNull();
    });
  });

  describe('getDetail', () => {
    it('should return campaign with keywords, article stats, and credit stats', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get campaign (from CampaignService.getDetail -> getById -> campaignLifecycleService.getById)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: verify campaign ownership (from CampaignService.getDetail -> getKeywords -> campaignKeywordService.getKeywords)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockCampaignId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: get keywords (from CampaignService.getDetail -> getKeywords -> campaignKeywordService.getKeywords)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockKeyword], error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 4) {
          // Fourth call: get campaign again (from CampaignLifecycleService.getDetail -> getById)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Fifth call: get articles with credits_used
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { status: 'draft', credits_used: 1 },
                  { status: 'published', credits_used: 1 },
                  { status: 'failed', credits_used: 1 },
                ],
                error: null,
              }),
            }),
          } as unknown;
        }
      });

      const detail = await campaignService.getDetail(mockCampaignId, mockUserId);

      expect(detail).toMatchObject({
        campaign: mockCampaign,
        keywords: [mockKeyword],
        articleStats: {
          queued: 0,
          generating: 0,
          draft: 2, // Both 'draft' and 'published' articles increment draft counter
          published: 1,
          total: 3,
        },
        creditStats: {
          creditsUsed: 2,
          creditsRefunded: 1,
          successfulCount: 2,
          failedCount: 1,
          costPerArticle: 2,
          estimatedCreditsRemaining: 2, // mockKeyword has 'pending' or 'queued' status
          totalCreditsRequired: 4,
        },
      });
    });

    it('should return null for non-existent campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as unknown);

      const detail = await campaignService.getDetail('non-existent', mockUserId);

      expect(detail).toBeNull();
    });

    it('should correctly aggregate credits for all article statuses', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get campaign (from CampaignService.getDetail -> getById -> campaignLifecycleService.getById)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: verify campaign ownership (from CampaignService.getDetail -> getKeywords -> campaignKeywordService.getKeywords)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockCampaignId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: get keywords (from CampaignService.getDetail -> getKeywords -> campaignKeywordService.getKeywords)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 4) {
          // Fourth call: get campaign again (from CampaignLifecycleService.getDetail -> getById)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Fifth call: get articles with all possible statuses
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  // Intermediate statuses - pre-charged credits
                  { status: 'queued', credits_used: 2 },
                  { status: 'generating', credits_used: 2 },
                  { status: 'qa_checking', credits_used: 2 },
                  // Success statuses - credits stay charged
                  { status: 'draft', credits_used: 2 },
                  { status: 'reviewed', credits_used: 2 },
                  { status: 'qa_passed', credits_used: 2 },
                  { status: 'approved', credits_used: 2 },
                  { status: 'published', credits_used: 2 },
                  // Failure statuses - credits refunded
                  { status: 'failed', credits_used: 2 },
                  { status: 'failed_quality', credits_used: 2 },
                  { status: 'failed_timeout', credits_used: 2 },
                  { status: 'qa_failed', credits_used: 2 },
                  { status: 'rejected', credits_used: 2 },
                ],
                error: null,
              }),
            }),
          } as unknown;
        }
      });

      const detail = await campaignService.getDetail(mockCampaignId, mockUserId);

      // Verify credit aggregation
      expect(detail).toMatchObject({
        articleStats: {
          queued: 1, // 'queued' only
          generating: 2, // 'generating' + 'qa_checking'
          draft: 5, // 'draft' + 'reviewed' + 'qa_passed' + 'approved' + 'published'
          published: 1, // 'published' only
          total: 13, // All articles (queued doesn't charge credits yet)
        },
        creditStats: {
          creditsUsed: 14, // 2 intermediate (generating, qa_checking) + 5 success = 7 articles * 2 credits
          creditsRefunded: 10, // 5 failure statuses * 2 credits
          successfulCount: 5, // 'draft', 'reviewed', 'qa_passed', 'approved', 'published'
          failedCount: 5, // 'failed', 'failed_quality', 'failed_timeout', 'qa_failed', 'rejected'
        },
      });
    });
  });

  describe('create', () => {
    it('should create campaign with keywords', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: insert campaign - return campaign with the new name
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockCampaign, name: 'New Campaign' },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else {
          // Fourth call: insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker', 'espresso machine'],
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      const campaign = await campaignService.create(mockUserId, input);

      expect(campaign).toMatchObject({
        id: mockCampaignId,
        name: 'New Campaign',
        status: 'scheduled',
      });
    });

    it('should deduplicate normalized keywords before insert', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertedKeywordRows: Array<{ keyword: string }> = [];
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Verify project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        }
        if (callCount === 2) {
          // Fetch project preferences
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        }
        if (callCount === 3) {
          // Insert campaign
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockCampaign, name: 'Dedup Campaign' },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
        // Insert keywords
        return {
          insert: vi.fn().mockImplementation((rows: unknown) => {
            insertedKeywordRows = rows as Array<{ keyword: string }>;
            return Promise.resolve({ data: null, error: null });
          }),
        } as unknown;
      });

      const input = {
        name: 'Dedup Campaign',
        projectId: mockProjectId,
        keywords: ['Coffee Maker', ' coffee maker ', 'COFFEE    MAKER', 'espresso machine'],
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await campaignService.create(mockUserId, input);

      expect(insertedKeywordRows.map(r => r.keyword)).toEqual(['Coffee Maker', 'espresso machine']);
    });

    it('should reject creation if project not owned by user', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      } as unknown);

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await expect(campaignService.create(mockUserId, input)).rejects.toThrow(
        'Project not found or access denied'
      );
    });

    it('should use defaults for optional fields', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await campaignService.create(mockUserId, input);

      expect(insertCall).toMatchObject({
        ai_model: 'balanced',
        tone: 'professional',
        target_word_count: 1500,
      });
    });

    it('should normalize project content preference defaults before campaign insert', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // verify project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // fetch project defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    content_preferences: {
                      articleStyle: 'comparison', // valid for project prefs, invalid for campaigns
                      imageStyle: 'brand-text', // project format should map to campaign format
                      internalLinksCount: 3,
                      globalInstructions: 'Prefer short paragraphs.',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // insert campaign
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          // insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
      });

      expect(insertCall).toMatchObject({
        article_style: null,
        image_style: 'brand_text',
        internal_links_count: 3,
        global_instructions: 'Prefer short paragraphs.',
      });
    });

    it('should inherit valid articleStyle from project content_preferences', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // verify project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // fetch project defaults with valid articleStyle
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    content_preferences: {
                      articleStyle: 'how-to', // valid campaign article style
                    },
                  },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // insert campaign
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          // insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
      });

      expect(insertCall).toMatchObject({
        article_style: 'how-to',
      });
    });

    it('should override project articleStyle when campaign specifies articleStyle', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // verify project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // fetch project defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    content_preferences: {
                      articleStyle: 'how-to',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // insert campaign
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          // insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        articleStyle: 'listicle', // Override project default
      });

      expect(insertCall).toMatchObject({
        article_style: 'listicle', // Should use campaign value, not project's 'how-to'
      });
    });

    it('should default boolean fields to false when not specified', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { content_preferences: {} },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
      });

      expect(insertCall).toMatchObject({
        include_youtube: false,
        include_cta: false,
        include_emojis: false,
        include_infographics: false,
        auto_publish: false,
      });
    });

    it('should allow setting boolean fields to true', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { content_preferences: {} },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        includeYoutube: true,
        includeCta: true,
        includeEmojis: true,
        includeInfographics: true,
        autoPublish: true,
      });

      expect(insertCall).toMatchObject({
        include_youtube: true,
        include_cta: true,
        include_emojis: true,
        include_infographics: true,
        auto_publish: true,
      });
    });

    it('should inherit multiple fields from project and allow partial override', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    content_preferences: {
                      articleStyle: 'tutorial',
                      internalLinksCount: 3,
                      globalInstructions: 'Write with authority',
                      imageStyle: 'watercolor',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        articleStyle: 'opinion', // Override project's 'tutorial'
        includeYoutube: true, // Set boolean
        // internalLinksCount, globalInstructions, imageStyle should inherit
      });

      expect(insertCall).toMatchObject({
        article_style: 'opinion', // Overridden
        internal_links_count: 3, // Inherited
        global_instructions: 'Write with authority', // Inherited
        image_style: 'watercolor', // Inherited
        include_youtube: true, // Explicitly set
        include_cta: false, // Default
        include_emojis: false, // Default
        include_infographics: false, // Default
        auto_publish: false, // Default
      });
    });

    it('should handle null project content_preferences', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { content_preferences: null },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      await campaignService.create(mockUserId, {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
      });

      expect(insertCall).toMatchObject({
        article_style: null,
        internal_links_count: 0,
        global_instructions: null,
        image_style: null,
        include_youtube: false,
        include_cta: false,
        include_emojis: false,
        include_infographics: false,
        auto_publish: false,
      });
    });
  });

  describe('update', () => {
    it('should update campaign settings', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      // The update method calls supabaseAdmin.from('campaigns').update() directly
      // (no prior select needed when schedule fields haven't changed)
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          }),
        }),
      } as unknown);

      const updated = await campaignService.update(mockCampaignId, mockUserId, {
        name: 'Updated Campaign',
        status: 'scheduled',
      });

      expect(updated).toMatchObject({
        id: mockCampaignId,
      });
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }),
      } as unknown);

      await expect(
        campaignService.update('non-existent', mockUserId, { name: 'Updated' })
      ).rejects.toThrow(CampaignNotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select status for deletion validation
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { status: 'draft' }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Second call: delete campaign
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          } as unknown;
        }
      });

      await expect(campaignService.delete(mockCampaignId, mockUserId)).resolves.not.toThrow();
    });
  });

  describe('addKeywords', () => {
    it('should add keywords skipping duplicates', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get campaign
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: get existing keywords with normalized values
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ keyword_normalized: 'coffee maker' }],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          // Third call: insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        'coffee maker',
        'espresso machine',
      ]);

      expect(result).toMatchObject({ added: 1, duplicates: 1 });
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as unknown);

      const nonExistentCampaignId = '99999999-9999-9999-9999-999999999999';
      await expect(
        campaignService.addKeywords(nonExistentCampaignId, mockUserId, ['keyword'])
      ).rejects.toThrow(CampaignNotFoundError);
    });

    it('should trim and filter empty keywords', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      // Filter out empty strings before passing to the service (real behavior)
      const keywords = ['  coffee maker  ', '', 'espresso machine'].filter(
        k => k.trim().length > 0
      );
      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, keywords);

      expect(result.added).toBe(2);
    });
  });

  describe('removeKeyword', () => {
    it('should remove a keyword', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      // The new implementation:
      // 1. from('keywords').select('campaign_id').eq('id', keywordId).single() - get keyword's campaign
      // 2. getById(campaignId, userId) - verify campaign ownership (uses our existing mock)
      // 3. from('keywords').delete().eq('id', keywordId) - delete keyword

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (table: string) => {
          callCount++;
          if (callCount === 1 && table === 'keywords') {
            // First call: get keyword's campaign_id
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { campaign_id: mockCampaignId },
                    error: null,
                  }),
                }),
              }),
            } as unknown;
          } else if (callCount === 2 && table === 'campaigns') {
            // Second call: getById (campaign check)
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockCampaign,
                      error: null,
                    }),
                  }),
                }),
              }),
            } as unknown;
          } else if (table === 'keywords') {
            // Delete call
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            } as unknown;
          }
          // Default fallback
          return {
            select: vi.fn(),
            delete: vi.fn(),
          } as unknown;
        }
      );

      await expect(campaignService.removeKeyword(mockKeywordId, mockUserId)).resolves.not.toThrow();
    });
  });

  describe('getKeywords', () => {
    it('should list keywords for a campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [mockKeyword], error: null }),
                }),
              }),
            }),
          } as unknown;
        }
      });

      const keywords = await campaignService.getKeywords(mockCampaignId, mockUserId);

      expect(keywords).toHaveLength(1);
      expect(keywords[0]).toMatchObject({
        id: mockKeywordId,
        keyword: 'best coffee maker',
      });
    });

    it('should throw CampaignNotFoundError for non-existent campaign', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as unknown);

      await expect(campaignService.getKeywords('non-existent', mockUserId)).rejects.toThrow(
        CampaignNotFoundError
      );
    });
  });

  describe('Image Preset Integration', () => {
    it('should validate image preset on create', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        imagePreset: 'budget',
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await campaignService.create(mockUserId, input);

      expect(insertCall).toMatchObject({
        image_preset: 'budget',
      });
    });

    it('should accept valid image presets on update', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let updateCall: Record<string, unknown> | null = null;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: unknown) => {
          updateCall = data as Record<string, unknown>;
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          };
        }),
      } as unknown);

      await campaignService.update(mockCampaignId, mockUserId, {
        imagePreset: 'pro',
      });

      expect(updateCall).toMatchObject({
        image_preset: 'pro',
      });
    });

    it('should reject invalid image preset on create', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
            }),
          }),
        }),
      } as unknown);

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        imagePreset: 'invalid-preset',
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await expect(campaignService.create(mockUserId, input)).rejects.toThrow();
    });

    it('should allow undefined image_preset on create (no preset selected)', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertCall: Record<string, unknown> | null = null;
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertCall = data as Record<string, unknown>;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              };
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
        // imagePreset: undefined (not provided)
      };

      await campaignService.create(mockUserId, input);

      expect(insertCall).toMatchObject({
        // image_preset should not be in the insert call when undefined
        // or it should be handled appropriately by the service
      });
    });
  });

  describe('Server-Side Validation (Configurable Models)', () => {
    it('should reject unavailable writer model on create', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check project ownership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else {
          // Second call: insert campaign (should not be reached if validation fails)
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        model: 'completely-invalid-model-id-not-in-registry', // This model does not exist
      };

      // When AVAILABLE_WRITER_PRESETS is empty, all presets are allowed
      // But keys NOT in WRITER_PRESETS should still be rejected by validation
      await expect(campaignService.create(mockUserId, input)).rejects.toThrow();
    });

    it('should reject unavailable image preset on create', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
            }),
          }),
        }),
      } as unknown);

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        imagePreset: 'invalid-preset', // This preset does not exist
      };

      // This should be caught by the Zod schema validation (isValidImagePreset)
      await expect(campaignService.create(mockUserId, input)).rejects.toThrow();
    });

    it('should accept available model on create', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        model: 'balanced', // This is a valid preset key
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      await expect(campaignService.create(mockUserId, input)).resolves.toBeDefined();
    });

    it('should accept any model when env is empty (all allowed)', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: mockProjectId }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Fetch project content_preferences for outrank defaults
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { content_preferences: null }, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const input = {
        name: 'New Campaign',
        projectId: mockProjectId,
        keywords: ['coffee maker'],
        model: 'ultra', // Any valid preset key should work when env is empty
        scheduleFrequency: 'daily' as const,
        scheduleBatchSize: 1,
        scheduleHour: 9,
        scheduleTimezone: 'UTC',
      };

      // When AVAILABLE_WRITER_PRESETS is empty, all preset keys are allowed
      await expect(campaignService.create(mockUserId, input)).resolves.toBeDefined();
    });

    it('should reject unavailable writer model on update', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          }),
        }),
      } as unknown);

      // Test with a completely invalid model ID that doesn't exist in the registry
      const input = {
        model: 'this-model-does-not-exist-in-ai-models-config',
      };

      // Should be caught by server-side validation
      await expect(campaignService.update(mockCampaignId, mockUserId, input)).rejects.toThrow(
        AppError
      );
    });

    it('should reject unavailable image preset on update', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
          }),
        }),
      } as unknown);

      const input = {
        imagePreset: 'definitely-not-a-valid-preset',
      };

      // Should be caught by the Zod schema validation (isValidImagePreset)
      await expect(campaignService.update(mockCampaignId, mockUserId, input)).rejects.toThrow();
    });

    it('should accept available image preset on update', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let updateCall: Record<string, unknown> | null = null;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: unknown) => {
          updateCall = data as Record<string, unknown>;
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          };
        }),
      } as unknown);

      const input = {
        imagePreset: 'budget',
      };

      await expect(
        campaignService.update(mockCampaignId, mockUserId, input)
      ).resolves.toBeDefined();
      expect(updateCall).toMatchObject({
        image_preset: 'budget',
      });
    });

    it('should allow empty string imagePreset (user might not want images)', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let updateCall: Record<string, unknown> | null = null;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: unknown) => {
          updateCall = data as Record<string, unknown>;
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          };
        }),
      } as unknown);

      const input = {
        imagePreset: '', // Empty string means no images
      };

      await expect(
        campaignService.update(mockCampaignId, mockUserId, input)
      ).resolves.toBeDefined();
      expect(updateCall).toMatchObject({
        image_preset: '',
      });
    });
  });

  describe('Keyword Normalization (E12)', () => {
    it('should reject case variants of existing keywords', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Get campaign
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Get existing keywords with normalized values
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { keyword_normalized: 'coffee maker' },
                  { keyword_normalized: 'espresso machine' },
                ],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          // Insert keywords
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        'Coffee Maker', // Case variant
        'ESPRESSO MACHINE', // Case variant
        'french press', // New keyword
      ]);

      // Only 'french press' should be added
      expect(result).toMatchObject({ added: 1, duplicates: 2 });
    });

    it('should reject spacing variants of existing keywords', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ keyword_normalized: 'coffee maker' }],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        'coffee  maker', // Extra spaces
        '  coffee maker', // Leading spaces
        'coffee maker ', // Trailing spaces
      ]);

      // All should be duplicates
      expect(result).toMatchObject({ added: 0, duplicates: 3 });
    });

    it('should reject combined case and spacing variants', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ keyword_normalized: 'best coffee maker' }],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        'Best  Coffee  Maker', // Case + spacing
        'BEST COFFEE MAKER', // All caps
        'best coffee maker', // Exact match
      ]);

      // All should be duplicates
      expect(result).toMatchObject({ added: 0, duplicates: 3 });
    });

    it('should handle within-batch duplicates', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // No existing keywords
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        'coffee maker',
        'Coffee Maker', // Duplicate within batch
        'COFFEE MAKER', // Duplicate within batch
        'espresso machine',
      ]);

      // Should deduplicate within the batch
      expect(result).toMatchObject({ added: 2, duplicates: 2 });
    });

    it('should trim leading/trailing spaces but preserve internal spacing', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let insertedKeywords: string[] = [];
      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockImplementation((data: unknown) => {
              insertedKeywords = (data as Array<{ keyword: string }>).map(k => k.keyword);
              return { data: null, error: null };
            }),
          } as unknown;
        }
      });

      await campaignService.addKeywords(mockCampaignId, mockUserId, [
        '  coffee  maker  ', // Leading/trailing spaces trimmed, internal spaces preserved
        'espresso machine',
      ]);

      // Keywords are trimmed but internal spacing preserved
      expect(insertedKeywords).toEqual(['coffee  maker', 'espresso machine']);
    });

    it('should handle trailing/leading spaces correctly', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown;
        }
      });

      const result = await campaignService.addKeywords(mockCampaignId, mockUserId, [
        '  coffee maker',
        'espresso machine  ',
        '\tfrench press\t', // Tab characters
      ]);

      // All keywords should be added (after trimming)
      expect(result).toMatchObject({ added: 3, duplicates: 0 });
    });
  });
});
