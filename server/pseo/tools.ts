/**
 * Tools Pages Data Loader
 *
 * Provides data access for programmatic SEO free tool pages.
 * Follows the same pattern as server/pseo/alternatives.ts for consistency.
 *
 * Edge-compatible - uses JSON imports instead of filesystem access.
 */

import toolsDataRaw from '@/content/tools-data.json';
import type { IToolPage, IToolPageMeta } from '@shared/types/pseo.types';

const toolsData = toolsDataRaw as { pages: IToolPage[] };

/**
 * Get all tool pages metadata (for listing and sitemap)
 * Edge-compatible - no filesystem access
 */
export function getAllTools(): IToolPageMeta[] {
  return toolsData.pages.map(page => ({
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    toolName: page.toolName,
    lastUpdated: page.lastUpdated,
  }));
}

/**
 * Get a single tool page by slug
 * Edge-compatible - no filesystem access
 */
export function getToolBySlug(slug: string): IToolPage | null {
  return toolsData.pages.find(p => p.slug === slug) || null;
}

/**
 * Get all slugs for static generation
 */
export function getAllToolSlugs(): string[] {
  return toolsData.pages.map(p => p.slug);
}

/**
 * Get tool pages by slugs (for related tools sections)
 */
export function getToolsBySlugs(slugs: string[]): IToolPageMeta[] {
  return slugs
    .map(slug => toolsData.pages.find(p => p.slug === slug))
    .filter((page): page is IToolPage => page !== undefined)
    .map(page => ({
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      toolName: page.toolName,
      lastUpdated: page.lastUpdated,
    }));
}

/**
 * Get full tool pages by slugs (for related tools with full data)
 */
export function getFullToolsBySlugs(slugs: string[]): IToolPage[] {
  return slugs
    .map(slug => toolsData.pages.find(p => p.slug === slug))
    .filter((page): page is IToolPage => page !== undefined);
}
