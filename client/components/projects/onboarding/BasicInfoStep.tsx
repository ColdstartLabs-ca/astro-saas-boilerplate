/**
 * BasicInfoStep Component
 * First step of project onboarding - name, domain, industry
 */

'use client';

import { useTranslations } from '@client/hooks/useTranslations';
import { useFormContext } from 'react-hook-form';
import type { IProjectOnboardingInput } from '@shared/validation/project.schema';
import { INDUSTRIES } from '@shared/validation/project.schema';
import { cn } from '@client/utils/cn';

export interface IBasicInfoStepProps {
  /** Optional className for styling */
  className?: string;
}

export function BasicInfoStep({ className }: IBasicInfoStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const {
    register,
    formState: { errors },
  } = useFormContext<IProjectOnboardingInput>();

  return (
    <div className={cn('space-y-6 animate-fadeIn', className)}>
      {/* Project Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-secondary mb-1.5">
          {t('projects.onboarding.step1.projectName')}
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          placeholder={t('projects.onboarding.step1.projectNamePlaceholder')}
          className={cn(
            'w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all',
            errors.name && 'border-red-500 focus:ring-red-500'
          )}
          autoFocus
        />
        {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>}
      </div>

      {/* Domain URL */}
      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-secondary mb-1.5">
          {t('projects.onboarding.step1.domainUrl')}
        </label>
        <div className="relative">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">
            https://
          </span>
          <input
            {...register('domain')}
            type="text"
            id="domain"
            placeholder="example.com"
            className={cn(
              'w-full bg-elevated border border-border rounded-lg pl-[4.25rem] pr-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all',
              errors.domain && 'border-red-500 focus:ring-red-500'
            )}
          />
        </div>
        {errors.domain && <p className="text-sm text-red-400 mt-1">{errors.domain.message}</p>}
      </div>

      {/* Industry */}
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-secondary mb-1.5">
          {t('projects.onboarding.step1.industry')}
        </label>
        <select
          {...register('industry')}
          id="industry"
          className={cn(
            'w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all',
            errors.industry && 'border-red-500 focus:ring-red-500'
          )}
        >
          <option value="">{t('projects.onboarding.step1.industryPlaceholder')}</option>
          {INDUSTRIES.map(industry => (
            <option key={industry} value={industry}>
              {t(`projects.onboarding.step1.industries.${industry}`)}
            </option>
          ))}
        </select>
        {errors.industry && <p className="text-sm text-red-400 mt-1">{errors.industry.message}</p>}
      </div>
    </div>
  );
}
