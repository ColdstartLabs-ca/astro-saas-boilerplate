/**
 * React translation hook for Astro i18n
 *
 * This is a thin wrapper that re-exports from src/i18n/utils.ts
 * to maintain a single source of truth for translations.
 *
 * The server-side utils are SSR-compatible and handle both
 * Astro pages and React islands.
 */

'use client';

import { useMemo } from 'react';
import { getTranslations as serverGetTranslations, type TFunction } from '@src/i18n/utils';

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
  return useMemo(() => serverGetTranslations(namespace), [namespace]);
}

/**
 * Get translations in non-hook contexts (e.g., callbacks, event handlers)
 * Re-exports from server utils for consistency
 *
 * @param namespace - Translation namespace
 * @returns Translation function
 */
export function getTranslations(namespace: string): TFunction {
  return serverGetTranslations(namespace);
}

// Re-export types for convenience
export type { TFunction };
