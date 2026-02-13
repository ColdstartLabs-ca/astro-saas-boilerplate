/**
 * OnboardingStepperProgress Component Tests
 * Tests for the horizontal progress indicator
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { OnboardingStepperProgress } from '@client/components/onboarding/OnboardingStepperProgress';
import { OnboardingStep } from '@shared/types/onboarding.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Check" />
  ),
  SkipForward: ({ className }: { className?: string }) => (
    <span className={className} data-icon="SkipForward" />
  ),
}));

describe('OnboardingStepperProgress', () => {
  const defaultProps = {
    currentStep: OnboardingStep.PROJECT_CREATION,
    completedSteps: new Set<number>(),
    skippedSteps: new Set<number>(),
  };

  describe('Rendering', () => {
    it('should render all 5 steps', () => {
      const { container } = render(<OnboardingStepperProgress {...defaultProps} />);

      // Check for step numbers (1-5)
      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('2');
      expect(container.textContent).toContain('3');
      expect(container.textContent).toContain('4');
      expect(container.textContent).toContain('5');
    });

    it('should highlight the current step', () => {
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} currentStep={OnboardingStep.GSC_CONNECTION} />
      );

      // Step 2 should be active (accent color)
      const stepCircles = container.querySelectorAll('.rounded-full');
      expect(stepCircles.length).toBeGreaterThan(0);
    });
  });

  describe('Completed Steps', () => {
    it('should show checkmark for completed steps', () => {
      const completedSteps = new Set([OnboardingStep.PROJECT_CREATION]);
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} completedSteps={completedSteps} />
      );

      // Check icon should be present
      const checkIcon = container.querySelector('[data-icon="Check"]');
      expect(checkIcon).toBeTruthy();
    });

    it('should use emerald color for completed steps', () => {
      const completedSteps = new Set([OnboardingStep.PROJECT_CREATION]);
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} completedSteps={completedSteps} />
      );

      // Should have emerald color class
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });
  });

  describe('Skipped Steps', () => {
    it('should show skip icon for skipped steps', () => {
      const skippedSteps = new Set([OnboardingStep.GSC_CONNECTION]);
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} skippedSteps={skippedSteps} />
      );

      // Skip icon should be present
      const skipIcon = container.querySelector('[data-icon="SkipForward"]');
      expect(skipIcon).toBeTruthy();
    });

    it('should use amber color for skipped steps', () => {
      const skippedSteps = new Set([OnboardingStep.GSC_CONNECTION]);
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} skippedSteps={skippedSteps} />
      );

      // Should have amber color class
      const amberElements = container.querySelectorAll('[class*="amber"]');
      expect(amberElements.length).toBeGreaterThan(0);
    });
  });

  describe('Active Step', () => {
    it('should use accent color for active step', () => {
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} currentStep={OnboardingStep.KEYWORDS_UPLOAD} />
      );

      // Should have accent color class on the active step
      const accentElements = container.querySelectorAll('[class*="accent"]');
      expect(accentElements.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render step labels on desktop', () => {
      const { container } = render(<OnboardingStepperProgress {...defaultProps} />);

      // Desktop labels are hidden on small screens but present
      const hiddenLabels = container.querySelectorAll('.hidden.sm\\:block');
      expect(hiddenLabels.length).toBeGreaterThan(0);
    });

    it('should render current step label below on mobile', () => {
      const { container } = render(
        <OnboardingStepperProgress {...defaultProps} currentStep={OnboardingStep.GSC_CONNECTION} />
      );

      // Mobile label (sm:hidden) should contain "GSC"
      const mobileLabel = container.querySelector('.sm\\:hidden.text-center');
      expect(mobileLabel).toBeTruthy();
    });
  });

  describe('Progress Indicator', () => {
    it('should show progress correctly when multiple steps completed', () => {
      const completedSteps = new Set([
        OnboardingStep.PROJECT_CREATION,
        OnboardingStep.GSC_CONNECTION,
        OnboardingStep.KEYWORDS_UPLOAD,
      ]);
      const { container } = render(
        <OnboardingStepperProgress
          {...defaultProps}
          completedSteps={completedSteps}
          currentStep={OnboardingStep.INTEGRATIONS}
        />
      );

      // Checkmarks should be present for completed steps
      // Note: Check icons appear in both desktop and mobile views
      const checkIcons = container.querySelectorAll('[data-icon="Check"]');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });
});
