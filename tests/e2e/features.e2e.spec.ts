import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test('should load and render content', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify page structure exists (content is client-rendered React component)
    const mainContent = await page.locator('main').count();
    expect(mainContent).toBeGreaterThanOrEqual(1);

    // Check that some content is rendered
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeDefined();
    expect(bodyContent.length).toBeGreaterThan(0);
  });

  test('should have correct page metadata', async ({ page }) => {
    await page.goto('/features');

    // Check title
    await expect(page).toHaveTitle(/Features/);

    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeDefined();
    expect(metaDescription?.length).toBeGreaterThan(0);
    expect(metaDescription).toContain('Multi-model AI');
  });

  test('should display all feature sections', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded (client-rendered)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Additional wait for React hydration

    // Verify feature section titles (using h2 elements with correct text)
    await expect(page.locator('h2', { hasText: 'Multi-Model AI Selection' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Built-In AI Humanizer' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'One-Click CMS Publishing' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Campaign Scheduling' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Flexible Credit System' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Keyword-to-Article Pipeline' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Built-In SEO Optimization' })).toBeVisible();

    // Verify key phrases from actual feature descriptions
    const pageContent = await page.locator('body').textContent();

    // Multi-Model AI
    expect(pageContent).toContain('GPT-4o');
    expect(pageContent).toContain('Claude Opus');
    expect(pageContent).toContain('Gemini Flash');

    // Humanizer
    expect(pageContent).toContain('human-sounding prose');
    expect(pageContent).toContain('AI detectors');

    // WordPress Publishing
    expect(pageContent).toContain('WordPress');
    expect(pageContent).toContain('Webflow');

    // GSC Integration
    expect(pageContent).toContain('Google Search Console');

    // Scheduling
    expect(pageContent).toContain('8 scheduling frequencies');
  });

  test('should have CTA section with correct links', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded (client-rendered)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify CTA section with updated text
    await expect(page.locator('text=Ready to put your content on autopilot?')).toBeVisible();

    // Check for signup link (there are multiple, just check at least one is visible)
    const signupLinks = page.locator('a[href="/signup"]');
    await expect(signupLinks.first()).toBeVisible();

    // Check for pricing link (there are multiple, just check at least one is visible)
    const pricingLinks = page.locator('a[href="/pricing"]');
    await expect(pricingLinks.first()).toBeVisible();
  });

  test('should display feature summary grid', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for the summary grid section
    await expect(
      page.locator('h2', { hasText: 'Everything included in every plan' })
    ).toBeVisible();

    // Check for key features in the grid (using h3 elements)
    await expect(page.locator('h3', { hasText: 'Multi-model AI' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'AI Humanizer' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'WordPress publishing' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Credit rollover' })).toBeVisible();
  });
});
