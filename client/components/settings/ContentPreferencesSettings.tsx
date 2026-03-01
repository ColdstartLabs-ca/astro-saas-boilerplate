/**
 * ContentPreferencesSettings Component
 * Settings panel for editing the active project's content preferences
 *
 * Features:
 * - Active project from Zustand + React Query (via useProjects)
 * - ContentPreferencesSection embedded component
 * - Save button with loading state
 * - Success/error toast via useToastStore
 */

'use client';

import { useState, useCallback } from 'react';
import { FileText, FolderPlus, Loader2 } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { ContentPreferencesSection } from '@client/components/onboarding/steps/ContentPreferencesSection';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useToastStore } from '@client/store/toastStore';
import { useLogger } from '@client/utils/logger';
import type { IContentPreferences } from '@shared/types/project.types';

// =============================================================================
// Component
// =============================================================================

export function ContentPreferencesSettings(): JSX.Element {
  const logger = useLogger('ContentPreferencesSettings');
  const { activeProject, updateProject, isLoading } = useProjects();
  const showToast = useToastStore(state => state.showToast);
  const [isSaving, setIsSaving] = useState(false);
  const [contentPreferences, setContentPreferences] = useState<IContentPreferences>(
    activeProject?.content_preferences ?? {}
  );

  const handleSave = useCallback(async () => {
    if (!activeProject) return;

    setIsSaving(true);
    try {
      await updateProject(activeProject.id, {
        content_preferences: contentPreferences,
      });
      showToast({ message: 'Content preferences saved.', type: 'success' });
      logger.info('Content preferences updated', { projectId: activeProject.id });
    } catch (error) {
      showToast({ message: 'Failed to save content preferences.', type: 'error' });
      logger.error('Failed to update content preferences', { error, projectId: activeProject.id });
    } finally {
      setIsSaving(false);
    }
  }, [activeProject, updateProject, contentPreferences, logger, showToast]);

  // Empty state - no active project
  if (!isLoading && !activeProject) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
            <FolderPlus className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No active project</h3>
          <p className="text-muted max-w-md">
            Select or create a project to manage its content preferences.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Content Preferences</h2>
          <p className="text-sm text-muted">
            Defaults applied when generating articles for{' '}
            <span className="text-white">{activeProject?.name}</span>.
          </p>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <ContentPreferencesSection
          value={contentPreferences}
          onChange={setContentPreferences}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <DashboardButton
          onClick={handleSave}
          disabled={isSaving || isLoading}
          size="sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </DashboardButton>
      </div>
    </div>
  );
}
