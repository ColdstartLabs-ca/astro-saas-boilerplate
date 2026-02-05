'use client';

import { Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useModalStore } from '@client/store/modalStore';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { HeroDashboardPreview } from './HeroDashboardPreview';
import { AmbientBackground } from '@client/components/landing/AmbientBackground';

interface IProps {
  className?: string;
}

// Animation variants for hero section
const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  },
};

export function HeroSection({ className = '' }: IProps): JSX.Element {
  const { openAuthModal } = useModalStore();
  const t = useMemo(() => getTranslations('homepage'), []);

  return (
    <section className={`relative pt-20 pb-16 lg:pt-32 lg:pb-24 hero-gradient-2025 z-20 min-h-[calc(100vh-5rem)] ${className}`}>
      <AmbientBackground variant="hero" />

      <motion.div
        className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 relative z-10"
        initial="hidden"
        animate="visible"
        variants={heroContainerVariants}
      >
        {/* Badge */}
        <motion.div
          variants={heroItemVariants}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-semibold text-accent mb-8 hover:shadow-xl hover:shadow-accent/20 transition-all duration-300 cursor-default group"
        >
          <Rocket size={14} className="text-secondary animate-pulse" />
          <span className="group-hover:scale-105 transition-transform">{t('badge')}</span>
          <span className="w-px h-3 bg-white/10 mx-1"></span>
          <span className="text-text-muted group-hover:text-white transition-colors">{t('badgeVersion')}</span>
        </motion.div>

        <motion.h1
          variants={heroItemVariants}
          className="text-6xl font-black tracking-tight text-white sm:text-7xl md:text-8xl mb-6 max-w-5xl mx-auto leading-[1.05]"
        >
          {t('heroTitle')}{' '}
          <span className="gradient-text-primary">{t('heroTitleHighlight')}</span>
        </motion.h1>

        <motion.h2
          variants={heroItemVariants}
          className="mx-auto mt-6 max-w-3xl text-xl sm:text-2xl md:text-3xl text-text-secondary leading-relaxed font-semibold"
        >
          {t('heroSubtitle')}
        </motion.h2>

        <motion.p
          variants={heroItemVariants}
          className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-text-secondary leading-relaxed font-light"
        >
          {t('heroDescription')}{' '}
          <span className="text-white font-medium">{t('heroDescriptionHighlight')}</span>
          {t('heroDescriptionMiddle')}{' '}
          <span className="relative text-white font-bold decoration-secondary underline decoration-2 underline-offset-4">
            {t('heroDescriptionTextSharp')}
          </span>
          .
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          variants={heroItemVariants}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            onClick={() => openAuthModal('register')}
            className="group inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl transition-all duration-300 gradient-cta shine-effect"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Rocket size={20} className="group-hover:rotate-12 transition-transform" />
            {t('ctaStartFreeTrial')}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-8 py-4 glass-strong hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('ctaWatchDemo')}
          </motion.button>
        </motion.div>

        <motion.p variants={heroItemVariants} className="mt-4 text-sm text-text-muted">
          {t('ctaSubtext')}
        </motion.p>

        {/* Dashboard Preview */}
        <motion.div variants={heroItemVariants} className="mt-20">
          <HeroDashboardPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}
