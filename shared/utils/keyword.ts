/**
 * Keyword normalization utilities
 *
 * Functions for normalizing keywords to enable duplicate detection
 * and comparison regardless of case, whitespace, or formatting.
 */

/**
 * Normalize a keyword for duplicate detection and comparison.
 *
 * This function:
 * - Converts to lowercase
 * - Trims leading/trailing whitespace
 * - Collapses internal whitespace to single spaces
 * - Removes extra spacing between words
 *
 * @param keyword - The raw keyword to normalize
 * @returns Normalized keyword suitable for comparison
 *
 * @example
 * ```ts
 * normalizeKeyword('  SEO  Optimization  ')
 * // Returns: 'seo optimization'
 *
 * normalizeKeyword('Coffee    Machines')
 * // Returns: 'coffee machines'
 *
 * normalizeKeyword('  best   coffee   machines  ')
 * // Returns: 'best coffee machines'
 * ```
 */
export function normalizeKeyword(keyword: string): string {
  if (!keyword) return '';

  return keyword.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two keywords are equivalent after normalization.
 *
 * @param keyword1 - First keyword to compare
 * @param keyword2 - Second keyword to compare
 * @returns true if keywords are equivalent after normalization
 *
 * @example
 * ```ts
 * areKeywordsEquivalent('SEO Optimization', '  seo  optimization  ')
 * // Returns: true
 *
 * areKeywordsEquivalent('Coffee Machines', 'coffee    machines')
 * // Returns: true
 *
 * areKeywordsEquivalent('SEO', 'SEM')
 * // Returns: false
 * ```
 */
export function areKeywordsEquivalent(keyword1: string, keyword2: string): boolean {
  return normalizeKeyword(keyword1) === normalizeKeyword(keyword2);
}
