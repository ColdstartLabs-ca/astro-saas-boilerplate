/**
 * Campaign Idempotency Service
 *
 * Provides idempotency support for campaign generation start operations.
 * Similar pattern to webhook idempotency but specifically for campaign generation.
 *
 * This prevents:
 * - Duplicate article creation on concurrent start requests
 * - Double-charging credits when multiple requests hit simultaneously
 * - Enables cached response retrieval for retry requests
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { serverEnv } from '@shared/config/env';

// Inline types (previously exported from campaign.types.ts but removed in issue #36 simplification)
interface ICampaignGenerationRunResult {
  queued: number;
  creditsRequired: number;
}

interface IClaimCampaignGenerationResult {
  isNew: boolean;
  generationRunId?: string;
  existingStatus?: string;
  cachedResponse?: ICampaignGenerationRunResult;
}

// In-memory test data store for test mode
const testModeGenerationRuns = new Map<
  string,
  {
    status: string;
    response?: ICampaignGenerationRunResult;
  }
>();

export class CampaignIdempotencyService {
  /**
   * Claim a campaign generation with idempotency key.
   * Uses database-level locking (SELECT FOR UPDATE) to prevent concurrent starts.
   *
   * @param campaignId - The campaign ID to start
   * @param idempotencyKey - Unique key for idempotency (from X-Idempotency-Key header)
   * @param userId - The user ID making the request
   * @returns Claim result indicating if this is a new request or cached response
   */
  static async claimGeneration(
    campaignId: string,
    idempotencyKey: string,
    userId: string
  ): Promise<IClaimCampaignGenerationResult> {
    // Validate idempotency key format
    if (!this.isValidIdempotencyKey(idempotencyKey)) {
      throw new Error('Invalid idempotency key format. Must be a UUID or 32+ character string.');
    }

    // In test mode with mock users, use in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const existingRun = testModeGenerationRuns.get(campaignId);

      if (existingRun && existingRun.status === 'already_running') {
        return {
          isNew: false,
          existingStatus: 'already_running',
        };
      }

      if (existingRun && existingRun.status === 'completed' && existingRun.response) {
        return {
          isNew: false,
          existingStatus: 'completed',
          cachedResponse: existingRun.response,
        };
      }

      // Create a new generation run
      const generationRunId = crypto.randomUUID();
      testModeGenerationRuns.set(campaignId, {
        status: 'already_running',
      });

      return {
        isNew: true,
        generationRunId,
      };
    }

    // Call the database function which handles locking and idempotency check atomically
    const { data, error } = await supabaseAdmin.rpc('claim_campaign_generation', {
      p_campaign_id: campaignId,
      p_idempotency_key: idempotencyKey,
      p_user_id: userId,
    });

    if (error) {
      // Check for specific error codes
      if (error.code === '42501') {
        throw new Error('Campaign not found or access denied');
      }
      throw new Error(`Failed to claim campaign generation: ${error.message}`);
    }

    // RPC returns a single row with columns: success, generation_run_id, existing_status, campaign_locked
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!result) {
      throw new Error('No result from claim_campaign_generation');
    }

    if (result.success) {
      return {
        isNew: true,
        generationRunId: result.generation_run_id,
      };
    }

    // Not a new request - check what status the existing run has
    if (result.existing_status === 'already_running') {
      return {
        isNew: false,
        existingStatus: 'already_running',
      };
    }

    // Fetch the cached response data for completed runs
    if (result.existing_status === 'completed' && result.generation_run_id) {
      const { data: runData } = await supabaseAdmin
        .from('campaign_generation_runs')
        .select('response_data, queued_count, credits_used')
        .eq('id', result.generation_run_id)
        .single();

      if (runData) {
        return {
          isNew: false,
          existingStatus: 'completed',
          cachedResponse: runData.response_data as ICampaignGenerationRunResult,
        };
      }
    }

    return {
      isNew: false,
      existingStatus: result.existing_status || 'unknown',
    };
  }

  /**
   * Mark a generation run as completed with response data.
   * This stores the result for future idempotency key lookups.
   *
   * @param generationRunId - The generation run ID
   * @param responseData - The response data to cache
   * @param queuedCount - Number of articles queued
   * @param creditsUsed - Credits consumed
   */
  static async markCompleted(
    generationRunId: string,
    responseData: ICampaignGenerationRunResult,
    queuedCount: number,
    creditsUsed: number
  ): Promise<void> {
    // In test mode, update in-memory store
    if (serverEnv.ENV === 'test') {
      for (const [campaignId, run] of testModeGenerationRuns.entries()) {
        if (run.status === 'already_running') {
          testModeGenerationRuns.set(campaignId, {
            status: 'completed',
            response: responseData,
          });
          break;
        }
      }
      return;
    }

    const { error } = await supabaseAdmin.rpc('complete_campaign_generation', {
      p_generation_run_id: generationRunId,
      p_response_data: responseData as unknown as Record<string, unknown>,
      p_queued_count: queuedCount,
      p_credits_used: creditsUsed,
    });

    if (error) {
      console.error(`Failed to mark generation run ${generationRunId} as completed:`, error);
      throw new Error(`Database error marking generation completed: ${error.message}`);
    }
  }

  /**
   * Mark a generation run as failed with error message.
   *
   * @param generationRunId - The generation run ID
   * @param errorMessage - Error message describing the failure
   */
  static async markFailed(generationRunId: string, errorMessage: string): Promise<void> {
    // In test mode, update in-memory store
    if (serverEnv.ENV === 'test') {
      for (const [campaignId, run] of testModeGenerationRuns.entries()) {
        if (run.status === 'already_running') {
          testModeGenerationRuns.set(campaignId, {
            status: 'failed',
            response: undefined,
          });
          break;
        }
      }
      return;
    }

    const { error } = await supabaseAdmin.rpc('fail_campaign_generation', {
      p_generation_run_id: generationRunId,
      p_error_message: errorMessage,
    });

    if (error) {
      console.error(`Failed to mark generation run ${generationRunId} as failed:`, error);
    }
  }

  /**
   * Clear the generation_run_id from a campaign after completion.
   * This allows the campaign to be started again (e.g., after adding more keywords).
   *
   * @param campaignId - The campaign ID
   */
  static async clearCampaignRunId(campaignId: string): Promise<void> {
    // In test mode, update in-memory store
    if (serverEnv.ENV === 'test') {
      testModeGenerationRuns.delete(campaignId);
      return;
    }

    const { error } = await supabaseAdmin.rpc('clear_campaign_generation_run', {
      p_campaign_id: campaignId,
    });

    if (error) {
      console.error(`Failed to clear generation run ID for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Validate idempotency key format.
   * Accepts UUID v4 format or strings with 32+ characters.
   *
   * @param key - The idempotency key to validate
   * @returns true if valid, false otherwise
   */
  private static isValidIdempotencyKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Accept UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(key)) {
      return true;
    }

    // Accept strings with 32+ characters (common for client-generated keys)
    if (key.length >= 32) {
      return true;
    }

    return false;
  }

  /**
   * Generate a client-side idempotency key (for convenience).
   * In production, clients should generate their own keys.
   *
   * @returns A new UUID v4 idempotency key
   */
  static generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }
}
