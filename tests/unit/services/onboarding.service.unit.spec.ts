import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { onboardingService } from '@server/services/onboarding.service';
import { OnboardingStepError } from '@shared/types/onboarding.types';

// Mock supabaseAdmin - must use factory function
vi.mock('@server/supabase/supabaseAdmin', () => {
  // Create mock functions that will be chained
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();

  // Build chain: from -> select/insert/update/delete -> eq -> single/maybeSingle
  const selectChain = () => ({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle });
  const insertChain = () => ({ select: mockSelect });
  const updateChain = () => ({ eq: mockEq });
  const deleteChain = () => ({ eq: mockEq });
  const eqChain = () => ({ single: mockSingle, maybeSingle: mockMaybeSingle });

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    eq: mockEq,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  }));
  mockSelect.mockImplementation(selectChain);
  mockInsert.mockImplementation(insertChain);
  mockUpdate.mockImplementation(updateChain);
  mockDelete.mockImplementation(deleteChain);
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockEq.mockImplementation(eqChain);
  mockSingle.mockReturnValue({ data: null, error: null });
  mockMaybeSingle.mockReturnValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
  };
});

// Mock serverEnv to return development mode (not test with mock_user_)
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    ENV: 'development',
  },
}));

describe('OnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockUserId = '01234567-89ab-cdef-0123-456789abcdef';

  const mockOnboarding = {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: mockUserId,
    current_step: 1,
    completed_steps: [],
    skipped_steps: [],
    is_complete: false,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getStatus', () => {
    it('should return existing onboarding status', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
          }),
        }),
      } as unknown);

      const status = await onboardingService.getStatus(mockUserId);

      expect(status).toEqual({
        isComplete: false,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
      });
    });

    it('should create new onboarding record if not exists', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check for existing onboarding record
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: check for existing projects (edge case for existing users)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: insert new onboarding record
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockOnboarding, id: 'new-id' },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
        return {} as unknown;
      });

      const status = await onboardingService.getStatus(mockUserId);

      expect(status).toEqual({
        isComplete: false,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
      });
    });

    it('should handle race condition with unique constraint violation', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check for existing onboarding record
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: check for existing projects
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: insert fails with unique violation
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'Unique violation' },
                }),
              }),
            }),
          } as unknown;
        } else {
          // Fourth call: retry fetch
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
              }),
            }),
          } as unknown;
        }
      });

      const status = await onboardingService.getStatus(mockUserId);

      expect(status).toEqual({
        isComplete: false,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
      });
    });

    it('should throw error on database failure', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as unknown);

      await expect(onboardingService.getStatus(mockUserId)).rejects.toThrow(
        'Failed to get onboarding status'
      );
    });

    it('should auto-complete onboarding for existing users with projects', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check for existing onboarding record - not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as unknown;
        } else if (callCount === 2) {
          // Second call: check for existing projects - FOUND
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { id: 'existing-project' }, error: null }),
                }),
              }),
            }),
          } as unknown;
        } else if (callCount === 3) {
          // Third call: insert complete onboarding record
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockOnboarding, is_complete: true, current_step: 5 },
                  error: null,
                }),
              }),
            }),
          } as unknown;
        }
        return {} as unknown;
      });

      const status = await onboardingService.getStatus(mockUserId);

      // Existing users with projects should have onboarding auto-completed
      expect(status).toEqual({
        isComplete: true,
        currentStep: 5,
        completedSteps: [1, 2, 3, 4],
        skippedSteps: [],
      });
    });
  });

  describe('updateProgress', () => {
    it('should update onboarding progress', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as unknown);

      await onboardingService.updateProgress(mockUserId, {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      // Success - no error thrown
    });

    it('should create onboarding record if record does not exist (upsert)', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as unknown);

      await expect(
        onboardingService.updateProgress(mockUserId, {
          currentStep: 2,
          completedSteps: [1],
          skippedSteps: [],
        })
      ).resolves.toBeUndefined();
    });

    it('should throw error if step is both completed and skipped', async () => {
      await expect(
        onboardingService.updateProgress(mockUserId, {
          currentStep: 3,
          completedSteps: [1, 2],
          skippedSteps: [2], // Step 2 is both completed and skipped
        })
      ).rejects.toThrow(OnboardingStepError);
    });

    it('should throw error if skipping to unreachable step', async () => {
      await expect(
        onboardingService.updateProgress(mockUserId, {
          currentStep: 5,
          completedSteps: [1], // Missing steps 2, 3, 4
          skippedSteps: [],
        })
      ).rejects.toThrow('Cannot skip to this step');
    });

    it('should throw error on database failure', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      } as unknown);

      await expect(
        onboardingService.updateProgress(mockUserId, {
          currentStep: 2,
          completedSteps: [1],
          skippedSteps: [],
        })
      ).rejects.toThrow('Failed to update onboarding progress');
    });

    it('should validate step range on currentStep', async () => {
      await expect(
        onboardingService.updateProgress(mockUserId, {
          currentStep: 6, // Invalid step
          completedSteps: [1],
          skippedSteps: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('completeStep', () => {
    it('should mark a step as complete', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getStatus: check for existing record
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
              }),
            }),
          } as unknown;
        } else {
          // updateProgress: upsert record
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          } as unknown;
        }
      });

      const status = await onboardingService.completeStep(mockUserId, 1);

      expect(status.completedSteps).toContain(1);
      expect(status.currentStep).toBe(2);
    });

    it('should return existing status if step already completed', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const existingOnboarding = {
        ...mockOnboarding,
        completed_steps: [1],
        current_step: 2,
      };

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingOnboarding, error: null }),
          }),
        }),
      } as unknown);

      const status = await onboardingService.completeStep(mockUserId, 1);

      expect(status.completedSteps).toContain(1);
    });

    it('should remove step from skipped when marking complete', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const existingOnboarding = {
        ...mockOnboarding,
        skipped_steps: [1],
      };

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingOnboarding, error: null }),
              }),
            }),
          } as unknown;
        } else {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          } as unknown;
        }
      });

      const status = await onboardingService.completeStep(mockUserId, 1);

      expect(status.completedSteps).toContain(1);
      expect(status.skippedSteps).not.toContain(1);
    });

    it('should throw error for invalid step number', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
          }),
        }),
      } as unknown);

      await expect(onboardingService.completeStep(mockUserId, 6)).rejects.toThrow(
        OnboardingStepError
      );
    });

    it('should throw OnboardingNotFoundError if no record exists', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          } as unknown;
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Insert failed' },
                }),
              }),
            }),
          } as unknown;
        }
      });

      await expect(onboardingService.completeStep(mockUserId, 1)).rejects.toThrow();
    });
  });

  describe('skipStep', () => {
    it('should mark a step as skipped', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let callCount = 0;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
              }),
            }),
          } as unknown;
        } else {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          } as unknown;
        }
      });

      const status = await onboardingService.skipStep(mockUserId, 1);

      expect(status.skippedSteps).toContain(1);
      expect(status.currentStep).toBe(2);
    });

    it('should return existing status if step already skipped', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const existingOnboarding = {
        ...mockOnboarding,
        skipped_steps: [1],
      };

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingOnboarding, error: null }),
          }),
        }),
      } as unknown);

      const status = await onboardingService.skipStep(mockUserId, 1);

      expect(status.skippedSteps).toContain(1);
    });

    it('should throw error when trying to skip completion step', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
          }),
        }),
      } as unknown);

      await expect(onboardingService.skipStep(mockUserId, 5)).rejects.toThrow(
        'Cannot skip the completion step'
      );
    });

    it('should throw error for invalid step number', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
          }),
        }),
      } as unknown);

      await expect(onboardingService.skipStep(mockUserId, 0)).rejects.toThrow(OnboardingStepError);
    });
  });

  describe('markComplete', () => {
    it('should mark onboarding as complete with timestamp', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let updateCall: Record<string, unknown> | null = null;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockImplementation((data: unknown) => {
          updateCall = data as Record<string, unknown>;
          return Promise.resolve({ error: null });
        }),
      } as unknown);

      await onboardingService.markComplete(mockUserId);

      expect(updateCall).toMatchObject({
        is_complete: true,
        current_step: 5,
      });
      expect(updateCall?.completed_at).toBeDefined();
    });

    it('should upsert completion when record does not exist', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as unknown);

      await expect(onboardingService.markComplete(mockUserId)).resolves.toBeUndefined();
    });

    it('should throw error on database failure', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      } as unknown);

      await expect(onboardingService.markComplete(mockUserId)).rejects.toThrow(
        'Failed to mark onboarding complete'
      );
    });
  });

  describe('reset', () => {
    it('should reset onboarding to initial state', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      let updateCall: Record<string, unknown> | null = null;
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: unknown) => {
          updateCall = data as Record<string, unknown>;
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      } as unknown);

      await onboardingService.reset(mockUserId);

      expect(updateCall).toMatchObject({
        current_step: 1,
        completed_steps: [],
        skipped_steps: [],
        is_complete: false,
        completed_at: null,
      });
    });

    it('should throw error on database failure', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Reset failed' } }),
        }),
      } as unknown);

      await expect(onboardingService.reset(mockUserId)).rejects.toThrow(
        'Failed to reset onboarding'
      );
    });
  });

  describe('delete', () => {
    it('should delete onboarding record', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown);

      await onboardingService.delete(mockUserId);

      // Success - no error thrown
    });

    it('should throw error on database failure', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      } as unknown);

      await expect(onboardingService.delete(mockUserId)).rejects.toThrow(
        'Failed to delete onboarding'
      );
    });
  });
});
