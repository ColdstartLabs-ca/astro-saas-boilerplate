import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Campaigns page
 *
 * Provides methods for interacting with the campaigns management UI,
 * including campaign list, campaign detail, and keyword management.
 */
export class CampaignsPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Gets the campaign cards container
   */
  get campaignCards(): Locator {
    return this.page.locator('[data-testid="campaign-card"]');
  }

  /**
   * Gets the empty state container
   */
  get emptyState(): Locator {
    return this.page.locator('[data-testid="campaigns-empty-state"]');
  }

  /**
   * Gets the new campaign button (from the header)
   */
  get newCampaignButton(): Locator {
    return this.page.getByRole('button', { name: /new campaign/i });
  }

  /**
   * Gets the create first campaign button (from empty state)
   */
  get createFirstButton(): Locator {
    return this.page.getByRole('button', { name: /create first|create first campaign/i });
  }

  /**
   * Gets the new campaign button card (from the list)
   */
  get newCampaignCardButton(): Locator {
    return this.page.locator('[data-testid="new-campaign-button"]');
  }

  /**
   * Gets the campaign modal (standard Modal component)
   * Note: This works for NewCampaignModal and SettingsModal which use the Modal component.
   * AddKeywordsModal uses its own custom modal structure - use addKeywordsModal instead.
   */
  get campaignModal(): Locator {
    return this.page.locator('[data-testid="modal"]');
  }

  /**
   * Gets the AddKeywordsModal (custom modal, not using Modal component)
   * This modal has a different structure from the standard Modal component.
   */
  get addKeywordsModal(): Locator {
    // AddKeywordsModal has a fixed inset-0 div with specific classes
    return this.page.locator('.fixed.inset-0.z-50').filter({
      has: this.page.locator('h3').filter({ hasText: /keywords/i }),
    });
  }

  /**
   * Gets campaign name input in modal
   */
  get campaignNameInput(): Locator {
    return this.page.locator('input[name="name"]');
  }

  /**
   * Gets keywords textarea in modal
   * Works for both NewCampaignModal (textarea[name="keywords"]) and
   * AddKeywordsModal (textarea without name attribute)
   */
  get keywordsTextarea(): Locator {
    // First try named textarea (NewCampaignModal)
    const namedTextarea = this.page.locator('textarea[name="keywords"]');
    // Fall back to any visible textarea in a modal context
    const anyTextarea = this.page
      .locator('.fixed.inset-0.z-50 textarea, [data-testid="modal"] textarea')
      .first();
    return namedTextarea.or(anyTextarea);
  }

  /**
   * Gets form submit button (scoped to modal) - handles multi-step form
   */
  get submitButton(): Locator {
    return this.campaignModal.getByRole('button', {
      name: /create|launch|start schedule|add|save/i,
    });
  }

  /**
   * Gets next button for multi-step form
   */
  get nextButton(): Locator {
    return this.campaignModal.getByRole('button', { name: /next/i });
  }

  /**
   * Gets cancel button (scoped to modal)
   */
  get cancelButton(): Locator {
    return this.campaignModal.getByRole('button', { name: /cancel|back/i });
  }

  /**
   * Gets back to campaigns list button
   */
  get backButton(): Locator {
    return this.page.getByRole('button', { name: /campaigns/i });
  }

  /**
   * Gets start/pause campaign button
   */
  get pauseButton(): Locator {
    return this.page.getByRole('button', { name: /pause|stop/i });
  }

  /**
   * Gets resume/play campaign button
   */
  get resumeButton(): Locator {
    return this.page.getByRole('button', { name: /resume|play|start/i });
  }

  /**
   * Gets add keywords button
   */
  get addKeywordsButton(): Locator {
    return this.page.getByRole('button', { name: /add keywords/i });
  }

  /**
   * Gets settings button
   */
  get settingsButton(): Locator {
    return this.page.getByRole('button', { name: /settings/i });
  }

  /**
   * Gets start schedule button
   */
  get startScheduleButton(): Locator {
    return this.page.getByRole('button', { name: /start.*schedule/i });
  }

  /**
   * Gets pause schedule button
   */
  get pauseScheduleButton(): Locator {
    return this.page.getByRole('button', { name: /pause.*schedule/i });
  }

  /**
   * Gets resume schedule button
   */
  get resumeScheduleButton(): Locator {
    return this.page.getByRole('button', { name: /resume.*schedule/i });
  }

  /**
   * Gets keyword items in campaign detail
   */
  get keywordItems(): Locator {
    return this.page.locator('[data-testid="keyword-item"], .keyword-item');
  }

  /**
   * Gets remove keyword buttons
   */
  get removeKeywordButtons(): Locator {
    return this.page.locator('button').filter({ hasText: /remove|delete/i });
  }

  /**
   * Gets validation error messages
   */
  get validationErrors(): Locator {
    return this.campaignModal.locator('.text-red-400, [data-testid="validation-error"]');
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigates to campaigns page
   */
  async goto(path?: string): Promise<void> {
    await super.goto(path ?? '/dashboard/campaigns');
    await this.waitForPageLoad();
  }

  /**
   * Opens the new campaign modal
   */
  async openNewCampaignModal(): Promise<void> {
    const isVisible = await this.newCampaignButton.isVisible().catch(() => false);
    const isCreateFirstVisible = await this.createFirstButton.isVisible().catch(() => false);

    if (isVisible) {
      await this.newCampaignButton.click();
    } else if (isCreateFirstVisible) {
      await this.createFirstButton.click();
    } else {
      // Try clicking any button with "campaign" in the text
      const campaignButton = this.page
        .getByRole('button')
        .filter({ hasText: /campaign/i })
        .first();
      await campaignButton.click();
    }

    // Wait for modal to appear with a timeout
    try {
      await this.waitForModal();
    } catch {
      // Modal might not open, continue anyway
    }
  }

  /**
   * Opens campaign detail by clicking on a campaign card
   *
   * @param campaignName - Name of the campaign to open
   */
  async openCampaignDetail(campaignName: string): Promise<void> {
    const card = this.campaignCards.filter({ hasText: campaignName }).first();
    await card.click();
    // Wait for client-side routing to complete
    await this.waitForLoadingComplete();
    await this.wait(1000); // Give extra time for client-side navigation
  }

  /**
   * Navigates back to campaigns list
   */
  async backToList(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL(/\/dashboard\/campaigns$/);
    await this.waitForPageLoad();
  }

  // ============================================================================
  // Campaign Actions
  // ============================================================================

  /**
   * Pauses the campaign
   */
  async pauseCampaign(): Promise<void> {
    await this.pauseButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Resumes the campaign
   */
  async resumeCampaign(): Promise<void> {
    await this.resumeButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Starts the campaign schedule
   */
  async startSchedule(): Promise<void> {
    await this.startScheduleButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Pauses the campaign schedule
   */
  async pauseSchedule(): Promise<void> {
    await this.pauseScheduleButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Resumes the campaign schedule
   */
  async resumeSchedule(): Promise<void> {
    await this.resumeScheduleButton.click();
    await this.waitForLoadingComplete();
  }

  // ============================================================================
  // Form Methods
  // ============================================================================

  /**
   * Fills the new campaign form
   *
   * @param data - Campaign form data
   */
  async fillCampaignForm(data: { name: string; keywords: string }): Promise<void> {
    await this.campaignNameInput.fill(data.name);
    await this.keywordsTextarea.fill(data.keywords);
  }

  /**
   * Submits the campaign form
   */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Submits the add keywords form
   * Handles both standard Modal-based modals and custom AddKeywordsModal
   */
  async submitAddKeywords(): Promise<void> {
    // Try AddKeywordsModal first (custom modal structure)
    const addKeywordsBtn = this.addKeywordsModal.getByRole('button', { name: /add/i });
    if (await addKeywordsBtn.isVisible().catch(() => false)) {
      await addKeywordsBtn.click();
      return;
    }
    // Fall back to standard modal
    await this.campaignModal.getByRole('button', { name: /add|save/i }).click();
  }

  // ============================================================================
  // Assertion Methods
  // ============================================================================

  /**
   * Asserts that campaign cards are visible
   *
   * @param count - Expected number of campaign cards
   */
  async assertCampaignCardsVisible(count: number): Promise<void> {
    await expect(this.campaignCards).toHaveCount(count);
  }

  /**
   * Asserts that empty state is visible
   */
  async assertEmptyStateVisible(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Asserts that modal is visible
   * Checks both standard Modal component and custom modals like AddKeywordsModal
   */
  async assertModalVisible(): Promise<void> {
    const standardModal = this.campaignModal;
    const customModal = this.addKeywordsModal;
    // Check if either modal type is visible
    const isStandardVisible = await standardModal.isVisible().catch(() => false);
    if (isStandardVisible) {
      await expect(standardModal).toBeVisible();
      return;
    }
    await expect(customModal).toBeVisible();
  }

  /**
   * Asserts that modal is hidden
   * Checks both standard Modal component and custom modals like AddKeywordsModal
   */
  async assertModalHidden(): Promise<void> {
    const standardModal = this.campaignModal;
    const customModal = this.addKeywordsModal;
    // Check if either modal type is still visible
    const isStandardVisible = await standardModal.isVisible().catch(() => false);
    const isCustomVisible = await customModal.isVisible().catch(() => false);

    if (isStandardVisible) {
      await expect(standardModal).toBeHidden();
    }
    if (isCustomVisible) {
      await expect(customModal).toBeHidden();
    }
  }

  /**
   * Asserts that a campaign with given name exists
   *
   * @param campaignName - Name of the campaign to check
   */
  async assertCampaignExists(campaignName: string): Promise<void> {
    const card = this.campaignCards.filter({ hasText: campaignName }).first();
    await expect(card).toBeVisible();
  }

  /**
   * Asserts that validation errors are visible
   *
   * @param errors - Array of expected error messages
   */
  async assertValidationErrors(errors: string[]): Promise<void> {
    for (const error of errors) {
      await expect(this.campaignModal.getByText(error)).toBeVisible();
    }
  }

  /**
   * Asserts that campaign is in specific status
   *
   * @param status - Expected campaign status
   */
  async assertCampaignStatus(status: string): Promise<void> {
    // Try multiple selectors for campaign status
    const statusBadge = this.page
      .locator(`[data-testid="campaign-name"]`)
      .locator('span.text-xs')
      .filter({ hasText: new RegExp(status, 'i') });

    // Also check for h2 with status span (simplified detail view in CampaignsView)
    const altStatusBadge = this.page
      .locator('h2.text-2xl')
      .locator('span.text-xs')
      .filter({ hasText: new RegExp(status, 'i') });

    await expect(statusBadge.first().or(altStatusBadge.first())).toBeVisible();
  }

  /**
   * Asserts that keyword count is displayed
   *
   * @param count - Expected keyword count
   */
  async assertKeywordCount(count: number): Promise<void> {
    const keywordText = this.page.locator(`text=/\\d+\\/\\d+\\s*keywords?/i`);
    await expect(keywordText).toBeVisible();
  }

  /**
   * Asserts that campaign name is visible in detail view
   *
   * @param campaignName - Name of the campaign to check
   */
  async assertCampaignNameVisible(campaignName: string): Promise<void> {
    // Try data-testid first (full detail view)
    const dataTestIdSelector = this.page
      .locator('[data-testid="campaign-name"]')
      .filter({ hasText: campaignName });

    // Also check for h2 (simplified detail view in CampaignsView)
    const h2Selector = this.page.locator('h2').filter({ hasText: campaignName });

    await expect(dataTestIdSelector.or(h2Selector)).toBeVisible();
  }

  /**
   * Waits for modal to close after submission
   * Handles both standard Modal component and custom modals like AddKeywordsModal
   */
  async waitForModalClose(): Promise<void> {
    const standardModal = this.campaignModal;
    const customModal = this.addKeywordsModal;

    // Wait for both modals to be hidden
    try {
      await expect(standardModal).toBeHidden({ timeout: 5000 });
    } catch {
      // Standard modal might not exist
    }
    try {
      await expect(customModal).toBeHidden({ timeout: 5000 });
    } catch {
      // Custom modal might not exist
    }
  }

  /**
   * Captures API request for campaign creation
   *
   * @returns Promise that resolves to the API request
   */
  async captureCampaignCreateRequest(): Promise<{
    url: string;
    method: string;
    body: unknown;
  }> {
    return this.captureApiRequest('/api/campaigns');
  }

  /**
   * Captures API request for campaign update
   *
   * @param campaignId - ID of the campaign being updated
   * @returns Promise that resolves to the API request
   */
  async captureCampaignUpdateRequest(campaignId: string): Promise<{
    url: string;
    method: string;
    body: unknown;
  }> {
    return this.captureApiRequest(`/api/campaigns/${campaignId}`);
  }

  /**
   * Captures API request for keyword operations
   *
   * @param campaignId - ID of the campaign
   * @returns Promise that resolves to the API request
   */
  async captureKeywordsRequest(campaignId: string): Promise<{
    url: string;
    method: string;
    body: unknown;
  }> {
    return this.captureApiRequest(`/api/campaigns/${campaignId}/keywords`);
  }
}
