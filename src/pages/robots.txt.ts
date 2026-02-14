/**
 * Robots.txt Configuration
 * Based on PRD-PSEO-04 Section 5.1: Robots.txt Implementation
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';

export const GET: APIRoute = () => {
  const BASE_URL = clientEnv.BASE_URL;

  const robotsTxt = `# Robots.txt Configuration
# Based on PRD-PSEO-04 Section 5.1

User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /_astro/
Disallow: /private/
Disallow: /*.json$
Disallow: /success
Disallow: /canceled

# Block AI scrapers
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Google-Extended
Disallow: /

# Sitemap
Sitemap: ${BASE_URL}/sitemap-static.xml
Sitemap: ${BASE_URL}/sitemap-blog.xml
Sitemap: ${BASE_URL}/sitemap-alternatives.xml
Sitemap: ${BASE_URL}/sitemap-comparisons.xml
Sitemap: ${BASE_URL}/sitemap-use-cases.xml
Sitemap: ${BASE_URL}/sitemap-tools.xml

# Host
Host: ${BASE_URL}
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    },
  });
};
