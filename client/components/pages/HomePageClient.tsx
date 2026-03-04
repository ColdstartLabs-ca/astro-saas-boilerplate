/**
 * Home Page Client Component
 *
 * Landing page for the SaaS boilerplate.
 * Replace this with your own landing page content.
 */

import { getTranslations } from '@src/i18n/utils';

export default function HomePageClient() {
  const t = getTranslations('homepage');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm mb-6">
          {t('badge')}
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-primary">{t('heroTitle')}</span>{' '}
          <span className="text-accent">{t('heroTitleHighlight')}</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('heroSubtitle')}{' '}
          <span className="text-foreground font-medium">{t('heroSubtitleHighlight')}</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
          >
            {t('ctaSignIn')}
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t('ctaUpscaleFirst')}
          </a>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{t('ctaSubtext')}</p>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-xl font-semibold mb-2">Authentication</h3>
            <p className="text-muted-foreground">
              Supabase Auth with email/password, Google, Facebook, and Azure SSO support.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-xl font-semibold mb-2">Billing</h3>
            <p className="text-muted-foreground">
              Stripe integration with subscriptions, one-time credit packs, and customer portal.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <h3 className="text-xl font-semibold mb-2">Credits System</h3>
            <p className="text-muted-foreground">
              Flexible credit-based usage with rollover, expiration, and admin management.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('finalCtaTitle')}</h2>
        <p className="text-xl text-muted-foreground mb-8">{t('finalCtaTitleHighlight')}</p>
        <a
          href="/auth/signup"
          className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
        >
          {t('ctaStartUpscaling')}
        </a>
      </section>
    </div>
  );
}
