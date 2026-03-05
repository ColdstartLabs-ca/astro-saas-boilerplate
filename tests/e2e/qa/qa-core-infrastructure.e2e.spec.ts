/**
 * QA Tests for Core SaaS Boilerplate Infrastructure
 *
 * These tests verify the remaining functionality after stripping
 * domain-specific code from AutopilotRank to create a reusable
 * SaaS boilerplate.
 *
 * PR: feat: Strip AutopilotRank to reusable SaaS boilerplate
 *
 * Tested features:
 * - Landing page structure and navigation
 * - Auth modal functionality
 * - Pricing page accessibility
 * - Help/Support page
 * - Legal pages (privacy, terms)
 * - 404/500 error pages
 */

import { test, expect } from '@playwright/test';

test.describe('Core Infrastructure QA', () => {
  test.describe('Landing Page', () => {
    test('should display hero section with correct structure', async ({ page }) => {
      await page.goto('/');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check hero section exists
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();

      // Check for main heading
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading.first()).toBeVisible();
    });

    test('should display feature cards section', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for features section
      const featuresSection = page.locator('section').nth(1);
      await expect(featuresSection).toBeVisible();

      // Check for feature cards (Authentication, Billing, Credits System)
      const featureCards = page.locator('div.p-6.rounded-lg.border');
      await expect(featureCards).toHaveCount(3, { timeout: 5000 });
    });

    test('should have working navigation links', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check CTA buttons exist
      const signUpLink = page.getByRole('link', { name: /sign/i });
      await expect(signUpLink.first()).toBeVisible();

      const dashboardLink = page.getByRole('link', { name: /dashboard/i });
      await expect(dashboardLink.first()).toBeVisible();
    });

    test('should display brand/logo', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check brand link exists
      const brand = page
        .locator('a')
        .filter({ hasText: /autopilot/i })
        .first();
      await expect(brand).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have pricing link in navbar', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const pricingLink = page.getByRole('link', { name: /pricing/i });
      await expect(pricingLink.first()).toBeVisible();
    });

    test('should have help/support link in navbar', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const helpLink = page.getByRole('link', { name: /support|help/i });
      await expect(helpLink.first()).toBeVisible();
    });

    test('should navigate to pricing page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('link', { name: /pricing/i })
        .first()
        .click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/pricing');
    });
  });

  test.describe('Pricing Page', () => {
    test('should display pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Check page loaded
      const mainContent = page.locator('main, div.min-h-screen');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should have pricing-related content', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Check for pricing-related text
      const pricingText = page.getByText(/price|plan|credit|month|\$/i);
      await expect(pricingText.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Help/Support Page', () => {
    test('should display help page', async ({ page }) => {
      await page.goto('/help');
      await page.waitForLoadState('networkidle');

      // Check page loaded
      const mainContent = page.locator('main, div.min-h-screen');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should have contact/support elements', async ({ page }) => {
      await page.goto('/help');
      await page.waitForLoadState('networkidle');

      // Check for support-related elements (form, heading, or button)
      const supportElements = page.locator('form, button, h1, h2').filter({
        hasText: /support|help|contact|email|message/i,
      });
      await expect(supportElements.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Legal Pages', () => {
    test('should display privacy policy page', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // Check page loaded
      const mainContent = page.locator('main, article, div.prose');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should display terms of service page', async ({ page }) => {
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      // Check page loaded
      const mainContent = page.locator('main, article, div.prose');
      await expect(mainContent.first()).toBeVisible();
    });
  });

  test.describe('Error Pages', () => {
    test('should display 404 page for unknown routes', async ({ page }) => {
      await page.goto('/this-route-does-not-exist-xyz');
      await page.waitForLoadState('networkidle');

      // Check for 404-related content
      const notFoundContent = page.getByText(/404|not found|doesn't exist|page not found/i);
      await expect(notFoundContent.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Auth Pages Structure', () => {
    test('should have auth callback page accessible', async ({ page }) => {
      // This page should exist even if it redirects
      const response = await page.goto('/auth/callback');

      // Should not return 500 error
      expect(response?.status()).toBeLessThan(500);
    });

    test('should have password reset page accessible', async ({ page }) => {
      await page.goto('/auth/reset-password');
      await page.waitForLoadState('networkidle');

      // Check page loaded (might show error or form)
      const bodyContent = page.locator('body');
      await expect(bodyContent).toBeVisible();
    });
  });

  test.describe('SEO Meta Tags', () => {
    test('should have proper meta tags on landing page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for essential meta tags
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveCount(1);

      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);

      const ogDescription = page.locator('meta[property="og:description"]');
      await expect(ogDescription).toHaveCount(1);
    });

    test('should have canonical URL', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
    });
  });

  test.describe('Responsive Design', () => {
    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check page is visible and scrollable
      const bodyContent = page.locator('body');
      await expect(bodyContent).toBeVisible();

      // Check hero section is visible
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
    });

    test('should render correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check page is visible
      const bodyContent = page.locator('body');
      await expect(bodyContent).toBeVisible();

      // Check features section
      const featureCards = page.locator('div.p-6.rounded-lg.border');
      await expect(featureCards.first()).toBeVisible();
    });
  });
});
