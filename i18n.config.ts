import { getRequestConfig } from 'next-intl/server';
import { IntlErrorCode } from 'next-intl';
import { DEFAULT_LOCALE, isValidLocale } from './i18n/config';
import { isDevelopment } from '@shared/config/env';

/**
 * Deep merge two objects, with source taking precedence
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * next-intl configuration
 * This file is automatically discovered by next-intl
 */
// eslint-disable-next-line import/no-default-export
export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !isValidLocale(locale)) {
    locale = DEFAULT_LOCALE;
  }

  // Load all translation files and merge them
  const [
    common,
    dashboard,
    auth,
    pricing,
    help,
    howItWorks,
    blog,
    homepage,
    stripe,
    subscription,
    checkout,
    i18n,
    errors,
    admin,
    modal,
    nav,
    privacy,
    terms,
    defaultCommon,
    defaultDashboard,
    defaultAuth,
    defaultPricing,
    defaultHelp,
    defaultHowItWorks,
    defaultBlog,
    defaultHomepage,
    defaultStripe,
    defaultSubscription,
    defaultCheckout,
    defaultI18n,
    defaultErrors,
    defaultAdmin,
    defaultModal,
    defaultNav,
    defaultPrivacy,
    defaultTerms,
  ] = await Promise.all([
    import(`./locales/${locale}/common.json`),
    import(`./locales/${locale}/dashboard.json`),
    import(`./locales/${locale}/auth.json`),
    import(`./locales/${locale}/pricing.json`),
    import(`./locales/${locale}/help.json`),
    import(`./locales/${locale}/howItWorks.json`),
    import(`./locales/${locale}/blog.json`),
    import(`./locales/${locale}/homepage.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/stripe.json`),
    import(`./locales/${locale}/subscription.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/checkout.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/i18n.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/errors.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/admin.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/modal.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/nav.json`),
    import(`./locales/${locale}/privacy.json`).catch(() => ({ default: {} })),
    import(`./locales/${locale}/terms.json`).catch(() => ({ default: {} })),
    // Load default locale (English) as fallback
    import(`./locales/${DEFAULT_LOCALE}/common.json`),
    import(`./locales/${DEFAULT_LOCALE}/dashboard.json`),
    import(`./locales/${DEFAULT_LOCALE}/auth.json`),
    import(`./locales/${DEFAULT_LOCALE}/pricing.json`),
    import(`./locales/${DEFAULT_LOCALE}/help.json`),
    import(`./locales/${DEFAULT_LOCALE}/howItWorks.json`),
    import(`./locales/${DEFAULT_LOCALE}/blog.json`),
    import(`./locales/${DEFAULT_LOCALE}/homepage.json`),
    import(`./locales/${DEFAULT_LOCALE}/stripe.json`),
    import(`./locales/${DEFAULT_LOCALE}/subscription.json`),
    import(`./locales/${DEFAULT_LOCALE}/checkout.json`),
    import(`./locales/${DEFAULT_LOCALE}/i18n.json`),
    import(`./locales/${DEFAULT_LOCALE}/errors.json`),
    import(`./locales/${DEFAULT_LOCALE}/admin.json`),
    import(`./locales/${DEFAULT_LOCALE}/modal.json`),
    import(`./locales/${DEFAULT_LOCALE}/nav.json`),
    import(`./locales/${DEFAULT_LOCALE}/privacy.json`),
    import(`./locales/${DEFAULT_LOCALE}/terms.json`),
  ]);

  // Deep merge current locale with default locale to fill in missing keys
  const messages = {
    ...deepMerge(defaultCommon.default, common.default),
    dashboard: deepMerge(defaultDashboard.default, dashboard.default),
    auth: deepMerge(defaultAuth.default, auth.default),
    pricing: deepMerge(defaultPricing.default, pricing.default),
    help: deepMerge(defaultHelp.default, help.default),
    howItWorks: deepMerge(defaultHowItWorks.default, howItWorks.default),
    blog: deepMerge(defaultBlog.default, blog.default),
    homepage: deepMerge(defaultHomepage.default, homepage.default),
    stripe: deepMerge(defaultStripe.default, stripe.default),
    subscription: deepMerge(defaultSubscription.default, subscription.default),
    checkout: deepMerge(defaultCheckout.default, checkout.default),
    i18n: deepMerge(defaultI18n.default, i18n.default),
    errors: deepMerge(defaultErrors.default, errors.default),
    admin: deepMerge(defaultAdmin.default, admin.default),
    modal: deepMerge(defaultModal.default, modal.default),
    nav: deepMerge(defaultNav.default, nav.default),
    privacy: deepMerge(defaultPrivacy.default, privacy.default),
    terms: deepMerge(defaultTerms.default, terms.default),
  };

  return {
    locale,
    messages,
    onError: error => {
      // Show warning instead of throwing for missing messages
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        if (isDevelopment()) {
          console.warn(`[i18n] ${error.message}`);
        }
        return;
      }
      // For other errors, log them but don't throw
      console.error('[i18n] Error:', error.message);
    },
    getMessageFallback: ({ key }) => {
      // If not found anywhere, return the key as last resort
      if (isDevelopment()) {
        console.warn(`[i18n] Missing translation: ${key}`);
      }
      return key;
    },
  };
});
