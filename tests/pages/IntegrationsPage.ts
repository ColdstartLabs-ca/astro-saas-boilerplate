import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Integrations page
 *
 * Provides methods for interacting with the integrations management UI,
 * including CRUD operations, connection testing, and validation.
 */
export class IntegrationsPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Gets the integration cards container
   */
  get integrationCards(): Locator {
    return this.page.locator('[data-testid="integration-card"]');
  }

  /**
   * Gets the empty state container
   */
  get emptyState(): Locator {
    return this.page.locator('[data-testid="integrations-empty-state"]');
  }

  /**
   * Gets the add integration button (matches both empty state and list view buttons)
   */
  get addButton(): Locator {
    return this.page.getByRole('button', { name: /add.*integration/i });
  }

  /**
   * Gets the integration form modal
   */
  get integrationModal(): Locator {
    return this.page.locator('[data-testid="modal"]');
  }

  /**
   * Gets integration type selection cards (scoped to modal)
   */
  get typeCards(): Locator {
    return this.integrationModal.locator('button').filter({ hasText: /WordPress|Webhook/i });
  }

  /**
   * Gets WordPress-specific form fields (using React Hook Form name attributes)
   */
  get wordpressFields() {
    const modal = this.integrationModal;
    const siteUrlInput = modal.locator('input[name="siteUrl"]');
    const usernameInput = modal.locator('input[name="username"]');
    const appPasswordInput = modal.locator('input[name="appPassword"]');

    return { siteUrlInput, usernameInput, appPasswordInput };
  }

  /**
   * Gets Webhook-specific form fields (using React Hook Form name attributes)
   */
  get webhookFields() {
    const modal = this.integrationModal;
    const urlInput = modal.locator('input[name="url"]');
    const secretInput = modal.locator('input[name="secret"]');
    const descriptionInput = modal.locator('input[name="description"]');

    return { urlInput, secretInput, descriptionInput };
  }

  /**
   * Gets test connection button (scoped to modal)
   */
  get testConnectionButton(): Locator {
    return this.integrationModal.locator('button').filter({ hasText: /^Test$|^Testing/i });
  }

  /**
   * Gets form submit button (scoped to modal)
   */
  get submitButton(): Locator {
    return this.integrationModal.getByRole('button', { name: /create|save/i });
  }

  /**
   * Gets cancel button (scoped to modal)
   */
  get cancelButton(): Locator {
    return this.integrationModal.getByRole('button', { name: /cancel/i });
  }

  /**
   * Gets validation error messages (red error text in form)
   */
  get validationErrors(): Locator {
    return this.integrationModal.locator('.text-red-400');
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigates to integrations page
   */
  async goto(path?: string): Promise<void> {
    await super.goto(path ?? '/dashboard/integrations');
    await this.waitForPageLoad();
  }

  /**
   * Opens the add integration modal
   */
  async openAddIntegrationModal(): Promise<void> {
    await this.addButton.first().click();
    await this.waitForModal();
  }

  /**
   * Opens edit modal for a specific integration via three-dot menu
   *
   * @param integrationName - Name of the integration to edit
   */
  async openEditModal(integrationName: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: integrationName }).first();
    // Click the three-dot actions menu button
    const menuButton = card.getByRole('button', { name: /actions/i });
    await menuButton.click();
    // Click "Edit" in the dropdown menu
    await this.page.getByRole('button', { name: 'Edit', exact: true }).click();
    await this.waitForModal();
  }

  // ============================================================================
  // Type Selection Methods
  // ============================================================================

  /**
   * Selects WordPress integration type and waits for form fields
   */
  async selectWordPressType(): Promise<void> {
    const wordpressCard = this.typeCards.filter({ hasText: /WordPress/i }).first();
    await wordpressCard.click();
    // Wait for step 2 form to render
    await expect(this.integrationModal.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Selects Webhook integration type and waits for form fields
   */
  async selectWebhookType(): Promise<void> {
    const webhookCard = this.typeCards.filter({ hasText: /Webhook/i }).first();
    await webhookCard.click();
    // Wait for step 2 form to render
    await expect(this.integrationModal.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
  }

  // ============================================================================
  // Form Interaction Methods
  // ============================================================================

  /**
   * Fills WordPress integration form
   */
  async fillWordPressForm(data: {
    name?: string;
    siteUrl?: string;
    username?: string;
    appPassword?: string;
  }): Promise<void> {
    const { siteUrlInput, usernameInput, appPasswordInput } = this.wordpressFields;

    if (data.name !== undefined) {
      const nameInput = this.integrationModal.locator('input[name="name"]');
      await nameInput.fill(data.name);
    }

    if (data.siteUrl !== undefined) {
      await siteUrlInput.fill(data.siteUrl);
    }

    if (data.username !== undefined) {
      await usernameInput.fill(data.username);
    }

    if (data.appPassword !== undefined) {
      await appPasswordInput.fill(data.appPassword);
    }
  }

  /**
   * Fills Webhook integration form
   */
  async fillWebhookForm(data: {
    name?: string;
    url?: string;
    secret?: string;
    description?: string;
  }): Promise<void> {
    const { urlInput, secretInput, descriptionInput } = this.webhookFields;

    if (data.name !== undefined) {
      const nameInput = this.integrationModal.locator('input[name="name"]');
      await nameInput.fill(data.name);
    }

    if (data.url !== undefined) {
      await urlInput.fill(data.url);
    }

    if (data.secret !== undefined) {
      await secretInput.fill(data.secret);
    }

    if (data.description !== undefined) {
      await descriptionInput.fill(data.description);
    }
  }

  /**
   * Submits the integration form
   */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Cancels the form/modal
   */
  async cancelForm(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Tests the connection (in create modal)
   */
  async testConnection(): Promise<void> {
    await this.testConnectionButton.click();
  }

  // ============================================================================
  // Assertion Methods
  // ============================================================================

  /**
   * Asserts empty state is visible
   */
  async assertEmptyStateVisible(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Asserts integration cards are visible with expected count
   *
   * @param count - Expected count (0 means no cards)
   */
  async assertIntegrationCardsVisible(count = 1): Promise<void> {
    const cards = this.integrationCards;
    if (count === 0) {
      const actualCount = await cards.count();
      expect(actualCount).toBe(0);
      return;
    }
    await expect(cards.first()).toBeVisible();
    const actualCount = await cards.count();
    expect(actualCount).toBeGreaterThanOrEqual(count);
  }

  /**
   * Asserts modal is visible
   */
  async assertModalVisible(): Promise<void> {
    await this.waitForModal();
  }

  /**
   * Asserts validation errors are visible
   *
   * @param expectedErrors - Array of expected error text
   */
  async assertValidationErrors(expectedErrors: string[]): Promise<void> {
    for (const errorText of expectedErrors) {
      const matchingError = this.validationErrors.filter({ hasText: errorText }).first();
      await expect(matchingError).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Asserts specific integration card is visible
   *
   * @param integrationName - Name of the integration
   */
  async assertIntegrationExists(integrationName: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: integrationName }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts integration has specific status
   *
   * @param integrationName - Name of the integration
   * @param status - Expected status text
   */
  async assertIntegrationStatus(integrationName: string, status: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: integrationName }).first();
    await expect(card).toContainText(status);
  }

  /**
   * Asserts success toast is visible
   *
   * @param message - Expected success message (can be partial or regex)
   */
  async assertSuccessToast(message?: string | RegExp): Promise<void> {
    await this.waitForToast(message);
  }

  /**
   * Waits for integration form modal to close
   */
  async waitForModalClose(): Promise<void> {
    await expect(this.integrationModal).toBeHidden({ timeout: 10000 });
  }

  /**
   * Waits for test connection result in modal
   */
  async waitForTestResult(): Promise<void> {
    const resultIndicator = this.integrationModal.locator('div').filter({
      hasText: /Connection successful|Connection failed|Configuration looks/i,
    });
    await expect(resultIndicator.first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Gets integration card names
   */
  async getIntegrationNames(): Promise<string[]> {
    const cards = this.integrationCards;
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const name = await card.locator('h3').first().textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Gets status indicators for all integration cards
   */
  async getIntegrationStatuses(): Promise<string[]> {
    const cards = this.integrationCards;
    const count = await cards.count();
    const statuses: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const statusElement = card.locator('span').filter({ hasText: /Active|Error|Disabled/i }).first();
      const status = await statusElement.textContent();
      if (status) {
        statuses.push(status.trim());
      }
    }

    return statuses;
  }

  /**
   * Checks if integration card with given name exists
   */
  async hasIntegrationNamed(name: string): Promise<boolean> {
    const names = await this.getIntegrationNames();
    return names.some(n => n.includes(name));
  }

  /**
   * Counts visible integration cards
   */
  async getIntegrationCount(): Promise<number> {
    return await this.integrationCards.count();
  }
}
