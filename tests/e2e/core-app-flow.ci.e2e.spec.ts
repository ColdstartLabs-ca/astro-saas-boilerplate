import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Core App Flow E2E Tests for CI
 *
 * This is a minimal test suite designed to run on CI to validate
 * the core application functionality without requiring external services.
 *
 * Tests cover:
 * 1. Landing page loads correctly
 * 2. Navigation works
 * 3. Login modal opens
 * 4. Pricing page is accessible
 * 5. Public pages render without errors
 */

test.describe('Core App Flow - CI', () => {
  let loginPage: LoginPage;

  test.describe('Landing Page', () => {
    test('should load and display correctly', async ({ page }) => {
      loginPage = new LoginPage(page);
      await loginPage.goto('/');

      // Check title exists and contains meaningful text
      // The APP_NAME is configurable via PUBLIC_APP_NAME env var
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      // Title should contain either the configured app name or "SaaS Boilerplate" (default)
      // Accept multiple possible app names used across different environments
      expect(title).toMatch(/SaaS Boilerplate|AutopilotRank|MyImageUpscaler/i);

      // Check meta description exists
      const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(metaDescription).toBeDefined();
      expect(metaDescription!.length).toBeGreaterThan(0);

      // Check header is visible using base page method
      await expect(loginPage.header).toBeVisible({ timeout: 15000 });
    });

    test('should have working navigation', async ({ page }) => {
      loginPage = new LoginPage(page);
      await loginPage.goto('/');

      // Wait for the header to be visible (basic page load check)
      await expect(loginPage.header).toBeVisible({ timeout: 15000 });

      // Check for navigation links that should be visible (use .first() to handle multiple matches)
      const pricingLink = page.getByRole('link', { name: 'Pricing', exact: true }).first();
      await expect(pricingLink).toBeVisible({ timeout: 10000 });

      // Blog link should also be visible
      const blogLink = page.getByRole('link', { name: 'Blog', exact: true }).first();
      await expect(blogLink).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Pricing Page', () => {
    test('should load pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('domcontentloaded');

      // Check page loaded - title should contain either Pricing or the app name
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).toMatch(/Pricing|SaaS Boilerplate|AutopilotRank/i);

      // Pricing section should exist
      const pricingContent = page.locator('main, [data-testid="pricing-page"], section').first();
      await expect(pricingContent).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Auth Modal', () => {
    test('should render auth buttons on landing page', async ({ page }) => {
      loginPage = new LoginPage(page);
      await loginPage.goto('/');

      // Wait for header to be visible
      await expect(loginPage.header).toBeVisible({ timeout: 15000 });

      // Wait for auth skeleton to disappear (loading state to complete)
      // The skeleton has animate-pulse class
      const skeleton = page.locator('.animate-pulse');
      await skeleton.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
        // If no skeleton found, that's fine - auth may have loaded already
      });

      // Check that some interactive elements exist in the header area
      // This validates that React hydrated correctly
      const headerButtons = page.locator('header button');
      const buttonCount = await headerButtons.count();
      expect(buttonCount).toBeGreaterThan(0);
    });
  });

  test.describe('Blog Page', () => {
    test('should load blog listing page', async ({ page }) => {
      await page.goto('/blog');
      await page.waitForLoadState('domcontentloaded');

      // Blog page should have content
      const mainContent = page.locator('main, article, [data-testid="blog-list"]').first();
      await expect(mainContent).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 page gracefully', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      await page.waitForLoadState('domcontentloaded');

      // Should still have some content (404 page or redirect)
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent!.length).toBeGreaterThan(0);

      // Page should not show a blank screen
      const mainContent = page.locator('main, body > div').first();
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('landing page should have basic accessibility', async ({ page }) => {
      loginPage = new LoginPage(page);
      await loginPage.goto('/');

      // Check for main landmark
      const main = page.locator('main').first();
      await expect(main).toBeVisible({ timeout: 15000 });

      // Check for header landmark
      await expect(loginPage.header).toBeVisible();

      // Check that images have alt text (basic accessibility check)
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaHidden = await img.getAttribute('aria-hidden');

        // Image should have alt text, aria-label, or be marked as decorative
        const hasAccessibility = alt !== null || ariaLabel !== null || ariaHidden === 'true';
        expect(hasAccessibility).toBe(true);
      }
    });
  });
});
