/**
 * Static Pages Sitemap Route
 * Contains all static marketing and utility pages
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';

const BASE_URL = `https://${clientEnv.PRIMARY_DOMAIN}`;

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/', priority: '0.95', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/features', priority: '0.85', changefreq: 'weekly' },
  { path: '/how-it-works', priority: '0.85', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/help', priority: '0.6', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  // pSEO index pages
  { path: '/alternative', priority: '0.8', changefreq: 'weekly' },
  { path: '/compare', priority: '0.8', changefreq: 'weekly' },
  { path: '/use-cases', priority: '0.8', changefreq: 'weekly' },
  { path: '/tools', priority: '0.8', changefreq: 'weekly' },
  // Resources
  { path: '/resources', priority: '0.7', changefreq: 'weekly' },
  { path: '/resources/best-ai-seo-tools-2026', priority: '0.8', changefreq: 'monthly' },
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    page => `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
