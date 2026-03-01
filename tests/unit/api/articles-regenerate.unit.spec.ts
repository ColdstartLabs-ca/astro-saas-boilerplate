/**
 * Article Regenerate API Unit Tests
 *
 * Tests for the /api/articles/[articleId]/regenerate endpoint:
 * - Status precondition validation (only retryable statuses)
 * - Proper credit cost calculation using getImagePresetCreditCost
 * - Conditional update to prevent race conditions
 * - 409 Conflict response when regenerate already in progress
 * - Concurrent regenerate attempts handling
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Get the file path directly using path.resolve to handle bracketed directory
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regenerateModulePath = path.resolve(
  __dirname,
  '../../../src/pages/api/articles/[articleId]/regenerate.ts'
);

// All regenerable statuses from the actual implementation
const REGENERATABLE_STATUSES = [
  'failed',
  'failed_quality',
  'failed_timeout',
  'qa_failed',
  'rejected',
];

// Mock dependencies first before importing the module under test
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();
const mockRpc = vi.fn();
const mockFireAndForget = vi.fn();
const mockGenerateArticle = vi.fn();

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock('@server/services/article-generation.service', () => ({
  articleGenerationService: {
    generateArticle: mockGenerateArticle,
  },
}));

vi.mock('@src/pages/api/_utils', () => ({
  withAuth: (handler: any) => handler,
  jsonResponse: (data: any, status = 200) => ({
    status,
    json: async () => ({ success: true, data }),
  }),
  errorResponse: (code: string, message: string, status: number) => ({
    status,
    json: async () => ({ success: false, error: { code, message } }),
  }),
  fireAndForget: mockFireAndForget,
}));

// Import the module - we'll use dynamic import with a workaround
let POST: any;

describe('POST /api/articles/[articleId]/regenerate', () => {
  beforeAll(async () => {
    // Use Node's native dynamic import with absolute path
    const module = await import(regenerateModulePath);
    POST = module.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup from() to return an object with BOTH select and update methods
    // This allows the same mock to be used for both select and update queries
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    // Setup select().eq().eq().single() chain
    // The select query uses: .select(...).eq('id', articleId).eq('user_id', userId).single()
    // So mockEq must return an object with both eq() and single() methods
    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    // Create a self-referential mock for eq() that supports chaining
    // eq() returns an object with eq() (for chaining) and single()
    const createEqResult = () => ({
      eq: mockEq,
      single: mockSingle,
      in: mockIn, // Also include in() for update chain
    });
    mockEq.mockImplementation(() => createEqResult());
    mockIn.mockImplementation(() => ({
      select: () => ({
        single: mockSingle,
      }),
    }));

    // Setup update().eq().in().select().single() chain
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    // Default: RPC calls succeed (consume_credits_v2, refund_credits_v2)
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFireAndForget.mockImplementation(() => {});
  });

  // Helper to create a mock article
  const createMockArticle = (overrides: Partial<any> = {}) => ({
    id: 'article-123',
    user_id: 'user-123',
    primary_keyword: 'test keyword',
    status: 'failed',
    campaigns: {
      id: 'campaign-123',
      project_id: 'project-123',
      ai_model: 'gpt-4',
      tone: 'professional',
      target_word_count: 1500,
      image_preset: null,
    },
    ...overrides,
  });

  describe('Status Precondition Validation', () => {
    it('should allow regeneration for failed articles', async () => {
      const mockArticle = createMockArticle({ status: 'failed' });
      // Only 2 mockSingle calls: article fetch + update result
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null }) // Article fetch
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null }); // Update result

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);
      const json = await result.json();
      expect(json.success).toBe(true);
    });

    it('should allow regeneration for failed_quality articles', async () => {
      const mockArticle = createMockArticle({ status: 'failed_quality' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);
      const json = await result.json();
      expect(json.success).toBe(true);
    });

    it('should allow regeneration for failed_timeout articles', async () => {
      const mockArticle = createMockArticle({ status: 'failed_timeout' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);
      const json = await result.json();
      expect(json.success).toBe(true);
    });

    it('should allow regeneration for qa_failed articles', async () => {
      const mockArticle = createMockArticle({ status: 'qa_failed' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);
      const json = await result.json();
      expect(json.success).toBe(true);
    });

    it('should allow regeneration for rejected articles', async () => {
      const mockArticle = createMockArticle({ status: 'rejected' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);
      const json = await result.json();
      expect(json.success).toBe(true);
    });

    it('should reject regeneration for draft articles', async () => {
      const mockArticle = createMockArticle({ status: 'draft' });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('cannot be regenerated');
      expect(json.error.message).toContain('draft');
    });

    it('should reject regeneration for generating articles', async () => {
      const mockArticle = createMockArticle({ status: 'generating' });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject regeneration for published articles', async () => {
      const mockArticle = createMockArticle({ status: 'published' });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject regeneration for queued articles', async () => {
      const mockArticle = createMockArticle({ status: 'queued' });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Credit Cost Calculation', () => {
    it('should use getImagePresetCreditCost for budget preset (0 cost)', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'gpt-4',
          tone: 'professional',
          target_word_count: 1500,
          image_preset: 'budget',
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called with totalCreditsNeeded = 1 (base) + 0 (budget) = 1
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', {
        target_user_id: 'user-123',
        amount: 1,
        ref_id: 'article-123',
        description: 'Article regeneration: test keyword',
      });
    });

    it('should use getImagePresetCreditCost for balanced preset (1 cost)', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'gpt-4',
          tone: 'professional',
          target_word_count: 1500,
          image_preset: 'balanced',
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called with totalCreditsNeeded = 1 (base) + 1 (balanced) = 2
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', {
        target_user_id: 'user-123',
        amount: 2,
        ref_id: 'article-123',
        description: 'Article regeneration: test keyword',
      });
    });

    it('should use getImagePresetCreditCost for pro preset (1 cost)', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'gpt-4',
          tone: 'professional',
          target_word_count: 1500,
          image_preset: 'pro',
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called with totalCreditsNeeded = 1 (base) + 1 (pro) = 2
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', {
        target_user_id: 'user-123',
        amount: 2,
        ref_id: 'article-123',
        description: 'Article regeneration: test keyword',
      });
    });

    it('should use getImagePresetCreditCost for ultra preset (2 cost)', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'gpt-4',
          tone: 'professional',
          target_word_count: 1500,
          image_preset: 'ultra',
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called with totalCreditsNeeded = 1 (base) + 2 (ultra) = 3
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', {
        target_user_id: 'user-123',
        amount: 3,
        ref_id: 'article-123',
        description: 'Article regeneration: test keyword',
      });
    });

    it('should use getImagePresetCreditCost for null preset (0 cost)', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'gpt-4',
          tone: 'professional',
          target_word_count: 1500,
          image_preset: null,
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called with totalCreditsNeeded = 1 (base) + 0 (null) = 1
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', {
        target_user_id: 'user-123',
        amount: 1,
        ref_id: 'article-123',
        description: 'Article regeneration: test keyword',
      });
    });
  });

  describe('Conditional Update and Race Condition Prevention', () => {
    it('should use conditional update with WHERE IN clause for status check', async () => {
      const mockArticle = createMockArticle({ status: 'failed' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify update was called
      expect(mockUpdate).toHaveBeenCalled();

      // Verify that .in() was called with all retryable statuses (for conditional update)
      expect(mockIn).toHaveBeenCalledWith('status', REGENERATABLE_STATUSES);
    });

    it('should return 409 Conflict when conditional update affects 0 rows (race condition)', async () => {
      const mockArticle = createMockArticle({ status: 'failed' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        // Simulate no rows updated (another request already changed the status)
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(409);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CONFLICT');
      expect(json.error.message).toContain('already in progress');
    });

    it('should refund credits when conditional update fails after deduction', async () => {
      const mockArticle = createMockArticle({ status: 'failed' });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        // Simulate no rows updated
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify consume_credits_v2 was called first
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', expect.any(Object));

      // Verify refund_credits_v2 was called after the update failed
      expect(mockRpc).toHaveBeenCalledWith('refund_credits_v2', {
        target_user_id: 'user-123',
        amount: 1,
        job_id: 'article-123',
        p_description: expect.stringContaining('Refund for failed regeneration lock'),
      });
    });
  });

  describe('Concurrent Regenerate Attempts', () => {
    it('should handle concurrent requests gracefully - only one succeeds', async () => {
      // This test verifies that concurrent regenerate requests don't cause double charges
      // The actual behavior depends on timing - either:
      // 1. First request updates status, second request fails validation (400)
      // 2. Both pass validation, conditional update blocks second (409)

      const mockArticle = createMockArticle({ status: 'failed' });

      // Reset and configure mocks specifically for this test
      vi.clearAllMocks();

      // Track calls with local counter
      let localCallCount = 0;
      mockSingle.mockImplementation(async () => {
        localCallCount++;

        // Request 1 reads article as failed
        if (localCallCount === 1) {
          return { data: mockArticle, error: null };
        }
        // Request 1 update succeeds
        if (localCallCount === 2) {
          return { data: { id: 'article-123' }, error: null };
        }
        // Request 2 reads article as generating (after Request 1's update)
        if (localCallCount === 3) {
          return { data: { ...mockArticle, status: 'generating' }, error: null };
        }

        return { data: null, error: null };
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        in: mockIn,
      });
      mockIn.mockReturnValue({
        select: () => ({
          single: mockSingle,
        }),
      });
      mockRpc.mockResolvedValue({ data: null, error: null });

      // Simulate concurrent requests
      const [result1, result2] = await Promise.all([
        POST('user-123', {
          params: { articleId: 'article-123' },
          locals: {},
        }),
        POST('user-123', {
          params: { articleId: 'article-123' },
          locals: {},
        }),
      ]);

      // First should succeed (202), second should fail with validation error (400)
      // or conflict (409) - both prevent double charging
      expect(result1.status).toBe(202);
      expect([400, 409]).toContain(result2.status);

      // Only one credit deduction should occur
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith('consume_credits_v2', expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent articles', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const result = await POST('user-123', {
        params: { articleId: 'non-existent' },
        locals: {},
      });

      expect(result.status).toBe(404);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for missing article ID', async () => {
      const result = await POST('user-123', {
        params: { articleId: '' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 for articles without campaign', async () => {
      const mockArticle = createMockArticle({ campaigns: null });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('no associated campaign');
    });

    it('should return 402 for insufficient credits', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        campaigns: {
          ...createMockArticle().campaigns,
          image_preset: 'pro', // Costs 2 credits total (1 base + 1 for pro)
        },
      });
      mockSingle.mockResolvedValueOnce({ data: mockArticle, error: null });

      // Mock consume_credits_v2 to return an error (insufficient credits)
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Insufficient credits' } });

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(402);
      const json = await result.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INSUFFICIENT_CREDITS');
      expect(json.error.message).toContain('2 credits');
    });
  });

  describe('Successful Regeneration', () => {
    it('should start generation with correct parameters', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        primary_keyword: 'coffee beans',
        campaigns: {
          id: 'campaign-123',
          project_id: 'project-123',
          ai_model: 'claude-3-opus',
          tone: 'casual',
          target_word_count: 2000,
          image_preset: 'balanced',
        },
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });
      mockGenerateArticle.mockResolvedValue(undefined);

      const result = await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      expect(result.status).toBe(202);

      // Verify fireAndForget was called
      expect(mockFireAndForget).toHaveBeenCalled();
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        'article-123',
        'user-123',
        expect.objectContaining({
          keyword: 'coffee beans',
          projectId: 'project-123',
          campaignId: 'campaign-123',
          model: 'claude-3-opus',
          tone: 'casual',
          targetWordCount: 2000,
          imagePreset: 'balanced',
        })
      );
    });

    it('should clear generation_error on regeneration', async () => {
      const mockArticle = createMockArticle({
        status: 'failed',
        generation_error: 'Previous error message',
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockArticle, error: null })
        .mockResolvedValueOnce({ data: { id: 'article-123' }, error: null });

      await POST('user-123', {
        params: { articleId: 'article-123' },
        locals: {},
      });

      // Verify update was called with generation_error: null and credits_used
      // Note: null image_preset means 0 image cost, so total is 1 (base cost)
      expect(mockUpdate).toHaveBeenCalledWith(
        {
          status: 'generating',
          generation_error: null,
          credits_used: 1, // 1 base cost + 0 for null image preset
        },
        { count: 'exact' }
      );
    });
  });
});
