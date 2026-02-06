/**
 * PlatformSelectionStep Component
 * Second step of project onboarding - CMS platform selection
 */

'use client';

import { useFormContext, Controller } from 'react-hook-form';
import type { IProjectOnboardingInput } from '@shared/validation/project.schema';
import { useTranslations } from '@client/hooks/useTranslations';
import { Code, Database, Globe, ShoppingBag } from 'lucide-react';
import { cn } from '@client/utils/cn';

export interface IPlatformSelectionStepProps {
  /** Optional className for styling */
  className?: string;
}

const CMS_OPTIONS = [
  { id: 'wordpress' as const, name: 'WordPress', icon: Globe },
  { id: 'webflow' as const, name: 'Webflow', icon: Code },
  { id: 'shopify' as const, name: 'Shopify', icon: ShoppingBag },
  { id: 'other' as const, name: 'Other/None', icon: Database },
] as const;

export function PlatformSelectionStep({ className }: IPlatformSelectionStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { control } = useFormContext<IProjectOnboardingInput>();

  return (
    <div className={cn('space-y-6 animate-fadeIn', className)}>
      {/* Platform Options Grid */}
      <div>
        <label className="block text-sm font-medium text-secondary mb-4">
          {t('projects.onboarding.step2.choosePlatform')}
        </label>
        <Controller
          name="cmsType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CMS_OPTIONS.map(cms => {
                const Icon = cms.icon;
                const isSelected = field.value === cms.id;
                return (
                  <button
                    key={cms.id}
                    type="button"
                    onClick={() => field.onChange(cms.id)}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-accent/20 border-accent ring-1 ring-accent/50'
                        : 'bg-elevated border-border hover:border-muted hover:bg-surface'
                    )}
                  >
                    <Icon
                      className={cn('w-8 h-8 mb-2', isSelected ? 'text-accent' : 'text-secondary')}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-accent-light' : 'text-secondary'
                      )}
                    >
                      {t(`projects.onboarding.step2.${cms.id}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className="text-blue-400 mt-0.5">ℹ️</span>
        <p className="text-sm text-blue-200">{t('projects.onboarding.step2.cmsNote')}</p>
      </div>
    </div>
  );
}
