/**
 * Sitemap and Robots.txt Unit Tests
 *
 * Verifies that sitemap-geo.xml is referenced in both
 * the sitemap index and robots.txt Sitemap directives.
 */

import { describe, it, expect } from 'vitest';
import type { APIContext } from 'astro';
import { GET as getSitemapIndex } from '@src/pages/sitemap.xml';
import { GET as getRobotsTxt } from '@src/pages/robots.txt';

const mockContext = {} as APIContext;

describe('sitemap index (sitemap.xml)', () => {
  it('should include sitemap-geo.xml in sitemap index', async () => {
    const response = getSitemapIndex(mockContext);
    const body = await response.text();

    expect(body).toContain('sitemap-geo.xml');
  });

  it('should include all expected sitemaps', async () => {
    const response = getSitemapIndex(mockContext);
    const body = await response.text();

    expect(body).toContain('sitemap-static.xml');
    expect(body).toContain('sitemap-blog.xml');
    expect(body).toContain('sitemap-tools.xml');
    expect(body).toContain('sitemap-comparisons.xml');
    expect(body).toContain('sitemap-alternatives.xml');
    expect(body).toContain('sitemap-use-cases.xml');
    expect(body).toContain('sitemap-geo.xml');
  });

  it('should return valid XML with correct content-type', () => {
    const response = getSitemapIndex(mockContext);

    expect(response.headers.get('Content-Type')).toContain('application/xml');
  });
});

describe('robots.txt', () => {
  it('should reference sitemap-geo.xml in robots.txt', async () => {
    const response = getRobotsTxt(mockContext);
    const body = await response.text();

    expect(body).toContain('sitemap-geo.xml');
  });

  it('should have all expected Sitemap directives', async () => {
    const response = getRobotsTxt(mockContext);
    const body = await response.text();

    expect(body).toContain('Sitemap:');
    expect(body).toContain('sitemap.xml');
    expect(body).toContain('sitemap-geo.xml');
  });

  it('should return plain text with correct content-type', () => {
    const response = getRobotsTxt(mockContext);

    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });
});
