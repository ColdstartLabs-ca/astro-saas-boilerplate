'use client';

import { Bot, Bug, Wrench, ArrowRight } from 'lucide-react';
import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';

interface IProps {
  className?: string;
}

export function PainPointsSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);

  const painPoints = [
    {
      icon: Bot,
      key: 'card1',
    },
    {
      icon: Bug,
      key: 'card2',
    },
    {
      icon: Wrench,
      key: 'card3',
    },
  ];

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('painPoints.title')}</h2>
            <p className="text-lg text-text-secondary">{t('painPoints.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {painPoints.map((point, index) => {
              const Icon = point.icon;
              const title = t(`painPoints.${point.key}.title`);
              const description = t(`painPoints.${point.key}.description`);

              return (
                <div
                  key={index}
                  className="glass-card p-8 rounded-2xl hover:border-accent/30 transition-all duration-300"
                >
                  <div className="w-14 h-14 gradient-cta rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                    <Icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                  <p className="text-text-secondary">{description}</p>
                </div>
              );
            })}
          </div>

          {/* Transition CTA */}
          <div className="mt-12 text-center">
            <a
              href="#solution"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {t('painPoints.transition')} <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

export { PainPointsSection };
