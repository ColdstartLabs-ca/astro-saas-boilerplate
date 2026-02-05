'use client';

import { useModalStore } from '@client/store/modalStore';
import { useToastStore } from '@client/store/toastStore';
import { prepareAuthRedirect } from '@client/utils/authRedirectManager';
import { getTranslations } from '@src/i18n/utils';
import { useEffect } from 'react';
import {
  HeroSection,
  PainPointsSection,
  SolutionSection,
  FeaturesSection,
  ComparisonSection,
  UseCasesSection,
  SocialProofSection,
  PricingPreviewSection,
  FAQSection,
} from '@client/components/landing';

export function HomePageClient(): JSX.Element {
  const { openAuthModal } = useModalStore();
  const { showToast } = useToastStore();

  // Use Astro i18n helper instead of next-intl's useTranslations
  const t = getTranslations('homepage');

  // Check for auth prompts from URL params (must access window inside useEffect)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
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
  }, [openAuthModal, showToast, t]);

  return (
    <div className="flex-grow bg-main font-sans selection:bg-accent/20 selection:text-white">
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Social Proof Top */}
      <SocialProofSection location="top" />

      {/* Section 3: Pain Points */}
      <PainPointsSection />

      {/* Section 4: Solution */}
      <SolutionSection />

      {/* Section 5: Features */}
      <FeaturesSection />

      {/* Section 6: Comparison */}
      <ComparisonSection />

      {/* Section 7: Use Cases */}
      <UseCasesSection />

      {/* Section 8: Social Proof Bottom */}
      <SocialProofSection location="bottom" />

      {/* Section 9: Pricing Preview */}
      <PricingPreviewSection />

      {/* Section 10: FAQ */}
      <FAQSection />
    </div>
  );
}

// Default export for Astro component import
export default HomePageClient;
