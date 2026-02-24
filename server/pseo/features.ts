/**
 * Feature Pages Data Loader
 *
 * Provides data access for programmatic SEO feature landing pages.
 * Follows the same pattern as server/pseo/alternatives.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import featuresDataRaw from '@/content/features-data.json';
import type { IFeaturePage, IFeaturePageMeta } from '@shared/types/pseo.types';

const featuresData = featuresDataRaw as { pages: IFeaturePage[] };

/**
 * Get all feature pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllFeatures(): IFeaturePageMeta[] {
  return featuresData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    featureName: page.featureName,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single feature page by slug
 * Edge-compatible - no filesystem access
 */
export function getFeatureBySlug(slug: string): IFeaturePage | undefined {
  return featuresData.pages.find(p => p.slug === slug);
}

/**
 * Get all slugs for static generation
 */
export function getAllFeatureSlugs(): string[] {
  return featuresData.pages.map(p => p.slug);
}

/**
 * Get feature pages by slugs (for related features sections)
 */
export function getFeaturesBySlugs(slugs: string[]): IFeaturePageMeta[] {
  return slugs
    .map(slug => featuresData.pages.find(p => p.slug === slug))
    .filter((page): page is IFeaturePage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      featureName: page.featureName,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full feature pages by slugs (for related features with full data)
 */
export function getFullFeaturesBySlugs(slugs: string[]): IFeaturePage[] {
  return slugs
    .map(slug => featuresData.pages.find(p => p.slug === slug))
    .filter((page): page is IFeaturePage => page !== undefined);
}
