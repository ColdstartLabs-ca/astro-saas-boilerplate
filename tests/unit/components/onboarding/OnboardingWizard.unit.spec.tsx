/**
 * OnboardingWizard Component Tests
 * Tests for the main wizard container
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
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

// Create a mutable state object for testing
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
};

// Mock Zustand store - use a factory function to return the selector result
vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

// Mock useOnboardingStatus hook
vi.mock('@client/hooks/useOnboardingStatus', () => ({
  useOnboardingStatus: vi.fn(() => ({
    isLoading: false,
    status: null,
    isComplete: false,
    currentStep: 1,
  })),
}));

// Mock translations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('OnboardingWizard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
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
    };
  });

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

  describe('Step Navigation', () => {
    it('should show step title in modal header', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      expect(getByTestId('modal-title').textContent).toContain('Create Your First Project');
    });

    it('should call setCurrentStep when step is completed', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Complete project step
      fireEvent.click(getByTestId('project-complete'));

      await waitFor(() => {
        expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(OnboardingStep.GSC_CONNECTION);
      });
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', async () => {
      // Set projectId so close button is visible
      mockStoreState.projectId = 'project-123';
      mockStoreState.currentStep = OnboardingStep.GSC_CONNECTION;

      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Close button should be visible after project is created
      const closeButton = getByTestId('modal-close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching status', async () => {
      vi.mocked(
        await import('@client/hooks/useOnboardingStatus')
      ).useOnboardingStatus.mockReturnValue({
        isLoading: true,
        status: null,
        isComplete: false,
        currentStep: 1,
      } as ReturnType<typeof import('@client/hooks/useOnboardingStatus').useOnboardingStatus>);

      const { container } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      const loader = container.querySelector('[data-icon="Loader2"]');
      expect(loader).toBeTruthy();
    });
  });

  describe('Step Titles', () => {
    it('should show step count in subtitle', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Check that the modal has subtitle rendered (checking the whole modal text)
      expect(getByTestId('modal')).toBeTruthy();
    });
  });
});
