/**
 * OnboardingStepComplete Component Tests
 * Tests for Step 5: Success screen with setup summary.
 * completedSteps and skippedSteps are now received as props (not from store).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { OnboardingStepComplete } from '@client/components/onboarding/steps/OnboardingStepComplete';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
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

// Mock Zustand store (only keywordCount is still read from store)
let mockKeywordCount = 5;
vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: { keywordCount: number }) => unknown) => {
    const state = { keywordCount: mockKeywordCount };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
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

const allCompletedSteps = new Set([
  OnboardingStep.PROJECT_CREATION,
  OnboardingStep.GSC_CONNECTION,
  OnboardingStep.KEYWORDS_UPLOAD,
  OnboardingStep.INTEGRATIONS,
]);

describe('OnboardingStepComplete', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockKeywordCount = 5;
  });

  it('should render the setup summary and "What\'s Next?" section', () => {
    const { container } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(container.textContent).toContain('Project');
    expect(container.textContent).toContain("What's Next?");
  });

  it('should show setup summary with all steps completed', () => {
    const { getByText, getAllByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(getByText('Project')).toBeDefined();
    expect(getByText('Created')).toBeDefined();
    expect(getByText('Google Search Console')).toBeDefined();
    // "Connected" appears twice (GSC + Integration)
    expect(getAllByText('Connected').length).toBe(2);
    expect(getByText('Keywords')).toBeDefined();
    expect(getByText('5 uploaded')).toBeDefined();
    expect(getByText('Integration')).toBeDefined();
  });

  it('should show skipped steps correctly', () => {
    const { getAllByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.KEYWORDS_UPLOAD])}
        skippedSteps={new Set([OnboardingStep.GSC_CONNECTION, OnboardingStep.INTEGRATIONS])}
      />
    );

    const skippedElements = getAllByText('Skipped');
    expect(skippedElements.length).toBe(2);
  });

  it('should show reminder about skipped steps', () => {
    const { getByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.KEYWORDS_UPLOAD])}
        skippedSteps={new Set([OnboardingStep.GSC_CONNECTION])}
      />
    );

    expect(getByText(/You skipped some optional steps/)).toBeDefined();
  });

  it('should not show skipped reminder when no steps were skipped', () => {
    const { queryByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(queryByText(/You skipped some optional steps/)).toBeNull();
  });

  it('should show "What\'s Next?" section', () => {
    const { getByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(getByText("What's Next?")).toBeDefined();
    expect(getByText(/Generate articles from your campaign keywords/)).toBeDefined();
  });

  it('should show "Go to Dashboard" button', () => {
    const { getByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(getByText('Go to Dashboard')).toBeDefined();
  });

  it('should call onClose directly when clicking "Go to Dashboard"', () => {
    const { getByTestId } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    fireEvent.click(getByTestId('dashboard-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show keyword count in summary', () => {
    mockKeywordCount = 42;

    const { getByText } = render(
      <OnboardingStepComplete
        onClose={mockOnClose}
        completedSteps={allCompletedSteps}
        skippedSteps={new Set()}
      />
    );

    expect(getByText('42 uploaded')).toBeDefined();
  });
});
