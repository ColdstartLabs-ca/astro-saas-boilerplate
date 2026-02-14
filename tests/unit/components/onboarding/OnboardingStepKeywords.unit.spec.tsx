/**
 * OnboardingStepKeywords Component Tests
 * Tests for Step 3: Upload keywords for first campaign
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepKeywords } from '@client/components/onboarding/steps/OnboardingStepKeywords';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  FileText: ({ className }: { className?: string }) => (
    <span className={className} data-icon="FileText" />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ArrowRight" />
  ),
}));

// Mutable store state
let mockStoreState = {
  projectId: 'project-123' as string | null,
  completedSteps: new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.GSC_CONNECTION]),
  skippedSteps: new Set<number>(),
  setKeywordCount: vi.fn(),
  markStepComplete: vi.fn(),
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
  updateProgress: vi.fn().mockResolvedValue({}),
  isUpdating: false,
};

vi.mock('@client/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => mockProgressState,
}));

// Mock useCampaigns
let mockCampaignState = {
  createCampaign: vi.fn().mockResolvedValue({ id: 'campaign-123', name: 'Onboarding Campaign' }),
};

vi.mock('@client/hooks/useCampaigns', () => ({
  useCampaigns: () => mockCampaignState,
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

describe('OnboardingStepKeywords', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      projectId: 'project-123',
      completedSteps: new Set([OnboardingStep.PROJECT_CREATION, OnboardingStep.GSC_CONNECTION]),
      skippedSteps: new Set<number>(),
      setKeywordCount: vi.fn(),
      markStepComplete: vi.fn(),
    };
    mockProgressState = {
      updateProgress: vi.fn().mockResolvedValue({}),
      isUpdating: false,
    };
    mockCampaignState = {
      createCampaign: vi
        .fn()
        .mockResolvedValue({ id: 'campaign-123', name: 'Onboarding Campaign' }),
    };
  });

  it('should render the keywords step header', () => {
    const { getByLabelText, getByText } = render(
      <OnboardingStepKeywords onComplete={mockOnComplete} />
    );

    expect(getByLabelText(/Keywords/i)).toBeDefined();
    expect(getByText('1-500 keywords allowed')).toBeDefined();
  });

  it('should render the textarea for keyword input', () => {
    const { container } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const textarea = container.querySelector('textarea');
    expect(textarea).toBeDefined();
    expect(textarea?.id).toBe('keywords-input');
  });

  it('should show 0 keywords when input is empty', () => {
    const { getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    expect(getByText('0 keywords detected')).toBeDefined();
  });

  it('should parse comma-separated keywords', () => {
    const { container, getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips, content marketing, blog writing' } });

    expect(getByText('3 keywords detected')).toBeDefined();
  });

  it('should parse line-separated keywords', () => {
    const { container, getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'seo tips\ncontent marketing\nblog writing\ndigital marketing\nSEM' },
    });

    expect(getByText('5 keywords detected')).toBeDefined();
  });

  it('should show keyword preview when count <= 20', () => {
    const { container, getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips, content marketing' } });

    expect(getByText('Preview')).toBeDefined();
    expect(getByText('seo tips')).toBeDefined();
    expect(getByText('content marketing')).toBeDefined();
  });

  it('should disable submit button when no keywords', () => {
    const { getByTestId } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const submitButton = getByTestId('dashboard-button');
    expect(submitButton.hasAttribute('disabled')).toBe(true);
  });

  it('should enable submit button when keywords are entered', () => {
    const { container, getByTestId } = render(
      <OnboardingStepKeywords onComplete={mockOnComplete} />
    );

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips' } });

    const submitButton = getByTestId('dashboard-button');
    expect(submitButton.hasAttribute('disabled')).toBe(false);
  });

  it('should call createCampaign on submit', async () => {
    const { container, getByTestId } = render(
      <OnboardingStepKeywords onComplete={mockOnComplete} />
    );

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips, content marketing' } });

    const submitButton = getByTestId('dashboard-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCampaignState.createCampaign).toHaveBeenCalledWith({
        name: 'Onboarding Campaign',
        projectId: 'project-123',
        keywords: ['seo tips', 'content marketing'],
      });
    });
  });

  it('should update store and call onComplete after successful submission', async () => {
    const { container, getByTestId } = render(
      <OnboardingStepKeywords onComplete={mockOnComplete} />
    );

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips' } });

    const submitButton = getByTestId('dashboard-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockStoreState.setKeywordCount).toHaveBeenCalledWith(1);
      expect(mockStoreState.markStepComplete).toHaveBeenCalledWith(OnboardingStep.KEYWORDS_UPLOAD);
      expect(mockProgressState.updateProgress).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show error message on failure', async () => {
    mockCampaignState.createCampaign = vi.fn().mockRejectedValue(new Error('API Error'));

    const { container, getByTestId, getByText } = render(
      <OnboardingStepKeywords onComplete={mockOnComplete} />
    );

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips' } });

    const submitButton = getByTestId('dashboard-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText('API Error')).toBeDefined();
    });
  });

  it('should filter out empty keywords', () => {
    const { container, getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'seo tips,,, ,content marketing' } });

    expect(getByText('2 keywords detected')).toBeDefined();
  });

  it('should show tip text', () => {
    const { getByText } = render(<OnboardingStepKeywords onComplete={mockOnComplete} />);

    expect(getByText(/paste keywords from a spreadsheet/)).toBeDefined();
  });
});
