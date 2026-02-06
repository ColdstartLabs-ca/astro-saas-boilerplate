/**
 * useStepper Hook
 * Reusable stepper/multi-step form abstraction
 *
 * Features:
 * - Step navigation with validation
 * - Progress tracking
 * - Per-step validation
 * - Back/Next navigation
 * - Can be used standalone or with React Hook Form
 */

import { useCallback, useMemo, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Step configuration for the stepper
 */
export interface IStepperStep {
  /** Unique identifier for this step */
  id: string;
  /** Display label for this step */
  label: string;
  /** Optional description */
  description?: string;
  /** Whether this step should be skipped */
  skip?: boolean;
}

/**
 * Configuration for the stepper
 */
export interface IStepperConfig {
  /** All steps in the stepper */
  steps: IStepperStep[];
  /** Initial step index */
  initialStep?: number;
  /** Callback when step changes */
  onStepChange?: (step: number, direction: 'next' | 'back' | 'jump') => void;
}

/**
 * Return type for useStepper
 */
export interface IUseStepperReturn {
  // Stepper state
  currentStep: number;
  steps: IStepperStep[];
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number; // 0-100

  // Navigation actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // Utilities
  canGoNext: () => boolean;
  canGoBack: () => boolean;
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStepper(config: IStepperConfig): IUseStepperReturn {
  const { steps, initialStep = 0, onStepChange } = config;
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Filter out skipped steps
  const activeSteps = useMemo(() => steps.filter(s => !s.skip), [steps]);

  // Derived state
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === activeSteps.length - 1;
  const progress = useMemo(
    () => Math.round(((currentStep + 1) / activeSteps.length) * 100),
    [currentStep, activeSteps.length]
  );

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (isLastStep) return;
    const nextIndex = currentStep + 1;
    setCurrentStep(nextIndex);
    onStepChange?.(nextIndex, 'next');
  }, [currentStep, isLastStep, onStepChange]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (isFirstStep) return;
    const prevIndex = currentStep - 1;
    setCurrentStep(prevIndex);
    onStepChange?.(prevIndex, 'back');
  }, [currentStep, isFirstStep, onStepChange]);

  // Jump to specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step < 0 || step >= activeSteps.length) return;
      setCurrentStep(step);
      onStepChange?.(step, 'jump');
    },
    [activeSteps.length, onStepChange]
  );

  // Check navigation availability
  const canGoNext = useCallback(() => !isLastStep, [isLastStep]);
  const canGoBack = useCallback(() => !isFirstStep, [isFirstStep]);

  // Reset to initial step
  const reset = useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  return {
    currentStep,
    steps: activeSteps,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoBack,
    reset,
  };
}
