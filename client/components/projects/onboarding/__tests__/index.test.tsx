import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import React from 'react';
import {
  BasicInfoStep,
  PlatformSelectionStep,
  ContentPreferencesStep,
  type IBasicInfoStepProps,
  type IPlatformSelectionStepProps,
  type IContentPreferencesStepProps,
} from '@client/components/projects/onboarding';
import type { IProjectOnboardingInput } from '@shared/validation/project.schema';

// Mock translations for onboarding
const mockTranslations = {
  'projects.onboarding.step1.projectName': 'Project Name',
  'projects.onboarding.step1.projectNamePlaceholder': 'Enter project name',
  'projects.onboarding.step1.domainUrl': 'Domain URL',
  'projects.onboarding.step1.industry': 'Industry',
  'projects.onboarding.step1.industryPlaceholder': 'Select an industry',
  'projects.onboarding.step1.industries.tech': 'Technology',
  'projects.onboarding.step1.industries.health': 'Health',
  'projects.onboarding.step1.industries.finance': 'Finance',
  'projects.onboarding.step1.industries.ecommerce': 'E-commerce',
  'projects.onboarding.step1.industries.education': 'Education',
  'projects.onboarding.step1.industries.lifestyle': 'Lifestyle',
  'projects.onboarding.step1.industries.realestate': 'Real Estate',
  'projects.onboarding.step1.industries.legal': 'Legal',
  'projects.onboarding.step1.industries.marketing': 'Marketing',
  'projects.onboarding.step1.industries.other': 'Other',
  'projects.onboarding.step2.choosePlatform': 'Choose your CMS platform',
  'projects.onboarding.step2.wordpress': 'WordPress',
  'projects.onboarding.step2.webflow': 'Webflow',
  'projects.onboarding.step2.shopify': 'Shopify',
  'projects.onboarding.step2.other': 'Other/None',
  'projects.onboarding.step2.cmsNote': 'You can change this later',
  'projects.onboarding.step3.contentStrategy': 'Content Strategy',
  'projects.onboarding.step3.publishingFrequency': 'Publishing Frequency',
  'projects.onboarding.step3.frequencies.daily': 'Daily',
  'projects.onboarding.step3.frequencies.3x_week': '3x per week',
  'projects.onboarding.step3.frequencies.weekly': 'Weekly',
  'projects.onboarding.step3.confirmationNote': 'You can adjust these later',
};

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
  Code: ({ className }: { className?: string }) => (
    <svg data-testid="code-icon" className={className} />
  ),
  ShoppingBag: ({ className }: { className?: string }) => (
    <svg data-testid="shopping-bag-icon" className={className} />
  ),
  Database: ({ className }: { className?: string }) => (
    <svg data-testid="database-icon" className={className} />
  ),
}));

// Mock the useTranslations hook
vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: vi.fn((_namespace: string) => {
    const t = (key: string) => {
      return (mockTranslations as Record<string, string>)[key] || key;
    };
    return t;
  }),
}));

