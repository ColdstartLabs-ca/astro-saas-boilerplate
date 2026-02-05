'use client';

import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';

interface IProps {
  className?: string;
}

export function SocialProofBar({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);

  return (
    <section className={`relative py-12 bg-main border-y border-border/30 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium text-text-secondary">{t('socialProofBar.heading')}</p>
      </div>
    </section>
  );
}

export { SocialProofBar };
