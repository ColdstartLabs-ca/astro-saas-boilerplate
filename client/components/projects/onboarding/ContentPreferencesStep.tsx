/**
 * ContentPreferencesStep Component
 * Third step of project onboarding - tone, frequency, word count
 */

'use client';

import { useTranslations } from '@client/hooks/useTranslations';
import { useFormContext, Controller } from 'react-hook-form';
import type { IProjectOnboardingInput } from '@shared/validation/project.schema';
import { TONES, FREQUENCIES } from '@shared/validation/project.schema';
import { cn } from '@client/utils/cn';

export interface IContentPreferencesStepProps {
  /** Optional className for styling */
  className?: string;
}

export function ContentPreferencesStep({ className }: IContentPreferencesStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<IProjectOnboardingInput>();

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

          {/* Tone of Voice */}
          <div>
            <label htmlFor="tone" className="text-sm font-medium text-secondary block mb-2">
              {t('projects.onboarding.step3.toneOfVoice')}
            </label>
            <select
              {...register('tone')}
              id="tone"
              className={cn(
                'w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none',
                errors.tone && 'border-red-500 focus:ring-red-500'
              )}
            >
              {TONES.map(tone => (
                <option key={tone} value={tone}>
                  {t(`projects.onboarding.step3.tones.${tone}`)}
                </option>
              ))}
            </select>
            {errors.tone && <p className="text-sm text-red-400 mt-1">{errors.tone.message}</p>}
          </div>

          {/* Target Word Count */}
          <div>
            <label
              htmlFor="targetWordCount"
              className="text-sm font-medium text-secondary block mb-2"
            >
              {t('projects.onboarding.step3.targetWordCount')}
            </label>
            <div className="relative">
              <input
                {...register('targetWordCount')}
                type="number"
                id="targetWordCount"
                min="100"
                max="10000"
                step="50"
                placeholder={t('projects.onboarding.step3.targetWordCountPlaceholder')}
                className={cn(
                  'w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all pr-16',
                  errors.targetWordCount && 'border-red-500 focus:ring-red-500'
                )}
              />
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary text-sm pointer-events-none">
                words
              </span>
            </div>
            {errors.targetWordCount && (
              <p className="text-sm text-red-400 mt-1">{errors.targetWordCount.message}</p>
            )}
            <p className="text-xs text-muted mt-1.5">
              {t('projects.onboarding.step3.wordCountHelp')}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Note */}
      <p className="text-sm text-muted">{t('projects.onboarding.step3.confirmationNote')}</p>
    </div>
  );
}
