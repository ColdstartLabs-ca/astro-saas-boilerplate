/**
 * useOnboardingProgress Hook
 * Mutation hook for updating onboarding progress via the API.
 *
 * Returns:
 * - updateProgress(input): fires PUT /api/onboarding/progress
 * - isUpdating: true while the request is in flight
 */

'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@client/utils/api-client';
import type { IUpdateOnboardingProgressInput } from '@shared/types/onboarding.types';

// =============================================================================
// Types
// =============================================================================

export interface IUseOnboardingProgressResult {
  updateProgress: (input: IUpdateOnboardingProgressInput) => Promise<void>;
  isUpdating: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useOnboardingProgress(): IUseOnboardingProgressResult {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProgress = useCallback(async (input: IUpdateOnboardingProgressInput) => {
    setIsUpdating(true);
    try {
      await apiFetch('/api/onboarding/progress', {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateProgress, isUpdating };
}
