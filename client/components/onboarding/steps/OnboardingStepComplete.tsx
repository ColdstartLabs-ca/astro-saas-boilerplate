/**
 * OnboardingStepComplete Component
 * Step 5 of onboarding: Success screen with setup summary
 * Auto-shown when all required steps are done
 */

'use client';

import { useState, useCallback } from 'react';
import { Loader2, CheckCircle2, SkipForward, Rocket, ArrowRight } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import { OnboardingStep } from '@shared/types/onboarding.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepCompleteProps {
  /** Callback when user clicks "Go to Dashboard" */
  onClose: () => void;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ISummaryItemProps {
  label: string;
  value: string;
  isCompleted: boolean;
  isSkipped: boolean;
}

function SummaryItem({ label, value, isCompleted, isSkipped }: ISummaryItemProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2">
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      ) : isSkipped ? (
        <SkipForward className="w-5 h-5 text-amber-400 flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{label}</span>
      </div>
      <span
        className={`text-xs font-medium ${
          isCompleted ? 'text-emerald-400' : isSkipped ? 'text-amber-400' : 'text-muted'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepComplete({ onClose }: IOnboardingStepCompleteProps): JSX.Element {
  const [isCompleting, setIsCompleting] = useState(false);

  const { completedSteps, skippedSteps, keywordCount } = useOnboardingStore();
  const { markComplete } = useOnboardingProgress();

  const handleGoToDashboard = useCallback(async () => {
    setIsCompleting(true);
    try {
      await markComplete();
      onClose();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      // Still redirect even if marking complete fails
      onClose();
    }
  }, [markComplete, onClose]);

  const isProjectComplete = completedSteps.has(OnboardingStep.PROJECT_CREATION);
  const isGscComplete = completedSteps.has(OnboardingStep.GSC_CONNECTION);
  const isGscSkipped = skippedSteps.has(OnboardingStep.GSC_CONNECTION);
  const isKeywordsComplete = completedSteps.has(OnboardingStep.KEYWORDS_UPLOAD);
  const isIntegrationsComplete = completedSteps.has(OnboardingStep.INTEGRATIONS);
  const isIntegrationsSkipped = skippedSteps.has(OnboardingStep.INTEGRATIONS);

  return (
    <div className="space-y-4">
      {/* Setup Summary */}
      <div className="bg-surface border border-border rounded-xl p-5 divide-y divide-border/50">
        <SummaryItem
          label="Project"
          value={isProjectComplete ? 'Created' : 'Pending'}
          isCompleted={isProjectComplete}
          isSkipped={false}
        />
        <SummaryItem
          label="Google Search Console"
          value={isGscComplete ? 'Connected' : isGscSkipped ? 'Skipped' : 'Pending'}
          isCompleted={isGscComplete}
          isSkipped={isGscSkipped}
        />
        <SummaryItem
          label="Keywords"
          value={isKeywordsComplete ? `${keywordCount} uploaded` : 'Pending'}
          isCompleted={isKeywordsComplete}
          isSkipped={false}
        />
        <SummaryItem
          label="CMS Integration"
          value={
            isIntegrationsComplete ? 'Connected' : isIntegrationsSkipped ? 'Skipped' : 'Pending'
          }
          isCompleted={isIntegrationsComplete}
          isSkipped={isIntegrationsSkipped}
        />
      </div>

      {/* Skipped Steps Note */}
      {(isGscSkipped || isIntegrationsSkipped) && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <p className="text-xs text-secondary">
            <strong className="text-amber-400">Reminder:</strong> You skipped some optional steps.
            You can always set these up later from the Dashboard settings.
          </p>
        </div>
      )}

      {/* What's Next */}
      <div className="bg-accent/5 border border-accent/10 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">What&apos;s Next?</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-xs text-secondary">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
            <span>Start generating articles from your campaign keywords</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-secondary">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
            <span>Review and publish generated content to your site</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-secondary">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-accent flex-shrink-0" />
            <span>Track performance with campaign analytics</span>
          </li>
        </ul>
      </div>

      {/* CTA Button */}
      <div className="pt-2">
        <DashboardButton
          type="button"
          onClick={handleGoToDashboard}
          className="w-full shadow-lg shadow-accent/20"
          disabled={isCompleting}
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finishing up...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </>
          )}
        </DashboardButton>
      </div>
    </div>
  );
}
