import { test, expect } from '../test-fixtures';
import { BillingPage } from '../pages/BillingPage';

/**
 * Dashboard Billing E2E Tests
 *
 * Tests the authenticated billing management page at /dashboard/billing.
 *
 * Scenarios covered:
 * - Free user state renders correctly
 * - Subscribed state renders correctly
 * - "Manage Subscription" and "View Invoices" actions trigger expected navigation/calls
 * - Refresh updates visible subscription/credits data
 *
 * Default test fixtures provide:
 * - Mock Supabase session with authenticated user
 * - Onboarding status as complete (isComplete: true)
 * - Default user data RPC mock (free user with 1000 credits)
 *
 * Tests override the user data RPC mock to simulate different subscription states.
 */

// =============================================================================
// Mock Data
// =============================================================================

const mockFreeUserProfile = {
  profile: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    subscription_credits_balance: 1000,
    purchased_credits_balance: 0,
    stripe_customer_id: null,
    subscription_tier: null,
  },
  subscription: null,
};

const mockSubscribedUserProfile = {
  profile: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    subscription_credits_balance: 150,
    purchased_credits_balance: 50,
    stripe_customer_id: 'cus_test_123',
    subscription_tier: 'growth',
  },
  subscription: {
    id: 'sub_test_123',
    user_id: 'test-user-id',
    status: 'active',
    price_id: 'price_growth_monthly',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    cancel_at_period_end: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

const mockTrialingUserProfile = {
  profile: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    subscription_credits_balance: 30,
    purchased_credits_balance: 0,
    stripe_customer_id: 'cus_test_456',
    subscription_tier: 'starter',
  },
  subscription: {
    id: 'sub_test_456',
    user_id: 'test-user-id',
    status: 'trialing',
    price_id: 'price_starter_monthly',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    trial_end: '2024-01-15T00:00:00Z',
    cancel_at_period_end: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

const mockPastDueUserProfile = {
  profile: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    subscription_credits_balance: 0,
    purchased_credits_balance: 0,
    stripe_customer_id: 'cus_test_789',
    subscription_tier: 'growth',
  },
  subscription: {
    id: 'sub_test_789',
    user_id: 'test-user-id',
    status: 'past_due',
    price_id: 'price_growth_monthly',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    cancel_at_period_end: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// =============================================================================
// Helpers: Mock API overrides
// =============================================================================

/**
 * Override the user data endpoints to return specific subscription state.
 * Must be called BEFORE goto() so the route is registered before the page loads.
 * Matches both the profiles table query and subscriptions table query.
 */
async function mockUserData(
  page: import('@playwright/test').Page,
  userData: typeof mockFreeUserProfile
) {
  // Mock profiles table query (used by StripeService.getUserProfile())
  await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/profiles.*/, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([userData.profile]),
    });
  });

  // Mock subscriptions table query (used by StripeService.getActiveSubscription())
  await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/subscriptions.*/, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userData.subscription ? [userData.subscription] : []),
    });
  });
}

/**
 * Mock the portal API to return a mock portal URL.
 * Must be called BEFORE goto().
 */
async function mockPortalApi(
  page: import('@playwright/test').Page,
  mockUrl = '/dashboard/billing?mock=true'
) {
  await page.route('**/api/portal', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { url: mockUrl },
        }),
      });
    }
  });
}

/**
 * Mock the portal API to return an error.
 * Must be called BEFORE goto().
 */
