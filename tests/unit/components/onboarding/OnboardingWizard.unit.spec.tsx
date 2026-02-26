/**
 * OnboardingWizard Component Tests
 * Tests for the main wizard container — always ephemeral, always starts at step 1.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '@client/components/onboarding/OnboardingWizard';

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
  OnboardingStepComplete: ({
    onClose,
    completedSteps,
    skippedSteps,
  }: {
    onClose: () => void;
    completedSteps: Set<number>;
    skippedSteps: Set<number>;
  }) => (
    <div data-testid="step-complete">
      <span>Complete Step</span>
      <span data-testid="completed-count">{completedSteps.size}</span>
      <span data-testid="skipped-count">{skippedSteps.size}</span>
      <button data-testid="go-to-dashboard" onClick={onClose}>
        Go to Dashboard
      </button>
    </div>
  ),
}));

// Mock onboardingStore — new simplified version (inter-step data only)
const mockReset = vi.fn();
vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: { reset: () => void }) => unknown) => {
    const state = { reset: mockReset };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
}));

describe('OnboardingWizard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should always start at step 1 on open', () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(getByTestId('step-project')).toBeTruthy();
      expect(getByTestId('stepper').textContent).toContain('Step 1');
    });
  });

  // ===========================================================================
  // Step navigation
  // ===========================================================================

  describe('Step Navigation', () => {
    it('should advance to step 2 (GSC) after completing step 1', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(getByTestId('project-complete'));

      await waitFor(() => {
        expect(getByTestId('step-gsc')).toBeTruthy();
      });
    });

    it('should advance through all steps sequentially', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

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

    it('should track completed steps in stepper', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());

      // Step 1 was completed
      expect(getByTestId('stepper').textContent).toContain('Completed: 1');
    });

    it('should track skipped steps in stepper', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());

      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());

      // Step 2 was skipped
      expect(getByTestId('stepper').textContent).toContain('Skipped: 1');
    });

    it('should pass completedSteps and skippedSteps to OnboardingStepComplete', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Complete step 1
      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());

      // Skip step 2
      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());

      // Complete step 3
      fireEvent.click(getByTestId('keywords-complete'));
      await waitFor(() => expect(getByTestId('step-integrations')).toBeTruthy());

      // Skip step 4
      fireEvent.click(getByTestId('integrations-skip'));
      await waitFor(() => expect(getByTestId('step-complete')).toBeTruthy());

      // Step 5 should receive 2 completed (steps 1, 3) and 2 skipped (steps 2, 4)
      expect(getByTestId('completed-count').textContent).toBe('2');
      expect(getByTestId('skipped-count').textContent).toBe('2');
    });
  });

  // ===========================================================================
  // Reset on open
  // ===========================================================================

  describe('Reset on open', () => {
    it('should reset to step 1 each time modal is opened', async () => {
      const { getByTestId, rerender } = render(
        <OnboardingWizard isOpen={true} onClose={mockOnClose} />
      );

      // Advance to step 2
      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());

      // Close and re-open
      rerender(<OnboardingWizard isOpen={false} onClose={mockOnClose} />);
      rerender(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Should be back at step 1
      await waitFor(() => {
        expect(getByTestId('step-project')).toBeTruthy();
      });
    });

    it('should call store reset when wizard opens', () => {
      render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);
      expect(mockReset).toHaveBeenCalled();
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

    it('should call onClose when "Go to Dashboard" is clicked on step 5', async () => {
      const { getByTestId } = render(<OnboardingWizard isOpen={true} onClose={mockOnClose} />);

      // Navigate to step 5
      fireEvent.click(getByTestId('project-complete'));
      await waitFor(() => expect(getByTestId('step-gsc')).toBeTruthy());
      fireEvent.click(getByTestId('gsc-skip'));
      await waitFor(() => expect(getByTestId('step-keywords')).toBeTruthy());
      fireEvent.click(getByTestId('keywords-complete'));
      await waitFor(() => expect(getByTestId('step-integrations')).toBeTruthy());
      fireEvent.click(getByTestId('integrations-skip'));
      await waitFor(() => expect(getByTestId('step-complete')).toBeTruthy());

      fireEvent.click(getByTestId('go-to-dashboard'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
