/**
 * Comparison Pages Data Loader
 *
 * Provides data access for programmatic SEO comparison pages.
 * Follows the same pattern as server/pseo/alternatives.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import comparisonsDataRaw from '@/content/comparisons-data.json';
import type { IComparisonPage, IComparisonPageMeta } from '@shared/types/pseo.types';

const comparisonsData = comparisonsDataRaw as { pages: IComparisonPage[] };

/**
 * Get all comparison pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllComparisons(): IComparisonPageMeta[] {
  return comparisonsData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    competitorA: page.competitorA,
    competitorB: page.competitorB,
    competitorBSlug: page.competitorBSlug,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single comparison page by slug
 * Edge-compatible - no filesystem access
 */
export function getComparisonBySlug(slug: string): IComparisonPage | null {
  return comparisonsData.pages.find(p => p.slug === slug) || null;
}

/**
 * Get all slugs for static generation
 */
export function getAllComparisonSlugs(): string[] {
  return comparisonsData.pages.map(p => p.slug);
}

/**
 * Get comparison pages by slugs (for related comparisons sections)
 */
export function getComparisonsBySlugs(slugs: string[]): IComparisonPageMeta[] {
  return slugs
    .map(slug => comparisonsData.pages.find(p => p.slug === slug))
    .filter((page): page is IComparisonPage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      competitorA: page.competitorA,
      competitorB: page.competitorB,
      competitorBSlug: page.competitorBSlug,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full comparison pages by slugs (for related comparisons with full data)
 */
export function getFullComparisonsBySlugs(slugs: string[]): IComparisonPage[] {
  return slugs
    .map(slug => comparisonsData.pages.find(p => p.slug === slug))
    .filter((page): page is IComparisonPage => page !== undefined);
}
