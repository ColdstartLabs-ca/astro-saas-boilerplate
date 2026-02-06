/**
 * ProjectOnboarding Component Tests
 * Tests for the 3-step project onboarding modal
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectOnboarding } from './ProjectOnboarding';
import * as useProjectOnboardingHook from '@client/hooks/useProjectOnboarding';

// Mock lucide-react icons - return empty spans so they don't affect text matching
vi.mock('lucide-react', () => ({
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Globe" />
  ),
  Code: ({ className }: { className?: string }) => <span className={className} data-icon="Code" />,
  ShoppingBag: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ShoppingBag" />
  ),
  Database: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Database" />
  ),
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Check" />
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ChevronRight" />
  ),
  X: ({ className }: { className?: string }) => <span className={className} data-icon="X" />,
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ArrowRight" />
  ),
}));

// Mock the hook
const mockSubmit = vi.fn();
const mockNextStep = vi.fn();
const mockPrevStep = vi.fn();
const mockClearError = vi.fn();

const mockForm = {
  watch: vi.fn(),
  reset: vi.fn(),
  handleSubmit: vi.fn(),
  register: vi.fn(),
  control: {
    _names: { array: [] },
    _subjects: { values: { next: vi.fn() }, array: { next: vi.fn() } },
    _getWatch: vi.fn(),
    _getValues: vi.fn(),
    _getFieldState: vi.fn(),
  },
  formState: { errors: {} },
  getValues: vi.fn(),
  setValue: vi.fn(),
  trigger: vi.fn(),
};

const mockStepper = {
  currentStep: 0,
  isFirstStep: true,
  isLastStep: false,
  steps: ['step1', 'step2', 'step3'],
  reset: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
};

vi.mock('@client/hooks/useProjectOnboarding', () => ({
  useProjectOnboarding: vi.fn(() => ({
    form: mockForm,
    stepper: mockStepper,
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    submit: mockSubmit,
    isSubmitting: false,
    error: null,
    clearError: mockClearError,
  })),
}));

// Mock react-hook-form - we need to use real FormProvider but mock useFormContext
vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual<typeof import('react-hook-form')>('react-hook-form');
  return {
    ...actual,
    useFormContext: vi.fn(() => mockForm),
    Controller: ({
      render,
    }: {
      render: (props: { field: unknown; fieldState: unknown }) => React.ReactNode;
    }) => render({ field: {}, fieldState: {} }),
  };
});

// Mock useTranslations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'projects.onboarding.title': 'Create New Project',
      'projects.onboarding.step1.projectName': 'Project Name',
      'projects.onboarding.step1.projectNamePlaceholder': 'My Awesome Project',
      'projects.onboarding.step1.domainUrl': 'Domain URL',
      'projects.onboarding.step1.industry': 'Industry',
      'projects.onboarding.step1.industryPlaceholder': 'Select an industry',
      'projects.onboarding.nextStep': 'Next Step',
      'projects.onboarding.back': 'Back',
      'projects.onboarding.cancel': 'Cancel',
      'projects.onboarding.completeSetup': 'Complete Setup',
      'projects.onboarding.creating': 'Creating...',
    };
    return translations[key] || key;
  }),
}));

describe('ProjectOnboarding', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    // Reset stepper state
    mockStepper.currentStep = 0;
    mockStepper.isFirstStep = true;
    mockStepper.isLastStep = false;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Rendering', () => {
    it('should render step 1 by default when isOpen is true', () => {
      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      // There are two "Step 1 of 3" elements (header and progress bar), use getAllByText
      expect(screen.getAllByText(/Step 1 of 3/i)).toHaveLength(2);
    });

    it('should not render when isOpen is false', () => {
      render(<ProjectOnboarding isOpen={false} onClose={() => {}} />, { wrapper });

      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate between steps using Back button', () => {
      mockStepper.currentStep = 1;
      mockStepper.isFirstStep = false;

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      expect(mockPrevStep).toHaveBeenCalled();
    });

    it('should close modal on Cancel button when on first step', () => {
      const onClose = vi.fn();

      render(<ProjectOnboarding isOpen={true} onClose={onClose} />, { wrapper });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should disable Next button when project name is empty', () => {
      mockForm.watch.mockReturnValue('');

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const nextButton = screen.getByText('Next Step');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when project name has content', () => {
      mockForm.watch.mockReturnValue('My Project');

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const nextButton = screen.getByText('Next Step');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Submission', () => {
    it('should submit form on final step when Complete Setup is clicked', async () => {
      mockStepper.currentStep = 2;
      mockStepper.isLastStep = true;
      mockForm.watch.mockReturnValue('My Project');

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const completeButton = screen.getByText(/Complete Setup/i);
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', () => {
      vi.mocked(useProjectOnboardingHook).useProjectOnboarding.mockReturnValue({
        form: mockForm,
        stepper: mockStepper,
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        submit: mockSubmit,
        isSubmitting: true,
        error: null,
        clearError: mockClearError,
      });

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    });

    it('should disable buttons during submission', () => {
      vi.mocked(useProjectOnboardingHook).useProjectOnboarding.mockReturnValue({
        form: mockForm,
        stepper: mockStepper,
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        submit: mockSubmit,
        isSubmitting: true,
        error: null,
        clearError: mockClearError,
      });

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const nextButton = screen.getByRole('button', { name: /Creating/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      const mockError = 'Failed to create project';

      vi.mocked(useProjectOnboardingHook).useProjectOnboarding.mockReturnValue({
        form: mockForm,
        stepper: mockStepper,
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        submit: mockSubmit,
        isSubmitting: false,
        error: mockError,
        clearError: mockClearError,
      });

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      expect(screen.getByText(mockError)).toBeInTheDocument();
    });

    it('should clear error when navigating to next step', async () => {
      vi.mocked(useProjectOnboardingHook).useProjectOnboarding.mockReturnValue({
        form: mockForm,
        stepper: mockStepper,
        nextStep: mockNextStep.mockResolvedValue(undefined),
        prevStep: mockPrevStep,
        submit: mockSubmit,
        isSubmitting: false,
        error: 'Some error',
        clearError: mockClearError,
      });

      mockForm.watch.mockReturnValue('My Project');

      render(<ProjectOnboarding isOpen={true} onClose={() => {}} />, { wrapper });

      const nextButton = screen.getByText('Next Step');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });
});
