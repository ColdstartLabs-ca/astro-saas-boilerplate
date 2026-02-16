/**
 * Astro i18n utilities
 * Re-exports shared translation functions for Astro pages and API routes.
 *
 * IMPORTANT: This module no longer re-exports the React useTranslations hook
 * to avoid circular dependencies. For React components, import from:
 *   - '@client/hooks/useTranslations' for the hook
 *   - '@shared/i18n' for the getTranslations function
 */

// Re-export everything from shared/i18n for backward compatibility
export {
  getTranslations,
  getNamespaceTranslations,
  formatDate,
  type TFunction,
} from '@shared/i18n';
