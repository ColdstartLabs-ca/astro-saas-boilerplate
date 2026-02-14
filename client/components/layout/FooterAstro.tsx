import { clientEnv } from '@shared/config/env';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';
import { Logo } from '@client/components/logo/Logo';
import { useMemo } from 'react';
import { getTranslations } from '@src/i18n/utils';
import { DEFAULT_LOCALE } from '@src/i18n/config';

export function FooterAstro(): JSX.Element {
  const t = useMemo(() => getTranslations('footer'), []);
  const currentYear = new Date().getFullYear();

  // Helper to generate localized URLs
  const localizedPath = (path: string) => {
    return DEFAULT_LOCALE === 'en' ? path : `/${DEFAULT_LOCALE}${path}`;
  };

  return (
    <footer className="bg-main text-text-muted mt-auto border-t border-border">
      <div className="max-w-[1600px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Company Info */}
          <div className="space-y-4">
            <a href="/">
              <Logo variant="full" />
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
                <a href={localizedPath('/pricing')} className="hover:text-accent transition-colors">
                  {t('pricingPlans')}
                </a>
              </li>
              <li>
                <a href={localizedPath('/blog')} className="hover:text-accent transition-colors">
                  {t('latestUpdates')}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources - pSEO Links */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">
              {t('resources')}
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href="/alternative" className="hover:text-accent transition-colors">
                  {t('alternatives')}
                </a>
              </li>
              <li>
                <a href="/compare" className="hover:text-accent transition-colors">
                  {t('comparisons')}
                </a>
              </li>
              <li>
                <a href="/use-cases" className="hover:text-accent transition-colors">
                  {t('useCases')}
                </a>
              </li>
              <li>
                <a href="/tools" className="hover:text-accent transition-colors">
                  {t('freeSeoTools')}
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
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-medium text-text-muted">
            © {currentYear} {clientEnv.APP_NAME}. {t('allRightsReserved')} {t('copyright')}
          </p>
          <div className="flex items-center gap-6">
            <LocaleSwitcher />
            <div className="flex gap-8 text-xs font-black uppercase tracking-widest">
              <a href="/privacy" className="hover:text-white transition-colors">
                {t('privacy')}
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                {t('terms')}
              </a>
              <a href="/help" className="hover:text-white transition-colors">
                {t('help')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
