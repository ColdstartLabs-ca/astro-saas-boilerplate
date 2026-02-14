/**
 * Alternative Pages Data Loader
 *
 * Provides data access for programmatic SEO alternative comparison pages.
 * Follows the same pattern as server/blog.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import alternativesDataRaw from '@/content/alternatives-data.json';
import type { IAlternativePage, IAlternativePageMeta } from '@shared/types/pseo.types';

const alternativesData = alternativesDataRaw as { pages: IAlternativePage[] };

/**
 * Get all alternative pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllAlternatives(): IAlternativePageMeta[] {
  return alternativesData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    competitorName: page.competitorName,
    competitorSlug: page.competitorSlug,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single alternative page by slug
 * Edge-compatible - no filesystem access
 */
export function getAlternativeBySlug(slug: string): IAlternativePage | null {
  return alternativesData.pages.find(p => p.slug === slug) || null;
}

/**
 * Get all slugs for static generation
 */
export function getAllAlternativeSlugs(): string[] {
  return alternativesData.pages.map(p => p.slug);
}

/**
 * Get alternative pages by slugs (for related alternatives sections)
 */
export function getAlternativesBySlugs(slugs: string[]): IAlternativePageMeta[] {
  return slugs
    .map(slug => alternativesData.pages.find(p => p.slug === slug))
    .filter((page): page is IAlternativePage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      competitorName: page.competitorName,
      competitorSlug: page.competitorSlug,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full alternative pages by slugs (for related alternatives with full data)
 */
export function getFullAlternativesBySlugs(slugs: string[]): IAlternativePage[] {
  return slugs
    .map(slug => alternativesData.pages.find(p => p.slug === slug))
    .filter((page): page is IAlternativePage => page !== undefined);
}
