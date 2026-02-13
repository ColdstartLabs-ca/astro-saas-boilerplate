import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { OnboardingStep } from '@shared/types/onboarding.types';

describe('onboardingStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useOnboardingStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useOnboardingStore.getState();

      expect(state.currentStep).toBe(OnboardingStep.PROJECT_CREATION);
      expect(state.completedSteps).toEqual(new Set());
      expect(state.skippedSteps).toEqual(new Set());
      expect(state.projectId).toBeNull();
      expect(state.keywordCount).toBe(0);
      expect(state.hasGscConnection).toBe(false);
      expect(state.hasIntegration).toBe(false);
    });
  });

  describe('Step Tracking Actions', () => {
    describe('setCurrentStep', () => {
      it('should set the current step', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.GSC_CONNECTION);
      });

      it('should ignore invalid step numbers (too low)', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        act(() => {
          useOnboardingStore.getState().setCurrentStep(0);
        });

        expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.PROJECT_CREATION);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should ignore invalid step numbers (too high)', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        act(() => {
          useOnboardingStore.getState().setCurrentStep(6);
        });

        expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.PROJECT_CREATION);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should accept step 5 (COMPLETION)', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.COMPLETION);
        });

        expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.COMPLETION);
      });
    });

    describe('markStepComplete', () => {
      it('should add step to completedSteps', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
        });

        expect(useOnboardingStore.getState().completedSteps.has(OnboardingStep.PROJECT_CREATION)).toBe(true);
      });

      it('should remove step from skippedSteps when marking complete', () => {
        // First skip the step
        act(() => {
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.GSC_CONNECTION);
        });
        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);

        // Then complete it
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().completedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);
        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(false);
      });

      it('should track multiple completed steps', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
        });

        const state = useOnboardingStore.getState();
        expect(state.completedSteps.size).toBe(2);
        expect(state.completedSteps.has(1)).toBe(true);
        expect(state.completedSteps.has(2)).toBe(true);
      });
    });

    describe('markStepSkipped', () => {
      it('should add step to skippedSteps for optional steps', () => {
        act(() => {
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);
      });

      it('should NOT allow skipping required steps', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        act(() => {
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.PROJECT_CREATION);
        });

        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.PROJECT_CREATION)).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should remove step from completedSteps when skipping', () => {
        // First complete the step
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
        });
        expect(useOnboardingStore.getState().completedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);

        // Then skip it
        act(() => {
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);
        expect(useOnboardingStore.getState().completedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(false);
      });
    });

    describe('unmarkStepSkipped', () => {
      it('should remove step from skippedSteps', () => {
        act(() => {
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.GSC_CONNECTION);
        });
        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(true);

        act(() => {
          useOnboardingStore.getState().unmarkStepSkipped(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().skippedSteps.has(OnboardingStep.GSC_CONNECTION)).toBe(false);
      });
    });
  });

  describe('Contextual Data Actions', () => {
    describe('setProjectId', () => {
      it('should set project ID', () => {
        act(() => {
          useOnboardingStore.getState().setProjectId('project-123');
        });

        expect(useOnboardingStore.getState().projectId).toBe('project-123');
      });

      it('should allow clearing project ID', () => {
        act(() => {
          useOnboardingStore.getState().setProjectId('project-123');
        });
        expect(useOnboardingStore.getState().projectId).toBe('project-123');

        act(() => {
          useOnboardingStore.getState().setProjectId(null);
        });

        expect(useOnboardingStore.getState().projectId).toBeNull();
      });
    });

    describe('setKeywordCount', () => {
      it('should set keyword count', () => {
        act(() => {
          useOnboardingStore.getState().setKeywordCount(50);
        });

        expect(useOnboardingStore.getState().keywordCount).toBe(50);
      });

      it('should not allow negative keyword counts', () => {
        act(() => {
          useOnboardingStore.getState().setKeywordCount(-5);
        });

        expect(useOnboardingStore.getState().keywordCount).toBe(0);
      });
    });

    describe('setHasGscConnection', () => {
      it('should set GSC connection status', () => {
        act(() => {
          useOnboardingStore.getState().setHasGscConnection(true);
        });

        expect(useOnboardingStore.getState().hasGscConnection).toBe(true);
      });
    });

    describe('setHasIntegration', () => {
      it('should set integration status', () => {
        act(() => {
          useOnboardingStore.getState().setHasIntegration(true);
        });

        expect(useOnboardingStore.getState().hasIntegration).toBe(true);
      });
    });
  });

  describe('Bulk Actions', () => {
    describe('initializeFromServer', () => {
      it('should initialize state from server data', () => {
        act(() => {
          useOnboardingStore.getState().initializeFromServer({
            currentStep: OnboardingStep.KEYWORDS_UPLOAD,
            completedSteps: [1, 2],
            skippedSteps: [4],
          });
        });

        const state = useOnboardingStore.getState();
        expect(state.currentStep).toBe(OnboardingStep.KEYWORDS_UPLOAD);
        expect(state.completedSteps).toEqual(new Set([1, 2]));
        expect(state.skippedSteps).toEqual(new Set([4]));
      });
    });

    describe('reset', () => {
      it('should reset all state to initial values', () => {
        // Set some state
        act(() => {
          const store = useOnboardingStore.getState();
          store.setCurrentStep(3);
          store.markStepComplete(1);
          store.markStepComplete(2);
          store.setProjectId('project-123');
          store.setKeywordCount(50);
          store.setHasGscConnection(true);
          store.setHasIntegration(true);
        });

        // Reset
        act(() => {
          useOnboardingStore.getState().reset();
        });

        const state = useOnboardingStore.getState();
        expect(state.currentStep).toBe(1);
        expect(state.completedSteps).toEqual(new Set());
        expect(state.skippedSteps).toEqual(new Set());
        expect(state.projectId).toBeNull();
        expect(state.keywordCount).toBe(0);
        expect(state.hasGscConnection).toBe(false);
        expect(state.hasIntegration).toBe(false);
      });
    });
  });

  describe('Computed Getters', () => {
    describe('canProceedToNext', () => {
      it('should return false for PROJECT_CREATION when no project ID', () => {
        expect(useOnboardingStore.getState().canProceedToNext()).toBe(false);
      });

      it('should return true for PROJECT_CREATION when project ID exists', () => {
        act(() => {
          useOnboardingStore.getState().setProjectId('project-123');
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(true);
      });

      it('should return true for GSC_CONNECTION (optional step)', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(true);
      });

      it('should return false for KEYWORDS_UPLOAD when no keywords', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.KEYWORDS_UPLOAD);
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(false);
      });

      it('should return true for KEYWORDS_UPLOAD when keywords exist', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.KEYWORDS_UPLOAD);
          useOnboardingStore.getState().setKeywordCount(10);
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(true);
      });

      it('should return true for INTEGRATIONS (optional step)', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.INTEGRATIONS);
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(true);
      });

      it('should return false for COMPLETION step', () => {
        act(() => {
          useOnboardingStore.getState().setCurrentStep(OnboardingStep.COMPLETION);
        });

        expect(useOnboardingStore.getState().canProceedToNext()).toBe(false);
      });
    });

    describe('canSkipStep', () => {
      it('should return true for optional steps (GSC)', () => {
        expect(useOnboardingStore.getState().canSkipStep(OnboardingStep.GSC_CONNECTION)).toBe(true);
      });

      it('should return true for optional steps (Integrations)', () => {
        expect(useOnboardingStore.getState().canSkipStep(OnboardingStep.INTEGRATIONS)).toBe(true);
      });

      it('should return false for required steps (Project)', () => {
        expect(useOnboardingStore.getState().canSkipStep(OnboardingStep.PROJECT_CREATION)).toBe(false);
      });

      it('should return false for required steps (Keywords)', () => {
        expect(useOnboardingStore.getState().canSkipStep(OnboardingStep.KEYWORDS_UPLOAD)).toBe(false);
      });
    });

    describe('isStepOptional', () => {
      it('should return true for optional steps', () => {
        expect(useOnboardingStore.getState().isStepOptional(OnboardingStep.GSC_CONNECTION)).toBe(true);
        expect(useOnboardingStore.getState().isStepOptional(OnboardingStep.INTEGRATIONS)).toBe(true);
      });

      it('should return false for required steps', () => {
        expect(useOnboardingStore.getState().isStepOptional(OnboardingStep.PROJECT_CREATION)).toBe(false);
        expect(useOnboardingStore.getState().isStepOptional(OnboardingStep.KEYWORDS_UPLOAD)).toBe(false);
        expect(useOnboardingStore.getState().isStepOptional(OnboardingStep.COMPLETION)).toBe(false);
      });
    });

    describe('getProgressPercentage', () => {
      it('should return 0 at start', () => {
        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(0);
      });

      it('should return 25% after completing first step', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
        });

        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(25);
      });

      it('should return 50% after completing first two steps', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(50);
      });

      it('should count skipped steps toward progress', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
          useOnboardingStore.getState().markStepSkipped(OnboardingStep.GSC_CONNECTION);
        });

        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(50);
      });

      it('should return 100% when all actionable steps are done', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.KEYWORDS_UPLOAD);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.INTEGRATIONS);
        });

        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(100);
      });

      it('should not count COMPLETION step toward progress', () => {
        act(() => {
          useOnboardingStore.getState().markStepComplete(OnboardingStep.PROJECT_CREATION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.GSC_CONNECTION);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.KEYWORDS_UPLOAD);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.INTEGRATIONS);
          useOnboardingStore.getState().markStepComplete(OnboardingStep.COMPLETION);
        });

        // Still 100% (4 actionable steps out of 4)
        expect(useOnboardingStore.getState().getProgressPercentage()).toBe(100);
      });
    });
  });
});
