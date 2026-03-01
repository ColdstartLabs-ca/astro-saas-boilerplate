/**
 * ArticleSettingsTab Component
 * Settings tab for editing project content preferences
 *
 * Features:
 * - Project context header (read-only name + domain)
 * - Language dropdown
 * - Country dropdown
 * - Content preferences section (embedded component)
 * - Save button with loading state and success toast
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, FolderPlus, Globe, MapPin } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import {
  ContentPreferencesSection,
  CONTENT_PREFERENCES_DEFAULTS,
} from '@client/components/onboarding/steps/ContentPreferencesSection';
import { LANGUAGE_OPTIONS, COUNTRY_OPTIONS } from '@shared/validation/onboarding.schema';
import { articleSettingsSchema, type IArticleSettingsFormData } from '@shared/validation/project-settings.schema';
import type { IContentPreferences } from '@shared/types/project.types';
import { getTranslations } from '@src/i18n/utils';
import { useLogger } from '@client/utils/logger';
import { useToastStore } from '@client/store/toastStore';

// =============================================================================
// Component
// =============================================================================

export function ArticleSettingsTab(): JSX.Element {
  const logger = useLogger('ArticleSettingsTab');
  const { activeProject, updateProject, isLoading } = useProjects();
  const showToast = useToastStore(state => state.showToast);
  const t = useMemo(() => getTranslations('dashboard'), []);
  const [isSaving, setIsSaving] = useState(false);
  const [contentPreferences, setContentPreferences] = useState<IContentPreferences>(() => ({
    ...CONTENT_PREFERENCES_DEFAULTS,
    ...(activeProject?.content_preferences ?? {}),
  }));

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty: isFormDirty },
  } = useForm<IArticleSettingsFormData>({
    resolver: zodResolver(articleSettingsSchema),
    defaultValues: {
      language: (activeProject?.language as IArticleSettingsFormData['language']) ?? 'en',
      country: (activeProject?.country as IArticleSettingsFormData['country']) ?? 'US',
    },
  });

  // Check if content preferences have changed
  const hasContentPreferencesChanged = useMemo(() => {
    if (!activeProject?.content_preferences) return Object.keys(contentPreferences).length > 0;
    return JSON.stringify(activeProject.content_preferences) !== JSON.stringify(contentPreferences);
  }, [activeProject?.content_preferences, contentPreferences]);

  const isDirty = isFormDirty || hasContentPreferencesChanged;

  const onSubmit = useCallback(
    async (data: IArticleSettingsFormData) => {
      if (!activeProject) return;

      setIsSaving(true);
      try {
        await updateProject(activeProject.id, {
          language: data.language,
          country: data.country,
          content_preferences: contentPreferences,
        });
        showToast({ message: t('projects.success.updated'), type: 'success' });
        logger.info('Article settings updated', { projectId: activeProject.id });
      } catch (error) {
        showToast({ message: t('projects.errors.updateFailed'), type: 'error' });
        logger.error('Failed to update article settings', { error, projectId: activeProject.id });
      } finally {
        setIsSaving(false);
      }
    },
    [activeProject, updateProject, contentPreferences, t, logger, showToast]
  );

  // Empty state - no active project
  if (!activeProject) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mb-4">
            <FolderPlus className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('settings.noProject')}</h3>
          <p className="text-muted max-w-md">{t('settings.noProjectDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Context Header */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{t('settings.articles')}</h2>
            <p className="text-sm text-muted">{t('settings.articlesSubtitle')}</p>
          </div>
        </div>

        {/* Read-only project context */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-surface-light rounded-lg">
          <div>
            <span className="text-xs text-muted uppercase tracking-wide">{t('settings.projectContext')}</span>
            <p className="text-white font-medium mt-1">{activeProject.name}</p>
          </div>
          <div>
            <span className="text-xs text-muted uppercase tracking-wide">{t('settings.domain')}</span>
            <p className="text-white font-medium mt-1 truncate">
              {activeProject.domain || t('settings.notSet')}
            </p>
          </div>
        </div>
      </div>

      {/* Language and Country Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            {t('settings.language')} & {t('settings.country')}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Language Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="language"
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <Globe className="w-4 h-4 text-muted" />
                {t('settings.language')}
              </label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    id="language"
                    className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.language && (
                <p className="text-xs text-error">{errors.language.message}</p>
              )}
            </div>

            {/* Country Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="country"
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <MapPin className="w-4 h-4 text-muted" />
                {t('settings.country')}
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    id="country"
                    className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-accent outline-none transition-all cursor-pointer"
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.country && (
                <p className="text-xs text-error">{errors.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content Preferences Section */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <ContentPreferencesSection
            value={contentPreferences}
            onChange={setContentPreferences}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSaving || isLoading}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isDirty && !isSaving && !isLoading
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-surface-light text-muted cursor-not-allowed'
            }`}
          >
            {isSaving ? t('settings.saving') : t('settings.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
