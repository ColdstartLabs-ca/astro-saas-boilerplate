/**
 * Project Onboarding Wizard
 * 3-step modal for creating a new project
 *
 * Features:
 * - React Hook Form + Zod validation
 * - Reuseable stepper abstraction
 * - Composed step components
 * - SRP - each component has a single responsibility
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Loader2 } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import { Button } from '@client/components/ui/Button';
import { StepperProgressCompact } from '@client/components/stepper';
import {
  BasicInfoStep,
  PlatformSelectionStep,
  ContentPreferencesStep,
} from '@client/components/projects/onboarding';
import { useProjectOnboarding } from '@client/hooks/useProjectOnboarding';

// =============================================================================
// Types
// =============================================================================

export interface IProjectOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectOnboarding({
  isOpen,
  onClose,
}: IProjectOnboardingProps): JSX.Element | null {
  const { form, stepper, nextStep, prevStep, submit, isSubmitting, error, clearError } =
    useProjectOnboarding();

  // Reset form and stepper when modal closes
  const wasOpenRef = useRef(false);
   
  useEffect(() => {
    // Only reset when transitioning from open -> closed
    if (wasOpenRef.current && !isOpen) {
      stepper.reset();
      form.reset();
      clearError();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Handle next/submit button
  const handleNextOrSubmit = async () => {
    clearError();
    if (stepper.isLastStep) {
      await submit();
      onClose();
    } else {
      await nextStep();
    }
  };

  // Check if current step is valid (for button disabled state)
  const canProceed = () => {
    const { currentStep } = stepper;
    if (currentStep === 0) {
      return form.watch('name')?.trim().length > 0;
    }
    return true; // Other steps have defaults
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-onboarding-title"
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-elevated/30 rounded-t-2xl">
          <div>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <h2 id="project-onboarding-title" className="text-xl font-bold text-white">Create New Project</h2>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <p className="text-secondary text-sm mt-1">
              Step {stepper.currentStep + 1} of {stepper.steps.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-white p-2 hover:bg-surface-light rounded-full transition-colors"
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <StepperProgressCompact
            currentStep={stepper.currentStep}
            totalSteps={stepper.steps.length}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form Body */}
        <FormProvider {...form}>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleNextOrSubmit();
            }}
            className="p-8 overflow-y-auto flex-1"
          >
            {/* Step 1: Basic Info */}
            {stepper.currentStep === 0 && <BasicInfoStep />}

            {/* Step 2: Platform Selection */}
            {stepper.currentStep === 1 && <PlatformSelectionStep />}

            {/* Step 3: Content Preferences */}
            {stepper.currentStep === 2 && <ContentPreferencesStep />}
          </form>
        </FormProvider>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between bg-elevated/30 rounded-b-2xl">
          <Button
            variant="ghost"
            onClick={stepper.isFirstStep ? handleClose : prevStep}
            disabled={isSubmitting}
          >
            { }
            {stepper.isFirstStep ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={handleNextOrSubmit}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                { }
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
              </>
            ) : stepper.isLastStep ? (
              <>
                { }
                Complete Setup <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                { }
                Next Step <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
