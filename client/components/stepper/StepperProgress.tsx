/**
 * StepperProgress Component
 * Generic, reusable horizontal stepper with circle-connector-label design
 *
 * Features:
 * - Circle indicators with numbered or checkmark states
 * - Connector lines between steps
 * - Active step highlighting with accent color
 * - Completed steps with green checkmark
 * - Mobile-responsive layout
 */

'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@client/utils/cn';

// =============================================================================
// Types
// =============================================================================

export interface IStepConfig {
  /** Display label for this step */
  label: string;
  /** Whether this step should be shown as optional */
  isOptional?: boolean;
}

export interface IStepperProgressProps {
  /** Current step index (0-based) */
  currentStep: number;
  /** Array of step configurations with labels */
  steps: IStepConfig[];
  /** Set of completed step indices (0-based) */
  completedSteps?: Set<number>;
  /** Additional className for the container */
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface IStepIndicatorProps {
  step: IStepConfig;
  stepIndex: number;
  isActive: boolean;
  isCompleted: boolean;
  isLast: boolean;
}

function StepIndicator({
  step,
  stepIndex,
  isActive,
  isCompleted,
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
          className={cn(
            'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300',
            colors.circle
          )}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <span className={cn('text-sm font-bold', colors.text)}>{stepIndex + 1}</span>
          )}
        </div>

        {/* Step Label - Hidden on very small screens */}
        <span
          className={cn('hidden sm:block mt-2 text-xs font-medium transition-colors', colors.label)}
        >
          {step.label}
          {step.isOptional && !isCompleted && <span className="text-muted ml-1">(opt)</span>}
        </span>
      </div>

      {/* Connector Line - Not shown for last step */}
      {!isLast && (
        <div
          className={cn(
            'flex-1 h-0.5 mx-2 sm:mx-4 transition-colors duration-300',
            colors.connector
          )}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StepperProgress({
  currentStep,
  steps,
  completedSteps = new Set(),
  className,
}: IStepperProgressProps): JSX.Element {
  return (
    <div data-testid="stepper-progress" className={cn('w-full py-3 sm:py-4', className)}>
      {/* Desktop/Tablet: Horizontal layout */}
      <div data-testid="stepper-desktop" className="hidden sm:flex items-center justify-center">
        {steps.map((step, index) => (
          <StepIndicator
            key={index}
            step={step}
            stepIndex={index}
            isActive={currentStep === index}
            isCompleted={completedSteps.has(index)}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      {/* Mobile: Compact horizontal layout */}
      <div className="sm:hidden flex items-center justify-center">
        {steps.map((step, index) => (
          <StepIndicator
            key={index}
            step={step}
            stepIndex={index}
            isActive={currentStep === index}
            isCompleted={completedSteps.has(index)}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      {/* Mobile: Current step label below */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-sm font-medium text-accent">
          {steps[currentStep]?.label || 'Unknown'}
          {steps[currentStep]?.isOptional && <span className="text-muted ml-1">(optional)</span>}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Compact Variant (for smaller spaces)
// =============================================================================

export interface IStepperProgressCompactProps {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step label to show (e.g., "Step 2 of 3") */
  stepLabel?: string;
  /** Additional className for the container */
  className?: string;
}

export function StepperProgressCompact({
  currentStep,
  totalSteps,
  stepLabel,
  className,
}: IStepperProgressCompactProps): JSX.Element {
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-secondary">
          {stepLabel || `Step ${currentStep + 1} of ${totalSteps}`}
        </span>
        <span className="text-sm font-medium text-accent">{progress}%</span>
      </div>
      <div className="w-full bg-surface-light h-1 rounded-full overflow-hidden">
        <div
          className="bg-accent h-1 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
