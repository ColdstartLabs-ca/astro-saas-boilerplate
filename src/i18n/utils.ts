/**
 * Astro i18n utilities
 * Replaces next-intl's useTranslations for Astro pages and React islands
 */

// Re-export useTranslations hook for React components
export { useTranslations } from '@client/hooks/useTranslations';

import enPrivacy from '@locales/en/privacy.json';
import enTerms from '@locales/en/terms.json';
import enHelp from '@locales/en/help.json';
import enHomepage from '@locales/en/homepage.json';
import enPricing from '@locales/en/pricing.json';
import enNav from '@locales/en/nav.json';
import enCommon from '@locales/en/common.json';

// Type for translation function
export type TFunction = (key: string, params?: Record<string, string | number>) => string;

// Store all translations
const translations: Record<string, Record<string, unknown>> = {
  privacy: enPrivacy,
  terms: enTerms,
  help: enHelp,
  homepage: enHomepage,
  pricing: enPricing,
  nav: enNav,
  common: enCommon,
  footer: ((enCommon as Record<string, unknown>).footer || {}) as Record<string, unknown>,
} as const;

/**
 * Get a translation function for a specific namespace
 * @param namespace - The translation namespace (e.g., 'privacy', 'terms')
 * @returns Translation function
 */
export function getTranslations(namespace: string): TFunction {
  const ns = translations[namespace] || {};

  return (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: unknown = ns;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }

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
  };
}

/**
 * Get translations as an object (for destructuring)
 * @param namespace - The translation namespace
 * @returns All translations in the namespace
 */
export function getNamespaceTranslations(namespace: string): Record<string, unknown> {
  return translations[namespace] || {};
}

/**
 * Format a date based on locale
 * @param date - Date to format
 * @param locale - Locale code (default: 'en')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
