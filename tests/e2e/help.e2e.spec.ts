import { test, expect } from '@playwright/test';

test.describe('Help Page', () => {
  test('should load help page with updated sections', async ({ page }) => {
    await page.goto('/help');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Help/);

    // Verify page structure
    const sections = await page.locator('section').count();
    expect(sections).toBeGreaterThanOrEqual(4);

    // Check hero section renders
    const heroTitle = page.locator('h1');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Help');
  });

  test('should display quick links section', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Check quick links are present
    const quickLinksSection = page
      .locator('section')
      .filter({ hasText: 'Getting Started' })
      .first();
    await expect(quickLinksSection).toBeVisible();

    // Verify all three quick link cards exist
    const quickLinks = page.locator(
      'a[href="#getting-started"], a[href="#credits-billing"], a[href="#technical"]'
    );
    expect(await quickLinks.count()).toBe(3);
  });

  test('should display Getting Started section with quick-start steps', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Navigate to Getting Started section
    const gettingStartedSection = page.locator('#getting-started');
    await expect(gettingStartedSection).toBeVisible();

    // Check section title
    const sectionTitle = gettingStartedSection.locator('h2');
    await expect(sectionTitle).toContainText('Getting Started');

    // Verify the 4 quick-start steps are present
    const pageContent = await gettingStartedSection.textContent();

    // Step 1: Create a Project
    expect(pageContent).toContain('Create a Project');
    expect(pageContent).toContain('WordPress');

    // Step 2: Add Keywords
    expect(pageContent).toContain('Add Keywords');
    expect(pageContent).toContain('CSV');

    // Step 3: Generate Articles
    expect(pageContent).toContain('Generate Articles');

    // Step 4: Review & Publish
    expect(pageContent).toContain('Review');
    expect(pageContent).toContain('Publish');
  });

  test('should display Credits & Billing section with pricing info', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Navigate to Credits & Billing section
    const creditsSection = page.locator('#credits-billing');
    await expect(creditsSection).toBeVisible();

    // Check section title
    const sectionTitle = creditsSection.locator('h2');
    await expect(sectionTitle).toContainText('Credits');

    // Verify FAQ accordion items exist
    const detailsElements = creditsSection.locator('details');
    const detailsCount = await detailsElements.count();
    expect(detailsCount).toBeGreaterThanOrEqual(6);
  });

  test('should display Technical Support section with integration info', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Navigate to Technical Support section
    const techSection = page.locator('#technical');
    await expect(techSection).toBeVisible();

    // Check section title
    const sectionTitle = techSection.locator('h2');
    await expect(sectionTitle).toContainText('Technical Support');

    // Verify FAQ accordion items exist
    const detailsElements = techSection.locator('details');
    const detailsCount = await detailsElements.count();
    expect(detailsCount).toBeGreaterThanOrEqual(6);

    // Check key technical content is present
    const pageContent = await techSection.textContent();

    // Supported CMS platforms
    expect(pageContent).toContain('CMS');

    // AI models
    expect(pageContent).toContain('AI');
    expect(pageContent).toContain('GPT');

    // Scheduling options - check for either scheduling or frequency
    const hasSchedulingContent =
      pageContent.includes('scheduling') || pageContent.includes('frequency');
    expect(hasSchedulingContent).toBe(true);
  });

  test('should allow expanding FAQ accordion items', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Find the first details element in Credits & Billing section
    const firstFaq = page.locator('#credits-billing details').first();
    await expect(firstFaq).toBeVisible();

    // Click to expand
    await firstFaq.locator('summary').click();

    // Verify it's open
    await expect(firstFaq).toHaveAttribute('open', '');

    // Check that answer content is visible
    const answerContent = firstFaq.locator('div');
    await expect(answerContent).toBeVisible();
  });

  test('quick links should navigate to correct sections', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    // Click Getting Started quick link
    await page.click('a[href="#getting-started"]');

    // Wait for navigation
    await page.waitForURL(/#getting-started/);

    // Verify section is in view
    const gettingStartedSection = page.locator('#getting-started');
    await expect(gettingStartedSection).toBeInViewport();

    // Click Credits & Billing quick link
    await page.click('a[href="#credits-billing"]');
    await page.waitForURL(/#credits-billing/);

    const creditsSection = page.locator('#credits-billing');
    await expect(creditsSection).toBeInViewport();

    // Click Technical Support quick link
    await page.click('a[href="#technical"]');
    await page.waitForURL(/#technical/);

    const techSection = page.locator('#technical');
    await expect(techSection).toBeInViewport();
  });

  test('should have correct SEO metadata', async ({ page }) => {
    await page.goto('/help');

    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeDefined();
    expect(metaDescription?.length).toBeGreaterThan(0);

    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeDefined();

    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(ogDescription).toBeDefined();

    // Check canonical URL
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/help');
  });
});
