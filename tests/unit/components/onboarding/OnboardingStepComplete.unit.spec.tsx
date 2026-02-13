/**
 * OnboardingStepComplete Component Tests
 * Tests for Step 5: Success screen with setup summary
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepComplete } from '@client/components/onboarding/steps/OnboardingStepComplete';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CheckCircle2" />
  ),
  SkipForward: ({ className }: { className?: string }) => (
    <span className={className} data-icon="SkipForward" />
  ),
  Rocket: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Rocket" />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ArrowRight" />
  ),
}));

// Mutable store state
let mockStoreState = {
  completedSteps: new Set([
    OnboardingStep.PROJECT_CREATION,
    OnboardingStep.GSC_CONNECTION,
    OnboardingStep.KEYWORDS_UPLOAD,
    OnboardingStep.INTEGRATIONS,
  ]),
  skippedSteps: new Set<number>(),
  keywordCount: 5,
};

// Mock Zustand store
vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

// Mock useOnboardingProgress
let mockProgressState = {
  markComplete: vi.fn().mockResolvedValue({}),
};

vi.mock('@client/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => mockProgressState,
}));

// Mock DashboardButton
vi.mock('@client/components/dashboard/ui/DashboardButton', () => ({
  DashboardButton: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid="dashboard-button" {...props}>
      {children}
    </button>
  ),
}));

describe('OnboardingStepComplete', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      completedSteps: new Set([
        OnboardingStep.PROJECT_CREATION,
        OnboardingStep.GSC_CONNECTION,
        OnboardingStep.KEYWORDS_UPLOAD,
        OnboardingStep.INTEGRATIONS,
      ]),
      skippedSteps: new Set<number>(),
      keywordCount: 5,
    };
    mockProgressState = {
      markComplete: vi.fn().mockResolvedValue({}),
    };
  });

  it('should render the completion header', () => {
    const { getByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText("You're All Set!")).toBeDefined();
    expect(getByText(/Your workspace is ready/)).toBeDefined();
  });

  it('should show setup summary with all steps completed', () => {
    const { getByText, getAllByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText('Project')).toBeDefined();
    expect(getByText('Created')).toBeDefined();
    expect(getByText('Google Search Console')).toBeDefined();
    // "Connected" appears twice (GSC + Integration)
    expect(getAllByText('Connected').length).toBe(2);
    expect(getByText('Keywords')).toBeDefined();
    expect(getByText('5 uploaded')).toBeDefined();
    expect(getByText('CMS Integration')).toBeDefined();
  });

  it('should show skipped steps correctly', () => {
    mockStoreState = {
      completedSteps: new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.KEYWORDS_UPLOAD]),
      skippedSteps: new Set([OnboardingStep.GSC_CONNECTION, OnboardingStep.INTEGRATIONS]),
      keywordCount: 3,
    };

    const { getAllByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    const skippedElements = getAllByText('Skipped');
    expect(skippedElements.length).toBe(2);
  });

  it('should show reminder about skipped steps', () => {
    mockStoreState = {
      completedSteps: new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.KEYWORDS_UPLOAD]),
      skippedSteps: new Set([OnboardingStep.GSC_CONNECTION]),
      keywordCount: 3,
    };

    const { getByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText(/You skipped some optional steps/)).toBeDefined();
  });

  it('should not show skipped reminder when no steps were skipped', () => {
    const { queryByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(queryByText(/You skipped some optional steps/)).toBeNull();
  });

  it('should show "What\'s Next?" section', () => {
    const { getByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText("What's Next?")).toBeDefined();
    expect(getByText(/Start generating articles/)).toBeDefined();
  });

  it('should show "Go to Dashboard" button', () => {
    const { getByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText('Go to Dashboard')).toBeDefined();
  });

  it('should call markComplete and onClose when clicking "Go to Dashboard"', async () => {
    const { getByTestId } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    const button = getByTestId('dashboard-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockProgressState.markComplete).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should still close even if markComplete fails', async () => {
    mockProgressState.markComplete = vi.fn().mockRejectedValue(new Error('Failed'));

    const { getByTestId } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    const button = getByTestId('dashboard-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show keyword count in summary', () => {
    mockStoreState.keywordCount = 42;

    const { getByText } = render(<OnboardingStepComplete onClose={mockOnClose} />);

    expect(getByText('42 uploaded')).toBeDefined();
  });
});
