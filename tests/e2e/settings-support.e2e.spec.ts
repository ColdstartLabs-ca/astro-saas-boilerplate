import { test, expect } from '../test-fixtures';
import { BasePage } from '../pages/BasePage';

/**
 * Settings and Support E2E Tests
 *
 * Consolidated tests for settings page (/dashboard/settings) and support functionality.
 */

// =============================================================================
// Page Objects
// =============================================================================

class SettingsPage extends BasePage {
  get pageTitle() {
    return this.page.getByRole('heading', { name: /settings/i, level: 1 });
  }

  get profileHeading() {
    return this.page.getByRole('heading', { name: /^profile$/i, level: 2 });
  }

  get securitySection() {
    return this.page.getByRole('heading', { name: /^security$/i, level: 2 });
  }

  get notificationsSection() {
    return this.page.getByRole('heading', { name: /^notifications$/i, level: 2 });
  }

  get productUpdatesToggle() {
    return this.page
      .locator('label')
      .filter({ hasText: /product updates/i })
      .locator('button');
  }

  get loadingState() {
    return this.page.getByText(/loading preferences/i);
  }

  async gotoSettings(): Promise<void> {
    await super.goto('/dashboard/settings');
  }

  async assertPageVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  async assertProfileSectionVisible(): Promise<void> {
    await expect(this.profileHeading).toBeVisible();
  }

  async assertNotificationsSectionVisible(): Promise<void> {
    await expect(this.notificationsSection).toBeVisible();
  }
}

class HelpPage extends BasePage {
  get pageTitle() {
    return this.page.getByRole('heading', { name: /help/i, level: 1 });
  }

  get contactSupportCTA() {
    return this.page.locator('section').filter({ hasText: /still need help/i }).last();
  }

  get contactSupportButton() {
    return this.page.getByRole('button', { name: /email support/i }).first();
  }

  get supportModal() {
    return this.page.locator('[data-testid="modal"]');
  }

  get modalTitle() {
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
    return this.page.locator('text=Message Sent').or(
      this.page.locator('[role="alert"]').getByText(/message sent|we'll get back to you/i)
    ).first();
  }

  validationError(field: string) {
    const errorPatterns: Record<string, RegExp> = {
      name: /name is required|name must be at least/i,
      email: /email is required|please enter a valid email/i,
      subject: /subject is required|subject must be at least/i,
      message: /message is required|message must be at least/i,
    };
    const pattern = errorPatterns[field] || new RegExp(field, 'i');
    return this.supportModal.locator('p').filter({ hasText: pattern });
  }

  async gotoHelp(): Promise<void> {
    await super.goto('/help');
  }

  async scrollToContactCTA(): Promise<void> {
    await this.contactSupportCTA.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  async openSupportModal(): Promise<void> {
    await this.scrollToContactCTA();
    await this.contactSupportButton.waitFor({ state: 'visible' });
    await this.contactSupportButton.click();
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

  async assertSupportModalVisible(): Promise<void> {
    await expect(this.supportModal).toBeVisible();
    await expect(this.modalTitle).toBeVisible();
  }

  async assertSuccessMessageVisible(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }
}

// =============================================================================
// Mock Helpers
// =============================================================================

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

async function mockSupportContactSuccess(page: import('@playwright/test').Page) {
  await page.route('**/api/support/contact', async route => {
    if (route.request().method() === 'POST') {
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
}

async function mockSupportContactServerError(page: import('@playwright/test').Page) {
  await page.route('**/api/support/contact', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to submit support request.',
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
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });
  });

  test('should display settings page with all sections', async ({ page }) => {
    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    await settingsPage.assertPageVisible();

    // Profile and notifications are under the Account tab — navigate there first
    const accountTab = page.getByRole('button', { name: /profile/i });
    await accountTab.click();

    await settingsPage.assertProfileSectionVisible();
    await settingsPage.assertNotificationsSectionVisible();
  });

  test('should toggle email preferences', async ({ page }) => {
    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    // Notifications are under the Account tab — navigate there first
    const accountTab = page.getByRole('button', { name: /profile/i });
    await accountTab.click();

    await expect(settingsPage.loadingState).not.toBeVisible();

    await settingsPage.productUpdatesToggle.click();
    await expect(settingsPage.productUpdatesToggle).toBeVisible();
  });
});

test.describe('Settings Tab Layout E2E Tests', () => {
  test('should show Articles tab by default', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });

    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    // Articles tab should be visible and active by default
    const articlesTab = page.getByRole('button', { name: /articles/i });
    await expect(articlesTab).toBeVisible();

    // Articles section content should be visible (Language & Country heading)
    await expect(page.getByRole('heading', { name: /language.*country/i })).toBeVisible();
  });

