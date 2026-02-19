/**
 * GEO Pages Data Loader
 *
 * Provides data access for Generative Engine Optimization (GEO) pages.
 * Follows the same pattern as server/pseo/alternatives.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import geoDataRaw from '@/content/geo-data.json';
import type { IGeoPage, IGeoPageMeta } from '@shared/types/pseo.types';

const geoData = geoDataRaw as { pages: IGeoPage[] };

/**
 * Get all GEO pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllGeoPages(): IGeoPageMeta[] {
  return geoData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    topic: page.topic,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single GEO page by slug
 * Edge-compatible - no filesystem access
 */
export function getGeoPageBySlug(slug: string): IGeoPage | null {
  return geoData.pages.find(p => p.slug === slug) || null;
}

/**
 * Get all slugs for static generation
 */
export function getAllGeoSlugs(): string[] {
  return geoData.pages.map(p => p.slug);
}

/**
 * Get GEO pages by slugs (for related GEO sections)
 */
export function getGeoPagesBySlugs(slugs: string[]): IGeoPageMeta[] {
  return slugs
    .map(slug => geoData.pages.find(p => p.slug === slug))
    .filter((page): page is IGeoPage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      topic: page.topic,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full GEO pages by slugs (for related GEO pages with full data)
 */
export function getFullGeoPagesBySlugs(slugs: string[]): IGeoPage[] {
  return slugs
    .map(slug => geoData.pages.find(p => p.slug === slug))
    .filter((page): page is IGeoPage => page !== undefined);
}
