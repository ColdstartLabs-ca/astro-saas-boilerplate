'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { Check, Zap, Globe, Puzzle } from 'lucide-react';

interface IProps {
  className?: string;
}

export function SolutionSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);

  const workflowSteps = [
    { key: 'keywords', icon: '🔍' },
    { key: 'content', icon: '✍️' },
    { key: 'optimize', icon: '⚡' },
    { key: 'publish', icon: '🚀' },
    { key: 'track', icon: '📊' },
  ];

  const features = [
    { icon: Zap, key: 'setAndForget' },
    { icon: Check, key: 'publishReady' },
    { icon: Globe, key: 'allInOne' },
    { icon: Puzzle, key: 'worksWithYourStack' },
  ];

  return (
    <FadeIn>
      <section id="solution" className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('solution.title')}</h2>
            <p className="text-lg text-text-secondary">{t('solution.subtitle')}</p>
          </div>

          {/* Workflow */}
          <div className="mb-16">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-elevated border border-border flex items-center justify-center text-2xl md:text-3xl shadow-lg">
                      {step.icon}
                    </div>
                    <span className="text-xs font-medium text-text-secondary mt-2 hidden sm:block">
                      {t(`solution.workflow.${step.key}`)}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-[10px] font-bold uppercase mt-2 border border-accent/30">
                      {t('solution.workflow.auto')}
                    </span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-accent to-accent/20"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const title = t(`solution.features.${feature.key}.title`);
              const description = t(`solution.features.${feature.key}.description`);

              return (
                <div
                  key={index}
                  className="glass-card p-6 rounded-xl hover:border-accent/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 gradient-cta rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-text-secondary">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

