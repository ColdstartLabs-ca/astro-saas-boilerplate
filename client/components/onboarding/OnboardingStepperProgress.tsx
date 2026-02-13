/**
 * OnboardingStepperProgress Component
 * Horizontal progress bar showing onboarding steps with mobile-responsive layout
 */

'use client';

import { Check, SkipForward } from 'lucide-react';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepperProgressProps {
  /** Current active step (1-5) */
  currentStep: number;
  /** Set of completed step numbers */
  completedSteps: Set<number>;
  /** Set of skipped step numbers */
  skippedSteps: Set<number>;
}

// =============================================================================
// Constants
// =============================================================================

interface IStepConfig {
  number: number;
  name: string;
  isOptional: boolean;
}

const STEPS: IStepConfig[] = [
  { number: OnboardingStep.PROJECT_CREATION, name: 'Project', isOptional: false },
  { number: OnboardingStep.GSC_CONNECTION, name: 'GSC', isOptional: true },
  { number: OnboardingStep.KEYWORDS_UPLOAD, name: 'Keywords', isOptional: false },
  { number: OnboardingStep.INTEGRATIONS, name: 'Integration', isOptional: true },
  { number: OnboardingStep.COMPLETION, name: 'Complete', isOptional: false },
];

// =============================================================================
// Sub-Components
// =============================================================================

interface IStepIndicatorProps {
  step: IStepConfig;
  isActive: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  isLast: boolean;
}

function StepIndicator({
  step,
  isActive,
  isCompleted,
  isSkipped,
  isLast,
}: IStepIndicatorProps): JSX.Element {
  // Determine the status colors
  const getStepColors = () => {
    if (isCompleted) {
      return {
        circle: 'bg-emerald-500 border-emerald-500',
        text: 'text-white',
        label: 'text-emerald-400',
        connector: 'bg-emerald-500',
      };
    }
    if (isSkipped) {
      return {
        circle: 'bg-amber-500/20 border-amber-500',
        text: 'text-amber-400',
        label: 'text-amber-400',
        connector: 'bg-amber-500/50',
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
  };

  const colors = getStepColors();

  return (
    <div data-testid="stepper-step" className="flex items-center flex-1 last:flex-none">
      {/* Step Circle */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${colors.circle}`}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : isSkipped ? (
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          ) : (
            <span className={`text-sm font-bold ${colors.text}`}>{step.number}</span>
          )}
        </div>

        {/* Step Label - Hidden on very small screens */}
        <span
          className={`hidden sm:block mt-2 text-xs font-medium transition-colors ${colors.label}`}
        >
          {step.name}
          {step.isOptional && !isCompleted && !isSkipped && (
            <span className="text-muted ml-1">(opt)</span>
          )}
        </span>
      </div>

      {/* Connector Line - Not shown for last step */}
      {!isLast && (
        <div
          className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors duration-300 ${colors.connector}`}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepperProgress({
  currentStep,
  completedSteps,
  skippedSteps,
}: IOnboardingStepperProgressProps): JSX.Element {
  return (
    <div data-testid="onboarding-stepper" className="w-full py-3 sm:py-4">
      {/* Desktop/Tablet: Horizontal layout */}
      <div data-testid="stepper-desktop" className="hidden sm:flex items-center justify-center">
        {STEPS.map((step, index) => (
          <StepIndicator
            key={step.number}
            step={step}
            isActive={currentStep === step.number}
            isCompleted={completedSteps.has(step.number)}
            isSkipped={skippedSteps.has(step.number)}
            isLast={index === STEPS.length - 1}
          />
        ))}
      </div>

      {/* Mobile: Compact horizontal layout */}
      <div className="sm:hidden flex items-center justify-center">
        {STEPS.map((step, index) => (
          <StepIndicator
            key={step.number}
            step={step}
            isActive={currentStep === step.number}
            isCompleted={completedSteps.has(step.number)}
            isSkipped={skippedSteps.has(step.number)}
            isLast={index === STEPS.length - 1}
          />
        ))}
      </div>

      {/* Mobile: Current step label below */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-sm font-medium text-accent">
          {STEPS[currentStep - 1]?.name || 'Unknown'}
          {STEPS[currentStep - 1]?.isOptional && (
            <span className="text-muted ml-1">(optional)</span>
          )}
        </span>
      </div>
    </div>
  );
}
