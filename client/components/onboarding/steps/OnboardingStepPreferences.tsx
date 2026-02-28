/**
 * OnboardingStepPreferences Component
 * Step 4 of onboarding: Content preferences
 * Optional step - can be skipped (sensible defaults will be used)
 */

'use client';

import { useState, useCallback } from 'react';
import { Loader2, SkipForward } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import {
  ContentPreferencesSection,
  CONTENT_PREFERENCES_DEFAULTS,
} from './ContentPreferencesSection';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { apiFetch } from '@client/utils/api-client';
import type { IContentPreferences } from '@shared/types/project.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepPreferencesProps {
  onComplete: () => void;
  onSkip: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepPreferences({
  onComplete,
  onSkip,
}: IOnboardingStepPreferencesProps): JSX.Element {
  const [contentPreferences, setContentPreferences] = useState<IContentPreferences>(
    CONTENT_PREFERENCES_DEFAULTS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projectId } = useOnboardingStore();

  const handleSaveAndContinue = useCallback(async () => {
    // BUG M3 fix: guard against null projectId — cannot save without a project
    if (!projectId) {
      setError('No project found. Please go back and create a project first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content_preferences: contentPreferences }),
      });
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [projectId, contentPreferences, onComplete]);

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-xl p-5">
        <ContentPreferencesSection value={contentPreferences} onChange={setContentPreferences} />
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <DashboardButton
        type="button"
        onClick={handleSaveAndContinue}
        className="w-full shadow-lg shadow-accent/20"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save & Continue'
        )}
      </DashboardButton>

      <button
        type="button"
        onClick={onSkip}
        disabled={isSaving}
        className="w-full py-2.5 text-sm text-muted hover:text-secondary transition-colors flex items-center justify-center gap-2"
      >
        <SkipForward className="w-4 h-4" />
        Skip, use defaults
      </button>
    </div>
  );
}
