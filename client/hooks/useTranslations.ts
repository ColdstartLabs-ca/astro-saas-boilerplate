/**
 * React translation hook for Astro i18n
 *
 * This hook wraps the shared translation utilities for use in React components.
 * The actual translation logic lives in @shared/i18n to avoid circular dependencies.
 */

'use client';

import { useMemo } from 'react';
import { getTranslations, type TFunction } from '@shared/i18n';

/**
 * React hook for translations
 * Replaces next-intl's useTranslations for React islands
 *
 * @param namespace - Translation namespace (e.g., 'dashboard', 'stripe')
 * @returns Translation function
 *
 * @example
 * const t = useTranslations('dashboard');
 * t('sidebar.overview'); // Returns translated string
 * t('overview.welcomeBack', { name: 'John' }); // Returns with params replaced
 */
export function useTranslations(namespace: string): TFunction {
  // useMemo ensures the translation function is stable across re-renders
  return useMemo(() => getTranslations(namespace), [namespace]);
}

/**
 * Get translations in non-hook contexts (e.g., callbacks, event handlers)
 * Re-exports from shared module for convenience
 *
 * @param namespace - Translation namespace
 * @returns Translation function
 */
export { getTranslations };

// Re-export types for convenience
export type { TFunction };
