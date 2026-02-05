'use client';

import { lazy, Suspense, useMemo } from 'react';
import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';

interface IProps {
  className?: string;
}

// Lazy load FAQ component
const FAQ = lazy(() =>
  import('@client/components/ui/FAQ').then((m) => ({ default: m.FAQ }))
);

export function FAQSection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);
  const faqItems = t('faq.items') as Array<{ question: string; answer: string }>;

  return (
    <FadeIn>
      <section id="faq" className={`py-24 relative ${className}`}>
        <AmbientBackground variant="section" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">{t('faq.title')}</h2>
            <p className="text-lg text-text-secondary">{t('faq.subtitle')}</p>
          </div>

          <Suspense fallback={<div className="animate-pulse h-64 bg-white/5 rounded-xl" />}>
            <FAQ items={faqItems} />
          </Suspense>
        </div>
      </section>
    </FadeIn>
  );
}

