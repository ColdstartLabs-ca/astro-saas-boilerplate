'use client';

import { FadeIn } from '@client/components/ui/MotionWrappers';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useModalStore } from '@client/store/modalStore';

interface IProps {
  className?: string;
}

export function FinalCTASection({ className = '' }: IProps): JSX.Element {
  const t = useMemo(() => getTranslations('homepage'), []);
  const { openAuthModal } = useModalStore();

  return (
    <FadeIn>
      <section className={`relative py-32 section-glow-top ${className}`}>
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-main to-accent/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">
            {t('finalCta.title')}
            <br />
            <span className="gradient-text-primary">{t('finalCtaTitleHighlight')}</span>
          </h2>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto font-light">
            {t('finalCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.button
              onClick={() => openAuthModal('register')}
              className="group inline-flex items-center gap-2 px-10 py-5 text-white font-bold rounded-xl transition-all duration-300 gradient-cta shine-effect text-lg shadow-xl shadow-accent/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Rocket size={22} className="group-hover:rotate-12 transition-transform" />
              {t('ctaStartNow')}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-10 py-5 glass-strong hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300 text-lg hover:scale-[1.05] active:scale-[0.95]"
            >
              {t('ctaComparePlans')}
            </a>
          </div>
          <p className="mt-8 text-sm text-text-muted">{t('finalCtaSubtext')}</p>
        </div>
      </section>
    </FadeIn>
  );
}

