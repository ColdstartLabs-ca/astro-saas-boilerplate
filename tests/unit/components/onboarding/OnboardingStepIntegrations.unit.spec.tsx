/**
 * OnboardingStepIntegrations Component Tests
 * Tests for Step 4: Set up CMS integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepIntegrations } from '@client/components/onboarding/steps/OnboardingStepIntegrations';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  Plug: ({ className }: { className?: string }) => <span className={className} data-icon="Plug" />,
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Globe" />
  ),
  Webhook: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Webhook" />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CheckCircle2" />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ArrowRight" />
  ),
  SkipForward: ({ className }: { className?: string }) => (
    <span className={className} data-icon="SkipForward" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertTriangle" />
  ),
}));

// Mutable store state
let mockStoreState = {
  completedSteps: new Set([
    OnboardingStep.PROJECT_CREATION,
    OnboardingStep.GSC_CONNECTION,
    OnboardingStep.KEYWORDS_UPLOAD,
  ]),
  skippedSteps: new Set<number>(),
  setHasIntegration: vi.fn(),
  markStepComplete: vi.fn(),
  markStepSkipped: vi.fn(),
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

// Mock useIntegrations
let mockIntegrationState = {
  createIntegration: vi.fn().mockResolvedValue({ id: 'integration-123' }),
};

vi.mock('@client/hooks/useIntegrations', () => ({
  useIntegrations: () => mockIntegrationState,
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

describe('OnboardingStepIntegrations', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      completedSteps: new Set([
        OnboardingStep.PROJECT_CREATION,
        OnboardingStep.GSC_CONNECTION,
        OnboardingStep.KEYWORDS_UPLOAD,
      ]),
      skippedSteps: new Set<number>(),
      setHasIntegration: vi.fn(),
      markStepComplete: vi.fn(),
      markStepSkipped: vi.fn(),
    };
    mockProgressState = {
      updateProgress: vi.fn().mockResolvedValue({}),
      isUpdating: false,
    };
    mockIntegrationState = {
      createIntegration: vi.fn().mockResolvedValue({ id: 'integration-123' }),
    };
  });

  it('should render the integrations step header', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('WordPress')).toBeDefined();
    expect(getByText('Webhook')).toBeDefined();
    expect(getByText('Auto-publish articles directly to your WordPress site')).toBeDefined();
  });

  it('should show integration type cards', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('WordPress')).toBeDefined();
    expect(getByText('Webhook')).toBeDefined();
  });

  it('should show WordPress description', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Auto-publish articles directly to your WordPress site')).toBeDefined();
  });

  it('should show skip button', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Skip for now')).toBeDefined();
  });

  it('should show WordPress form when WordPress is selected', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('WordPress'));

    expect(getByText('Integration Name')).toBeDefined();
    expect(getByText('Site URL')).toBeDefined();
    expect(getByText('Username')).toBeDefined();
    expect(getByText('App Password')).toBeDefined();
  });

  it('should show Webhook form when Webhook is selected', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('Webhook'));

    expect(getByText('Integration Name')).toBeDefined();
    expect(getByText('Webhook URL')).toBeDefined();
    expect(getByText('Secret Key (optional)')).toBeDefined();
  });

  it('should allow going back to type selection', () => {
    const { getByText, queryByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('WordPress'));
    expect(getByText('Site URL')).toBeDefined();

    fireEvent.click(getByText(/Choose different type/));
    expect(queryByText('Site URL')).toBeNull();
    expect(getByText('WordPress')).toBeDefined();
  });

  it('should show skip confirmation when skip is clicked', () => {
    const { getByText, container } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('Skip for now'));

    expect(container.textContent).toContain('Are you sure?');
    expect(getByText('Skip Anyway')).toBeDefined();
    expect(getByText('Go Back')).toBeDefined();
  });

  it('should handle skip after confirmation', async () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Click "Skip for now" then "Skip Anyway"
    fireEvent.click(getByText('Skip for now'));
    fireEvent.click(getByText('Skip Anyway'));

    await waitFor(() => {
      expect(mockStoreState.markStepSkipped).toHaveBeenCalledWith(OnboardingStep.INTEGRATIONS);
      expect(mockProgressState.updateProgress).toHaveBeenCalled();
      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  it('should submit WordPress integration', async () => {
    const { getByText, container } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Select WordPress
    fireEvent.click(getByText('WordPress'));

    // Fill form
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'My WP Site' } }); // name
    fireEvent.change(inputs[1], { target: { value: 'https://mysite.com' } }); // siteUrl
    fireEvent.change(inputs[2], { target: { value: 'admin' } }); // username
    fireEvent.change(inputs[3], { target: { value: 'app-password-123' } }); // appPassword

    // Submit
    const submitButton = container.querySelector('[data-testid="dashboard-button"]')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockIntegrationState.createIntegration).toHaveBeenCalledWith({
        type: 'wordpress',
        name: 'My WP Site',
        siteUrl: 'https://mysite.com',
        username: 'admin',
        appPassword: 'app-password-123',
      });
      expect(mockStoreState.setHasIntegration).toHaveBeenCalledWith(true);
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show error on integration failure', async () => {
    mockIntegrationState.createIntegration = vi
      .fn()
      .mockRejectedValue(new Error('Connection failed'));

    const { getByText, container } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    // Select Webhook
    fireEvent.click(getByText('Webhook'));

    // Fill form
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'My Hook' } });
    fireEvent.change(inputs[1], { target: { value: 'https://api.example.com/hook' } });

    // Submit
    const submitButton = container.querySelector('[data-testid="dashboard-button"]')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText('Connection failed')).toBeDefined();
    });
  });

  it('should show help text', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText(/Without an integration/)).toBeDefined();
  });
});
