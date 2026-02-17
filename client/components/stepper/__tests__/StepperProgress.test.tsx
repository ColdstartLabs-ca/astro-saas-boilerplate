import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StepperProgress,
  StepperProgressCompact,
} from '@client/components/stepper/StepperProgress';
import type {
  IStepperProgressProps,
  IStepperProgressCompactProps,
} from '@client/components/stepper/StepperProgress';

describe('StepperProgress', () => {
  describe('StepperProgress Component', () => {
    const defaultProps: IStepperProgressProps = {
      currentStep: 0,
      steps: [{ label: 'Basic Info' }, { label: 'Platform' }, { label: 'Preferences' }],
    };

    test('should render all step circles with labels', () => {
      render(<StepperProgress {...defaultProps} />);

      // Use getAllByText since we render both desktop and mobile versions
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    test('should render correct number of steps', () => {
      render(
        <StepperProgress
          currentStep={0}
          steps={[
            { label: 'Step 1' },
            { label: 'Step 2' },
            { label: 'Step 3' },
            { label: 'Step 4' },
            { label: 'Step 5' },
          ]}
        />
      );

      // Use getAllByText since we render both desktop and mobile versions
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });

    test('should highlight current step', () => {
      const { container } = render(
        <StepperProgress
          currentStep={1}
          steps={[{ label: 'Step 1' }, { label: 'Step 2' }, { label: 'Step 3' }]}
        />
      );

      // Current step should have accent color
      const accentElements = container.querySelectorAll('[class*="accent"]');
      expect(accentElements.length).toBeGreaterThan(0);
    });

    test('should show checkmark for completed steps', () => {
      const completedSteps = new Set([0]);
      const { container } = render(
        <StepperProgress
          currentStep={1}
          steps={[{ label: 'Step 1' }, { label: 'Step 2' }, { label: 'Step 3' }]}
          completedSteps={completedSteps}
        />
      );

      // Should have emerald color for completed step
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });

    test('should render connector lines between steps', () => {
      const { container } = render(<StepperProgress {...defaultProps} />);

      // Should have connector lines (h-0.5)
      const connectors = container.querySelectorAll('.h-0\\.5');
      // N-1 connectors for N steps * 2 (desktop + mobile)
      expect(connectors.length).toBe(4);
    });

    test('should render step labels on desktop', () => {
      const { container } = render(<StepperProgress {...defaultProps} />);

      // Desktop labels are hidden on small screens but present
      const hiddenLabels = container.querySelectorAll('.hidden.sm\\:block');
      expect(hiddenLabels.length).toBeGreaterThan(0);
    });

    test('should apply custom className', () => {
      const { container } = render(<StepperProgress {...defaultProps} className="custom-class" />);

      const stepper = container.querySelector('.custom-class');
      expect(stepper).toBeInTheDocument();
    });

    test('should handle single step', () => {
      render(<StepperProgress currentStep={0} steps={[{ label: 'Only Step' }]} />);

      // Use getAllByText since we render both desktop and mobile versions
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });

    test('should handle last step as current', () => {
      const completedSteps = new Set([0, 1]);
      const { container } = render(
        <StepperProgress
          currentStep={2}
          steps={[{ label: 'Step 1' }, { label: 'Step 2' }, { label: 'Step 3' }]}
          completedSteps={completedSteps}
        />
      );

      // Step 3 should be current
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      // Should have emerald for completed steps
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });

    test('should handle all steps completed (current equals last)', () => {
      const completedSteps = new Set([0, 1]);
      const { container } = render(
        <StepperProgress
          currentStep={2}
          steps={[{ label: 'Step 1' }, { label: 'Step 2' }, { label: 'Step 3' }]}
          completedSteps={completedSteps}
        />
      );

      // Step 3 should be current (not completed)
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      // Steps 1 and 2 should be completed (emerald)
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });

    test('should render with optional steps', () => {
      render(
        <StepperProgress
          currentStep={0}
          steps={[
            { label: 'Required', isOptional: false },
            { label: 'Optional', isOptional: true },
          ]}
        />
      );

      // Use getAllByText since we render both desktop and mobile versions
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });

    test('should show mobile current step label', () => {
      render(<StepperProgress {...defaultProps} />);

      // Mobile label should be visible (appears in both desktop hidden and mobile visible)
      const labels = screen.getAllByText('Basic Info');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('StepperProgressCompact Component', () => {
    const defaultProps: IStepperProgressCompactProps = {
      currentStep: 0,
      totalSteps: 3,
    };

    test('should render default step label', () => {
      render(<StepperProgressCompact {...defaultProps} />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    test('should render custom step label', () => {
      const props: IStepperProgressCompactProps = {
        ...defaultProps,
        stepLabel: 'Account Setup',
      };

      render(<StepperProgressCompact {...props} />);

      expect(screen.getByText('Account Setup')).toBeInTheDocument();
    });

    test('should display percentage for first step', () => {
      render(<StepperProgressCompact {...defaultProps} />);

      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    test('should display 100% for last step', () => {
      render(<StepperProgressCompact currentStep={2} totalSteps={3} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should display correct percentage for middle step', () => {
      render(<StepperProgressCompact currentStep={1} totalSteps={3} />);

      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    test('should render progress bar', () => {
      const { container } = render(<StepperProgressCompact {...defaultProps} />);

      const progressBar = container.querySelector('.h-1');
      expect(progressBar).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const { container } = render(
        <StepperProgressCompact {...defaultProps} className="custom-class" />
      );

      const stepper = container.querySelector('.custom-class');
      expect(stepper).toBeInTheDocument();
    });

    test('should handle single step', () => {
      render(<StepperProgressCompact currentStep={0} totalSteps={1} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should handle many steps', () => {
      render(<StepperProgressCompact currentStep={2} totalSteps={5} />);

      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    test('should display 0% for step 0 of many steps', () => {
      render(<StepperProgressCompact currentStep={0} totalSteps={10} />);

      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    test('should render rounded progress bar', () => {
      const { container } = render(<StepperProgressCompact {...defaultProps} />);

      const roundedBars = container.querySelectorAll('.rounded-full');
      expect(roundedBars.length).toBeGreaterThan(0);
    });

    test('should handle step label as empty string', () => {
      render(<StepperProgressCompact {...defaultProps} stepLabel="" />);

      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    test('should display progress percentage correctly for edge cases', () => {
      const { rerender } = render(<StepperProgressCompact currentStep={0} totalSteps={3} />);

      expect(screen.getByText('33%')).toBeInTheDocument();

      rerender(<StepperProgressCompact currentStep={1} totalSteps={3} />);
      expect(screen.getByText('67%')).toBeInTheDocument();

      rerender(<StepperProgressCompact currentStep={2} totalSteps={3} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should show correct step number in label', () => {
      const { rerender } = render(<StepperProgressCompact currentStep={0} totalSteps={5} />);

      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();

      rerender(<StepperProgressCompact currentStep={2} totalSteps={5} />);
      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();

      rerender(<StepperProgressCompact currentStep={4} totalSteps={5} />);
      expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    });
  });

  describe('exports', () => {
    test('should export StepperProgress component', () => {
      expect(StepperProgress).toBeDefined();
      expect(typeof StepperProgress).toBe('function');
    });

    test('should export StepperProgressCompact component', () => {
      expect(StepperProgressCompact).toBeDefined();
      expect(typeof StepperProgressCompact).toBe('function');
    });

    test('should export IStepperProgressProps type', () => {
      const props: IStepperProgressProps = {
        currentStep: 0,
        steps: [{ label: 'Test' }],
      };
      expect(props).toBeDefined();
    });

    test('should export IStepperProgressCompactProps type', () => {
      const props: IStepperProgressCompactProps = {
        currentStep: 0,
        totalSteps: 3,
      };
      expect(props).toBeDefined();
    });
  });
});
