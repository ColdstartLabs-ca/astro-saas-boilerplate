/**
 * useOnboardingStatus Hook
 * React hook for fetching user onboarding status with React Query
 *
 * Features:
 * - Fetch onboarding status from API
 * - Auto-sync with Zustand store
 * - Caching with React Query
 * - Loading and error states
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import type { IOnboardingStatus, IOnboardingStatusResponse } from '@shared/types/onboarding.types';
import { useUserStore } from '@client/store/userStore';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { apiFetch } from '@client/utils/api-client';
import { useLogger } from '@client/utils/logger';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch onboarding status from API
 */
async function fetchOnboardingStatus(): Promise<IOnboardingStatus> {
  const data = await apiFetch<{ data: IOnboardingStatusResponse }>('/api/onboarding/status', {
    method: 'GET',
  });
  return data.data.onboarding;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseOnboardingStatusReturn {
  /** Current onboarding status */
  status: IOnboardingStatus | null;
  /** Whether the status query is loading */
  isLoading: boolean;
  /** Error from the status query */
  error: Error | null;
  /** Whether onboarding is complete */
  isComplete: boolean;
  /** Current step number */
  currentStep: number;
  /** Refetch the status from the server */
  refetch: () => void;
  /** Invalidate and refetch the status */
  refresh: () => void;
}

/**
 * Hook for fetching and managing onboarding status
 *
 * This hook:
 * 1. Fetches onboarding status from the API
 * 2. Syncs the status with the Zustand store
 * 3. Provides loading and error states
 *
 * @example
 * ```tsx
 * const { status, isLoading, isComplete, currentStep, refetch } = useOnboardingStatus();
 *
 * if (isLoading) return <Spinner />;
 * if (isComplete) return <Dashboard />;
 * return <OnboardingWizard currentStep={currentStep} />;
 * ```
 */
export function useOnboardingStatus(): IUseOnboardingStatusReturn {
  const logger = useLogger('useOnboardingStatus');
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useUserStore();
  const { initializeFromServer, setCurrentStep, syncDismissed } = useOnboardingStore();

  // Fetch status query
  const {
    data: status,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: fetchOnboardingStatus,
    enabled: !!user && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once on failure
  });

  // Sync dismissed flag from user-scoped localStorage when the user ID is known.
  // This prevents a previous user's dismissed state from leaking into a new session.
  useEffect(() => {
    if (user?.id) {
      syncDismissed(user.id);
    }
  }, [user?.id, syncDismissed]);

  // Sync status with Zustand store when it changes
  useEffect(() => {
    if (status) {
      logger.info('Syncing onboarding status with store', {
        currentStep: status.currentStep,
        isComplete: status.isComplete,
      });

      initializeFromServer({
        currentStep: status.currentStep,
        completedSteps: status.completedSteps,
        skippedSteps: status.skippedSteps,
      });
    }
  }, [status, initializeFromServer, logger]);

  // Ensure store currentStep matches status when status changes
  useEffect(() => {
    if (status) {
      setCurrentStep(status.currentStep);
    }
  }, [status, setCurrentStep]);

  // Refetch - just trigger a new fetch
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
  }, [queryClient, user?.id]);

  // Refresh - invalidate and refetch
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
    queryClient.refetchQueries({ queryKey: ['onboarding-status', user?.id] });
  }, [queryClient, user?.id]);

  return {
    status: status ?? null,
    isLoading,
    error: error as Error | null,
    isComplete: status?.isComplete ?? false,
    currentStep: status?.currentStep ?? 1,
    refetch,
    refresh,
  };
}
