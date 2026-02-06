/**
 * ContentPreferencesStep Component
 * Third step of project onboarding - tone, frequency, word count
 */

'use client';

import { useTranslations } from '@client/hooks/useTranslations';
import { useFormContext, Controller } from 'react-hook-form';
import type { IProjectOnboardingInput } from '@shared/validation/project.schema';
import { FREQUENCIES } from '@shared/validation/project.schema';
import { cn } from '@client/utils/cn';

export interface IContentPreferencesStepProps {
  /** Optional className for styling */
  className?: string;
}

export function ContentPreferencesStep({ className }: IContentPreferencesStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { control } = useFormContext<IProjectOnboardingInput>();

  return (
    <div className={cn('space-y-6 animate-fadeIn', className)}>
      <div className="bg-elevated/50 border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          {t('projects.onboarding.step3.contentStrategy')}
        </h3>

        <div className="space-y-5">
          {/* Publishing Frequency */}
          <div>
            <label className="text-sm font-medium text-secondary block mb-2">
              {t('projects.onboarding.step3.publishingFrequency')}
            </label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCIES.map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => field.onChange(freq)}
                      className={cn(
                        'py-2 px-3 text-sm rounded-lg border transition-colors',
                        field.value === freq
                          ? 'bg-accent text-white border-accent'
                          : 'bg-elevated text-secondary border-border hover:border-muted'
                      )}
                    >
                      {t(`projects.onboarding.step3.frequencies.${freq}`)}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Note */}
      <p className="text-sm text-muted">{t('projects.onboarding.step3.confirmationNote')}</p>
    </div>
  );
}
