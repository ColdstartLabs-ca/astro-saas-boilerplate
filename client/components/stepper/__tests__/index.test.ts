import { describe, test, expect } from 'vitest';
import {
  StepperProgress,
  StepperProgressCompact,
  type IStepperProgressProps,
  type IStepperProgressCompactProps,
} from '@client/components/stepper';

describe('Stepper Index Exports', () => {
  describe('component exports', () => {
    test('should export StepperProgress component', () => {
      expect(StepperProgress).toBeDefined();
      expect(typeof StepperProgress).toBe('function');
    });

    test('should export StepperProgressCompact component', () => {
      expect(StepperProgressCompact).toBeDefined();
      expect(typeof StepperProgressCompact).toBe('function');
    });
  });

  describe('type exports', () => {
    test('should export IStepperProgressProps type', () => {
      const props: IStepperProgressProps = {
        currentStep: 0,
        totalSteps: 3,
      };
      expect(props).toBeDefined();
      expect(typeof props.currentStep).toBe('number');
      expect(typeof props.totalSteps).toBe('number');
    });

    test('should export IStepperProgressCompactProps type', () => {
      const props: IStepperProgressCompactProps = {
        currentStep: 0,
        totalSteps: 3,
      };
      expect(props).toBeDefined();
      expect(typeof props.currentStep).toBe('number');
      expect(typeof props.totalSteps).toBe('number');
    });

    test('should allow optional properties on IStepperProgressProps', () => {
      const minimalProps: IStepperProgressProps = {
        currentStep: 1,
        totalSteps: 5,
      };
      expect(minimalProps).toBeDefined();

      const fullProps: IStepperProgressProps = {
        currentStep: 1,
        totalSteps: 5,
        stepLabels: ['One', 'Two', 'Three', 'Four', 'Five'],
        showNumbers: true,
        className: 'custom-class',
      };
      expect(fullProps).toBeDefined();
      expect(fullProps.stepLabels).toBeDefined();
      expect(fullProps.showNumbers).toBe(true);
      expect(fullProps.className).toBe('custom-class');
    });

    test('should allow optional properties on IStepperProgressCompactProps', () => {
      const minimalProps: IStepperProgressCompactProps = {
        currentStep: 0,
        totalSteps: 1,
      };
      expect(minimalProps).toBeDefined();

      const fullProps: IStepperProgressCompactProps = {
        currentStep: 0,
        totalSteps: 1,
        stepLabel: 'Custom Step Label',
        className: 'custom-class',
      };
      expect(fullProps).toBeDefined();
      expect(fullProps.stepLabel).toBe('Custom Step Label');
      expect(fullProps.className).toBe('custom-class');
    });
  });

  describe('export structure', () => {
    test('should have consistent export naming', () => {
      const componentNames = ['StepperProgress', 'StepperProgressCompact'];
      const typeNames = ['IStepperProgressProps', 'IStepperProgressCompactProps'];

      componentNames.forEach(name => {
        expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });

      typeNames.forEach(name => {
        expect(name).toMatch(/^I[A-Z][a-zA-Z0-9]*$/);
      });
    });
  });
});
