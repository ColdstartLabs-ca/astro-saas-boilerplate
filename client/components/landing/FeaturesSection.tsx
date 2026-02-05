'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { Cpu, Wand2, ShieldCheck } from 'lucide-react';

interface IProps {
  className?: string;
}

export function FeaturesSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);

  const features = [
    {
      icon: Cpu,
      key: 'feature1',
      reverse: false,
    },
    {
      icon: Wand2,
      key: 'feature2',
      reverse: true,
    },
    {
      icon: ShieldCheck,
      key: 'feature3',
      reverse: false,
    },
  ];

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
              {t('features.label')}
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('features.title')}</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">{t('features.subtitle')}</p>
          </div>

          {/* Feature Blocks with Alternating Layout */}
          <div className="space-y-24">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const title = t(`features.${feature.key}.title`);
              const highlight = t(`features.${feature.key}.highlight`);
              const description = t(`features.${feature.key}.description`);
              const proof = t(`features.${feature.key}.proof`);

              return (
                <div
                  key={index}
                  className={`flex flex-col ${feature.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${feature.reverse ? 'lg:text-left' : 'lg:text-right'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl gradient-cta flex items-center justify-center shadow-lg shadow-accent/20">
                        <Icon size={24} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-text-primary">{title}</h3>
                    </div>
                    <h4 className="text-xl font-semibold text-accent mb-4">{highlight}</h4>
                    <p className="text-text-secondary text-lg mb-6">{description}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-elevated border border-border">
                      <span className="text-sm text-text-muted">{proof}</span>
                    </div>
                  </div>

                  {/* Visual Placeholder */}
                  <div className="flex-1">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-accent/20 via-elevated to-secondary/20 border border-border shadow-2xl">
                      {/* Decorative gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon size={64} className="text-accent/20" />
                      </div>
                      {/* Screenshot placeholder text */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-main/80 backdrop-blur-sm rounded-lg p-3 border border-border">
                          <p className="text-xs text-text-muted text-center">Screenshot placeholder</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

export { FeaturesSection };
