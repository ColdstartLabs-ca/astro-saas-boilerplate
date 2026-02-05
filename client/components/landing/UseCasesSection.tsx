'use client';

import { useState } from 'react';
import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';

interface IProps {
  className?: string;
}

const tabs = [
  { id: 0, key: 'tab1', icon: '🏢' },
  { id: 1, key: 'tab2', icon: '📝' },
  { id: 2, key: 'tab3', icon: '🏛️' },
];

export function UseCasesSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);
  const [activeTab, setActiveTab] = useState(0);

  const currentTab = tabs[activeTab];
  const title = t(`useCases.${currentTab.key}.title`);
  const points = t(`useCases.${currentTab.key}.points`) as string[];
  const testimonial = t(`useCases.${currentTab.key}.testimonial`);

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('useCases.title')}</h2>
            <p className="text-lg text-text-secondary">{t('useCases.subtitle')}</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-elevated border border-border rounded-xl p-1 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-accent text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{t(`useCases.${tab.key}.label`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 md:p-12 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">{tabs[activeTab].icon}</span>
                <h3 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h3>
              </div>

              <ul className="space-y-4 mb-8">
                {points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-text-secondary text-lg">{point}</span>
                  </li>
                ))}
              </ul>

              {/* Testimonial Placeholder */}
              <div className="bg-elevated/50 border border-border rounded-xl p-6">
                <p className="text-text-secondary italic mb-4">{testimonial}</p>
                <p className="text-xs text-text-muted">{t('socialProof.testimonialsNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

// Check icon component for bullet points
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

