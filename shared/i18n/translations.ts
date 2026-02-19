/**
 * Core Translation Utilities
 *
 * This module contains the shared translation logic that can be used by both:
 * - Server-side code (Astro pages, API routes)
 * - Client-side code (React hooks)
 *
 * Supports multi-locale translations with fallback to English.
 *
 * IMPORTANT: This module has NO client-side dependencies to avoid circular imports.
 */

import { DEFAULT_LOCALE, type Locale } from '../../i18n/config';

// English translations
import enPrivacy from '@locales/en/privacy.json';
import enTerms from '@locales/en/terms.json';
import enHelp from '@locales/en/help.json';
import enHomepage from '@locales/en/homepage.json';
import enPricing from '@locales/en/pricing.json';
import enNav from '@locales/en/nav.json';
import enCommon from '@locales/en/common.json';
import enAdmin from '@locales/en/admin.json';
import enCheckout from '@locales/en/checkout.json';
import enAuth from '@locales/en/auth.json';
import enBlog from '@locales/en/blog.json';
import enErrors from '@locales/en/errors.json';
import enModal from '@locales/en/modal.json';
import enSubscription from '@locales/en/subscription.json';
import enStripe from '@locales/en/stripe.json';
import enI18n from '@locales/en/i18n.json';
import enHowItWorks from '@locales/en/howItWorks.json';
import enDashboard from '@locales/en/dashboard.json';

// Portuguese (Brazil) translations
import ptBRPrivacy from '@locales/pt-BR/privacy.json';
import ptBRTerms from '@locales/pt-BR/terms.json';
import ptBRHelp from '@locales/pt-BR/help.json';
import ptBRHomepage from '@locales/pt-BR/homepage.json';
import ptBRPricing from '@locales/pt-BR/pricing.json';
import ptBRNav from '@locales/pt-BR/nav.json';
import ptBRCommon from '@locales/pt-BR/common.json';
import ptBRAdmin from '@locales/pt-BR/admin.json';
import ptBRCheckout from '@locales/pt-BR/checkout.json';
import ptBRAuth from '@locales/pt-BR/auth.json';
import ptBRBlog from '@locales/pt-BR/blog.json';
import ptBRErrors from '@locales/pt-BR/errors.json';
import ptBRModal from '@locales/pt-BR/modal.json';
import ptBRSubscription from '@locales/pt-BR/subscription.json';
import ptBRStripe from '@locales/pt-BR/stripe.json';
import ptBRI18n from '@locales/pt-BR/i18n.json';
import ptBRHowItWorks from '@locales/pt-BR/howItWorks.json';
import ptBRDashboard from '@locales/pt-BR/dashboard.json';
import ptBRSettings from '@locales/pt-BR/settings.json';

// =============================================================================
// Types
// =============================================================================

/**
 * Translation function type
 * Supports key lookup with optional parameter interpolation
 */
export type TFunction = ((key: string, params?: Record<string, string | number>) => string) & {
  raw: (key: string) => unknown;
};

/**
 * Registry type for translations by locale
 */
type TranslationRegistry = Record<string, Record<string, unknown>>;

// =============================================================================
// Translation Data
// =============================================================================

/**
 * English translations registry
 */
const enTranslations: TranslationRegistry = {
  privacy: enPrivacy,
  terms: enTerms,
  help: enHelp,
  homepage: enHomepage,
  pricing: enPricing,
  nav: enNav,
  common: enCommon,
  admin: enAdmin,
  checkout: enCheckout,
  auth: enAuth,
  blog: enBlog,
  errors: enErrors,
  modal: enModal,
  subscription: enSubscription,
  stripe: enStripe,
  i18n: enI18n,
  howItWorks: enHowItWorks,
  dashboard: enDashboard,
  footer: ((enCommon as Record<string, unknown>).footer || {}) as Record<string, unknown>,
} as const;

/**
 * Portuguese (Brazil) translations registry
 */
