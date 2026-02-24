/**
 * Static Pages Sitemap Route
 * Contains all static marketing and utility pages
 * Includes hreflang links for i18n SEO
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '../../i18n/config';

const BASE_URL = `https://${clientEnv.PRIMARY_DOMAIN}`;

/**
 * Pages that should have locale variants in sitemap
 * These are the main localized pages
 */
const localizablePages = [
  { path: '/', priority: '1.0', changefreq: 'daily', lastmod: '2026-02-20' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly', lastmod: '2026-02-15' },
  { path: '/features', priority: '0.85', changefreq: 'weekly', lastmod: '2026-02-15' },
  { path: '/how-it-works', priority: '0.85', changefreq: 'weekly', lastmod: '2026-02-15' },
  { path: '/blog', priority: '0.8', changefreq: 'daily', lastmod: '2026-02-23' },
  { path: '/help', priority: '0.6', changefreq: 'monthly', lastmod: '2026-01-15' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly', lastmod: '2026-01-01' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly', lastmod: '2026-01-01' },
];

/**
 * Pages that are English-only (pSEO pages, resources, etc.)
 * These don't get locale variants
 */
const englishOnlyPages = [
  { path: '/alternative', priority: '0.8', changefreq: 'weekly', lastmod: '2026-02-17' },
  { path: '/compare', priority: '0.8', changefreq: 'weekly', lastmod: '2026-02-17' },
  { path: '/use-cases', priority: '0.8', changefreq: 'weekly', lastmod: '2026-02-17' },
  { path: '/tools', priority: '0.8', changefreq: 'weekly', lastmod: '2026-02-13' },
  { path: '/resources', priority: '0.7', changefreq: 'weekly', lastmod: '2026-02-01' },
  {
    path: '/resources/best-ai-seo-tools-2026',
    priority: '0.8',
    changefreq: 'monthly',
    lastmod: '2026-02-01',
  },
];

/**
 * Get locale-specific URL path
 */
function getLocalePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) {
    return path;
  }
  return `/${locale}${path === '/' ? '' : path}`;
}

/**
 * Generate hreflang links for a URL
 */
function generateHreflangLinks(basePath: string): string {
  return SUPPORTED_LOCALES.map(locale => {
    const localePath = getLocalePath(basePath, locale);
    const hreflang = locale === 'pt-BR' ? 'pt-BR' : locale;
    return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${BASE_URL}${localePath}"/>`;
  }).join('\n');
}

/**
 * Generate URL entry with hreflang links
 */
function generateUrlEntry(
  path: string,
  priority: string,
  changefreq: string,
  locale: Locale,
  lastmod: string
): string {
  const localePath = getLocalePath(path, locale);
  const hreflangLinks = generateHreflangLinks(path);

  return `  <url>
    <loc>${BASE_URL}${localePath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangLinks}
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}"/>
  </url>`;
}

export const GET: APIRoute = () => {
  // Generate localized page entries
  const localizedUrls = localizablePages.flatMap(page =>
    SUPPORTED_LOCALES.map(locale =>
      generateUrlEntry(page.path, page.priority, page.changefreq, locale, page.lastmod)
    )
  );

  // Generate English-only page entries
  const englishUrls = englishOnlyPages.map(
    page => `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...localizedUrls, ...englishUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