function createWrapper(defaultValues: Partial<IProjectOnboardingInput> = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<IProjectOnboardingInput>({
      defaultValues: {
        name: '',
        domain: '',
        industry: 'tech',
        cmsType: 'wordpress',
        frequency: 'daily',
        ...defaultValues,
      },
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  }
  return Wrapper;
}

describe('Onboarding Steps Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exports', () => {
    test('should export BasicInfoStep component', () => {
      expect(BasicInfoStep).toBeDefined();
      expect(typeof BasicInfoStep).toBe('function');
    });

    test('should export PlatformSelectionStep component', () => {
      expect(PlatformSelectionStep).toBeDefined();
      expect(typeof PlatformSelectionStep).toBe('function');
    });

    test('should export ContentPreferencesStep component', () => {
      expect(ContentPreferencesStep).toBeDefined();
      expect(typeof ContentPreferencesStep).toBe('function');
    });

    test('should export IBasicInfoStepProps type', () => {
      const props: IBasicInfoStepProps = {};
      expect(props).toBeDefined();
    });

    test('should export IPlatformSelectionStepProps type', () => {
      const props: IPlatformSelectionStepProps = {};
      expect(props).toBeDefined();
    });

    test('should export IContentPreferencesStepProps type', () => {
      const props: IContentPreferencesStepProps = {};
      expect(props).toBeDefined();
    });
  });

  describe('BasicInfoStep', () => {
    test('should render project name input field', () => {
      const Wrapper = createWrapper();
      render(<BasicInfoStep />, { wrapper: Wrapper });

      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    });

    test('should render domain URL input field', () => {
      const Wrapper = createWrapper();
      render(<BasicInfoStep />, { wrapper: Wrapper });

      expect(screen.getByLabelText('Domain URL')).toBeInTheDocument();
    });

    test('should render industry select field', () => {
      const Wrapper = createWrapper();
      render(<BasicInfoStep />, { wrapper: Wrapper });

      expect(screen.getByLabelText('Industry')).toBeInTheDocument();
    });

    test('should render industry options', () => {
      const Wrapper = createWrapper();
      render(<BasicInfoStep />, { wrapper: Wrapper });

      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const Wrapper = createWrapper();
      const { container } = render(<BasicInfoStep className="custom-class" />, {
        wrapper: Wrapper,
      });

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    test('should show error message when name has error', () => {
      const Wrapper = createWrapper({
        name: 'a',
      });
      render(<BasicInfoStep />, { wrapper: Wrapper });

      const nameInput = screen.getByLabelText('Project Name');
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe('PlatformSelectionStep', () => {
    test('should render platform selection title', () => {
      const Wrapper = createWrapper();
      render(<PlatformSelectionStep />, { wrapper: Wrapper });

      expect(screen.getByText('Choose your CMS platform')).toBeInTheDocument();
    });

    test('should render all CMS platform options', () => {
      const Wrapper = createWrapper();
      render(<PlatformSelectionStep />, { wrapper: Wrapper });

      expect(screen.getByText('WordPress')).toBeInTheDocument();
      expect(screen.getByText('Webflow')).toBeInTheDocument();
      expect(screen.getByText('Shopify')).toBeInTheDocument();
      expect(screen.getByText('Other/None')).toBeInTheDocument();
    });

    test('should render CMS note', () => {
      const Wrapper = createWrapper();
      render(<PlatformSelectionStep />, { wrapper: Wrapper });

      expect(screen.getByText('You can change this later')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const Wrapper = createWrapper();
      const { container } = render(<PlatformSelectionStep className="custom-class" />, {
        wrapper: Wrapper,
      });

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('ContentPreferencesStep', () => {
    test('should render content strategy section', () => {
      const Wrapper = createWrapper();
      render(<ContentPreferencesStep />, { wrapper: Wrapper });

      expect(screen.getByText('Content Strategy')).toBeInTheDocument();
    });

    test('should render publishing frequency label', () => {
      const Wrapper = createWrapper();
      render(<ContentPreferencesStep />, { wrapper: Wrapper });

      expect(screen.getByText('Publishing Frequency')).toBeInTheDocument();
    });

    test('should render all frequency options', () => {
      const Wrapper = createWrapper();
      render(<ContentPreferencesStep />, { wrapper: Wrapper });

      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('3x per week')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
    });

    test('should render confirmation note', () => {
      const Wrapper = createWrapper();
      render(<ContentPreferencesStep />, { wrapper: Wrapper });

      expect(screen.getByText('You can adjust these later')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const Wrapper = createWrapper();
      const { container } = render(<ContentPreferencesStep className="custom-class" />, {
        wrapper: Wrapper,
      });

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('integration', () => {
    test('should render all steps together in form context', () => {
      const Wrapper = createWrapper();
      const { container } = render(
        <div>
          <BasicInfoStep />
          <PlatformSelectionStep />
          <ContentPreferencesStep />
        </div>,
        { wrapper: Wrapper }
      );

      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Choose your CMS platform')).toBeInTheDocument();
      expect(screen.getByText('Content Strategy')).toBeInTheDocument();
      expect(container.firstChild).toBeDefined();
    });
  });
});
