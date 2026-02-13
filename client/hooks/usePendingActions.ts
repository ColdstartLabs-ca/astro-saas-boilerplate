/**
 * usePendingActions Hook
 *
 * Tracks pending actions for users who completed onboarding.
 * Shows indicators on dashboard tabs when action is needed.
 *
 * Features:
 * - Reads onboarding state from Zustand store (synced from API by useOnboardingStatus)
 * - Checks actual campaign count via useCampaigns (React Query cached)
 * - Checks if user skipped integrations step
 * - Provides computed state for UI indicators
 */

import { useOnboardingStore } from '@client/store/onboardingStore';
import { useProjectStore } from '@client/store/projectStore';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { OnboardingStep } from '@shared/types/onboarding.types';

export interface IPendingActions {
  /** Whether user has created at least one campaign */
  hasCampaigns: boolean;
  /** Whether integrations step was skipped during onboarding */
  skippedIntegrations: boolean;
  /** Whether onboarding is complete */
  isOnboardingComplete: boolean;
  /** Whether any pending actions exist */
  hasPendingActions: boolean;
}

/**
 * Hook to determine pending actions for dashboard navigation
 */
export function usePendingActions(): IPendingActions {
  // Get onboarding state (synced from API by useOnboardingStatus in DashboardRouter)
  const skippedSteps = useOnboardingStore(state => state.skippedSteps);
  const completedSteps = useOnboardingStore(state => state.completedSteps);

  // Check if integrations step was skipped (step 4)
  const skippedIntegrations = skippedSteps.has(OnboardingStep.INTEGRATIONS);

  // Onboarding is complete if completion step (5) is completed
  const isOnboardingComplete = completedSteps.has(OnboardingStep.COMPLETION);

  // Check actual campaign count from the active project (React Query cached)
  const { activeProjectId } = useProjectStore();
  const { campaigns } = useCampaigns(activeProjectId);
  const hasCampaigns = campaigns.length > 0;

  // Any pending actions exist
  const hasPendingActions = isOnboardingComplete && (!hasCampaigns || skippedIntegrations);

  return {
    hasCampaigns,
    skippedIntegrations,
    isOnboardingComplete,
    hasPendingActions,
  };
}
