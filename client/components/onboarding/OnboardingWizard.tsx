/**
 * OnboardingWizard Component
 * Main wizard container that orchestrates the multi-step onboarding flow
 * Steps 1-5: Project, GSC, Keywords, Integration, Complete
 *
 * Supports two modes:
 * - Initial onboarding (default): synced with DB, dismissible
 * - New project setup (isNewProject=true): local state, resets on open, not dismissible
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, FolderPlus, Search, FileText, Plug, Rocket } from 'lucide-react';
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
  /**
   * When true, runs a fresh new-project setup flow:
   * - Starts at step 1 regardless of DB state
   * - Uses local step state (does not affect DB-synced store step)
   * - Close does not set the "dismissed" flag
   */
  isNewProject?: boolean;
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingWizard({
  isOpen,
  onClose,
  isNewProject = false,
}: IOnboardingWizardProps): JSX.Element | null {
  // Local state used only in new-project mode so DB-synced store doesn't interfere
  const [localStep, setLocalStep] = useState<number>(OnboardingStep.PROJECT_CREATION);
  const [localSkipped, setLocalSkipped] = useState<Set<number>>(new Set());

  const { isLoading: isStatusLoading } = useOnboardingStatus();

  const { currentStep: storeStep, completedSteps, skippedSteps, setCurrentStep, dismiss } =
    useOnboardingStore();

  // Which step is active depends on mode
  const currentStep = isNewProject ? localStep : storeStep;

  // Reset local state each time the new-project modal opens
  useEffect(() => {
    if (isOpen && isNewProject) {
      setLocalStep(OnboardingStep.PROJECT_CREATION);
      setLocalSkipped(new Set());
    }
  }, [isOpen, isNewProject]);

  // In initial mode, auto-advance to the first incomplete step when the wizard opens.
  // This avoids showing a completed step if the user re-opens after partial progress.
  useEffect(() => {
    if (!isOpen || isNewProject || isStatusLoading) return;
    const firstIncomplete = ([1, 2, 3, 4] as const).find(
      step => !completedSteps.has(step) && !skippedSteps.has(step)
    );
    if (firstIncomplete != null && firstIncomplete !== storeStep) {
      setCurrentStep(firstIncomplete);
    }
  }, [isOpen, isNewProject, isStatusLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ intentionally only runs when open/mode/loading change, not on every step change

  // Advance to next step
  const handleStepComplete = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      if (isNewProject) {
        setLocalStep(nextStep);
      } else {
        setCurrentStep(nextStep);
      }
    }
  }, [currentStep, isNewProject, setCurrentStep]);

  // Skip current step (optional steps only)
  const handleStepSkip = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      if (isNewProject) {
        setLocalSkipped(prev => new Set([...prev, currentStep]));
        setLocalStep(nextStep);
      } else {
        setCurrentStep(nextStep);
      }
    }
  }, [currentStep, isNewProject, setCurrentStep]);

  // Go back one step
  const handleBack = useCallback(() => {
    const prevStep = currentStep - 1;
    if (prevStep >= OnboardingStep.PROJECT_CREATION) {
      if (isNewProject) {
        setLocalStep(prevStep);
      } else {
        setCurrentStep(prevStep);
      }
    }
  }, [currentStep, isNewProject, setCurrentStep]);

  // Close: only dismiss initial onboarding (not new-project flow)
  const handleClose = useCallback(() => {
    if (!isNewProject) {
      dismiss();
    }
    onClose();
  }, [isNewProject, dismiss, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // In initial mode, show spinner while fetching DB status
  if (isStatusLoading && !isNewProject) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="xl" showCloseButton={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Modal>
    );
  }

  // Derive display progress for stepper
  const displayCompletedSteps = isNewProject
    ? new Set(
        Array.from({ length: localStep - 1 }, (_, i) => i + 1).filter(s => !localSkipped.has(s))
      )
    : completedSteps;
  const displaySkippedSteps = isNewProject ? localSkipped : skippedSteps;

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return <OnboardingStepProject onComplete={handleStepComplete} />;

      case OnboardingStep.GSC_CONNECTION:
        return <OnboardingStepGSC onComplete={handleStepComplete} onSkip={handleStepSkip} />;

      case OnboardingStep.KEYWORDS_UPLOAD:
        return <OnboardingStepKeywords onComplete={handleStepComplete} />;

      case OnboardingStep.INTEGRATIONS:
        return (
          <OnboardingStepIntegrations onComplete={handleStepComplete} onSkip={handleStepSkip} />
        );

      case OnboardingStep.COMPLETION:
        return <OnboardingStepComplete onClose={handleClose} />;

      default:
        return <OnboardingStepProject onComplete={handleStepComplete} />;
    }
  };

  // Step icon
  const getStepIcon = () => {
    const iconMap: Record<number, { Icon: typeof FolderPlus; bg: string; color: string }> = {
      [OnboardingStep.PROJECT_CREATION]: {
        Icon: FolderPlus,
        bg: 'bg-accent/10',
        color: 'text-accent',
      },
      [OnboardingStep.GSC_CONNECTION]: { Icon: Search, bg: 'bg-primary/10', color: 'text-primary' },
      [OnboardingStep.KEYWORDS_UPLOAD]: {
        Icon: FileText,
        bg: 'bg-accent/10',
        color: 'text-accent',
      },
      [OnboardingStep.INTEGRATIONS]: { Icon: Plug, bg: 'bg-primary/10', color: 'text-primary' },
      [OnboardingStep.COMPLETION]: {
        Icon: Rocket,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-400',
      },
    };
    const config = iconMap[currentStep];
    if (!config) return undefined;
    const { Icon, bg, color } = config;
    return (
      <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    );
  };

  // Step title — "Add New Project" in new-project mode, otherwise initial onboarding titles
  const getStepTitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return isNewProject ? 'Add New Project' : 'Add Your First Project';
      case OnboardingStep.GSC_CONNECTION:
        return 'Connect Google Search Console';
      case OnboardingStep.KEYWORDS_UPLOAD:
        return 'Add Your Keywords';
      case OnboardingStep.INTEGRATIONS:
        return 'Connect Your CMS';
      case OnboardingStep.COMPLETION:
        return isNewProject ? 'Project Ready!' : "You're All Set!";
      default:
        return 'Onboarding';
    }
  };

  // Step subtitle
  const getStepSubtitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return 'Create a project and tell us about your website.';
      case OnboardingStep.GSC_CONNECTION:
        return 'Link your Google Search Console account to discover keyword opportunities from your actual search data.';
      case OnboardingStep.KEYWORDS_UPLOAD:
        return "Enter the keywords you want to target. We'll create your first campaign with these keywords.";
      case OnboardingStep.INTEGRATIONS:
        return 'Set content preferences and connect your CMS.';
      case OnboardingStep.COMPLETION:
        return isNewProject
          ? "Your new project is set up. Here's a summary of what was configured."
          : "Your workspace is ready. Here's a summary of what was set up.";
      default:
        return `Step ${currentStep} of ${OnboardingStep.COMPLETION}`;
    }
  };

  const showBackButton =
    currentStep > OnboardingStep.PROJECT_CREATION && currentStep < OnboardingStep.COMPLETION;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      icon={getStepIcon()}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      size="xl"
      showCloseButton={true}
      footer={
        showBackButton ? (
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-muted hover:text-secondary transition-colors"
          >
            Back to previous step
          </button>
        ) : undefined
      }
    >
      {/* Stepper Progress */}
      <OnboardingStepperProgress
        currentStep={currentStep}
        completedSteps={displayCompletedSteps}
        skippedSteps={displaySkippedSteps}
      />

      {/* Step Content */}
      <div>{renderStep()}</div>
    </Modal>
  );
}
