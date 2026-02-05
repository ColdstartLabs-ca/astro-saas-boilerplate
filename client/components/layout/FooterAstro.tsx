import { clientEnv } from '@shared/config/env';

// Simple translations for footer (will be replaced with proper i18n)
const t = (key: string) => {
  const translations: Record<string, string> = {
    description: 'Build and scale your SaaS with powerful APIs and developer-friendly tools.',
    product: 'Product',
    pricingPlans: 'Pricing Plans',
    latestUpdates: 'Blog',
    support: 'Support',
    helpCenter: 'Help Center',
    contactSupport: 'Contact Support',
    legal: 'Legal',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    copyright: 'All rights reserved',
    allRightsReserved: 'All rights reserved',
  };
  return translations[key] || key;
};

export function FooterAstro(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-main text-text-muted mt-auto border-t border-border">
      <div className="max-w-[1600px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="space-y-4">
            <a href="/">
              <img
                src="/logo/horizontal-logo-full.png"
                alt={clientEnv.APP_NAME}
                width={180}
                height={45}
                className="h-10 w-auto"
              />
            </a>
            <p className="text-sm text-text-muted font-medium leading-relaxed max-w-xs">
              {t('description')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">
              {t('product')}
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href="/pricing" className="hover:text-accent transition-colors">
                  {t('pricingPlans')}
                </a>
              </li>
              <li>
                <a href="/blog" className="hover:text-accent transition-colors">
                  {t('latestUpdates')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">
              {t('support')}
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href="/help" className="hover:text-accent transition-colors">
                  {t('helpCenter')}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${clientEnv.SUPPORT_EMAIL}`}
                  className="hover:text-accent transition-colors"
                >
                  {t('contactSupport')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">
              {t('legal')}
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href="/privacy" className="hover:text-accent transition-colors">
                  {t('privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-accent transition-colors">
                  {t('termsOfService')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-muted">
            {t('copyright')} © {currentYear} {clientEnv.APP_NAME}. {t('allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
