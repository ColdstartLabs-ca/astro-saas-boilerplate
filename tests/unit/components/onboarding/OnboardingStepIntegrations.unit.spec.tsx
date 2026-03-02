/**
 * OnboardingStepIntegrations Component Tests
 * Tests for Step 5: CMS integration setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepIntegrations } from '@client/components/onboarding/steps/OnboardingStepIntegrations';
import { OnboardingStep } from '@shared/types/onboarding.types';

const mockApiFetch = vi.fn();

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = ({ className }: { className?: string }) => <span className={className} />;
  return {
    Loader2: icon,
    Plug: icon,
    Globe: icon,
    Webhook: icon,
    CheckCircle2: icon,
    ArrowRight: icon,
    SkipForward: icon,
    AlertTriangle: icon,
    Hexagon: icon,
    BookOpen: icon,
    HelpCircle: icon,
    ExternalLink: icon,
    Zap: icon,
    RefreshCw: icon,
    Clock: icon,
    Copy: icon,
    Check: icon,
    Send: icon,
    Palette: icon,
    Image: icon,
    FileText: icon,
    Link2: icon,
    Sparkles: icon,
  };
});

// Mutable store state
let mockStoreState = {
  completedSteps: new Set([
    OnboardingStep.PROJECT_CREATION,
    OnboardingStep.GSC_CONNECTION,
    OnboardingStep.KEYWORDS_UPLOAD,
  ]),
  skippedSteps: new Set<number>(),
  campaignId: null as string | null,
  projectId: 'project-123' as string | null,
  setHasIntegration: vi.fn(),
  markStepComplete: vi.fn(),
  markStepSkipped: vi.fn(),
};

vi.mock('@client/utils/api-client', () => ({
  apiFetch: (...args: Parameters<typeof mockApiFetch>) => mockApiFetch(...args),
}));

// Mock Zustand store
vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
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

// Mock useOnboardingProgress
let mockProgressState = {
  updateProgress: vi.fn().mockResolvedValue({}),
  isUpdating: false,
};

vi.mock('@client/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => mockProgressState,
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
      campaignId: null,
      projectId: 'project-123',
      setHasIntegration: vi.fn(),
      markStepComplete: vi.fn(),
      markStepSkipped: vi.fn(),
    };
    mockIntegrationState = {
      createIntegration: vi.fn().mockResolvedValue({ id: 'integration-123' }),
    };
    mockProgressState = {
      updateProgress: vi.fn().mockResolvedValue({}),
      isUpdating: false,
    };
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ data: { integrations: [] } });
  });

  it('should render the integrations step header', () => {
    const { getByText, queryByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('WordPress')).toBeDefined();
    expect(getByText('Webhook')).toBeDefined();
    expect(getByText('Auto-publish articles directly to your WordPress site')).toBeDefined();
    expect(queryByText('Content Preferences')).toBeNull();
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

  it('should assign created integration to onboarding campaign with auto-publish enabled', async () => {
    mockStoreState.campaignId = 'campaign-123';
    mockApiFetch.mockResolvedValueOnce({
      data: {
        integration: { id: 'integration-123' },
      },
    });

    const { getByText, container } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('WordPress'));

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'My WP Site' } });
    fireEvent.change(inputs[1], { target: { value: 'https://mysite.com' } });
    fireEvent.change(inputs[2], { target: { value: 'admin' } });
    fireEvent.change(inputs[3], { target: { value: 'app-password-123' } });

    const submitButton = container.querySelector('[data-testid="dashboard-button"]')!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/integrations',
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'wordpress',
            name: 'My WP Site',
            siteUrl: 'https://mysite.com',
            username: 'admin',
            appPassword: 'app-password-123',
            campaignId: 'campaign-123',
            autoPublish: true,
          }),
        }
      );
      expect(mockIntegrationState.createIntegration).not.toHaveBeenCalled();
    });
  });

  it('should show help text', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText(/Without an integration/)).toBeDefined();
  });

  it('should show "Why Connect a CMS?" benefits section', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Why Connect a CMS?')).toBeDefined();
    expect(getByText('Auto-Publish Articles')).toBeDefined();
    expect(getByText('Save Hours Every Week')).toBeDefined();
    expect(getByText('Works With Any Platform')).toBeDefined();
  });

  it('should show "Choose your platform" label', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Choose your platform')).toBeDefined();
  });

  it('should show webhook help toggle when webhook is selected', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('Webhook'));

    expect(getByText('How to build your webhook endpoint')).toBeDefined();
  });

  it('should toggle webhook help panel', () => {
    const { getByText, queryByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('Webhook'));

    // Initially hidden
    expect(queryByText('How Webhooks Work')).toBeNull();

    // Click to show
    fireEvent.click(getByText('How to build your webhook endpoint'));
    expect(getByText('How Webhooks Work')).toBeDefined();
    expect(getByText('Payload Format:')).toBeDefined();
    expect(getByText('Copy instructions')).toBeDefined();

    // Click to hide
    fireEvent.click(getByText('Hide details'));
    expect(queryByText('How Webhooks Work')).toBeNull();
  });

  it('should show setup guide link for WordPress', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('WordPress'));

    expect(getByText('How to create an App Password')).toBeDefined();
  });

  it('should show field help text when form is visible', () => {
    const { getByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    fireEvent.click(getByText('Webhook'));

    expect(
      getByText('Your endpoint must accept POST requests and return a 2xx status')
    ).toBeDefined();
  });

  it('should hide benefits section when a type is selected', () => {
    const { getByText, queryByText } = render(
      <OnboardingStepIntegrations onComplete={mockOnComplete} onSkip={mockOnSkip} />
    );

    expect(getByText('Why Connect a CMS?')).toBeDefined();

    fireEvent.click(getByText('WordPress'));

    expect(queryByText('Why Connect a CMS?')).toBeNull();
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
});
