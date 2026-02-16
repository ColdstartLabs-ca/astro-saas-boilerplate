import { test, expect } from '@playwright/test';

test.describe('Blog', () => {
  test.describe('Blog Index Page', () => {
    test('should display blog posts on index page', async ({ page }) => {
      await page.goto('/blog');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Verify page has correct title/meta
      await expect(page).toHaveTitle(/Blog/);

      // Check that blog posts are displayed (at least 3 posts)
      const postLinks = await page.locator('a[href^="/blog/"]').count();
      expect(postLinks).toBeGreaterThanOrEqual(3);

      // Verify featured post section exists
      const featuredSection = page.locator('article').first();
      await expect(featuredSection).toBeVisible();
    });

    test('should display post metadata correctly', async ({ page }) => {
      await page.goto('/blog');
      await page.waitForLoadState('networkidle');

      // Check for category badges
      const categoryBadge = page
        .locator('span:has-text("Product"), span:has-text("Guides"), span:has-text("Comparisons")')
        .first();
      await expect(categoryBadge).toBeVisible();

      // Check for reading time
      const readingTime = page.locator('text=/\\d+ min read/').first();
      await expect(readingTime).toBeVisible();

      // Check for dates
      const dateElement = page.locator('text=/2026/').first();
      await expect(dateElement).toBeVisible();
    });

    test('should have proper SEO metadata', async ({ page }) => {
      await page.goto('/blog');

      // Check meta description exists
      const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(metaDescription).toBeDefined();
      expect(metaDescription?.length).toBeGreaterThan(0);

      // Check canonical URL
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toContain('/blog');
    });
  });

  test.describe('Blog Post Detail Page', () => {
    test('should render blog post detail page', async ({ page }) => {
      await page.goto('/blog/introducing-autopilotrank');

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Verify the page title is present
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      await expect(title).toContainText('Introducing AutopilotRank');

      // Verify article container exists
      const articleContent = page.locator('article');
      await expect(articleContent).toBeVisible();
    });

    test('should display post author and date', async ({ page }) => {
      await page.goto('/blog/introducing-autopilotrank');
      await page.waitForLoadState('networkidle');

      // Check for author text on page (appears in "By {author}" format)
      const pageContent = await page.locator('article').textContent();
      expect(pageContent).toContain('AutopilotRank Team');

      // Check for date - the date is displayed with "By" prefix
      // e.g., "By AutopilotRank Team • 2026-02-16"
      const articleText = await page.locator('article').textContent();
      expect(articleText).toContain('2026');
    });

    test('should have back to blog link', async ({ page }) => {
      await page.goto('/blog/introducing-autopilotrank');
      await page.waitForLoadState('networkidle');

      // Check for back to blog link - it's an arrow character followed by text
      const backLink = page.locator('article > a[href="/blog"]').first();
      await expect(backLink).toBeVisible();
      // The link contains "← Back to Blog"
      const linkText = await backLink.textContent();
      expect(linkText).toContain('Back');
    });

    test('should have working internal links', async ({ page }) => {
      await page.goto('/blog/why-ai-seo-content');
      await page.waitForLoadState('networkidle');

      // Check for internal links to /pricing or /features
      const pricingLink = page.locator('a[href="/pricing"]');
      const featuresLink = page.locator('a[href="/features"]');

      // At least one of these should exist in the post
      const hasInternalLinks = (await pricingLink.count()) > 0 || (await featuresLink.count()) > 0;
      expect(hasInternalLinks).toBe(true);
    });

    test('should render comparison post', async ({ page }) => {
      await page.goto('/blog/autopilotrank-vs-outrank');
      await page.waitForLoadState('networkidle');

      // Verify title
      const title = page.locator('h1');
      await expect(title).toContainText('AutopilotRank vs Outrank');

      // Verify the page loaded and has content
      const articleContent = await page.locator('article').textContent();
      expect(articleContent).toContain('AutopilotRank');
      expect(articleContent).toContain('Outrank');
    });
  });

  test.describe('Blog Navigation', () => {
    test('should navigate from index to detail page', async ({ page }) => {
      await page.goto('/blog');
      await page.waitForLoadState('networkidle');

      // Click on the first blog post link
      const firstPostLink = page.locator('a[href^="/blog/"]').first();
      const postUrl = await firstPostLink.getAttribute('href');
      expect(postUrl).not.toBeNull();

      await firstPostLink.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // Verify we're on a blog post page (URL contains /blog/ and has more path segments)
      const url = page.url();
      expect(url).toContain('/blog/');
      // Verify we're not just on /blog (should have additional path)
      expect(url.match(/\/blog\/[^/]+/)).not.toBeNull();
    });
  });
});
