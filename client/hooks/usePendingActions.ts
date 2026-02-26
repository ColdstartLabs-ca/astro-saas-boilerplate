/**
 * usePendingActions Hook
 *
 * Tracks pending actions for users who have set up a project.
 * Shows indicators on dashboard tabs when action is needed.
 *
 * Features:
 * - Derives onboarding completion from actual projects count
 * - Checks actual campaign count via useCampaigns (React Query cached)
 * - Checks if user has any integrations set up
 * - Provides computed state for UI indicators
 */

import { useProjectStore } from '@client/store/projectStore';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { useIntegrations } from '@client/hooks/useIntegrations';

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
  // Onboarding is considered complete when the user has at least one project
  const { projects } = useProjects();
  const isOnboardingComplete = projects.length > 0;

  // Check if user has set up any integrations
  const { integrations } = useIntegrations();
  const skippedIntegrations = integrations.length === 0;

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
