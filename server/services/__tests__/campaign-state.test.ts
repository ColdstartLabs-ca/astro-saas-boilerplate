/**
 * Campaign State Transition Unit Tests
 *
 * Tests for:
 * - C5: startGenerationInternal checks campaign.status before proceeding
 * - Starting an active campaign returns CampaignAlreadyActiveError
 * - Starting a completed campaign with no remaining keywords throws NoPendingKeywordsError
 * - Starting a paused campaign works (resumes)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from '../campaign.service';
import {
  CampaignNotFoundError,
  CampaignAlreadyActiveError,
  NoPendingKeywordsError,
} from '@shared/types/campaign.types';
import type { ICampaign } from '@shared/types/campaign.types';
import { serverEnv } from '@shared/config/env';

// Mock serverEnv — use test mode so we can exercise the in-memory path
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    ENV: 'production', // default; individual tests can override
    AVAILABLE_WRITER_PRESETS: '',
    AVAILABLE_IMAGE_PRESETS: '',
  },
}));

// Mock Supabase admin client
vi.mock('@server/supabase/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(),
            })),
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
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(),
        })),
        rpc: vi.fn(),
      })),
      rpc: vi.fn(),
    },
  };
});

// Mock idempotency service to avoid circular dep
vi.mock('@server/services/campaign-idempotency.service', () => ({
  CampaignIdempotencyService: {
    generateIdempotencyKey: vi.fn(() => 'test-key'),
    claimGeneration: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
    clearCampaignRunId: vi.fn(),
  },
}));

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

const mockSupabaseAdmin = supabaseAdmin as unknown as {
  from: ReturnType<typeof vi.fn>;
};

// Helper to create a mock campaign
function createMockCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-abc',
    user_id: 'user-123',
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
    schedule_frequency: null,
    schedule_batch_size: 1,
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
  };
}

// Utility to mock a single .select().eq().eq().single() chain returning `data`
function mockSelectSingle(data: unknown, error: unknown = null) {
  mockSupabaseAdmin.from.mockReturnValueOnce({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data, error })),
        })),
      })),
    })),
  });
}

describe('CampaignService - startGeneration status guard (BUG C5)', () => {
  let campaignService: CampaignService;
  const userId = 'user-123';
  const campaignId = 'campaign-abc';

  beforeEach(() => {
    campaignService = new CampaignService();
    // Use resetAllMocks to clear both call history AND queued mock return values
    vi.resetAllMocks();
    // Ensure non-test mode so the DB path is exercised
    (serverEnv as { ENV: string }).ENV = 'production';
  });

  it('should throw CampaignAlreadyActiveError when campaign is already active', async () => {
    mockSelectSingle(createMockCampaign({ status: 'active' }));

    await expect(campaignService.startGeneration(campaignId, userId)).rejects.toThrow(
      CampaignAlreadyActiveError
    );
  });

  it('should throw CampaignAlreadyActiveError when campaign is completed', async () => {
    mockSelectSingle(createMockCampaign({ status: 'completed' }));

    await expect(campaignService.startGeneration(campaignId, userId)).rejects.toThrow(
      CampaignAlreadyActiveError
    );
  });

  it('should throw CampaignAlreadyActiveError when campaign is scheduled', async () => {
    mockSelectSingle(createMockCampaign({ status: 'scheduled' }));

    await expect(campaignService.startGeneration(campaignId, userId)).rejects.toThrow(
      CampaignAlreadyActiveError
    );
  });

  it('should throw CampaignAlreadyActiveError with descriptive message for active status', async () => {
    mockSelectSingle(createMockCampaign({ status: 'active' }));

    try {
      await campaignService.startGeneration(campaignId, userId);
      expect.fail('Should have thrown');
    } catch (err) {
      // Check by name to avoid instanceof issues with module mocking boundaries
      expect((err as Error).name).toBe('CampaignAlreadyActiveError');
      expect((err as Error).message).toContain("'active'");
      expect((err as Error).message).toContain('draft');
      expect((err as Error).message).toContain('paused');
    }
  });

  it('should proceed when campaign is in draft status (no keywords → NoPendingKeywordsError)', async () => {
    // First call: getById
    mockSelectSingle(createMockCampaign({ status: 'draft' }));

    // Second call: select pending keywords (empty)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    });

    // Third call: select queued keywords (empty) — triggers NoPendingKeywordsError
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    });

    // Should pass the status guard and then fail because there are no keywords
    await expect(campaignService.startGeneration(campaignId, userId)).rejects.toThrow(
      NoPendingKeywordsError
    );
  });

  it('should proceed when campaign is paused (resume path — queued keywords exist)', async () => {
    // First call: getById — paused campaign
    mockSelectSingle(createMockCampaign({ status: 'paused' }));

    // Second call: select pending keywords (none — this is a resume)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    });

    // Third call: select queued keywords (some exist = resume path)
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ id: 'kw-1' }, { id: 'kw-2' }],
            error: null,
          })),
        })),
      })),
    });

    // Fourth call: update campaign status to active
    mockSupabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    });

    const result = await campaignService.startGeneration(campaignId, userId);

    expect(result.queued).toBe(2);
    expect(result.creditsRequired).toBe(0); // Resume path: credits already deducted
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    mockSelectSingle(null, { code: 'PGRST116', message: 'Not found' });

    await expect(campaignService.startGeneration(campaignId, userId)).rejects.toThrow(
      CampaignNotFoundError
    );
  });
});
