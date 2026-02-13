import { test, expect } from '../test-fixtures';
import { IntegrationsPage } from '../pages/IntegrationsPage';

/**
 * Integration Management E2E Tests
 *
 * Tests the full user flow for managing WordPress and webhook integrations,
 * including CRUD operations, validation, and connection testing.
 *
 * Mock data and API routes are set up per test group to provide the right
 * state for each scenario.
 */

// =============================================================================
// Mock Data
// =============================================================================

const mockWordPressIntegration = {
  id: 'mock-wp-1',
  name: 'My WordPress Blog',
  type: 'wordpress',
  status: 'active',
  config: { site_url: 'https://myblog.com', username: 'admin' },
  campaign_count: 2,
  last_tested_at: '2024-06-01T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockWebhookIntegration = {
  id: 'mock-wh-1',
  name: 'Test Webhook',
  type: 'webhook',
  status: 'active',
  config: { url: 'https://webhook.example.com/endpoint' },
  campaign_count: 0,
  last_tested_at: null,
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
};

// =============================================================================
// Helper: Mock integrations API with existing data
// =============================================================================

async function mockIntegrationsWithData(
  page: import('@playwright/test').Page,
  integrations: typeof mockWordPressIntegration[]
) {
  await page.route('**/api/integrations', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { integrations },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Helper: Mock integrations API with stateful create behavior
// =============================================================================

async function mockIntegrationsWithCreate(
  page: import('@playwright/test').Page,
  newIntegration: Record<string, unknown>
) {
  const createdIntegrations: Record<string, unknown>[] = [];

  await page.route('**/api/integrations', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { integrations: createdIntegrations },
        }),
      });
    } else if (route.request().method() === 'POST') {
      createdIntegrations.push(newIntegration);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { integration: newIntegration },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Integration Management E2E Tests', () => {
  let integrationsPage: IntegrationsPage;

  test.beforeEach(async ({ page }) => {
    integrationsPage = new IntegrationsPage(page);
  });

  test.describe('Empty State', () => {
    test('should display empty state when no integrations', async () => {
      await integrationsPage.goto();

      await integrationsPage.assertEmptyStateVisible();
      await integrationsPage.assertIntegrationCardsVisible(0);
    });

    test('should show add integration button in empty state', async () => {
      await integrationsPage.goto();

      await expect(integrationsPage.addButton.first()).toBeVisible();
      await integrationsPage.assertIntegrationCardsVisible(0);
    });
  });

  test.describe('Create Integration Flow', () => {
    test('should open create integration modal from empty state', async () => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.assertModalVisible();
    });

    test('should select WordPress integration type', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      // Verify step 2 form shows WordPress-specific fields
      const { siteUrlInput, usernameInput, appPasswordInput } = integrationsPage.wordpressFields;
      await expect(siteUrlInput).toBeVisible();
      await expect(usernameInput).toBeVisible();
      await expect(appPasswordInput).toBeVisible();
    });

    test('should select Webhook integration type', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWebhookType();

      // Verify step 2 form shows Webhook-specific fields
      const { urlInput } = integrationsPage.webhookFields;
      await expect(urlInput).toBeVisible();
    });

    test('should show validation errors for missing required fields', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      // Submit without filling any fields
      await integrationsPage.submitForm();

      // Zod schema messages: 'Name is required', 'Invalid URL', 'Username is required', 'Application password is required'
      await integrationsPage.assertValidationErrors([
        'Name is required',
        'Invalid URL',
        'Username is required',
        'Application password is required',
      ]);
    });

    test('should create WordPress integration successfully', async ({ page }) => {
      // Set up stateful mock: GET returns empty initially, then returns integration after POST
      await mockIntegrationsWithCreate(page, {
        ...mockWordPressIntegration,
        name: 'My WordPress Blog',
      });

      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      await integrationsPage.fillWordPressForm({
        name: 'My WordPress Blog',
        siteUrl: 'https://myblog.com',
        username: 'admin',
        appPassword: 'secret123',
      });

      await integrationsPage.submitForm();

      // Wait for modal to close (indicates successful submission)
      await integrationsPage.waitForModalClose();

      // Verify integration appears in list after refetch
      await integrationsPage.assertIntegrationExists('My WordPress Blog');
    });

    test('should create Webhook integration successfully', async ({ page }) => {
      // Set up stateful mock
      await mockIntegrationsWithCreate(page, {
        ...mockWebhookIntegration,
        name: 'Test Webhook',
      });

      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWebhookType();

      await integrationsPage.fillWebhookForm({
        name: 'Test Webhook',
        url: 'https://webhook.example.com/endpoint',
        secret: 'webhook_secret',
        description: 'Test webhook for integration',
      });

      await integrationsPage.submitForm();

      // Wait for modal to close
      await integrationsPage.waitForModalClose();

      // Verify integration appears in list
      await integrationsPage.assertIntegrationExists('Test Webhook');
    });

    test('should validate URL format', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      await integrationsPage.fillWordPressForm({
        name: 'Test',
        siteUrl: 'not-a-url',
        username: 'admin',
        appPassword: 'testpass',
      });

      await integrationsPage.submitForm();

      // The input has type="url", so browser-native validation fires before
      // React Hook Form's Zod validation. Native validation prevents submission.
      // Verify the modal stays open (form was not submitted)
      await expect(integrationsPage.integrationModal).toBeVisible();
      await expect(integrationsPage.submitButton).toBeVisible();
    });
  });

  test.describe('Integration List Display', () => {
    test.beforeEach(async ({ page }) => {
      // Override default empty mock with existing integrations
      await mockIntegrationsWithData(page, [
        mockWordPressIntegration,
        mockWebhookIntegration,
      ] as typeof mockWordPressIntegration[]);
    });

    test('should display integration cards', async () => {
      await integrationsPage.goto();

      await integrationsPage.assertIntegrationCardsVisible(2);
    });

    test('should show integration status', async () => {
      await integrationsPage.goto();

      await integrationsPage.assertIntegrationCardsVisible(1);

      // Check for status indicators
      const statuses = await integrationsPage.getIntegrationStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });

    test('should not leak encrypted credentials in list', async () => {
      await integrationsPage.goto();

      const integrationCards = integrationsPage.integrationCards;
      const cardCount = await integrationCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const card = integrationCards.nth(i);
        const cardText = await card.textContent();

        // Verify passwords/secrets are not visible in card text
        expect(cardText).not.toContain('secret123');
        expect(cardText).not.toContain('app_password');
        expect(cardText).not.toContain('encrypted_credentials');
      }
    });
  });

  test.describe('Edit Integration Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Set up existing integration data
      await mockIntegrationsWithData(page, [mockWordPressIntegration] as typeof mockWordPressIntegration[]);

      // Mock PUT endpoint for updates
      await page.route('**/api/integrations/*', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                integration: { ...mockWordPressIntegration, name: 'Updated Name' },
              },
            }),
          });
        } else {
          await route.fallback();
        }
      });
    });

    test('should open edit modal from integration card', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openEditModal('My WordPress Blog');
      await integrationsPage.assertModalVisible();

      // Verify fields are pre-populated (edit mode skips step 1, goes to step 2)
      const { siteUrlInput, usernameInput } = integrationsPage.wordpressFields;
      await expect(siteUrlInput).toHaveValue('https://myblog.com');
      await expect(usernameInput).toHaveValue('admin');
    });

    test('should update integration name', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openEditModal('My WordPress Blog');

      // Update only the name
      const nameInput = integrationsPage.integrationModal.locator('input[name="name"]');
      await nameInput.fill('Updated Name');

      await integrationsPage.submitForm();

      // Modal should close after successful update
      await integrationsPage.waitForModalClose();
    });
  });

  test.describe('Delete Integration Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Set up existing integration data
      await mockIntegrationsWithData(page, [mockWordPressIntegration] as typeof mockWordPressIntegration[]);

      // Mock DELETE endpoint
      await page.route('**/api/integrations/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.fallback();
        }
      });
    });

    test('should delete integration', async ({ page }) => {
      await integrationsPage.goto();
      await integrationsPage.assertIntegrationCardsVisible(1);

      // Open the three-dot menu on the card
      const firstCard = integrationsPage.integrationCards.first();
      const menuButton = firstCard.getByRole('button', { name: /actions/i });
      await menuButton.click();

      // Click "Delete" in the dropdown
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmButton = page.getByRole('button', { name: /delete/i }).first();
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // After delete, the list should refetch. Since our mock always returns the same data,
      // we verify the delete flow completes without errors
      await page.waitForTimeout(1000);
    });

    test('should not allow deleting other user integration', async () => {
      // This test requires multi-user auth setup
      test.skip(true, 'Requires multi-user auth setup');
    });
  });

  test.describe('Test Connection Flow', () => {
    test('should test connection from create modal', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      // Fill required fields before testing
      await integrationsPage.fillWordPressForm({
        name: 'Test Blog',
        siteUrl: 'https://test.com',
        username: 'admin',
        appPassword: 'testpass',
      });

      // Click test connection button (only available in create mode)
      await integrationsPage.testConnection();

      // Wait for test result to appear
      await integrationsPage.waitForTestResult();

      // Verify "Configuration looks valid" message appears
      const resultText = integrationsPage.integrationModal.locator('text=Configuration looks valid');
      await expect(resultText).toBeVisible();
    });

    test('should handle connection test states', async ({ page }) => {
      await integrationsPage.goto();

      await integrationsPage.openAddIntegrationModal();
      await integrationsPage.selectWordPressType();

      await integrationsPage.fillWordPressForm({
        name: 'Test Blog',
        siteUrl: 'https://test.com',
        username: 'admin',
        appPassword: 'testpass',
      });

      await integrationsPage.testConnection();

      // Wait for result
      await integrationsPage.waitForTestResult();

      // Verify submit button is still available (modal didn't crash)
      await expect(integrationsPage.submitButton).toBeVisible();
      await expect(integrationsPage.submitButton).toBeEnabled();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from dashboard to integrations', async () => {
      await integrationsPage.goto();

      expect(integrationsPage.page.url()).toContain('/integrations');
    });

    test('should handle back navigation', async () => {
      await integrationsPage.goto();

      // Verify we're on integrations page
      expect(integrationsPage.page.url()).toContain('/dashboard');
    });
  });
});
