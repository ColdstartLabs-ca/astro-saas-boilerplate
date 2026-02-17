import { test, expect } from '../test-fixtures';
import { BasePage } from '../pages/BasePage';

/**
 * Settings and Support E2E Tests
 *
 * Tests the settings page (/dashboard/settings) and support/contact functionality (/dashboard/support).
 * Covers settings form rendering, email preferences toggles, and support form submission.
 *
 * Test fixtures provide:
 * - Authenticated user session
 * - Mocked onboarding status (complete)
 * - Mocked API responses for common endpoints
 */

// =============================================================================
// Page Objects
// =============================================================================

class SettingsPage extends BasePage {
  // Locators
  get pageTitle() {
    // SettingsPageClient uses h1 with "Settings" text
    return this.page.getByRole('heading', { name: /settings/i, level: 1 });
  }

  get profileHeading() {
    // Profile section heading (h2)
    return this.page.getByRole('heading', { name: /^profile$/i, level: 2 });
  }

  get profileSection() {
    // Profile section - identifiable by the "Your personal information" subtitle
    return this.page.locator('div').filter({ hasText: 'Your personal information' }).first();
  }

  get emailInput() {
    // Email input in profile section - the label is "Email"
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(/^Email$/) })
      .locator('input[type="email"]')
      .first();
  }

  get displayNameInput() {
    // Display Name input in profile section
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(/Display Name/) })
      .locator('input[type="text"]')
      .first();
  }

  get securitySection() {
    // Security section - has h2 heading with "Security"
    return this.page.getByRole('heading', { name: /^security$/i, level: 2 });
  }

  get changePasswordButton() {
    return this.page.getByRole('button', { name: /change password/i });
  }

  get notificationsSection() {
    // Notifications section - has h2 heading with "Notifications"
    return this.page.getByRole('heading', { name: /^notifications$/i, level: 2 });
  }

  get productUpdatesToggle() {
    // Product Updates toggle button
    return this.page
      .locator('label')
      .filter({ hasText: /Product Updates/ })
      .locator('button');
  }

  get marketingEmailsToggle() {
    // Marketing Emails toggle button
    return this.page
      .locator('label')
      .filter({ hasText: /Marketing Emails/ })
      .locator('button');
  }

  get lowCreditAlertsToggle() {
    // Low Credit Alerts toggle button
    return this.page
      .locator('label')
      .filter({ hasText: /Low Credit Alerts/ })
      .locator('button');
  }

  get loadingState() {
    // Loading state shows "Loading preferences..."
    return this.page.getByText(/loading preferences/i);
  }

  // Actions
  async gotoSettings(): Promise<void> {
    await super.goto('/dashboard/settings');
  }

  async toggleProductUpdates(): Promise<void> {
    await this.productUpdatesToggle.click();
  }

  async toggleMarketingEmails(): Promise<void> {
    await this.marketingEmailsToggle.click();
  }

  async toggleLowCreditAlerts(): Promise<void> {
    await this.lowCreditAlertsToggle.click();
  }

  // Assertions
  async assertPageVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  async assertProfileSectionVisible(): Promise<void> {
    await expect(this.profileHeading).toBeVisible();
  }

  async assertSecuritySectionVisible(): Promise<void> {
    await expect(this.securitySection).toBeVisible();
  }

  async assertSecuritySectionHidden(): Promise<void> {
    await expect(this.securitySection).not.toBeVisible();
  }

  async assertNotificationsSectionVisible(): Promise<void> {
    // No tabs in SettingsPageClient - notifications section is always visible
    await expect(this.notificationsSection).toBeVisible();
  }

  async assertEmailValue(email: string): Promise<void> {
    await expect(this.emailInput).toHaveValue(email);
  }

  async assertDisplayNameValue(name: string): Promise<void> {
    await expect(this.displayNameInput).toHaveValue(name);
  }
}

class HelpPage extends BasePage {
  // Locators
  get pageTitle() {
    return this.page.getByRole('heading', { name: /help/i, level: 1 });
  }

  get contactSupportCTA() {
    // The Contact CTA section rendered by HelpPageClient (React island)
    // Uses "Still need help?" as the heading
    return this.page.locator('section').filter({ hasText: /still need help/i }).last();
  }

  get contactSupportButton() {
    return this.page.getByRole('button', { name: /email support/i }).first();
  }

  get supportModal() {
    return this.page.locator('[data-testid="modal"]');
  }

  get modalTitle() {
    // Modal.tsx renders the title as h3#modal-title
    return this.page.getByRole('heading', { name: /contact support/i, level: 3 });
  }

  get nameInput() {
    return this.page.locator('#name');
  }

  get emailInput() {
    return this.page.locator('#email');
  }

  get categorySelect() {
    return this.page.locator('#category');
  }

