/**
 * OnboardingWizard Component
 * Main wizard container that orchestrates the multi-step onboarding flow
 * Steps 1-5: Project, GSC, Keywords, Integration, Complete
 */

'use client';

import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@client/components/modal/Modal';
import { OnboardingStepperProgress } from './OnboardingStepperProgress';
import { OnboardingStepProject } from './steps/OnboardingStepProject';
import { OnboardingStepGSC } from './steps/OnboardingStepGSC';
import { OnboardingStepKeywords } from './steps/OnboardingStepKeywords';
import { OnboardingStepIntegrations } from './steps/OnboardingStepIntegrations';
import { OnboardingStepComplete } from './steps/OnboardingStepComplete';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useOnboardingStatus } from '@client/hooks/useOnboardingStatus';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingWizardProps {
  /** Whether the wizard modal is open */
  isOpen: boolean;
  /** Callback when wizard is closed */
  onClose: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingWizard({ isOpen, onClose }: IOnboardingWizardProps): JSX.Element | null {
  const { isLoading: isStatusLoading } = useOnboardingStatus();

  const {
    currentStep,
    completedSteps,
    skippedSteps,
    projectId,
    setCurrentStep,
  } = useOnboardingStore();

  // Handle step completion (move to next step)
  const handleStepComplete = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      setCurrentStep(nextStep);
    }
  }, [currentStep, setCurrentStep]);

  // Handle step skip (move to next step for optional steps)
  const handleStepSkip = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      setCurrentStep(nextStep);
    }
  }, [currentStep, setCurrentStep]);

  // Handle going back to previous step
  const handleBack = useCallback(() => {
    const prevStep = currentStep - 1;
    if (prevStep >= OnboardingStep.PROJECT_CREATION) {
      setCurrentStep(prevStep);
    }
  }, [currentStep, setCurrentStep]);

  // Handle wizard close with confirmation
  const handleClose = useCallback(() => {
    // Allow closing only if project is created (step 1 complete)
    // Otherwise, user needs to complete the required step
    if (projectId) {
      onClose();
    } else {
      // Could show a confirmation dialog here
      // For now, just close
      onClose();
    }
  }, [projectId, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Loading state while fetching initial status
  if (isStatusLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="lg" showCloseButton={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Modal>
    );
  }

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return <OnboardingStepProject onComplete={handleStepComplete} />;

      case OnboardingStep.GSC_CONNECTION:
        return (
          <OnboardingStepGSC onComplete={handleStepComplete} onSkip={handleStepSkip} />
        );

      case OnboardingStep.KEYWORDS_UPLOAD:
        return (
          <OnboardingStepKeywords onComplete={handleStepComplete} />
        );

      case OnboardingStep.INTEGRATIONS:
        return (
          <OnboardingStepIntegrations
            onComplete={handleStepComplete}
            onSkip={handleStepSkip}
          />
        );

      case OnboardingStep.COMPLETION:
        return <OnboardingStepComplete onClose={handleClose} />;

      default:
        return <OnboardingStepProject onComplete={handleStepComplete} />;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return 'Create Project';
      case OnboardingStep.GSC_CONNECTION:
        return 'Connect GSC';
      case OnboardingStep.KEYWORDS_UPLOAD:
        return 'Add Keywords';
      case OnboardingStep.INTEGRATIONS:
        return 'Integrations';
      case OnboardingStep.COMPLETION:
        return 'All Done!';
      default:
        return 'Onboarding';
    }
  };

  // Get step subtitle
  const getStepSubtitle = () => {
    return `Step ${currentStep} of ${OnboardingStep.COMPLETION}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      size="lg"
      showCloseButton={currentStep > OnboardingStep.PROJECT_CREATION || !!projectId}
    >
      {/* Stepper Progress */}
      <OnboardingStepperProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        skippedSteps={skippedSteps}
      />

      {/* Step Content */}
      <div className="min-h-[300px]">{renderStep()}</div>

      {/* Back Button (not on first step) */}
      {currentStep > OnboardingStep.PROJECT_CREATION && currentStep < OnboardingStep.COMPLETION && (
        <div className="mt-6 pt-4 border-t border-border/30">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-muted hover:text-secondary transition-colors"
          >
            Back to previous step
          </button>
        </div>
      )}
    </Modal>
  );
}
