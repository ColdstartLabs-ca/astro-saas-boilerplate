/**
 * StepperProgress Component
 * Visual progress indicator for multi-step forms
 *
 * Features:
 * - Horizontal step indicators
 * - Current step highlighting
 * - Completed step indicators
 * - Optional step labels
 */

'use client';

import React from 'react';
import { cn } from '@client/utils/cn';

// =============================================================================
// Types
// =============================================================================

export interface IStepperProgressProps {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional step labels */
  stepLabels?: string[];
  /** Whether to show step numbers */
  showNumbers?: boolean;
  /** Additional className for the container */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function StepperProgress({
  currentStep,
  totalSteps,
  stepLabels,
  showNumbers = true,
  className,
}: IStepperProgressProps): JSX.Element {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

        {/* Active Progress Line */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-accent -translate-y-1/2 transition-all duration-300 ease-out"
          style={{
            width: `${(currentStep / (totalSteps - 1)) * 100}%`,
          }}
        />

        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {steps.map(step => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;
            const isUpcoming = step > currentStep;

            return (
              <div key={step} className="flex flex-col items-center gap-2">
                {/* Step Circle */}
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                    isCompleted && 'bg-accent border-accent text-white',
                    isCurrent && 'bg-accent/20 border-accent text-accent ring-4 ring-accent/10',
                    isUpcoming && 'bg-surface border-border text-muted'
                  )}
                >
                  {isCompleted ? (
                    // Checkmark for completed steps
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : showNumbers ? (
                    // Step number
                    <span className="text-sm font-medium">{step + 1}</span>
                  ) : null}
                </div>

                {/* Step Label */}
                {stepLabels && stepLabels[step] && (
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isCurrent && 'text-accent',
                      isCompleted && 'text-accent',
                      isUpcoming && 'text-muted'
                    )}
                  >
                    {stepLabels[step]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
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
