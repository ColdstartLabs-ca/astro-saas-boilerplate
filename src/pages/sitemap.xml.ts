/**
 * Sitemap Index Route
 *
 * Lists all sitemap files and serves as the main sitemap entry point.
 * Includes locale-aware URLs for hreflang SEO.
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';

const BASE_URL = `https://${clientEnv.PRIMARY_DOMAIN}`;

export const GET: APIRoute = () => {
  const sitemaps = [
    '/sitemap-static.xml',
    '/sitemap-blog.xml',
    '/sitemap-tools.xml',
    '/sitemap-comparisons.xml',
    '/sitemap-alternatives.xml',
    '/sitemap-use-cases.xml',
    '/sitemap-geo.xml',
    '/sitemap-features.xml',
  ];

  const lastmod = '2026-02-23';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    sitemap => `  <sitemap>
    <loc>${BASE_URL}${sitemap}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
