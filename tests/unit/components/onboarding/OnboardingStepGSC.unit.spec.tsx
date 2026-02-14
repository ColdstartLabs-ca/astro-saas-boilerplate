/**
 * OnboardingStepGSC Component Tests
 * Tests for Step 2: Connect Google Search Console
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepGSC } from '@client/components/onboarding/steps/OnboardingStepGSC';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Search" />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ExternalLink" />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
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

// Create a mutable state object for testing
let mockStoreState = {
  projectId: 'project-123' as string | null,
  completedSteps: new Set([OnboardingStep.PROJECT_CREATION]),
  skippedSteps: new Set<number>(),
  setHasGscConnection: vi.fn(),
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
  getState: () => mockStoreState,
}));

// Mock useOnboardingProgress hook
let mockProgressState = {
  updateProgress: vi.fn().mockResolvedValue({}),
  isUpdating: false,
};

vi.mock('@client/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: vi.fn(() => mockProgressState),
}));

// Mock apiFetch
vi.mock('@client/utils/api-client', () => ({
  apiFetch: vi.fn(),
}));

// Mock translations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => key,
}));

import { apiFetch } from '@client/utils/api-client';

describe('OnboardingStepGSC', () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as ReturnType<typeof vi.fn>).mockReset();

    // Reset store state
    mockStoreState = {
      projectId: 'project-123',
      completedSteps: new Set([OnboardingStep.PROJECT_CREATION]),
      skippedSteps: new Set<number>(),
      setHasGscConnection: vi.fn(),
      markStepComplete: vi.fn(),
      markStepSkipped: vi.fn(),
    };

    mockProgressState = {
      updateProgress: vi.fn().mockResolvedValue({}),
      isUpdating: false,
    };
  });

  describe('Rendering', () => {
    it('should render the GSC connection UI', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Connect Google Search Console');
      });
    });

    it('should show benefits of connecting GSC', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Why Connect GSC?');
        expect(container.textContent).toContain('Discover Real Keywords');
      });
    });

    it('should show skip button', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Skip for now');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching connection', () => {
      // Don't resolve the promise yet
      (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      const loader = container.querySelector('[data-icon="Loader2"]');
      expect(loader).toBeTruthy();
    });
  });

  describe('Connect Flow', () => {
    it('should call connect API when connect button is clicked', async () => {
      (apiFetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { connection: null } }) // Initial fetch
        .mockResolvedValueOnce({ data: { authUrl: 'https://accounts.google.com/oauth' } }); // Connect

      // Mock window.location.href
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Connect Google Search Console');
      });

      // Find and click connect button
      const buttons = container.querySelectorAll('button');
      const connectButton = Array.from(buttons).find(btn =>
        btn.textContent?.includes('Connect Google Search Console')
      );

      if (connectButton) {
        fireEvent.click(connectButton);
      }

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith('/api/gsc/connect', expect.any(Object));
      });

      // Restore window.location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should show error when connect fails', async () => {
      (apiFetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { connection: null } }) // Initial fetch
        .mockRejectedValueOnce(new Error('Connection failed')); // Connect

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Connect Google Search Console');
      });

      // Find and click connect button
      const buttons = container.querySelectorAll('button');
      const connectButton = Array.from(buttons).find(btn =>
        btn.textContent?.includes('Connect Google Search Console')
      );

      if (connectButton) {
        fireEvent.click(connectButton);
      }

      await waitFor(() => {
        expect(container.textContent).toContain('Failed to connect');
      });
    });
  });

  describe('Skip Flow', () => {
    it('should show skip confirmation when skip button is clicked', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Skip for now');
      });

      // Click "Skip for now" to show confirmation
      const skipButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Skip for now')
      );
      if (skipButton) fireEvent.click(skipButton);

      // Should show confirmation dialog
      expect(container.textContent).toContain('Are you sure?');
      expect(container.textContent).toContain('Skip Anyway');
      expect(container.textContent).toContain('Go Back');
    });

    it('should mark step as skipped when Skip Anyway is clicked', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Skip for now');
      });

      // Click "Skip for now" then "Skip Anyway"
      const skipButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Skip for now')
      );
      if (skipButton) fireEvent.click(skipButton);

      const skipAnywayButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Skip Anyway')
      );
      if (skipAnywayButton) fireEvent.click(skipAnywayButton);

      await waitFor(() => {
        expect(mockStoreState.markStepSkipped).toHaveBeenCalledWith(OnboardingStep.GSC_CONNECTION);
      });
    });

    it('should hide confirmation when Go Back is clicked', async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { connection: null } });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Skip for now');
      });

      // Click "Skip for now" to show confirmation
      const skipButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Skip for now')
      );
      if (skipButton) fireEvent.click(skipButton);

      expect(container.textContent).toContain('Are you sure?');

      // Click "Go Back"
      const goBackButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Go Back')
      );
      if (goBackButton) fireEvent.click(goBackButton);

      // Confirmation should be hidden
      expect(container.textContent).not.toContain('Are you sure?');
      expect(container.textContent).toContain('Skip for now');
    });
  });

  describe('Already Connected State', () => {
    it('should show connected state when GSC is already connected', async () => {
      const activeConnection = {
        id: 'conn-1',
        project_id: 'project-123',
        google_email: 'user@example.com',
        site_url: 'https://example.com/',
        last_synced_at: '2026-02-10T12:00:00Z',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      };

      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { connection: activeConnection },
      });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('GSC Connected');
        expect(container.textContent).toContain('user@example.com');
      });
    });

    it('should call onComplete when continue is clicked after connection', async () => {
      const activeConnection = {
        id: 'conn-1',
        project_id: 'project-123',
        google_email: 'user@example.com',
        site_url: 'https://example.com/',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
      };

      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { connection: activeConnection },
      });

      const { container } = render(
        <OnboardingStepGSC onComplete={mockOnComplete} onSkip={mockOnSkip} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('Continue to Keywords');
      });

      // Find and click continue button
      const continueButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Continue to Keywords')
      );

      if (continueButton) {
        fireEvent.click(continueButton);
      }

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });
});