  test('should switch between Articles and Account tabs', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });

    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    // Start on Articles tab
    const articlesTab = page.getByRole('button', { name: /articles/i });
    const accountTab = page.getByRole('button', { name: /profile/i });

    // Click Account tab
    await accountTab.click();

    // Profile section should now be visible
    await expect(settingsPage.profileHeading).toBeVisible();
    await expect(settingsPage.notificationsSection).toBeVisible();

    // Click back to Articles tab
    await articlesTab.click();

    // Articles content should be visible again
    await expect(page.getByRole('heading', { name: /language.*country/i })).toBeVisible();
  });

  test('should show empty state when no project selected', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });

    // Mock no active project
    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { projects: [] },
        }),
      });
    });

    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    // Empty state should be visible (use heading role to avoid matching sidebar)
    await expect(page.getByRole('heading', { name: /no project selected/i })).toBeVisible();
    await expect(page.getByText(/select a project to edit/i)).toBeVisible();
  });

  test('should display current project content preferences', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await mockEmailPreferences(page, {
      product_updates: true,
      marketing_emails: false,
      low_credit_alerts: true,
    });

    // Mock active project with content preferences
    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            projects: [
              {
                id: 'test-project-id',
                name: 'Test Project',
                domain: 'https://example.com',
                language: 'en',
                country: 'US',
                content_preferences: {
                  frequency: 'daily',
                  articleStyle: 'informative',
                  internalLinksCount: 2,
                  brandColor: '#4F46E5',
                  imageStyle: 'cinematic',
                  globalInstructions: 'Test instructions',
                },
              },
            ],
          },
        }),
      });
    });

    await settingsPage.gotoSettings();
    await settingsPage.waitForPageLoad();

    // Project name should be visible in the project context header (not sidebar)
    // Use main content area to avoid matching sidebar project selector
    await expect(page.getByRole('main').getByText('Test Project').first()).toBeVisible();

    // Language dropdown should have correct value
    const languageSelect = page.locator('#language');
    await expect(languageSelect).toHaveValue('en');

    // Country dropdown should have correct value
    const countrySelect = page.locator('#country');
    await expect(countrySelect).toHaveValue('US');

    // Content preferences form should be visible
    await expect(page.getByText(/content preferences/i)).toBeVisible();
  });
});

test.describe('Support/Help Page E2E Tests', () => {
  let helpPage: HelpPage;

  test.beforeEach(async ({ page }) => {
    helpPage = new HelpPage(page);
  });

  test('should display help page with contact support button', async () => {
    await helpPage.gotoHelp();
    await helpPage.waitForPageLoad();

    await expect(helpPage.pageTitle).toBeVisible();
    await expect(helpPage.contactSupportButton).toBeVisible();
  });

  test('should open support modal and display form fields', async () => {
    await helpPage.gotoHelp();
    await helpPage.waitForPageLoad();

    await helpPage.openSupportModal();
    await helpPage.assertSupportModalVisible();

    await expect(helpPage.nameInput).toBeVisible();
    await expect(helpPage.emailInput).toBeVisible();
    await expect(helpPage.categorySelect).toBeVisible();
    await expect(helpPage.subjectInput).toBeVisible();
    await expect(helpPage.messageTextarea).toBeVisible();
  });

  test('should show validation errors for invalid form data', async () => {
    await helpPage.gotoHelp();
    await helpPage.waitForPageLoad();

    await helpPage.openSupportModal();
    await helpPage.assertSupportModalVisible();

    await helpPage.nameInput.fill('');
    await helpPage.fillSupportForm({
      email: 'not-an-email',
      category: 'technical',
      subject: 'abc',
      message: 'short',
    });

    await helpPage.submitForm();

    await expect(helpPage.validationError('name')).toBeVisible();
    await expect(helpPage.validationError('email')).toBeVisible();
  });

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

    await expect(page.locator('[role="alert"]').getByText(/failed/i)).toBeVisible();
  });
});

test.describe('Support Page Navigation', () => {
  test('should redirect /dashboard/support to /help', async ({ page }) => {
    await page.goto('/dashboard/support');
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