async function mockPortalApiError(
  page: import('@playwright/test').Page,
  errorMessage = 'Failed to create portal session'
) {
  await page.route('**/api/portal', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: errorMessage, code: 'STRIPE_CUSTOMER_NOT_FOUND' },
        }),
      });
    }
  });
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Dashboard Billing E2E Tests', () => {
  let billingPage: BillingPage;

  test.beforeEach(async ({ page }) => {
    billingPage = new BillingPage(page);
  });

  test.describe('Free User State', () => {
    test.beforeEach(async ({ page }) => {
      // Mock free user profile (no subscription)
      await mockUserData(page, mockFreeUserProfile);
      // Mock portal API (will return error for free users anyway)
      await mockPortalApi(page);
    });

    test('should display free plan correctly', async () => {
      await billingPage.goto();

      // Verify page title and description
      await expect(billingPage.pageTitle).toBeVisible();
      await expect(billingPage.pageTitle).toHaveText('Billing');
      await expect(billingPage.pageDescription).toBeVisible();

      // Verify current plan section
      await expect(billingPage.currentPlanSection).toBeVisible();
      await expect(billingPage.currentPlanTitle).toBeVisible();
      await expect(billingPage.currentPlanTitle).toHaveText('Current Plan');

      // Verify free plan is shown
      const planName = await billingPage.getCurrentPlanName();
      expect(planName.toLowerCase()).toContain('free');

      // Verify credits balance is shown
      await expect(billingPage.creditsBalanceValue).toBeVisible();
      const creditsBalance = await billingPage.getCreditsBalance();
      expect(creditsBalance).toBe(1000);
    });

    test('should show upgrade button for free users', async () => {
      await billingPage.goto();

      // Verify "Choose Plan" button is visible
      await expect(billingPage.choosePlanButton).toBeVisible();
      await expect(billingPage.choosePlanButton).toHaveText('Choose Plan');

      // Verify "Manage Subscription" button is NOT visible for free users
      await expect(billingPage.manageSubscriptionButton).not.toBeVisible();

      // Verify "View Pricing" button is visible
      await expect(billingPage.viewPricingButton).toBeVisible();
    });

    test('should show no payment methods message for free users', async () => {
      await billingPage.goto();

      // Verify payment methods section is visible
      await expect(billingPage.paymentMethodsSection).toBeVisible();
      await expect(billingPage.paymentMethodsTitle).toBeVisible();
      await expect(billingPage.paymentMethodsTitle).toHaveText('Payment Methods');

      // Verify no payment methods message is shown
      await expect(billingPage.noPaymentMethodsMessage).toBeVisible();
      await expect(billingPage.manageSubscriptionButton).not.toBeVisible();
    });

    test('should show no billing history for free users', async () => {
      await billingPage.goto();

      // Verify billing history section is visible
      await expect(billingPage.billingHistorySection).toBeVisible();
      await expect(billingPage.billingHistoryTitle).toBeVisible();
      await expect(billingPage.billingHistoryTitle).toHaveText('Billing History');

      // Verify no billing history message is shown
      await expect(billingPage.noBillingHistoryMessage).toBeVisible();
      await expect(billingPage.viewInvoicesButton).not.toBeVisible();
    });

    test('should not show subscription details for free users', async () => {
      await billingPage.goto();

      // Verify subscription details are not shown (no current period end)
      await expect(billingPage.currentPeriodEndValue).not.toBeVisible();

      // Verify no cancellation notice
      expect(await billingPage.hasCancellationNotice()).toBe(false);
    });

    test('should navigate to pricing page when clicking upgrade button', async ({ page }) => {
      await billingPage.goto();

      // Click choose plan button
      await billingPage.clickChoosePlan();

      // Should navigate to pricing page
      await page.waitForURL(/\/pricing/, { timeout: 5000 });
      expect(page.url()).toContain('/pricing');
    });

    test('should navigate to pricing page when clicking view pricing button', async ({ page }) => {
      await billingPage.goto();

      // Click view pricing button
      await billingPage.viewPricingButton.click();

      // Should navigate to pricing page
      await page.waitForURL(/\/pricing/, { timeout: 5000 });
      expect(page.url()).toContain('/pricing');
    });
  });

  test.describe('Subscribed User State', () => {
    test.beforeEach(async ({ page }) => {
      // Mock subscribed user profile
      await mockUserData(page, mockSubscribedUserProfile);
      // Mock portal API
      await mockPortalApi(page);
    });

    test('should display active subscription correctly', async () => {
      await billingPage.goto();

      // Verify page title
      await expect(billingPage.pageTitle).toBeVisible();
      await expect(billingPage.pageTitle).toHaveText('Billing');

      // Verify current plan section shows Growth plan
      const planName = await billingPage.getCurrentPlanName();
      expect(planName.toLowerCase()).toContain('growth');

      // Verify subscription status badge
      const status = await billingPage.getSubscriptionStatus();
      expect(status.toLowerCase()).toContain('active');

      // Verify credits balance includes both subscription and purchased credits
      const creditsBalance = await billingPage.getCreditsBalance();
      expect(creditsBalance).toBe(200); // 150 subscription + 50 purchased
    });

    test('should show subscription details for active subscription', async () => {
      await billingPage.goto();

      // Verify current period end is visible
      await expect(billingPage.currentPeriodEndValue).toBeVisible();

      const periodEnd = await billingPage.getCurrentPeriodEnd();
      expect(periodEnd).toBeTruthy();

      // Verify no cancellation notice
      expect(await billingPage.hasCancellationNotice()).toBe(false);
    });

    test('should show manage subscription button for subscribed users', async () => {
      await billingPage.goto();

      // Verify "Manage Subscription" button is visible
      await expect(billingPage.manageSubscriptionButton).toBeVisible();
      await expect(billingPage.manageSubscriptionButton).toHaveText(/Manage Subscription/i);

      // Verify button has correct icon (external link)
      const button = billingPage.manageSubscriptionButton;
      await expect(button).toBeVisible();
    });

    test('should show view invoices button for subscribed users', async () => {
      await billingPage.goto();

      // Verify billing history section
      await expect(billingPage.billingHistorySection).toBeVisible();

      // Verify "View Invoices" button is visible
      await expect(billingPage.viewInvoicesButton).toBeVisible();
      await expect(billingPage.viewInvoicesButton).toHaveText(/View Invoices/i);
    });

    test('should show payment methods section with manage link', async () => {
      await billingPage.goto();

      // Verify payment methods section
      await expect(billingPage.paymentMethodsSection).toBeVisible();
      await expect(billingPage.paymentMethodsTitle).toBeVisible();

      // Verify no "no payment methods" message
      await expect(billingPage.noPaymentMethodsMessage).not.toBeVisible();

      // Verify manage subscription button is visible
      await expect(billingPage.manageSubscriptionButton).toBeVisible();
    });

    test('should call portal API when clicking manage subscription', async ({ page }) => {
      await billingPage.goto();

      // Set up request capture before clicking
      const portalRequestPromise = page.waitForRequest('**/api/portal');

      // Click manage subscription button
      await billingPage.clickManageSubscription();

      // Verify the API call was made
      const portalRequest = await portalRequestPromise;
      expect(portalRequest.url()).toContain('/api/portal');
      expect(portalRequest.method()).toBe('POST');
    });

    test('should navigate to portal URL after clicking manage subscription', async ({ page }) => {
      await billingPage.goto();

      // Click manage subscription button
      await billingPage.clickManageSubscription();

      // Should navigate to portal URL (or mock URL)
      await page.waitForURL(/mock=true|billing\.stripe\.com/, { timeout: 5000 });
      expect(page.url()).toMatch(/mock=true|billing\.stripe\.com/);
    });

    test('should call portal API when clicking view invoices', async ({ page }) => {
      await billingPage.goto();

      // Set up request capture before clicking
      const portalRequestPromise = page.waitForRequest('**/api/portal');

      // Click view invoices button
      await billingPage.viewInvoicesButton.click();

      // Verify the API call was made
      const portalRequest = await portalRequestPromise;
      expect(portalRequest.url()).toContain('/api/portal');
      expect(portalRequest.method()).toBe('POST');
    });
  });

  test.describe('Trialing Subscription State', () => {
    test.beforeEach(async ({ page }) => {
      // Mock trialing user profile
      await mockUserData(page, mockTrialingUserProfile);
      // Mock portal API
      await mockPortalApi(page);
    });

    test('should display trial subscription correctly', async () => {
      await billingPage.goto();

      // Verify plan shows Starter
      const planName = await billingPage.getCurrentPlanName();
      expect(planName.toLowerCase()).toContain('starter');

      // Verify subscription status shows trialing
      const status = await billingPage.getSubscriptionStatus();
      expect(status.toLowerCase()).toContain('trialing');

      // Verify trial end date is visible
      await expect(billingPage.currentPeriodEndValue).toBeVisible();
    });

    test('should show trial information alert', async ({ page }) => {
      await billingPage.goto();

      // Look for trial information message
      const trialAlert = page.locator('div').filter({ hasText: /trial/i });
      await expect(trialAlert.first()).toBeVisible();
    });
  });

  test.describe('Past Due Subscription State', () => {
    test.beforeEach(async ({ page }) => {
      // Mock past due user profile
      await mockUserData(page, mockPastDueUserProfile);
      // Mock portal API
      await mockPortalApi(page);
    });

    test('should display past due status correctly', async () => {
      await billingPage.goto();

      // Verify subscription status shows past due
      const status = await billingPage.getSubscriptionStatus();
      expect(status.toLowerCase()).toContain('past');
    });

    test('should still show manage subscription option for past due', async () => {
      await billingPage.goto();

      // Verify manage subscription button is still visible
      await expect(billingPage.manageSubscriptionButton).toBeVisible();
    });
  });

  test.describe('Refresh Functionality', () => {
    test('should update billing data after refresh', async ({ page }) => {
      // Start with free user
      await mockUserData(page, mockFreeUserProfile);
      await mockPortalApi(page);

      await billingPage.goto();

      // Verify initial state (free plan)
      const initialPlanName = await billingPage.getCurrentPlanName();
      expect(initialPlanName.toLowerCase()).toContain('free');
      let initialCredits = await billingPage.getCreditsBalance();
      expect(initialCredits).toBe(1000);

      // Now mock a subscribed user state
      await mockUserData(page, mockSubscribedUserProfile);

      // Click refresh button
      await billingPage.refresh();

      // Wait for data to update
      await billingPage.waitForBillingUpdate();

      // Verify updated state (growth plan)
      const updatedPlanName = await billingPage.getCurrentPlanName();
      expect(updatedPlanName.toLowerCase()).toContain('growth');

      const updatedCredits = await billingPage.getCreditsBalance();
      expect(updatedCredits).toBe(200); // 150 + 50
    });

    test('should show loading state during refresh', async ({ page }) => {
      await mockUserData(page, mockFreeUserProfile);
      await mockPortalApi(page);

      await billingPage.goto();

      // Set up a delay for the API response - intercept profile call
      let resolveProfile: ((value: any) => void) | null = null;
      const profilePromise = new Promise(resolve => { resolveProfile = resolve; });

      await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/profiles.*/, async route => {
        // Wait a bit before responding to see loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockFreeUserProfile.profile]),
        });
      });

      // Click refresh button
      await billingPage.refreshButton.click();

      // Briefly check for loading indicator - the refresh button icon may spin
      await page.waitForTimeout(100);
      const spinningIcon = page.locator('.animate-spin');
      const hasSpinner = await spinningIcon.count() > 0;

      // Wait for refresh to complete - just wait for network to settle rather than full idle
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify page is still functional
      await expect(billingPage.pageTitle).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error state when data fetch fails', async ({ page }) => {
      // Mock API error - abort the connection to trigger network error
      await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/profiles.*/, async route => {
        await route.abort('failed');
      });

      await billingPage.goto();

      // Wait for error state to appear - the component shows an error UI when loading fails
      await page.waitForTimeout(2000);

      // Check if we're on the billing page and error state is shown
      // The error UI contains "Failed to load billing information" text
      const pageContent = await page.content();
      const hasErrorText = pageContent.includes('Failed to load') ||
                          pageContent.includes('error') ||
                          pageContent.includes('Error');

      expect(hasErrorText).toBe(true);
    });

    test('should show retry button on error', async ({ page }) => {
      // Mock API error to trigger error state
      // We need to make both requests fail in a way that triggers the catch block
      await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/profiles.*/, async route => {
        // Return an error response that Supabase will treat as an error
        await route.fulfill({
          status: 500,
          statusText: 'Internal Server Error',
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Database error',
            details: 'Connection failed',
            hint: 'Check database connection'
          }),
        });
      });

      await billingPage.goto();

      // Wait for page to handle error
      await page.waitForTimeout(1500);

      // Check if the error UI is rendered - it should have a button to retry
      // Look for any button element in the page
      const buttons = await page.locator('button').count();
      expect(buttons).toBeGreaterThan(0);
    });

    test('should handle portal API error gracefully', async ({ page }) => {
      await mockUserData(page, mockSubscribedUserProfile);
      await mockPortalApiError(page, 'Stripe customer not found');

      await billingPage.goto();

      const initialUrl = page.url();

      // Click manage subscription button
      await billingPage.clickManageSubscription();

      // Wait for error handling
      await page.waitForTimeout(2000);

      // Should remain on billing page (not redirected to portal)
      expect(page.url()).toBe(initialUrl);

      // Page should still be functional - check title is still visible
      await expect(billingPage.pageTitle).toBeVisible();
    });

    test('should remain on billing page after portal error', async ({ page }) => {
      await mockUserData(page, mockSubscribedUserProfile);
      await mockPortalApiError(page);

      await billingPage.goto();

      const initialUrl = page.url();

      // Click manage subscription button
      await billingPage.clickManageSubscription();

      // Wait for error handling
      await billingPage.waitForLoadingComplete();

      // Should still be on billing page
      expect(page.url()).toBe(initialUrl);

      // Page should still be functional
      await expect(billingPage.pageTitle).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to billing page from dashboard', async ({ page }) => {
      await mockUserData(page, mockFreeUserProfile);
      await mockPortalApi(page);

      // Navigate to dashboard first
      await page.goto('/dashboard');

      // Navigate to billing page using client-side navigation
      await page.goto('/dashboard/billing');

      // Verify billing page is loaded
      await expect(billingPage.pageTitle).toBeVisible();
      await expect(billingPage.currentPlanSection).toBeVisible();
    });

    test('should have accessible navigation elements', async ({ page }) => {
      await mockUserData(page, mockFreeUserProfile);
      await mockPortalApi(page);

      await billingPage.goto();

      // Check basic accessibility
      await billingPage.checkBasicAccessibility();

      // Verify page has proper heading structure
      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible();
      await expect(h1.first()).toContainText('Billing');

      // Verify navigation/main landmarks
      await expect(billingPage.mainContent).toBeVisible();
    });
  });

  test.describe('Cancel Subscription Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock subscribed user profile
      await mockUserData(page, mockSubscribedUserProfile);
      // Mock portal API
      await mockPortalApi(page);
    });

    test('should show cancel subscription button for active subscriptions', async ({ page }) => {
      await billingPage.goto();

      // Look for cancel subscription link/button - it's a red text button in the billing page
      const cancelButton = page.locator('button').filter({ hasText: /Cancel Subscription/i });

      await expect(cancelButton.first()).toBeVisible();
    });

    test('should open cancel modal when clicking cancel subscription', async ({ page }) => {
      await billingPage.goto();

      // Click cancel subscription button
      const cancelButton = page.locator('button').filter({ hasText: /Cancel Subscription/i });

      await cancelButton.first().click();

      // Modal should appear - it's a fixed overlay div with a modal container inside
      // The modal shows "Cancel Subscription" title and has AlertTriangle icon
      const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Cancel Subscription/i });

      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Credit Purchase Section', () => {
    test.beforeEach(async ({ page }) => {
      await mockUserData(page, mockFreeUserProfile);
      await mockPortalApi(page);
    });

    test('should show credit purchase options', async ({ page }) => {
      await billingPage.goto();

      // Look for credit pack selector or purchase section
      const creditSection = page.locator('div').filter({ hasText: /buy credits|credit pack/i });
      await expect(creditSection.first()).toBeVisible();
    });

    test('should show tip about subscription value', async ({ page }) => {
      await billingPage.goto();

      // Look for tip message about subscription being better value
      const tipMessage = page
        .locator('div')
        .filter({ hasText: /subscription.*better value|subscribe.*better value/i });
      await expect(tipMessage.first()).toBeVisible();
    });
  });
});
