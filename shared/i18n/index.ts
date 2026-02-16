/**
 * Shared i18n Module
 *
 * Re-exports core translation utilities for use across the codebase.
 * This module has no client-side dependencies.
 */

export {
  getTranslations,
  getNamespaceTranslations,
  formatDate,
  type TFunction,
} from './translations';