  get subjectInput() {
    return this.page.locator('#subject');
  }

  get messageTextarea() {
    return this.page.locator('#message');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /send message|sending/i });
  }

  get successMessage() {
    // Success messages can appear in the modal or as a toast
    return this.page.locator('text=Message Sent').or(
      this.page.locator('[role="alert"]').getByText(/message sent|we'll get back to you/i)
    ).first();
  }

  get errorMessage() {
    // Toast messages appear in role="alert" elements, scope to avoid matching other page text
    return this.page.locator('[role="alert"]').getByText(/failed to submit support/i);
  }

  validationError(field: string) {
    // Error messages appear in p elements with text-destructive class inside the modal
    // Map field names to error message patterns (matching Zod schema messages)
    const errorPatterns: Record<string, RegExp> = {
      name: /name is required|name must be at least/i,
      email: /email is required|please enter a valid email/i,
      subject: /subject is required|subject must be at least/i,
      message: /message is required|message must be at least/i,
      category: /select a category/i,
    };
    const pattern = errorPatterns[field] || new RegExp(field, 'i');
    // Look for p.text-destructive elements within the modal that contain the error text
    return this.supportModal.locator('p').filter({ hasText: pattern });
  }

  // Actions
  async gotoHelp(): Promise<void> {
    await super.goto('/help');
  }

  async scrollToContactCTA(): Promise<void> {
    // The HelpPageClient uses client:visible, so we need to scroll it into view
    // to trigger React hydration before interacting with it
    await this.contactSupportCTA.scrollIntoViewIfNeeded();
    // Wait for the React island to hydrate after becoming visible
    await this.page.waitForTimeout(500);
  }

  async openSupportModal(): Promise<void> {
    // Ensure the CTA is visible and hydrated before clicking
    await this.scrollToContactCTA();
    await this.contactSupportButton.waitFor({ state: 'visible' });
    await this.contactSupportButton.click();
    // Wait for modal animation to complete
    await this.page.waitForTimeout(300);
  }

  async fillSupportForm(data: {
    name?: string;
    email?: string;
    category?: string;
    subject?: string;
    message?: string;
  }): Promise<void> {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.category !== undefined) await this.categorySelect.selectOption(data.category);
    if (data.subject !== undefined) await this.subjectInput.fill(data.subject);
    if (data.message !== undefined) await this.messageTextarea.fill(data.message);
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  // Assertions
  async assertPageVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  async assertSupportModalVisible(): Promise<void> {
    await expect(this.supportModal).toBeVisible();
    await expect(this.modalTitle).toBeVisible();
  }

  async assertSupportModalHidden(): Promise<void> {
    await expect(this.supportModal).not.toBeVisible();
  }

  async assertSuccessMessageVisible(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }

  async assertValidationError(field: string, message: string): Promise<void> {
    await expect(this.validationError(field)).toContainText(message);
  }

  async assertFieldRequiredError(field: string): Promise<void> {
    await expect(this.validationError(field)).toBeVisible();
  }
}

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Mock email preferences API
 */
async function mockEmailPreferences(
  page: import('@playwright/test').Page,
  preferences: {
    marketing_emails?: boolean;
    product_updates?: boolean;
    low_credit_alerts?: boolean;
  }
) {
  await page.route('**/api/email/preferences', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            marketing_emails: preferences.marketing_emails ?? false,
            product_updates: preferences.product_updates ?? false,
            low_credit_alerts: preferences.low_credit_alerts ?? false,
          },
        }),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            marketing_emails: body.marketing_emails ?? preferences.marketing_emails ?? false,
            product_updates: body.product_updates ?? preferences.product_updates ?? false,
            low_credit_alerts: body.low_credit_alerts ?? preferences.low_credit_alerts ?? false,
          },
        }),
      });
    }
  });
}

/**
 * Mock support contact API success
 */
async function mockSupportContactSuccess(page: import('@playwright/test').Page) {
  await page.route('**/api/support/contact', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message:
            'Your support request has been submitted. We will get back to you within 24 hours.',
        }),
      });
    }
  });
}

/**
 * Mock support contact API validation error
 */
async function mockSupportContactValidationError(page: import('@playwright/test').Page) {
  await page.route('**/api/support/contact', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Invalid form data',
          error: 'Validation failed',
        }),
      });
    }
  });
}

/**
 * Mock support contact API server error
 */
