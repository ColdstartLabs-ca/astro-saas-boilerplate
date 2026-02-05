/**
 * React translation hook for Astro i18n
 * Replaces next-intl's useTranslations for React islands
 */

import { useMemo } from 'react';

// Type for translation function
export type TFunction = (key: string, params?: Record<string, string | number>) => string;

// Import all locale files
import enAdmin from '@locales/en/admin.json';
import enAuth from '@locales/en/auth.json';
import enBlog from '@locales/en/blog.json';
import enCheckout from '@locales/en/checkout.json';
import enCommon from '@locales/en/common.json';
import enDashboard from '@locales/en/dashboard.json';
import enErrors from '@locales/en/errors.json';
import enHelp from '@locales/en/help.json';
import enHomepage from '@locales/en/homepage.json';
import enHowItWorks from '@locales/en/howItWorks.json';
import enI18n from '@locales/en/i18n.json';
import enModal from '@locales/en/modal.json';
import enNav from '@locales/en/nav.json';
import enPricing from '@locales/en/pricing.json';
import enPrivacy from '@locales/en/privacy.json';
import enStripe from '@locales/en/stripe.json';
import enSubscription from '@locales/en/subscription.json';
import enTerms from '@locales/en/terms.json';

// Store all translations by namespace
const translations: Record<string, Record<string, unknown>> = {
  admin: enAdmin,
  auth: enAuth,
  blog: enBlog,
  checkout: enCheckout,
  common: enCommon,
  dashboard: enDashboard,
  errors: enErrors,
  help: enHelp,
  homepage: enHomepage,
  howItWorks: enHowItWorks,
  i18n: enI18n,
  modal: enModal,
  nav: enNav,
  pricing: enPricing,
  privacy: enPrivacy,
  stripe: enStripe,
  subscription: enSubscription,
  terms: enTerms,
} as const;

/**
 * Flatten nested object with dot notation keys
 */
function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }

  return Object.entries(obj as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(acc, flattenObject(value, newKey));
      } else if (typeof value === 'string') {
        acc[newKey] = value;
      }
      return acc;
    },
    {}
  );
}

/**
 * React hook for translations
 * Replaces next-intl's useTranslations
 *
 * @param namespace - Translation namespace (e.g., 'stripe', 'stripe.cancelSubscription')
 * @returns Translation function
 *
 * @example
 * const t = useTranslations('stripe.cancelSubscription');
 * t('title'); // Returns "Cancel Subscription"
 * t('info', { planName: 'Pro', formattedEndDate: 'Jan 1, 2025' }); // Returns with params replaced
 */
export function useTranslations(namespace: string): TFunction {
  const t = useMemo(() => {
    // Get the namespace object
    const parts = namespace.split('.');
    let nsData: unknown = translations;

    for (const part of parts) {
      if (nsData && typeof nsData === 'object' && part in nsData) {
        nsData = (nsData as Record<string, unknown>)[part];
      } else {
        // Namespace not found, return identity function
        return (key: string) => key;
      }
    }

    // Flatten the namespace for easier access
    const flatTranslations = flattenObject(nsData);

    return (key: string, params?: Record<string, string | number>) => {
      // Check if the key is a full path (includes dots) or relative to current namespace
      const fullKey = key.includes('.') ? key : `${namespace}.${key}`;

      // Try full key first
      let value = flatTranslations[fullKey];

      // If not found, try relative key
      if (value === undefined) {
        value = flatTranslations[key];
      }

      // Return key if translation not found
      if (value === undefined) {
        return key;
      }

      // Replace params like {planName} with actual values
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
          return params[paramKey]?.toString() ?? `{${paramKey}}`;
        });
      }

      return value;
    };
  }, [namespace]);

  return t;
}

/**
 * Get translations as an object (for non-component contexts)
 * @param namespace - Translation namespace
 * @returns All translations in the namespace
 */
export function getTranslations(namespace: string): TFunction {
  // Reuse the same logic as the hook
  const parts = namespace.split('.');
  let nsData: unknown = translations;

  for (const part of parts) {
    if (nsData && typeof nsData === 'object' && part in nsData) {
      nsData = (nsData as Record<string, unknown>)[part];
    } else {
      return (key: string) => key;
    }
  }

  const flatTranslations = flattenObject(nsData);

  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = key.includes('.') ? key : `${namespace}.${key}`;
    let value = flatTranslations[fullKey];

    if (value === undefined) {
      value = flatTranslations[key];
    }

    if (value === undefined) {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{${paramKey}}`;
      });
    }

    return value;
  };
}

/**
 * Get all translations from a namespace as an object
 */
export function getNamespaceTranslations<T = Record<string, unknown>>(
  namespace: string
): T {
  const parts = namespace.split('.');
  let nsData: unknown = translations;

  for (const part of parts) {
    if (nsData && typeof nsData === 'object' && part in nsData) {
      nsData = (nsData as Record<string, unknown>)[part];
    } else {
      return {} as T;
    }
  }

  return (nsData as T) || ({} as T);
}
