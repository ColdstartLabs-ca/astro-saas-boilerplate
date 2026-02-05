'use client';

import { AmbientBackground } from '@client/components/landing/AmbientBackground';
import { FadeIn } from '@client/components/ui/MotionWrappers';
import { useModalStore } from '@client/store/modalStore';
import { useToastStore } from '@client/store/toastStore';
import { prepareAuthRedirect } from '@client/utils/authRedirectManager';
import { getSubscriptionConfig } from '@shared/config/subscription.config';
import { getTranslations } from '../../../src/i18n/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Zap, Shield, CheckCircle } from 'lucide-react';

import { lazy, Suspense, useEffect, useMemo } from 'react';

// Lazy load FAQ component
const FAQ = lazy(() => import('@client/components/ui/FAQ').then(m => ({ default: m.FAQ })));

// Animation variants for hero section
const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
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

export function HomePageClient(): JSX.Element {
  const { openAuthModal } = useModalStore();
  const { showToast } = useToastStore();

  // Use Astro i18n helper instead of next-intl's useTranslations
  const t = useMemo(() => getTranslations('homepage'), []);

  // Get URL params from window.location
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

  // Check if any plan has trial enabled
  const config = getSubscriptionConfig();
  const hasTrialEnabled = config.plans.some(plan => plan.trial.enabled);

  // Check for auth prompts from URL params
  useEffect(() => {
    const loginRequired = searchParams.get('login');
    const signupRequired = searchParams.get('signup');
    const nextUrl = searchParams.get('next');

    // Handle login redirect (from middleware)
    if (loginRequired === '1' && nextUrl) {
      prepareAuthRedirect('dashboard_access', {
        returnTo: nextUrl,
      });

      showToast({
        message: t('toastLoginRequired'),
        type: 'info',
        duration: 5000,
      });

      setTimeout(() => {
        openAuthModal('login');
      }, 500);

      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('next');
      window.history.replaceState({}, '', url.toString());
    }

    // Handle signup prompt (from blog CTAs, etc.)
    if (signupRequired === '1') {
      setTimeout(() => {
        openAuthModal('register');
      }, 300);

      const url = new URL(window.location.href);
      url.searchParams.delete('signup');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, openAuthModal, showToast, t]);

  return (
    <div className="flex-grow bg-main font-sans selection:bg-accent/20 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 hero-gradient-2025 z-20">
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
            <span className="text-muted-foreground group-hover:text-white transition-colors">
              {t('badgeVersion')}
            </span>
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
            className="mx-auto mt-6 max-w-2xl text-2xl sm:text-3xl text-text-secondary leading-relaxed font-semibold"
          >
            {t('heroSubtitle')} <span className="text-white">{t('heroSubtitleHighlight')}</span>
          </motion.h2>

          <motion.p
            variants={heroItemVariants}
            className="mx-auto mt-6 max-w-2xl text-xl sm:text-2xl text-text-secondary leading-relaxed font-light"
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
              {hasTrialEnabled ? t('ctaGetStarted') : t('ctaStartBuilding')}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center gap-2 px-8 py-4 glass-strong hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('ctaSignIn')}
            </motion.button>
          </motion.div>

          <motion.p variants={heroItemVariants} className="mt-4 text-sm text-text-muted">
            {t('ctaSubtext')}
          </motion.p>
        </motion.div>
      </section>

      {/* Features Section */}
      <FadeIn>
        <section id="features" className="py-24 relative">
          <AmbientBackground variant="section" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                {t('featuresTitle')}
              </h2>
              <p className="text-lg text-text-secondary">{t('featuresSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="glass-card p-8 rounded-2xl hover:border-accent/30 transition-all duration-300">
                <div className="w-14 h-14 gradient-cta rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                  <Zap size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('feature1Title')}</h3>
                <p className="text-text-secondary">{t('feature1Description')}</p>
              </div>

              {/* Feature 2 */}
              <div className="glass-card p-8 rounded-2xl hover:border-accent/30 transition-all duration-300">
                <div className="w-14 h-14 gradient-cta rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                  <Shield size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('feature2Title')}</h3>
                <p className="text-text-secondary">{t('feature2Description')}</p>
              </div>

              {/* Feature 3 */}
              <div className="glass-card p-8 rounded-2xl hover:border-accent/30 transition-all duration-300">
                <div className="w-14 h-14 gradient-cta rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('feature3Title')}</h3>
                <p className="text-text-secondary">{t('feature3Description')}</p>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* FAQ Section */}
      <FadeIn>
        <section id="faq" className="py-24 relative">
          <AmbientBackground variant="section" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">{t('faqTitle')}</h2>
              <p className="text-lg text-text-secondary">{t('faqSubtitle')}</p>
            </div>

            <Suspense fallback={<div className="animate-pulse h-64 bg-white/5 rounded-xl" />}>
              <FAQ
                items={[
                  {
                    question: t('faq1Question'),
                    answer: t('faq1Answer'),
                  },
                  {
                    question: t('faq2Question'),
                    answer: t('faq2Answer'),
                  },
                  {
                    question: t('faq3Question'),
                    answer: t('faq3Answer'),
                  },
                  {
                    question: t('faq4Question'),
                    answer: t('faq4Answer'),
                  },
                ]}
              />
            </Suspense>
          </div>
        </section>
      </FadeIn>

      {/* Pricing CTA Section */}
      <FadeIn>
        <section className="py-24 relative">
          <AmbientBackground variant="section" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
              {t('pricingCtaTitle')}
            </h2>
            <p className="text-lg sm:text-xl text-text-secondary mb-10 max-w-2xl mx-auto font-light">
              {t('pricingCtaDescription')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.a
                href="/pricing"
                className="group inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl transition-all duration-300 gradient-cta shine-effect"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('ctaSeePricing')}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </motion.a>
              <motion.button
                onClick={() => openAuthModal('register')}
                className="inline-flex items-center gap-2 px-8 py-4 glass-strong hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {hasTrialEnabled ? t('ctaTryFree') : t('ctaGetFree')}
              </motion.button>
            </div>
            <p className="mt-6 text-sm text-text-muted">{t('pricingCtaSubtext')}</p>
          </div>
        </section>
      </FadeIn>

      {/* Final CTA Section */}
      <FadeIn>
        <section className="relative py-32 section-glow-top">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-main to-accent/10"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">
              {t('finalCtaTitle')}
              <br />
              <span className="gradient-text-primary">{t('finalCtaTitleHighlight')}</span>
            </h2>
            <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto font-light">
              {t('finalCtaDescription')}
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
              <motion.a
                href="/pricing"
                className="inline-flex items-center gap-2 px-10 py-5 glass-strong hover:bg-white/5 text-white font-semibold rounded-xl transition-all duration-300 text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('ctaComparePlans')}
              </motion.a>
            </div>
            <p className="mt-8 text-sm text-text-muted">{t('finalCtaSubtext')}</p>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

// Default export for Astro component import
export default HomePageClient;
