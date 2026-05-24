import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should have correct page metadata', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/SaaS Boilerplate/);

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

  test('should display core landing content', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Authentication' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Credits System' })).toBeVisible();

    await expect(page.getByText('Supabase Auth with email/password')).toBeVisible();
    await expect(page.getByText('Stripe integration with subscriptions')).toBeVisible();
    await expect(page.getByText('Flexible credit-based usage')).toBeVisible();
  });
});