const ptBRTranslations: TranslationRegistry = {
  privacy: ptBRPrivacy,
  terms: ptBRTerms,
  help: ptBRHelp,
  homepage: ptBRHomepage,
  pricing: ptBRPricing,
  nav: ptBRNav,
  common: ptBRCommon,
  admin: ptBRAdmin,
  checkout: ptBRCheckout,
  auth: ptBRAuth,
  blog: ptBRBlog,
  errors: ptBRErrors,
  modal: ptBRModal,
  subscription: ptBRSubscription,
  stripe: ptBRStripe,
  i18n: ptBRI18n,
  howItWorks: ptBRHowItWorks,
  dashboard: ptBRDashboard,
  footer: ((ptBRCommon as Record<string, unknown>).footer || {}) as Record<string, unknown>,
  settings: ptBRSettings,
} as const;

/**
 * All translations by locale
 * Used to look up translations based on the current locale
 */
const translationsByLocale: Record<string, TranslationRegistry> = {
  en: enTranslations,
  'pt-BR': ptBRTranslations,
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Deep merge two objects, with source values taking precedence
 * Used to fill in missing translations from fallback locale
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(
        (result[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else if (!(key in result)) {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Get a translation function for a specific namespace and locale
 *
 * @param namespace - The translation namespace (e.g., 'privacy', 'terms', 'dashboard.articles.seo')
 * @param locale - The locale to use (default: 'en')
 * @returns Translation function
 *
 * @example
 * // Get English translations (backward compatible)
 * const t = getTranslations('dashboard');
 *
 * @example
 * // Get Portuguese translations
 * const t = getTranslations('dashboard', 'pt-BR');
 */
export function getTranslations(namespace: string, locale: Locale = DEFAULT_LOCALE): TFunction {
  // Get the translations for the specified locale
  const localeTranslations = translationsByLocale[locale] || translationsByLocale[DEFAULT_LOCALE];

  // Get fallback translations (English)
  const fallbackTranslations = translationsByLocale[DEFAULT_LOCALE];

  // Support nested namespace paths (e.g., 'dashboard.articles.seo')
  const getNamespace = (registry: TranslationRegistry): Record<string, unknown> => {
    return namespace.split('.').reduce(
      (obj, key) => {
        if (obj && typeof obj === 'object' && key in obj) {
          return obj[key] as Record<string, unknown>;
        }
        return {};
      },
      registry as Record<string, unknown>
    ) as Record<string, unknown>;
  };

  // Get the namespace from both locale and fallback
  const localeNs = getNamespace(localeTranslations);
  const fallbackNs = getNamespace(fallbackTranslations);

  // Merge with fallback for missing keys
  const ns = locale === DEFAULT_LOCALE ? localeNs : deepMerge(fallbackNs, localeNs);

  const resolve = (key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = ns;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }

    return value;
  };

  const t = ((key: string, params?: Record<string, string | number>) => {
    const value = resolve(key);

    if (typeof value !== 'string') {
      return key;
    }

    // Replace params like {APP_NAME} with actual values
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{${paramKey}}`;
      });
    }

    return value;
  }) as TFunction;

  t.raw = (key: string): unknown => {
    const value = resolve(key);
    return value ?? key;
  };

  return t;
}

/**
 * Get translations as an object (for destructuring)
 * @param namespace - The translation namespace
 * @param locale - The locale to use (default: 'en')
 * @returns All translations in the namespace
 */
export function getNamespaceTranslations(
  namespace: string,
  locale: Locale = DEFAULT_LOCALE
): Record<string, unknown> {
  const localeTranslations = translationsByLocale[locale] || translationsByLocale[DEFAULT_LOCALE];
  return localeTranslations[namespace] || {};
}

/**
 * Format a date based on locale
 * @param date - Date to format
 * @param locale - Locale code (default: 'en')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Map locale codes to Intl locale format
  const intlLocale = locale === 'pt-BR' ? 'pt-BR' : locale;
  return d.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
