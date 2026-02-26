/**
 * OnboardingStepProject Component Tests
 * Tests for Step 1: Create Project
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingStepProject } from '@client/components/onboarding/steps/OnboardingStepProject';
import { OnboardingStep } from '@shared/types/onboarding.types';
import { apiFetch } from '@client/utils/api-client';

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
    FolderPlus: makeIcon('FolderPlus'),
    Globe: makeIcon('Globe'),
    Briefcase: makeIcon('Briefcase'),
    Loader2: makeIcon('Loader2'),
    FileText: makeIcon('FileText'),
    Rss: makeIcon('Rss'),
    Sparkles: makeIcon('Sparkles'),
    CheckCircle: makeIcon('CheckCircle'),
    AlertTriangle: makeIcon('AlertTriangle'),
  };
});

// Create mutable state for testing
let mockStoreState = {
  setProjectId: vi.fn(),
  markStepComplete: vi.fn(),
};

let mockProjectStoreState = {
  setActiveProjectId: vi.fn(),
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

vi.mock('@client/store/projectStore', () => ({
  useProjectStore: vi.fn((selector?: (state: typeof mockProjectStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockProjectStoreState);
    }
    return mockProjectStoreState;
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

// Mock api-client (used for crawl and validate-sitemap calls)
vi.mock('@client/utils/api-client', () => ({
  apiFetch: vi.fn(),
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

    mockProjectStoreState = {
      setActiveProjectId: vi.fn(),
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

      expect(container.textContent).toContain('Project Name');
      expect(container.textContent).toContain('Website URL');
      expect(container.textContent).toContain('Industry');
    });

    it('should have the project name input field', () => {
      const { getByLabelText } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const nameInput = getByLabelText(/Project Name/);
      expect(nameInput).toBeTruthy();
    });

    it('should have the domain input field', () => {
      const { getByLabelText } = render(<OnboardingStepProject onComplete={mockOnComplete} />);

      const domainInput = getByLabelText(/Website URL/);
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

    it('should accept domain URLs (no format validation — https:// added automatically)', async () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'example.com' } });

      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      await waitFor(() => {
        const submitButton = container.querySelector('button[type="submit"]');
        expect(submitButton?.hasAttribute('disabled')).toBe(false);
      });
    });

    it('should accept valid domain URLs with protocol', async () => {
      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website URL/);
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
      mockProjectsState.createProject.mockResolvedValueOnce({
        id: 'project-123',
        name: 'Test Project',
      });
      mockProgressState.updateProgress.mockResolvedValueOnce({});

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Fill form
      const nameInput = getByLabelText(/Project Name/);
      fireEvent.input(nameInput, { target: { value: 'Test Project' } });

      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'https://example.com' } });

      // Submit
      const form = container.querySelector('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockProjectsState.createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Project',
            domain: 'https://example.com',
          })
        );
      });
    });

    it('should update store after successful creation', async () => {
      mockProjectsState.createProject.mockResolvedValueOnce({
        id: 'project-123',
        name: 'Test Project',
      });
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
        expect(mockProjectStoreState.setActiveProjectId).toHaveBeenCalledWith('project-123');
        expect(mockStoreState.markStepComplete).toHaveBeenCalledWith(
          OnboardingStep.PROJECT_CREATION
        );
      });
    });

    it('should call onComplete after successful creation', async () => {
      mockProjectsState.createProject.mockResolvedValueOnce({
        id: 'project-123',
        name: 'Test Project',
      });
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

  describe('URL Auto-suggestion', () => {
    it('should auto-suggest sitemap and blog URLs on domain blur', () => {
      const { getByLabelText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'example.com' } });
      fireEvent.blur(domainInput);

      const sitemapInput = getByLabelText(/Sitemap URL/) as HTMLInputElement;
      const blogInput = getByLabelText(/Blog URL/) as HTMLInputElement;

      expect(sitemapInput.value).toBe('https://example.com/sitemap.xml');
      expect(blogInput.value).toBe('https://example.com/blog');
    });

    it('should update sitemap/blog when domain is corrected (typo fix)', () => {
      const { getByLabelText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website URL/);

      // Type mistyped domain and blur
      fireEvent.input(domainInput, { target: { value: 'exmaple.com' } });
      fireEvent.blur(domainInput);

      const sitemapInput = getByLabelText(/Sitemap URL/) as HTMLInputElement;
      expect(sitemapInput.value).toBe('https://exmaple.com/sitemap.xml');

      // Fix the domain and blur again
      fireEvent.input(domainInput, { target: { value: 'example.com' } });
      fireEvent.blur(domainInput);

      expect(sitemapInput.value).toBe('https://example.com/sitemap.xml');
      const blogInput = getByLabelText(/Blog URL/) as HTMLInputElement;
      expect(blogInput.value).toBe('https://example.com/blog');
    });

    it('should not overwrite manually-edited sitemap/blog on domain change', () => {
      const { getByLabelText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'example.com' } });
      fireEvent.blur(domainInput);

      // Manually edit the sitemap URL
      const sitemapInput = getByLabelText(/Sitemap URL/) as HTMLInputElement;
      fireEvent.change(sitemapInput, { target: { value: 'https://example.com/custom-sitemap.xml' } });

      // Change domain
      fireEvent.input(domainInput, { target: { value: 'other.com' } });
      fireEvent.blur(domainInput);

      // Sitemap should keep the user's custom value (doesn't match auto-suggestion)
      expect(sitemapInput.value).toBe('https://example.com/custom-sitemap.xml');

      // Blog was not manually edited, so it should update
      const blogInput = getByLabelText(/Blog URL/) as HTMLInputElement;
      expect(blogInput.value).toBe('https://other.com/blog');
    });
  });

  describe('Validation State Edge Cases', () => {
    it('should clear validation icons when sitemap URL is manually edited', async () => {
      const mockApiFetch = apiFetch as Mock;
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { valid: true },
      });

      const { getByLabelText, container } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      const sitemapInput = getByLabelText(/Sitemap URL/) as HTMLInputElement;

      // Set a value and blur to trigger validation
      fireEvent.input(sitemapInput, { target: { value: 'https://example.com/sitemap.xml' } });
      fireEvent.blur(sitemapInput);

      // Wait for validation to complete (shows green check)
      await waitFor(() => {
        const checkIcon = container.querySelector('[data-icon="CheckCircle"]');
        expect(checkIcon).toBeTruthy();
      });

      // Start typing in the field — validation icon should clear
      fireEvent.change(sitemapInput, { target: { value: 'https://example.com/new-sitemap.xml' } });

      await waitFor(() => {
        const checkIcon = container.querySelector('#project-sitemap + [data-icon="CheckCircle"]');
        // The parent should no longer show validation icons
        const sitemapField = sitemapInput.closest('.relative');
        const icons = sitemapField?.querySelectorAll('[data-icon="CheckCircle"], [data-icon="AlertTriangle"]');
        // Only the left-side Rss icon should remain, no validation icons
        expect(icons?.length ?? 0).toBe(0);
      });
    });

    it('should hide analyze error banner when domain is changed', async () => {
      const mockApiFetch = apiFetch as Mock;
      mockApiFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const { getByLabelText, container, getByText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Type domain and click Analyze
      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'bad-site.com' } });

      await waitFor(() => {
        expect(getByText('Analyze')).toBeTruthy();
      });

      fireEvent.click(getByText('Analyze'));

      // Wait for error banner to appear
      await waitFor(() => {
        expect(container.textContent).toContain('Connection failed');
      });

      // Change domain — error should disappear
      fireEvent.input(domainInput, { target: { value: 'other-site.com' } });

      await waitFor(() => {
        expect(container.textContent).not.toContain('Connection failed');
      });
    });

    it('should hide analyze success banner when domain is changed', async () => {
      const mockApiFetch = apiFetch as Mock;
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { metadata: { title: 'Test Site', description: 'A test' } },
      });

      const { getByLabelText, container, getByText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Type domain and click Analyze
      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'good-site.com' } });

      await waitFor(() => {
        expect(getByText('Analyze')).toBeTruthy();
      });

      fireEvent.click(getByText('Analyze'));

      // Wait for success banner
      await waitFor(() => {
        expect(container.textContent).toContain('Website analyzed');
      });

      // Change domain — success should disappear
      fireEvent.input(domainInput, { target: { value: 'different-site.com' } });

      await waitFor(() => {
        expect(container.textContent).not.toContain('Website analyzed');
      });
    });

    it('should not show stale analyze success banner after blurring a new domain', async () => {
      const mockApiFetch = apiFetch as Mock;
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { metadata: { title: 'Test Site', description: 'A test' } },
      });

      const { getByLabelText, container, getByText } = render(
        <OnboardingStepProject onComplete={mockOnComplete} />
      );

      // Analyze first domain
      const domainInput = getByLabelText(/Website URL/);
      fireEvent.input(domainInput, { target: { value: 'first.com' } });

      await waitFor(() => {
        expect(getByText('Analyze')).toBeTruthy();
      });

      fireEvent.click(getByText('Analyze'));

      await waitFor(() => {
        expect(container.textContent).toContain('Website analyzed');
      });

      // Change domain and just blur (don't analyze) — the success banner
      // from first.com should NOT reappear even though suggestUrlsFromDomain
      // updates lastSuggestedDomainRef
      fireEvent.input(domainInput, { target: { value: 'second.com' } });
      fireEvent.blur(domainInput);

      expect(container.textContent).not.toContain('Website analyzed');
    });
  });
});
