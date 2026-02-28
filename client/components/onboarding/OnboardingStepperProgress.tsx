/**
 * OnboardingStepperProgress Component
 * Visual step indicator for the onboarding wizard
 *
 * Features:
 * - 6 hardcoded onboarding steps
 * - Skipped-step styling (amber color)
 * - Optional step labels
 */

'use client';

import { useMemo } from 'react';
import { SkipForward, Check } from 'lucide-react';
import { cn } from '@client/utils/cn';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepperProgressProps {
  /** Current active step (1-6) */
  currentStep: number;
  /** Set of completed step numbers */
  completedSteps: Set<number>;
  /** Set of skipped step numbers */
  skippedSteps: Set<number>;
}

// =============================================================================
// Constants
// =============================================================================

interface IOnboardingStepConfig {
  number: number;
  label?: string;
  isOptional?: boolean;
}

const ONBOARDING_STEPS: IOnboardingStepConfig[] = [
  { number: OnboardingStep.PROJECT_CREATION, label: 'Project', isOptional: false },
  { number: OnboardingStep.GSC_CONNECTION, label: 'GSC', isOptional: true },
  { number: OnboardingStep.KEYWORDS_UPLOAD, label: 'Keywords', isOptional: false },
  { number: OnboardingStep.PREFERENCES, label: 'Style', isOptional: true },
  { number: OnboardingStep.INTEGRATIONS, label: 'CMS', isOptional: true },
  { number: OnboardingStep.COMPLETION, label: 'Complete', isOptional: false },
];

// =============================================================================
// Skipped Step Indicator (internal component)
// =============================================================================

interface ISkippedStepIndicatorProps {
  step: IOnboardingStepConfig;
  isLast: boolean;
}

function SkippedStepIndicator({ step, isLast }: ISkippedStepIndicatorProps): JSX.Element {
  return (
    <div data-testid="stepper-step" className="flex items-center flex-1 last:flex-none">
      {/* Step Circle */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300',
            'bg-amber-500/20 border-amber-500'
          )}
        >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        </div>

        {/* Step Label - Hidden on very small screens */}
        <span className="hidden sm:block mt-2 text-xs font-medium text-amber-400">
          {step.label}
        </span>
      </div>

      {/* Connector Line - Not shown for last step */}
      {!isLast && <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-amber-500/50" />}
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

interface IStepColors {
  circle: string;
  text: string;
  label: string;
  connector: string;
}

/**
 * Get color classes for a step based on its state
 */
function getStepColors(isCompleted: boolean, isActive: boolean): IStepColors {
  if (isCompleted) {
    return {
      circle: 'bg-emerald-500 border-emerald-500',
      text: 'text-white',
      label: 'text-emerald-400',
      connector: 'bg-emerald-500',
    };
  }
  if (isActive) {
    return {
      circle: 'bg-accent border-accent',
      text: 'text-white',
      label: 'text-accent',
      connector: 'bg-border',
    };
  }
  return {
    circle: 'bg-surface-light border-border',
    text: 'text-muted',
    label: 'text-muted',
    connector: 'bg-border',
  };
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepperProgress({
  currentStep,
  completedSteps,
  skippedSteps,
}: IOnboardingStepperProgressProps): JSX.Element {
  // Validate and clamp currentStep to valid range
  const clampedStep = Math.max(1, Math.min(currentStep, ONBOARDING_STEPS.length));

  // Convert 1-based currentStep to 0-based index for generic stepper
  const currentStepIndex = clampedStep - 1;

  // Memoize the conversion of 1-based step numbers to 0-based indices
  const { completedIndices, skippedIndices } = useMemo(() => {
    const completed = new Set<number>();
    const skipped = new Set<number>();
    ONBOARDING_STEPS.forEach((step, index) => {
      if (completedSteps.has(step.number)) {
        completed.add(index);
      }
      if (skippedSteps.has(step.number)) {
        skipped.add(index);
      }
    });
    return { completedIndices: completed, skippedIndices: skipped };
  }, [completedSteps, skippedSteps]);

  return (
    <div data-testid="onboarding-stepper" className="w-full py-3 sm:py-4">
      {/* Desktop/Tablet: Horizontal layout */}
      <div data-testid="stepper-desktop" className="hidden sm:flex items-center justify-center">
        {ONBOARDING_STEPS.map((step, index) => {
          const isSkipped = skippedIndices.has(index);

          if (isSkipped) {
            return (
              <SkippedStepIndicator
                key={step.number}
                step={step}
                isLast={index === ONBOARDING_STEPS.length - 1}
              />
            );
          }

          // For non-skipped steps, we need to render with the generic styling
          // but integrate with the skipped steps visually
          const isCompleted = completedIndices.has(index);
          const isActive = currentStepIndex === index;
          const isLast = index === ONBOARDING_STEPS.length - 1;

          const colors = getStepColors(isCompleted, isActive);

          return (
            <div
              key={step.number}
              data-testid="stepper-step"
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                    colors.circle
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <span className={cn('text-sm font-bold', colors.text)}>{step.number}</span>
                  )}
                </div>

                {/* Step Label */}
                <span className={cn('hidden sm:block mt-2 text-xs font-medium', colors.label)}>
                  {step.label}
                  {step.isOptional && !isCompleted && (
                    <span className="text-muted ml-1">(opt)</span>
                  )}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && <div className={cn('flex-1 h-0.5 mx-2 sm:mx-4', colors.connector)} />}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact horizontal layout */}
      <div className="sm:hidden flex items-center justify-center">
        {ONBOARDING_STEPS.map((step, index) => {
          const isSkipped = skippedIndices.has(index);

          if (isSkipped) {
            return (
              <SkippedStepIndicator
                key={step.number}
                step={step}
                isLast={index === ONBOARDING_STEPS.length - 1}
              />
            );
          }

          const isCompleted = completedIndices.has(index);
          const isActive = currentStepIndex === index;
          const isLast = index === ONBOARDING_STEPS.length - 1;

          const colors = getStepColors(isCompleted, isActive);

          return (
            <div
              key={step.number}
              data-testid="stepper-step"
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                    colors.circle
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <span className={cn('text-sm font-bold', colors.text)}>{step.number}</span>
                  )}
                </div>
              </div>
              {!isLast && <div className="flex-1 h-0.5 mx-2 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Mobile: Current step label below */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-sm font-medium text-accent">
          {ONBOARDING_STEPS[currentStepIndex]?.label || 'Unknown'}
          {ONBOARDING_STEPS[currentStepIndex]?.isOptional && (
            <span className="text-muted ml-1">(optional)</span>
          )}
        </span>
      </div>
    </div>
  );
}
