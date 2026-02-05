'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { Check, ArrowRight } from 'lucide-react';
import { useModalStore } from '@client/store/modalStore';

interface IProps {
  className?: string;
}

const plans = [
  { key: 'starter', highlight: false },
  { key: 'growth', highlight: true },
  { key: 'agency', highlight: false },
];

const allFeatures = ['humanizer', 'qa', 'wordpress'];

export function PricingPreviewSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);
  const { openAuthModal } = useModalStore();

  return (
    <FadeIn>
      <section className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-text-secondary">{t('pricing.subtitle')}</p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => {
              const name = t(`pricing.${plan.key}.name`);
              const price = t(`pricing.${plan.key}.price`);
              const period = t(`pricing.${plan.key}.period`);
              const description = t(`pricing.${plan.key}.description`);
              const articles = t(`pricing.${plan.key}.articles`);
              const sites = t(`pricing.${plan.key}.sites`);
              const integrations = t(`pricing.${plan.key}.integrations`);
              const cta = t(`pricing.${plan.key}.cta`);
              const badge = plan.key === 'growth' ? t(`pricing.${plan.key}.badge`) : null;

              return (
                <div
                  key={plan.key}
                  className={`glass-card rounded-2xl p-8 transition-all duration-300 relative ${
                    plan.highlight
                      ? 'border-accent shadow-xl shadow-accent/20 scale-105 z-10'
                      : 'border-border hover:border-accent/30'
                  }`}
                >
                  {badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wider">
                        {badge}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-text-primary mb-2">{name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black text-white">{price}</span>
                      <span className="text-text-muted">{period}</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{description}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-text-secondary">{articles}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-text-secondary">{sites}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-text-secondary">{integrations}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAuthModal('register')}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                      plan.highlight
                        ? 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20'
                        : 'bg-elevated hover:bg-surface text-text-primary border border-border'
                    }`}
                  >
                    {cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* All plans include */}
          <div className="text-center mb-8">
            <p className="text-sm text-text-muted mb-4">{t('pricing.allPlansInclude')}</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text-secondary">
              {allFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" />
                  <span>{t(`pricing.${feature}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust line */}
          <p className="text-center text-sm text-text-muted mb-8">{t('pricing.trust')}</p>

          {/* Compare Plans Link */}
          <div className="text-center">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {t('pricing.compareLink')} <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

export { PricingPreviewSection };
