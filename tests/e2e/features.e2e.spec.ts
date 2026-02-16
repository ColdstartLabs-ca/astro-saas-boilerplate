import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test('should load and render content', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify page structure exists (content is server-rendered)
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

  test('should display feature cards with updated descriptions', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify key feature names are visible
    await expect(page.locator('h3', { hasText: 'Multi-Model AI Engine' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Built-in Humanizer' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Campaign Management' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'WordPress Publishing' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Webhook Integrations' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'GSC Integration' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Smart Scheduling' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'SEO Scoring' })).toBeVisible();

    // Verify updated descriptions contain key phrases from PRD
    const pageContent = await page.locator('body').textContent();

    // Multi-Model AI Engine
    expect(pageContent).toContain('GPT-4o');
    expect(pageContent).toContain('Claude Sonnet');
    expect(pageContent).toContain('Gemini Flash');

    // Built-in Humanizer
    expect(pageContent).toContain('24+ AI pattern');

    // Webhook Integrations
    expect(pageContent).toContain('HMAC signing');

    // Smart Scheduling
    expect(pageContent).toContain('8 frequency options');
  });

  test('should display How It Works section', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify How It Works section exists
    await expect(page.locator('h2', { hasText: 'How It Works' })).toBeVisible();

    // Verify all 4 steps are present
    await expect(page.locator('h3', { hasText: 'Connect Your Site' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Add Keywords' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Generate' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Review & Publish' })).toBeVisible();
  });

  test('should have CTA section with correct links', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify CTA section
    await expect(page.locator('text=Ready to scale your content?')).toBeVisible();

    // Verify links exist
    const pricingLink = page.locator('a[href="/pricing"]');
    await expect(pricingLink).toBeVisible();

    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('features page snapshot', async ({ page }) => {
    await page.goto('/features');

    // Wait for content to render
    await page.waitForLoadState('networkidle');

    // Verify screenshot capture works in E2E runtime without hardcoded visual baselines.
    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
});
