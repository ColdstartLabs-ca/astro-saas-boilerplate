/**
 * Unit Tests: Campaign Idempotency Service
 *
 * Tests for campaign-idempotency.service.ts including:
 * - Idempotency key validation
 * - Claim generation with new request
 * - Return cached response for existing idempotency key
 * - Handle already_running status
 * - Mark completed/failed operations
 * - Clear campaign run ID
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignIdempotencyService } from '@server/services/campaign-idempotency.service';
import type { IClaimCampaignGenerationResult } from '@shared/types/campaign.types';

// Mock Supabase
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

const mockRpc = supabaseAdmin.rpc as vi.Mock;
const mockFrom = supabaseAdmin.from as vi.Mock;

describe('CampaignIdempotencyService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('claimGeneration', () => {
    const campaignId = 'campaign-123';
    const userId = 'user-123';
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4

    it('should claim new generation successfully', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            success: true,
            generation_run_id: 'run-123',
            existing_status: null,
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        idempotencyKey,
        userId
      );

      expect(result.isNew).toBe(true);
      expect(result.generationRunId).toBe('run-123');
      expect(mockRpc).toHaveBeenCalledWith('claim_campaign_generation', {
        p_campaign_id: campaignId,
        p_idempotency_key: idempotencyKey,
        p_user_id: userId,
      });
    });

    it('should return cached response for completed generation', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            success: false,
            generation_run_id: 'run-123',
            existing_status: 'completed',
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const cachedResponse = { queued: 5, creditsRequired: 10 };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                response_data: cachedResponse,
                queued_count: 5,
                credits_used: 10,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        '550e8400-e29b-41d4-a716-446655440001',
        userId
      );

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('completed');
      expect(result.cachedResponse).toEqual(cachedResponse);
    });

    it('should return already_running status when campaign is active', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            success: false,
            generation_run_id: null,
            existing_status: 'already_running',
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        '550e8400-e29b-41d4-a716-446655440001',
        userId
      );

      expect(result.isNew).toBe(false);
      expect(result.existingStatus).toBe('already_running');
    });

    it('should throw error for invalid idempotency key', async () => {
      await expect(
        CampaignIdempotencyService.claimGeneration(campaignId, 'short', userId)
      ).rejects.toThrow('Invalid idempotency key format');
    });

    it('should throw error for campaign not found', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Campaign not found' },
      });

      await expect(
        CampaignIdempotencyService.claimGeneration(
          campaignId,
          '550e8400-e29b-41d4-a716-446655440001',
          userId
        )
      ).rejects.toThrow('Campaign not found or access denied');
    });

    it('should accept valid UUID v4 idempotency keys', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockRpc.mockResolvedValue({
        data: [{ success: true, generation_run_id: 'run-123', existing_status: null }],
        error: null,
      });

      const result = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        validUUID,
        userId
      );

      expect(result.isNew).toBe(true);
    });

    it('should accept long string idempotency keys (32+ chars)', async () => {
      const longKey = 'a'.repeat(32);
      mockRpc.mockResolvedValue({
        data: [{ success: true, generation_run_id: 'run-123', existing_status: null }],
        error: null,
      });

      const result = await CampaignIdempotencyService.claimGeneration(campaignId, longKey, userId);

      expect(result.isNew).toBe(true);
    });

    it('should reject short idempotency keys', async () => {
      await expect(
        CampaignIdempotencyService.claimGeneration(campaignId, 'short-key', userId)
      ).rejects.toThrow('Invalid idempotency key format');
    });
  });

  describe('markCompleted', () => {
    const generationRunId = 'run-123';
    const responseData = { queued: 5, creditsRequired: 10 };
    const queuedCount = 5;
    const creditsUsed = 10;

    it('should mark generation as completed successfully', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await CampaignIdempotencyService.markCompleted(
        generationRunId,
        responseData,
        queuedCount,
        creditsUsed
      );

      expect(mockRpc).toHaveBeenCalledWith('complete_campaign_generation', {
        p_generation_run_id: generationRunId,
        p_response_data: responseData,
        p_queued_count: queuedCount,
        p_credits_used: creditsUsed,
      });
    });

    it('should throw error when database update fails', async () => {
      const dbError = new Error('Database update failed');
      mockRpc.mockResolvedValue({ error: dbError });

      await expect(
        CampaignIdempotencyService.markCompleted(
          generationRunId,
          responseData,
          queuedCount,
          creditsUsed
        )
      ).rejects.toThrow('Database error marking generation completed');
    });
  });

  describe('markFailed', () => {
    const generationRunId = 'run-123';
    const errorMessage = 'Insufficient credits';

    it('should mark generation as failed successfully', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await CampaignIdempotencyService.markFailed(generationRunId, errorMessage);

      expect(mockRpc).toHaveBeenCalledWith('fail_campaign_generation', {
        p_generation_run_id: generationRunId,
        p_error_message: errorMessage,
      });
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const dbError = new Error('Database update failed');
      mockRpc.mockResolvedValue({ error: dbError });

      // Should not throw, just log error
      await expect(
        CampaignIdempotencyService.markFailed(generationRunId, errorMessage)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('clearCampaignRunId', () => {
    const campaignId = 'campaign-123';

    it('should clear generation run ID successfully', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await CampaignIdempotencyService.clearCampaignRunId(campaignId);

      expect(mockRpc).toHaveBeenCalledWith('clear_campaign_generation_run', {
        p_campaign_id: campaignId,
      });
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const dbError = new Error('Database update failed');
      mockRpc.mockResolvedValue({ error: dbError });

      // Should not throw, just log error
      await expect(
        CampaignIdempotencyService.clearCampaignRunId(campaignId)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate valid UUID v4 idempotency keys', () => {
      const key1 = CampaignIdempotencyService.generateIdempotencyKey();
      const key2 = CampaignIdempotencyService.generateIdempotencyKey();

      // Should be valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(key1)).toBe(true);
      expect(uuidRegex.test(key2)).toBe(true);

      // Should be unique
      expect(key1).not.toBe(key2);
    });
  });

  describe('Concurrent Request Handling', () => {
    const campaignId = 'campaign-123';
    const userId = 'user-123';
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440002'; // Valid UUID v4

    it('should handle concurrent requests with same idempotency key', async () => {
      // First request succeeds
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            success: true,
            generation_run_id: 'run-123',
            existing_status: null,
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result1 = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        idempotencyKey,
        userId
      );
      expect(result1.isNew).toBe(true);

      // Second concurrent request with same key gets cached response
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            success: false,
            generation_run_id: 'run-123',
            existing_status: 'processing',
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result2 = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        idempotencyKey,
        userId
      );
      expect(result2.isNew).toBe(false);
      expect(result2.existingStatus).toBe('processing');
    });

    it('should prevent duplicate articles on concurrent requests with different keys', async () => {
      // First request claims the campaign
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            success: true,
            generation_run_id: 'run-123',
            existing_status: null,
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result1 = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        '550e8400-e29b-41d4-a716-446655440003',
        userId
      );
      expect(result1.isNew).toBe(true);

      // Second request with different key gets already_running
      mockRpc.mockResolvedValueOnce({
        data: [
          {
            success: false,
            generation_run_id: null,
            existing_status: 'already_running',
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result2 = await CampaignIdempotencyService.claimGeneration(
        campaignId,
        '550e8400-e29b-41d4-a716-446655440004',
        userId
      );
      expect(result2.isNew).toBe(false);
      expect(result2.existingStatus).toBe('already_running');
    });
  });

  describe('Idempotency Key Validation', () => {
    it('should validate all valid UUID formats', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000', // lowercase
        '550E8400-E29B-41D4-A716-446655440000', // uppercase
        '550e8400-e29b-41d4-a716-446655440000', // mixed
      ];

      for (const uuid of validUUIDs) {
        mockRpc.mockResolvedValue({
          data: [{ success: true, generation_run_id: 'run-123', existing_status: null }],
          error: null,
        });

        const result = await CampaignIdempotencyService.claimGeneration(
          'campaign-123',
          uuid,
          'user-123'
        );
        expect(result.isNew).toBe(true);
      }
    });

    it('should reject invalid idempotency key formats', async () => {
      const invalidKeys = [
        '', // empty
        'short', // too short
        'abc-123', // too short
        null, // null
        undefined, // undefined
      ];

      for (const key of invalidKeys) {
        await expect(
          CampaignIdempotencyService.claimGeneration('campaign-123', key as string, 'user-123')
        ).rejects.toThrow('Invalid idempotency key format');
      }
    });
  });

  describe('Type Safety and Structure', () => {
    it('should return IClaimCampaignGenerationResult for new requests', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            success: true,
            generation_run_id: 'run-123',
            existing_status: null,
            campaign_locked: true,
          },
        ],
        error: null,
      });

      const result: IClaimCampaignGenerationResult =
        await CampaignIdempotencyService.claimGeneration(
          'campaign-123',
          '550e8400-e29b-41d4-a716-446655440005',
          'user-123'
        );

      expect(result).toHaveProperty('isNew');
      expect(result.isNew).toBe(true);
      expect(result).toHaveProperty('generationRunId');
    });

    it('should return IClaimCampaignGenerationResult for existing requests', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            success: false,
            generation_run_id: 'run-123',
            existing_status: 'completed',
            campaign_locked: true,
          },
        ],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                response_data: { queued: 5, creditsRequired: 10 },
                queued_count: 5,
                credits_used: 10,
              },
              error: null,
            }),
          }),
        }),
      });

      const result: IClaimCampaignGenerationResult =
        await CampaignIdempotencyService.claimGeneration(
          'campaign-123',
          '550e8400-e29b-41d4-a716-446655440006',
          'user-123'
        );

      expect(result).toHaveProperty('isNew');
      expect(result.isNew).toBe(false);
      expect(result).toHaveProperty('existingStatus');
      expect(result).toHaveProperty('cachedResponse');
    });
  });
});
