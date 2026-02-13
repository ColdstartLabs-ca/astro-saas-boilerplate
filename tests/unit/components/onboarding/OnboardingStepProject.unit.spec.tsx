/**
 * OnboardingStepProject Component Tests
 * Tests for Step 1: Create Project
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepProject } from '@client/components/onboarding/steps/OnboardingStepProject';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FolderPlus: ({ className }: { className?: string }) => (
    <span className={className} data-icon="FolderPlus" />
  ),
  Globe: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Globe" />
  ),
  Briefcase: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Briefcase" />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
}));

// Create mutable state for testing
let mockStoreState = {
  setProjectId: vi.fn(),
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

// Mock useProjects hook
let mockProjectsState = {
  createProject: vi.fn(),
};

vi.mock('@client/hooks/useProjects', () => ({
  useProjects: vi.fn(() => mockProjectsState),
}));

// Mock useOnboardingProgress hook
let mockProgressState = {
  updateProgress: vi.fn().mockResolvedValue({}),
  isUpdating: false,
};

vi.mock('@client/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: vi.fn(() => mockProgressState),
}));

// Mock translations
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('OnboardingStepProject', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset state
    mockStoreState = {
      setProjectId: vi.fn(),
      markStepComplete: vi.fn(),
    };

    mockProjectsState = {
      createProject: vi.fn(),
    };

    mockProgressState = {
      updateProgress: vi.fn().mockResolvedValue({}),
      isUpdating: false,
    };
  });

  describe('Rendering', () => {
    it('should render the project creation form', () => {
      const { container } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      expect(container.textContent).toContain('Create Your First Project');
      expect(container.textContent).toContain('Project Name');
      expect(container.textContent).toContain('Website Domain');
      expect(container.textContent).toContain('Industry');
    });

    it('should have the project name input field', () => {
      const { getByLabelText } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const nameInput = getByLabelText(/Project Name/);
      expect(nameInput).toBeTruthy();
    });

    it('should have the domain input field', () => {
      const { getByLabelText } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const domainInput = getByLabelText(/Website Domain/);
      expect(domainInput).toBeTruthy();
    });

    it('should have the industry select', () => {
      const { getByLabelText } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const industrySelect = getByLabelText(/Industry/);
      expect(industrySelect).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when name is empty', () => {
      const { container } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton?.hasAttribute('disabled')).toBe(true);
    });

    it('should enable submit button when name is provided', async () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      await waitFor(() => {
        const submitButton = container.querySelector('button[type="submit"]');
        expect(submitButton?.hasAttribute('disabled')).toBe(false);
      });
    });

    it('should show error for invalid domain', async () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website Domain/);
      fireEvent.input(domainInput, { target: { value: 'not-a-valid-url' } });

      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        // Domain validation error should appear
        expect(container.textContent).toContain('valid URL');
      });
    });

    it('should accept valid domain URLs', async () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website Domain/);
      fireEvent.input(domainInput, { target: { value: 'https://example.com' } });

      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      await waitFor(() => {
        const submitButton = container.querySelector('button[type="submit"]');
        expect(submitButton?.hasAttribute('disabled')).toBe(false);
      });
    });
  });

  describe('Form Submission', () => {
    it('should call createProject with form data', async () => {
      mockProjectsState.createProject.mockResolvedValueOnce({ id: 'project-123', name: 'Test Project' });
      mockProgressState.updateProgress.mockResolvedValueOnce({});

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Fill form
      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const domainInput = getByLabelText(/Website Domain/);
      fireEvent.input(domainInput, { target: { value: 'https://example.com' } });

      // Submit
      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockProjectsState.createProject).toHaveBeenCalledWith({
          name: 'Test Project',
          domain: 'https://example.com',
          industry: undefined,
        });
      });
    });

    it('should update store after successful creation', async () => {
      mockProjectsState.createProject.mockResolvedValueOnce({ id: 'project-123', name: 'Test Project' });
      mockProgressState.updateProgress.mockResolvedValueOnce({});

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Fill and submit form
      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockStoreState.setProjectId).toHaveBeenCalledWith('project-123');
        expect(mockStoreState.markStepComplete).toHaveBeenCalledWith(OnboardingStep.PROJECT_CREATION);
      });
    });

    it('should call onComplete after successful creation', async () => {
      mockProjectsState.createProject.mockResolvedValueOnce({ id: 'project-123', name: 'Test Project' });
      mockProgressState.updateProgress.mockResolvedValueOnce({});

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Fill and submit form
      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      // Make the promise hang to test loading state
      mockProjectsState.createProject.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'project-123' }), 1000))
      );

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Fill and submit form
      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        // Should show loading text
        expect(container.textContent).toContain('Creating Project');
      });
    });
  });

  describe('Character Counter', () => {
    it('should show character count for project name', () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test' } });

      expect(container.textContent).toContain('4/100 characters');
    });
  });
});
