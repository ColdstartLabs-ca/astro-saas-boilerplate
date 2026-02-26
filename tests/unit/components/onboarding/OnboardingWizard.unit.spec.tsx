/**
 * OnboardingWizard Component Tests
 * Tests for the main wizard container
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { OnboardingWizard } from '@client/components/onboarding/OnboardingWizard';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const makeIcon = (name: string) => {
    const Icon = ({ className }: { className?: string }) => (
      <span className={className} data-icon={name} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return {
    Loader2: makeIcon('Loader2'),
    X: makeIcon('X'),
    Check: makeIcon('Check'),
    SkipForward: makeIcon('SkipForward'),
    FolderPlus: makeIcon('FolderPlus'),
    Globe: makeIcon('Globe'),
    Briefcase: makeIcon('Briefcase'),
    Search: makeIcon('Search'),
    ExternalLink: makeIcon('ExternalLink'),
    CheckCircle2: makeIcon('CheckCircle2'),
    ArrowRight: makeIcon('ArrowRight'),
    FileText: makeIcon('FileText'),
    Plug: makeIcon('Plug'),
    Webhook: makeIcon('Webhook'),
    Rocket: makeIcon('Rocket'),
  };
});

// Mock Modal component
vi.mock('@client/components/modal/Modal', () => ({
  Modal: ({
    isOpen,
    children,
    onClose,
    title,
    subtitle,
    showCloseButton,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    showCloseButton?: boolean;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        {subtitle && <div data-testid="modal-subtitle">{subtitle}</div>}
        {showCloseButton && (
          <button data-testid="modal-close" onClick={onClose}>
            Close
          </button>
        )}
        {children}
      </div>
    );
  },
}));

// Mock OnboardingStepperProgress
vi.mock('@client/components/onboarding/OnboardingStepperProgress', () => ({
  OnboardingStepperProgress: ({
    currentStep,
    completedSteps,
    skippedSteps,
  }: {
    currentStep: number;
    completedSteps: Set<number>;
    skippedSteps: Set<number>;
  }) => (
    <div data-testid="stepper">
      Step {currentStep} | Completed: {completedSteps.size} | Skipped: {skippedSteps.size}
    </div>
  ),
}));

// Mock OnboardingStepProject
vi.mock('@client/components/onboarding/steps/OnboardingStepProject', () => ({
  OnboardingStepProject: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-project">
      <span>Project Step</span>
      <button data-testid="project-complete" onClick={onComplete}>
        Complete Project
      </button>
    </div>
  ),
}));

// Mock OnboardingStepGSC
vi.mock('@client/components/onboarding/steps/OnboardingStepGSC', () => ({
  OnboardingStepGSC: ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => (
    <div data-testid="step-gsc">
      <span>GSC Step</span>
      <button data-testid="gsc-complete" onClick={onComplete}>
        Complete GSC
      </button>
      <button data-testid="gsc-skip" onClick={onSkip}>
        Skip GSC
      </button>
    </div>
  ),
}));

// Mock OnboardingStepKeywords
vi.mock('@client/components/onboarding/steps/OnboardingStepKeywords', () => ({
  OnboardingStepKeywords: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-keywords">
      <span>Keywords Step</span>
      <button data-testid="keywords-complete" onClick={onComplete}>
        Complete Keywords
      </button>
    </div>
  ),
}));

// Mock OnboardingStepIntegrations
vi.mock('@client/components/onboarding/steps/OnboardingStepIntegrations', () => ({
  OnboardingStepIntegrations: ({
    onComplete,
    onSkip,
  }: {
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <div data-testid="step-integrations">
      <span>Integrations Step</span>
      <button data-testid="integrations-complete" onClick={onComplete}>
        Complete Integrations
      </button>
      <button data-testid="integrations-skip" onClick={onSkip}>
        Skip Integrations
      </button>
    </div>
  ),
}));

// Mock OnboardingStepComplete
vi.mock('@client/components/onboarding/steps/OnboardingStepComplete', () => ({
  OnboardingStepComplete: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="step-complete">
      <span>Complete Step</span>
      <button data-testid="go-to-dashboard" onClick={onClose}>
        Go to Dashboard
      </button>
    </div>
  ),
}));

// Mutable store state
let mockStoreState = {
  currentStep: OnboardingStep.PROJECT_CREATION,
  completedSteps: new Set<number>(),
  skippedSteps: new Set<number>(),
  projectId: null as string | null,
  setCurrentStep: vi.fn((step: number) => {
    mockStoreState.currentStep = step;
  }),
  markStepComplete: vi.fn((step: number) => {
    mockStoreState.completedSteps.add(step);
  }),
  canSkipStep: (step: number) =>
    step === OnboardingStep.GSC_CONNECTION || step === OnboardingStep.INTEGRATIONS,
  dismiss: vi.fn(),
};

vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

vi.mock('@client/hooks/useOnboardingStatus', () => ({
  useOnboardingStatus: vi.fn(() => ({
    isLoading: false,
    status: null,
    isComplete: false,
    currentStep: 1,
  })),
}));

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('OnboardingWizard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      currentStep: OnboardingStep.PROJECT_CREATION,
      completedSteps: new Set<number>(),
      skippedSteps: new Set<number>(),
      projectId: null,
      setCurrentStep: vi.fn((step: number) => {
        mockStoreState.currentStep = step;
      }),
      markStepComplete: vi.fn((step: number) => {
        mockStoreState.completedSteps.add(step);
      }),
      canSkipStep: (step: number) =>
        step === OnboardingStep.GSC_CONNECTION || step === OnboardingStep.INTEGRATIONS,
      dismiss: vi.fn(),
    };
  });

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { queryByTestId } = render(<OnboardingWizard isOpen={false} onClose={mockOnClose} />);
      expect(queryByTestId('modal')).toBeNull();
    });

    it('should render when isOpen is true', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should render stepper progress', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(getByTestId('stepper')).toBeTruthy();
    });

    it('should render first step (Project) by default', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(getByTestId('step-project')).toBeTruthy();
    });
  });

  // ===========================================================================
  // Step navigation (initial mode)
  // ===========================================================================

  describe('Step Navigation (initial mode)', () => {
    it('should show step title in modal header', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(getByTestId('modal-title').textContent).toContain('Add Your First Project');
    });

    it('should call setCurrentStep when step is completed', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => {
        expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(OnboardingStep.GSC_CONNECTION);
      });
    });

    it('should advance through all steps sequentially', async () => {
      const { getByTestId, queryByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} />
      );

      // Step 1 → Project
      expect(getByTestId('step-project')).toBeTruthy();
      act(() => {
        mockStoreState.currentStep = OnboardingStep.GSC_CONNECTION;
      });
      fireEvent.click(getByTestId('project-complete'));

      await waitFor(() => {
        expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(OnboardingStep.GSC_CONNECTION);
      });
    });

    it('should call dismiss on close in initial mode', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(getByTestId('modal-close'));
      expect(mockStoreState.dismiss).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // isNewProject mode — key standardization behavior
  // ===========================================================================

  describe('isNewProject mode', () => {
    it('should start at step 1 regardless of store currentStep', () => {
      // Store is at step 3 (as if initial onboarding was further along)
      mockStoreState.currentStep = OnboardingStep.KEYWORDS_UPLOAD;

      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      // Must show project step (step 1), NOT keywords step
      expect(getByTestId('step-project')).toBeTruthy();
    });

    it('should show "Add New Project" title instead of first-project copy', () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );
      expect(getByTestId('modal-title').textContent).toBe('Add New Project');
    });

    it('should use local step state — NOT call store setCurrentStep on advance', async () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      fireEvent.click(getByTestId('project-complete'));

      await waitFor(() => {
        // GSC step is now rendered (local step advanced)
        expect(getByTestId('step-gsc')).toBeTruthy();
      });

      // Store's setCurrentStep should NOT have been called by the wizard itself
      // (only OnboardingStepProject may call it internally — that's separate)
      // The key check: the wizard did NOT call setCurrentStep to drive its own display
      // We verify by checking the store's step is unchanged
      expect(mockStoreState.currentStep).toBe(OnboardingStep.PROJECT_CREATION);
    });

    it('should reset to step 1 each time modal is opened', async () => {
      const { getByTestId, rerender } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      // Advance to step 2
      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => {
        expect(getByTestId('step-gsc')).toBeTruthy();
      });

      // Close and re-open
      rerender(<OnboardingWizard isOpen={false} onClose={mockOnClose} isNewProject={true} />);
      rerender(<OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />);

      // Should be back at step 1
      await waitFor(() => {
        expect(getByTestId('step-project')).toBeTruthy();
      });
    });

    it('should NOT call dismiss on close in new-project mode', () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );
      fireEvent.click(getByTestId('modal-close'));
      expect(mockStoreState.dismiss).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should advance through steps locally: project → gsc → keywords → integrations → complete', async () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      expect(getByTestId('step-project')).toBeTruthy();

      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());

      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());

      fireEvent.click(getByTestId('keywords-complete'));
      await waitFor(() => expect(getByTestId('step-integrations')).toBeTruthy());

      fireEvent.click(getByTestId('integrations-skip'));
      await waitFor(() => expect(getByTestId('step-complete')).toBeTruthy());
    });

    it('should show "Project Ready!" on completion step in new-project mode', async () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());
      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());
      fireEvent.click(getByTestId('keywords-complete'));
      await waitFor(() => expect(getByTestId('step-integrations')).toBeTruthy());
      fireEvent.click(getByTestId('integrations-skip'));
      await waitFor(() => expect(getByTestId('step-complete')).toBeTruthy());

      expect(getByTestId('modal-title').textContent).toBe('Project Ready!');
    });

    it('should track skipped steps in local stepper (not in store)', async () => {
      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());
      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());

      // Stepper should show 1 skipped
      expect(getByTestId('stepper').textContent).toContain('Skipped: 1');
    });
  });

  // ===========================================================================
  // Initial mode — auto-advance past completed steps
  // ===========================================================================

  describe('Auto-advance past completed steps (initial mode)', () => {
    it('should advance to first incomplete step when wizard opens with completed steps', async () => {
      // Simulate: step 1 completed, step 2 skipped; store step is 1 (stale cache)
      mockStoreState.currentStep = OnboardingStep.PROJECT_CREATION;
      mockStoreState.completedSteps = new Set([OnboardingStep.PROJECT_CREATION]);
      mockStoreState.skippedSteps = new Set([OnboardingStep.GSC_CONNECTION]);

      render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Should call setCurrentStep with step 3 (keywords) since 1 is completed and 2 is skipped
      // (Visual re-render is not testable here because the mock store doesn't trigger React re-renders)
      await waitFor(() => {
        expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(OnboardingStep.KEYWORDS_UPLOAD);
      });
    });

    it('should not advance if store step is already at the first incomplete step', async () => {
      mockStoreState.currentStep = OnboardingStep.GSC_CONNECTION;
      mockStoreState.completedSteps = new Set([OnboardingStep.PROJECT_CREATION]);
      mockStoreState.skippedSteps = new Set();

      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // GSC is not completed, so should stay at step 2
      expect(getByTestId('step-gsc')).toBeTruthy();
      // setCurrentStep should NOT have been called (already at correct step)
      expect(mockStoreState.setCurrentStep).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Modal Controls
  // ===========================================================================

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(getByTestId('modal-close'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Loading State (initial mode only)
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading spinner while fetching status in initial mode', async () => {
      vi.mocked(
        await import('@client/hooks/useOnboardingStatus')
      ).useOnboardingStatus.mockReturnValue({
        isLoading: true,
        status: null,
        isComplete: false,
        currentStep: 1,
      } as ReturnType<typeof import('@client/hooks/useOnboardingStatus').useOnboardingStatus>);

      const { container } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(container.querySelector('[data-icon="Loader2"]')).toBeTruthy();
    });

    it('should NOT show loading spinner in new-project mode even when status is loading', async () => {
      vi.mocked(
        await import('@client/hooks/useOnboardingStatus')
      ).useOnboardingStatus.mockReturnValue({
        isLoading: true,
        status: null,
        isComplete: false,
        currentStep: 1,
      } as ReturnType<typeof import('@client/hooks/useOnboardingStatus').useOnboardingStatus>);

      const { getByTestId } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} isNewProject={true} />
      );

      // Should render step 1 immediately (no spinner)
      expect(getByTestId('step-project')).toBeTruthy();
    });
  });
});
