'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { Cpu, Link, Shield, Sparkles } from 'lucide-react';

interface IProps {
  className?: string;
}

const metrics = [
  { key: 'aiModels', icon: Cpu },
  { key: 'integrations', icon: Link },
  { key: 'qa', icon: Shield },
  { key: 'quality', icon: Sparkles },
];

export function SocialProofSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const value = t(`socialProof.metrics.${metric.key}`);

              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl gradient-cta flex items-center justify-center shadow-lg shadow-accent/20">
                    <Icon size={32} className="text-white" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white mb-2">{value}</p>
                </div>
              );
            })}
          </div>

          {/* Testimonials Section - Placeholder for Beta */}
          <div className="text-center">
            <div className="inline-block glass-card px-6 py-3 rounded-xl">
              <p className="text-sm text-text-secondary">{t('socialProof.testimonialsNote')}</p>
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

export { SocialProofSection };
