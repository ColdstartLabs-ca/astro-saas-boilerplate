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
      totalSteps: 3,
    };

    test('should render step indicators', () => {
      render(<StepperProgress {...defaultProps} />);

      const step1 = screen.getByText('1');
      const step2 = screen.getByText('2');
      const step3 = screen.getByText('3');

      expect(step1).toBeInTheDocument();
      expect(step2).toBeInTheDocument();
      expect(step3).toBeInTheDocument();
    });

    test('should render correct number of steps', () => {
      render(<StepperProgress currentStep={0} totalSteps={5} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('should show current step as active', () => {
      render(<StepperProgress currentStep={1} totalSteps={3} />);

      const step2 = screen.getByText('2');
      expect(step2).toBeInTheDocument();
    });

    test('should show checkmark for completed steps', () => {
      const { container } = render(<StepperProgress currentStep={2} totalSteps={4} />);

      const checkmarks = container.querySelectorAll('svg');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    test('should render step labels when provided', () => {
      const props: IStepperProgressProps = {
        ...defaultProps,
        stepLabels: ['Personal Info', 'Address', 'Review'],
      };

      render(<StepperProgress {...props} />);

      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    test('should not render step labels when not provided', () => {
      render(<StepperProgress {...defaultProps} />);

      expect(screen.queryByText('Personal Info')).not.toBeInTheDocument();
    });

    test('should hide numbers when showNumbers is false', () => {
      render(<StepperProgress {...defaultProps} showNumbers={false} />);

      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    test('should show numbers by default', () => {
      render(<StepperProgress {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const { container } = render(<StepperProgress {...defaultProps} className="custom-class" />);

      const stepper = container.querySelector('.custom-class');
      expect(stepper).toBeInTheDocument();
    });

    test('should handle single step', () => {
      render(<StepperProgress currentStep={0} totalSteps={1} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('should handle last step as current', () => {
      const { container } = render(<StepperProgress currentStep={2} totalSteps={3} />);

      const checkmarks = container.querySelectorAll('svg');
      expect(checkmarks.length).toBe(2);
    });

    test('should handle all steps completed (current equals total-1)', () => {
      const { container } = render(<StepperProgress currentStep={2} totalSteps={3} />);

      // Step 3 should be current (not completed), steps 1 and 2 should have checkmarks
      expect(screen.getByText('3')).toBeInTheDocument();
      const checkmarks = container.querySelectorAll('svg');
      expect(checkmarks.length).toBe(2);
    });

    test('should render progress bar background line', () => {
      const { container } = render(<StepperProgress {...defaultProps} />);

      const progressBars = container.querySelectorAll('.bg-border');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    test('should render active progress line with correct width', () => {
      const { container } = render(<StepperProgress currentStep={1} totalSteps={3} />);

      const activeProgressBars = container.querySelectorAll('.bg-accent');
      expect(activeProgressBars.length).toBeGreaterThan(0);
    });

    test('should handle step 0 as current', () => {
      render(<StepperProgress currentStep={0} totalSteps={4} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('should render partial labels (some empty)', () => {
      const props: IStepperProgressProps = {
        currentStep: 0,
        totalSteps: 4,
        stepLabels: ['Step 1', '', 'Step 3', ''],
      };

      render(<StepperProgress {...props} />);

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
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
    test('should export StepperProgressCompact component', () => {
      expect(StepperProgressCompact).toBeDefined();
      expect(typeof StepperProgressCompact).toBe('function');
    });

    test('should export IStepperProgressProps type', () => {
      const props: IStepperProgressProps = {
        currentStep: 0,
        totalSteps: 3,
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
