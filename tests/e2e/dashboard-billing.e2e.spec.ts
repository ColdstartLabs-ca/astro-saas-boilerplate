import { test, expect } from '../test-fixtures';

/**
 * Dashboard Billing E2E Tests
 *
 * Tests the authenticated billing management page at /dashboard/billing.
 * Simplified to focus on core rendering functionality.
 */

test.describe('Dashboard Billing E2E Tests', () => {
  test.describe('Page Rendering', () => {
    test('should display billing page with title', async ({ page }) => {
      await page.goto('/dashboard/billing');
      await page.waitForLoadState('domcontentloaded');

      // Wait for the page to render (it's a client component)
      await page.waitForTimeout(2000);

      // Check page title exists (h1 with "Billing")
      const title = page.getByRole('heading', { name: 'Billing', level: 1 });
      await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('should display main sections', async ({ page }) => {
      await page.goto('/dashboard/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check current plan section is visible
      const currentPlanHeading = page.getByRole('heading', { name: 'Current Plan' });
      await expect(currentPlanHeading).toBeVisible({ timeout: 15000 });

      // Check buy credits section
      await expect(page.getByRole('heading', { name: 'Buy Credits' })).toBeVisible({
        timeout: 5000,
      });

      // Check payment methods section
      await expect(page.getByRole('heading', { name: 'Payment Methods' })).toBeVisible({
        timeout: 5000,
      });

      // Check billing history section
      await expect(page.getByRole('heading', { name: 'Billing History' })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to billing page from dashboard', async ({ page }) => {
      // Navigate to dashboard first
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Navigate to billing page
      await page.goto('/dashboard/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Verify billing page is loaded
      const title = page.getByRole('heading', { name: 'Billing', level: 1 });
      await expect(title).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/dashboard/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check for h1
      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible({ timeout: 15000 });
      await expect(h1.first()).toContainText('Billing');

      // Check for h2 headings for sections
      const h2 = page.locator('h2');
      const h2Count = await h2.count();
      expect(h2Count).toBeGreaterThanOrEqual(3); // Current Plan, Buy Credits, Payment Methods, Billing History
    });
  });
});