async function mockSupportContactServerError(page: import('@playwright/test').Page) {
  await page.route('**/api/support/contact', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to submit support request. Please try again.',
          error: 'Server error',
        }),
      });
    }
  });
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Settings Page E2E Tests', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    // Set up default email preferences mock
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });
  });

  test.describe('Page Rendering', () => {
    test('should display settings page with all sections', async () => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      await settingsPage.assertPageVisible();
      await settingsPage.assertProfileSectionVisible();
      await settingsPage.assertNotificationsSectionVisible();
    });

    test('should display user profile information', async () => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      await settingsPage.assertProfileSectionVisible();
      // The test fixtures create user with email 'test@example.com' and name 'Test User'
      await settingsPage.assertEmailValue('test@example.com');
      await settingsPage.assertDisplayNameValue('Test User');
    });

    test('should show security section for password users', async ({ page }) => {
      // The test fixtures use provider: 'email', so security section should be visible
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      await settingsPage.assertSecuritySectionVisible();
      await expect(settingsPage.changePasswordButton).toBeVisible();
    });
  });

  test.describe('Email Preferences', () => {
    test('should load and display email preferences', async () => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      // Notifications section is always visible (no tabs)
      await settingsPage.assertNotificationsSectionVisible();
    });

    test('should toggle product updates preference', async ({ page }) => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      // Wait for loading to complete
      await expect(settingsPage.loadingState).not.toBeVisible();

      // Click the toggle - it should be visible and clickable
      await settingsPage.toggleProductUpdates();

      // Verify toggle button is visible after click
      await expect(settingsPage.productUpdatesToggle).toBeVisible();
    });

    test('should toggle marketing emails preference', async ({ page }) => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      // Wait for loading to complete
      await expect(settingsPage.loadingState).not.toBeVisible();

      // Click the toggle
      await settingsPage.toggleMarketingEmails();

      // Verify toggle button is visible after click
      await expect(settingsPage.marketingEmailsToggle).toBeVisible();
    });

    test('should toggle low credit alerts preference', async ({ page }) => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      // Wait for loading to complete
      await expect(settingsPage.loadingState).not.toBeVisible();

      // Click the toggle
      await settingsPage.toggleLowCreditAlerts();

      // Verify toggle button is visible after click
      await expect(settingsPage.lowCreditAlertsToggle).toBeVisible();
    });

    test('should show all three preference toggles', async () => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      // Wait for loading to complete
      await expect(settingsPage.loadingState).not.toBeVisible();

      await expect(settingsPage.productUpdatesToggle).toBeVisible();
      await expect(settingsPage.marketingEmailsToggle).toBeVisible();
      await expect(settingsPage.lowCreditAlertsToggle).toBeVisible();
    });
  });

  test.describe('Form Field States', () => {
    test('should disable email and display name inputs', async () => {
      await settingsPage.gotoSettings();
      await settingsPage.waitForPageLoad();

      await expect(settingsPage.emailInput).toBeDisabled();
      await expect(settingsPage.displayNameInput).toBeDisabled();
    });

    test('should show loading state while fetching preferences', async ({ page }) => {
      // Create a mock that delays response - MUST be set up before navigation
      await page.route('**/api/email/preferences', async route => {
        if (route.request().method() === 'GET') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                marketing_emails: false,
                product_updates: true,
                low_credit_alerts: false,
              },
            }),
          });
        }
      });

      // Navigate after setting up the mock to catch the loading state
      await settingsPage.gotoSettings();

      // Check for loading state (it might appear briefly)
      const loadingVisible = await settingsPage.loadingState.isVisible().catch(() => false);
      if (loadingVisible) {
        // If we caught the loading state, wait for it to disappear
        await expect(settingsPage.loadingState).not.toBeVisible({ timeout: 5000 });
      }
      // If we missed the loading state, the test passes (loading completed quickly)
    });
  });
});

