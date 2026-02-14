/**
 * Use Case Pages Data Loader
 *
 * Provides data access for programmatic SEO use case pages.
 * Follows the same pattern as server/pseo/alternatives.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import useCasesDataRaw from '@/content/use-cases-data.json';
import type { IUseCasePage, IUseCasePageMeta } from '@shared/types/pseo.types';

const useCasesData = useCasesDataRaw as { pages: IUseCasePage[] };

/**
 * Get all use case pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllUseCases(): IUseCasePageMeta[] {
  return useCasesData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    industry: page.industry,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single use case page by slug
 * Edge-compatible - no filesystem access
 */
export function getUseCaseBySlug(slug: string): IUseCasePage | null {
  return useCasesData.pages.find(p => p.slug === slug) || null;
}

/**
 * Get all slugs for static generation
 */
export function getAllUseCaseSlugs(): string[] {
  return useCasesData.pages.map(p => p.slug);
}

/**
 * Get use case pages by slugs (for related use cases sections)
 */
export function getUseCasesBySlugs(slugs: string[]): IUseCasePageMeta[] {
  return slugs
    .map(slug => useCasesData.pages.find(p => p.slug === slug))
    .filter((page): page is IUseCasePage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      industry: page.industry,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full use case pages by slugs (for related use cases with full data)
 */
export function getFullUseCasesBySlugs(slugs: string[]): IUseCasePage[] {
  return slugs
    .map(slug => useCasesData.pages.find(p => p.slug === slug))
    .filter((page): page is IUseCasePage => page !== undefined);
}

/**
 * Get use cases grouped by industry
 */
export function getUseCasesByIndustry(): Record<string, IUseCasePageMeta[]> {
  const allUseCases = getAllUseCases();
  return allUseCases.reduce(
    (acc, useCase) => {
      const industry = useCase.industry;
      if (!acc[industry]) {
        acc[industry] = [];
      }
      acc[industry].push(useCase);
      return acc;
    },
    {} as Record<string, IUseCasePageMeta[]>
  );
}

/**
 * Get all unique industries
 */
export function getAllIndustries(): string[] {
  const industries = new Set(useCasesData.pages.map(p => p.industry));
  return Array.from(industries);
}
