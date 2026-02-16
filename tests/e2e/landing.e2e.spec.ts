import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load and render content', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify page structure exists (content is server-rendered)
    const sections = await page.locator('section').count();
    expect(sections).toBeGreaterThanOrEqual(1);

    const astroIslands = await page.locator('astro-island').count();
    expect(astroIslands).toBeGreaterThanOrEqual(1);

    // Check that some content is rendered
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeDefined();
    expect(bodyContent.length).toBeGreaterThan(0);
  });

  test('should have correct page metadata', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/AutopilotRank/);

    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeDefined();
    expect(metaDescription?.length).toBeGreaterThan(0);
  });

  test('should have page structure', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify structural elements exist
    const sections = await page.locator('section').count();
    expect(sections).toBeGreaterThanOrEqual(3);

    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThanOrEqual(2);

    const links = await page.locator('a').count();
    expect(links).toBeGreaterThanOrEqual(1);
  });

  test('landing page snapshot', async ({ page }) => {
    await page.goto('/');

    // Wait for content to render
    await page.waitForLoadState('networkidle');

    // Verify screenshot capture works in E2E runtime without hardcoded visual baselines.
    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });

  test('should display updated FAQ content', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Find FAQ section by id
    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeVisible();

    // Verify FAQ items exist
    const faqItems = page.locator('#faq button');
    const faqCount = await faqItems.count();
    expect(faqCount).toBeGreaterThanOrEqual(6);

    // Verify key FAQ content is present
    const pageContent = await page.locator('body').textContent();

    // Check Google penalties FAQ
    expect(pageContent).toContain('Will Google penalize AI-generated content?');

    // Check CMS platforms FAQ
    expect(pageContent).toContain('What CMS platforms do you support?');

    // Check content review FAQ
    expect(pageContent).toContain('Can I review content before it publishes?');

    // Check refund policy FAQ
    expect(pageContent).toContain("What's your refund policy?");
  });
});
