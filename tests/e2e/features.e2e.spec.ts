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

  test('should display all feature cards', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify all 8 feature titles are visible (matching actual content)
    await expect(page.locator('h3', { hasText: 'Multi-Model AI Engine' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Humanizer Engine' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Pre-Publication QA' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Campaign Management' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'GSC Integration' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'WordPress Publishing' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Content Calendar' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Article Editor' })).toBeVisible();

    // Verify key phrases from actual feature descriptions
    const pageContent = await page.locator('body').textContent();

    // Multi-Model AI Engine
    expect(pageContent).toContain('GPT-4');
    expect(pageContent).toContain('Claude');
    expect(pageContent).toContain('Gemini');
    expect(pageContent).toContain('Llama');

    // Humanizer Engine
    expect(pageContent).toContain('rewriting engine');
    expect(pageContent).toContain('natural prose');

    // Pre-Publication QA
    expect(pageContent).toContain('Plagiarism check');
    expect(pageContent).toContain('AI detection score');

    // Campaign Management
    expect(pageContent).toContain('keyword campaigns');

    // WordPress Publishing
    expect(pageContent).toContain('WordPress plugin');
    expect(pageContent).toContain('webhooks');

    // GSC Integration
    expect(pageContent).toContain('Google Search Console');

    // Content Calendar
    expect(pageContent).toContain('scheduled publishing');

    // Article Editor
    expect(pageContent).toContain('review and editing');
  });

  test('should have CTA section with correct links', async ({ page }) => {
    await page.goto('/features');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify CTA section
    await expect(page.locator('text=Ready to scale your content?')).toBeVisible();

    // Scope to CTA section to avoid strict mode violation (multiple /pricing links exist)
    const ctaSection = page.locator('.bg-gradient-to-br').first();
    await expect(ctaSection.locator('a[href="/pricing"]')).toBeVisible();
    await expect(ctaSection.locator('a[href="/"]')).toContainText('Back to Home');
  });
});
