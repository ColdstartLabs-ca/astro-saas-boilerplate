'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { Check, X } from 'lucide-react';
import { useModalStore } from '@client/store/modalStore';

interface IProps {
  className?: string;
}

export function ComparisonSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);
  const { openAuthModal } = useModalStore();

  const comparisonData = [
    {
      row: 'fullAutomation',
      values: [true, true, false, false],
    },
    {
      row: 'humanQuality',
      values: [true, false, null, false],
    },
    {
      row: 'nativeCMS',
      values: [true, true, false, true],
    },
    {
      row: 'gscIntegration',
      values: [true, false, false, false],
    },
    {
      row: 'humanizer',
      values: [true, false, false, false],
    },
    {
      row: 'prePublicationQA',
      values: [true, false, false, false],
    },
    {
      row: 'startingPrice',
      values: ['$49', '$99', '$99', '$99'],
    },
  ];

  const columns = ['autopilotrank', 'toolA', 'toolB', 'toolC'];

  const renderValue = (value: boolean | null | string) => {
    if (typeof value === 'boolean') {
      if (value === null) {
        return <span className="text-text-muted">—</span>;
      }
      return value ? (
        <Check className="w-5 h-5 text-success mx-auto" />
      ) : (
        <X className="w-5 h-5 text-error mx-auto" />
      );
    }
    return <span className="font-semibold text-text-primary">{value}</span>;
  };

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('comparison.title')}</h2>
            <p className="text-lg text-text-secondary">{t('comparison.subtitle')}</p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-text-muted font-semibold text-sm uppercase tracking-wider w-48">
                      Feature
                    </th>
                    {columns.map((col, index) => (
                      <th
                        key={col}
                        className={`py-4 px-4 text-sm font-semibold ${
                          index === 0 ? 'text-accent bg-accent/5 border-l-4 border-accent' : 'text-text-secondary'
                        }`}
                      >
                        {t(`comparison.columns.${col}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border/50 hover:bg-elevated/20 transition-colors">
                      <td className="py-4 px-4 text-text-secondary font-medium">
                        {t(`comparison.rows.${item.row}`)}
                      </td>
                      {item.values.map((value, colIndex) => (
                        <td
                          key={colIndex}
                          className={`py-4 px-4 text-center ${colIndex === 0 ? 'bg-accent/5' : ''}`}
                        >
                          {renderValue(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-xs text-text-muted text-center">{t('comparison.disclaimer')}</p>

          {/* CTA */}
          <div className="mt-12 text-center">
            <button
              onClick={() => openAuthModal('register')}
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl transition-all duration-300 gradient-cta shine-effect hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

