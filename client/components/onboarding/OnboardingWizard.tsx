/**
 * OnboardingWizard Component
 * Main wizard container that orchestrates the multi-step onboarding flow.
 * Steps 1–6: Project, GSC, Keywords, Preferences, Integration, Complete.
 *
 * The wizard is always ephemeral — it always starts at step 1 and uses
 * local React state for navigation. No DB progress is tracked.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderPlus, Search, FileText, SlidersHorizontal, Plug, Rocket } from 'lucide-react';
import { Modal } from '@client/components/modal/Modal';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { OnboardingStepperProgress } from './OnboardingStepperProgress';
import { OnboardingStepProject } from './steps/OnboardingStepProject';
import { OnboardingStepGSC } from './steps/OnboardingStepGSC';
import { OnboardingStepKeywords } from './steps/OnboardingStepKeywords';
import { OnboardingStepPreferences } from './steps/OnboardingStepPreferences';
import { OnboardingStepIntegrations } from './steps/OnboardingStepIntegrations';
import { OnboardingStepComplete } from './steps/OnboardingStepComplete';
import { useOnboardingStore } from '@client/store/onboardingStore';
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
  const [currentStep, setCurrentStep] = useState<number>(OnboardingStep.PROJECT_CREATION);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const { reset } = useOnboardingStore();

  // Reset to step 1 and clear inter-step store data each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(OnboardingStep.PROJECT_CREATION);
      setCompletedSteps(new Set());
      setSkippedSteps(new Set());
      reset();
    }
  }, [isOpen, reset]);

  // Advance to next step and mark current as completed
  const handleStepComplete = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(nextStep);
    }
  }, [currentStep]);

  // Skip current optional step
  const handleStepSkip = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= OnboardingStep.COMPLETION) {
      setSkippedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(nextStep);
    }
  }, [currentStep]);

  // Go back one step — confirm before losing unsaved data
  const handleBack = useCallback(() => {
    setShowBackConfirm(true);
  }, []);

  const confirmGoBack = useCallback(() => {
    const prevStep = currentStep - 1;
    if (prevStep >= OnboardingStep.PROJECT_CREATION) {
      setCurrentStep(prevStep);
    }
    setShowBackConfirm(false);
  }, [currentStep]);

  if (!isOpen) return null;

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return <OnboardingStepProject onComplete={handleStepComplete} />;

      case OnboardingStep.GSC_CONNECTION:
        return <OnboardingStepGSC onComplete={handleStepComplete} onSkip={handleStepSkip} />;

      case OnboardingStep.KEYWORDS_UPLOAD:
        return <OnboardingStepKeywords onComplete={handleStepComplete} />;

      case OnboardingStep.PREFERENCES:
        return (
          <OnboardingStepPreferences onComplete={handleStepComplete} onSkip={handleStepSkip} />
        );

      case OnboardingStep.INTEGRATIONS:
        return (
          <OnboardingStepIntegrations onComplete={handleStepComplete} onSkip={handleStepSkip} />
        );

      case OnboardingStep.COMPLETION:
        return (
          <OnboardingStepComplete
            onClose={onClose}
            completedSteps={completedSteps}
            skippedSteps={skippedSteps}
          />
        );

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
      [OnboardingStep.PREFERENCES]: {
        Icon: SlidersHorizontal,
        bg: 'bg-purple-500/10',
        color: 'text-purple-400',
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

  const getStepTitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return 'Add Your Project';
      case OnboardingStep.GSC_CONNECTION:
        return 'Connect Google Search Console';
      case OnboardingStep.KEYWORDS_UPLOAD:
        return 'Add Your Keywords';
      case OnboardingStep.PREFERENCES:
        return 'Content Preferences';
      case OnboardingStep.INTEGRATIONS:
        return 'Connect Your CMS';
      case OnboardingStep.COMPLETION:
        return 'Project Ready!';
      default:
        return 'Setup';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROJECT_CREATION:
        return 'Create a project and tell us about your website.';
      case OnboardingStep.GSC_CONNECTION:
        return 'Link your Google Search Console account to discover keyword opportunities from your actual search data.';
      case OnboardingStep.KEYWORDS_UPLOAD:
        return "Enter the keywords you want to target. We'll create your first campaign with these keywords.";
      case OnboardingStep.PREFERENCES:
        return 'Set defaults for your generated articles. You can customize these anytime.';
      case OnboardingStep.INTEGRATIONS:
        return 'Connect your CMS to auto-publish articles directly to your site.';
      case OnboardingStep.COMPLETION:
        return "Your project is set up. Here's a summary of what was configured.";
      default:
        return `Step ${currentStep} of ${OnboardingStep.COMPLETION}`;
    }
  };

  const showBackButton =
    currentStep > OnboardingStep.PROJECT_CREATION && currentStep < OnboardingStep.COMPLETION;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={getStepIcon()}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      size="xl"
      showCloseButton={true}
      preventClose
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
        completedSteps={completedSteps}
        skippedSteps={skippedSteps}
      />

      {/* Step Content */}
      <div>{renderStep()}</div>

      {/* Back Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={confirmGoBack}
        title="Go Back?"
        message="Going back will lose any unsaved changes on this step. Continue?"
        variant="warning"
        labels={{ confirm: 'Go Back', cancel: 'Stay Here' }}
      />
    </Modal>
  );
}