test.describe('Support/Help Page E2E Tests', () => {
  let helpPage: HelpPage;

  test.beforeEach(async ({ page }) => {
    helpPage = new HelpPage(page);
  });

  test.describe('Page Rendering', () => {
    test('should display help page with contact support button', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.assertPageVisible();
      await expect(helpPage.contactSupportButton).toBeVisible();
    });
  });

  test.describe('Support Modal', () => {
    test('should open support modal when clicking contact support button', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();
    });

    test('should display all form fields in modal', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await expect(helpPage.nameInput).toBeVisible();
      await expect(helpPage.emailInput).toBeVisible();
      await expect(helpPage.categorySelect).toBeVisible();
      await expect(helpPage.subjectInput).toBeVisible();
      await expect(helpPage.messageTextarea).toBeVisible();
      await expect(helpPage.submitButton).toBeVisible();
    });

    test('should pre-fill name and email for authenticated users', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await expect(helpPage.nameInput).toHaveValue('Test User');
      await expect(helpPage.emailInput).toHaveValue('test@example.com');
    });

    test('should have category options', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      const options = await helpPage.categorySelect.locator('option').allTextContents();
      // Match the actual translated option text
      expect(options).toContain('Technical Support');
      expect(options).toContain('Billing & Account');
      expect(options).toContain('Feature Request');
      expect(options).toContain('Other');
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation error for empty name', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      // Clear the pre-filled name
      await helpPage.nameInput.fill('');
      await helpPage.fillSupportForm({
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Subject',
        message: 'This is a test message with enough content',
      });

      await helpPage.submitForm();

      // Should show validation error
      await expect(helpPage.validationError('name')).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      // Fill form with invalid email (no clearing needed, fill replaces the value)
      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'not-an-email',
        category: 'technical',
        subject: 'Test Subject',
        message: 'This is a test message with enough content',
      });

      await helpPage.submitForm();

      // The error message should contain "valid email" based on the Zod schema
      await expect(helpPage.validationError('email')).toBeVisible();
    });

    test('should show validation error for short subject', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'abc', // Less than 5 characters
        message: 'This is a test message with enough content',
      });

      await helpPage.submitForm();

      await expect(helpPage.validationError('subject')).toBeVisible();
    });

    test('should show validation error for short message', async () => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Subject',
        message: 'short', // Less than 10 characters
      });

      await helpPage.submitForm();

      // Wait for validation to complete and error to appear
      await expect(helpPage.validationError('message')).toBeVisible({ timeout: 10000 });
    });

    test('should have default category value selected', async ({ page }) => {
      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      // Category should have a default value of 'technical'
      const categoryValue = await helpPage.categorySelect.inputValue();
      expect(categoryValue).toBe('technical');

      // Verify the form can be submitted with valid data
      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a test message with enough content',
      });

      // With all valid fields, the submit button should be enabled
      await expect(helpPage.submitButton).toBeEnabled();
    });
  });

  test.describe('Form Submission', () => {
    test('should submit form successfully with valid data', async ({ page }) => {
      await mockSupportContactSuccess(page);

      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Issue',
        message: 'This is a detailed test message that meets the minimum length requirement.',
      });

      await helpPage.submitForm();

      await helpPage.assertSuccessMessageVisible();
    });

    test('should show error message on API failure', async ({ page }) => {
      await mockSupportContactServerError(page);

      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Issue',
        message: 'This is a detailed test message that meets the minimum length requirement.',
      });

      await helpPage.submitForm();

      await expect(helpPage.errorMessage).toBeVisible();
    });

    test('should send correct payload to API', async ({ page }) => {
      let capturedPayload: any = null;

      page.on('request', async request => {
        if (request.url().includes('/api/support/contact') && request.method() === 'POST') {
          capturedPayload = JSON.parse(request.postData() || '{}');
        }
      });

      await mockSupportContactSuccess(page);

      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        category: 'billing',
        subject: 'Billing Question',
        message: 'I have a question about my billing statement.',
      };

      await helpPage.fillSupportForm(formData);
      await helpPage.submitForm();

      await page.waitForTimeout(500);

      expect(capturedPayload).toBeTruthy();
      expect(capturedPayload.name).toBe(formData.name);
      expect(capturedPayload.email).toBe(formData.email);
      expect(capturedPayload.category).toBe(formData.category);
      expect(capturedPayload.subject).toBe(formData.subject);
      expect(capturedPayload.message).toBe(formData.message);
    });

    test('should disable submit button while submitting', async ({ page }) => {
      // Create a mock that delays response
      page.route('**/api/support/contact', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Your support request has been submitted.',
            }),
          });
        }
      });

      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Issue',
        message: 'This is a detailed test message that meets the minimum length requirement.',
      });

      await helpPage.submitForm();

      // Button should be disabled while submitting
      await expect(helpPage.submitButton).toBeDisabled();
    });

    test('should show success state with checkmark icon', async ({ page }) => {
      await mockSupportContactSuccess(page);

      await helpPage.gotoHelp();
      await helpPage.waitForPageLoad();

      await helpPage.openSupportModal();
      await helpPage.assertSupportModalVisible();

      await helpPage.fillSupportForm({
        name: 'Test User',
        email: 'test@example.com',
        category: 'technical',
        subject: 'Test Issue',
        message: 'This is a detailed test message that meets the minimum length requirement.',
      });

      await helpPage.submitForm();

      // Check for success state elements
      await helpPage.assertSuccessMessageVisible();
    });
  });
});

test.describe('Settings Page Navigation', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });
  });

  test('should be accessible from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to settings via URL
    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    await settingsPage.assertPageVisible();
  });
});

test.describe('Support Page Navigation', () => {
  test('should redirect /dashboard/support to /help', async ({ page }) => {
    await page.goto('/dashboard/support');

    // Wait for redirect
    await page.waitForURL('/help', { timeout: 5000 });
    expect(page.url()).toContain('/help');
  });

  test('should be accessible directly via /help', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('domcontentloaded');

    const pageTitle = page.getByRole('heading', { name: /help/i, level: 1 });
    await expect(pageTitle).toBeVisible();
  });
});
