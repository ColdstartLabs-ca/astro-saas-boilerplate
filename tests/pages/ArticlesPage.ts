import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Articles page
 *
 * Provides methods for interacting with the articles list UI,
 * including filtering, status interactions, and detail panel actions.
 */
export class ArticlesPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Gets the articles list container
   */
  get articlesList(): Locator {
    return this.page.locator('[data-testid="articles-list"], [data-testid="article-card"]');
  }

  /**
   * Gets individual article cards
   */
  get articleCards(): Locator {
    return this.page.locator('[data-testid="article-card"]');
  }

  /**
   * Gets the empty state container
   */
  get emptyState(): Locator {
    return this.page.locator('[data-testid="articles-empty-state"]');
  }

  /**
   * Gets the detail panel (slide-over or modal)
   */
  get detailPanel(): Locator {
    return this.page.locator(
      '[data-testid="article-detail-panel"], [data-testid="article-detail-modal"]'
    );
  }

  /**
   * Gets close button on detail panel (the X button in the header)
   */
  get detailPanelCloseButton(): Locator {
    // The close button is in the modal header - it's a button containing an X icon (lucide-react)
    // The button is the only one in the header section (flex justify-between) with text-muted class
    return this.detailPanel.locator('div.flex.justify-between button.text-muted');
  }

  /**
   * Gets inline error message in detail panel (error shown after failed action)
   */
  get inlineError(): Locator {
    // The error message is in a div with red background in the content area
    return this.detailPanel.locator('.mb-4.p-3.bg-red-500\\/10').filter({
      hasText: /failed|error/i,
    });
  }

  /**
   * Gets the article title button (used for keyboard navigation)
   * Note: There are two buttons with the same aria-label - returns the title text button
   */
  get articleTitleButton(): Locator {
    // The title button has class "flex-1 min-w-0 cursor-pointer text-left"
    return this.articleCards.first().locator('button.flex-1.min-w-0[aria-label^="View article:"]');
  }

  /**
   * Gets status filter dropdown (second select in filter panel)
   */
  get statusFilterSelect(): Locator {
    // The filter panel has: Campaign (1st), Status (2nd), Date Range (3rd)
    return this.filterPanel.locator('select').nth(1);
  }

  /**
   * Gets campaign filter dropdown (first select in filter panel)
   */
  get campaignFilterSelect(): Locator {
    return this.filterPanel.locator('select').first();
  }

  /**
   * Gets search input field
   * Note: Articles page doesn't have search input currently
   */
  get searchInput(): Locator {
    return this.page.locator('input[type="search"], input[placeholder*="search"]').first();
  }

  /**
   * Gets regenerate button in detail panel
   */
  get regenerateButton(): Locator {
    // Prefer data-testid for reliable selection
    return this.detailPanel.locator('[data-testid="regenerate-button"]');
  }

  /**
   * Gets deliver button in detail panel
   */
  get deliverButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /deliver|publish/i });
  }

  /**
   * Gets approve button in detail panel
   */
  get approveButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /approve/i });
  }

  /**
   * Gets reject button in detail panel
   */
  get rejectButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /reject/i });
  }

  /**
   * Gets preview button
   */
  get previewButton(): Locator {
    return this.page.getByRole('button', { name: /preview/i });
  }

  /**
   * Gets article status badge
   */
  get statusBadge(): Locator {
    return this.page.locator('[data-testid="article-status-badge"]');
  }

  /**
   * Gets article title (from inside article card)
   */
  get articleTitle(): Locator {
    // First try data-testid, then fallback to h3 inside article card
    return this.articleCards
      .first()
      .locator('[data-testid="article-title"]')
      .or(this.articleCards.first().locator('h3'));
  }

  /**
   * Gets SEO score indicator
   */
  get seoScore(): Locator {
    return this.page.locator('[data-testid="seo-score"], [data-testid="article-seo-score"]');
  }

  /**
   * Gets word count indicator
   */
  get wordCount(): Locator {
    return this.page.locator('[data-testid="word-count"], [data-testid="article-word-count"]');
  }

  /**
   * Gets primary keyword tag (from inside article card)
   * Note: The keyword is shown in a <p> with text-muted class below the title
   */
  get primaryKeyword(): Locator {
    // The keyword paragraph is inside the title button, as a sibling to the h3 title
    return this.articleCards
      .first()
      .locator('button h3 + p.text-muted, [data-testid="article-keyword"]');
  }

  /**
   * Gets loading spinner or loading state indicators (generic spinners)
   */
  get loadingSpinner(): Locator {
    return this.page.locator('[data-loading], .animate-spin, [aria-busy="true"]');
  }

  /**
   * Gets the regenerating button (button shows "Regenerating..." text)
   * The regenerate button changes text to "Regenerating..." during the operation
   */
  get regeneratingButton(): Locator {
    return this.detailPanel.locator('[data-testid="regenerate-button"]:has-text("Regenerating")');
  }

  /**
   * Gets article content preview - the prose element in the detail panel
   */
  get contentPreview(): Locator {
    // The content is rendered in a div with class "prose prose-invert max-w-none"
    return this.detailPanel.locator('.prose.prose-invert');
  }

  /**
   * Gets meta description field
   */
  get metaDescriptionField(): Locator {
    return this.detailPanel.locator(
      'textarea[name="meta_description"], [data-testid="meta-description"]'
    );
  }

  /**
   * Gets save button
   */
  get saveButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /save|update/i });
  }

  /**
   * Gets campaign name link/badge
   */
  get campaignLink(): Locator {
    return this.page.locator('[data-testid="campaign-link"], [data-testid="article-campaign"]');
  }

  /**
   * Gets created date indicator
   */
  get createdDate(): Locator {
    return this.page.locator('[data-testid="created-date"], [data-testid="article-date"]');
  }

  /**
   * Gets back to list button
   */
  get backToListButton(): Locator {
    return this.page.getByRole('button', { name: /back|←|return/i });
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigates to articles page
   *
   * @param path - Optional path (defaults to /dashboard/articles)
   */
  async goto(path?: string): Promise<void> {
    await super.goto(path ?? '/dashboard/articles');
    await this.waitForPageLoad();
  }

  // ============================================================================
  // List Display Methods
  // ============================================================================

  /**
   * Asserts that the articles list is visible
   */
  async assertArticlesListVisible(): Promise<void> {
    await expect(this.articlesList.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts the number of article cards visible
   *
   * @param count - Expected number of article cards
   */
  async assertArticleCardsCount(count: number): Promise<void> {
    const actualCount = await this.articleCards.count();
    expect(actualCount).toBe(count);
  }

  /**
   * Asserts that empty state is visible
   */
  async assertEmptyStateVisible(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Asserts that empty state is hidden
   */
  async assertEmptyStateHidden(): Promise<void> {
    await expect(this.emptyState).not.toBeVisible();
  }

  /**
   * Gets the number of visible article cards
   *
   * @returns Number of article cards
   */
  async getArticleCardCount(): Promise<number> {
    return this.articleCards.count();
  }

  // ============================================================================
  // Filter Methods
  // ============================================================================

  /**
   * Gets the filter toggle button
   */
  get filterButton(): Locator {
    return this.page.getByRole('button', { name: /filters/i });
  }

  /**
   * Gets the filter panel (visible when expanded)
   */
  get filterPanel(): Locator {
    return this.page.locator('.grid.grid-cols-3.gap-3');
  }

  /**
   * Opens the filter panel if not already open
   */
  async openFilterPanel(): Promise<void> {
    const panel = this.filterPanel;
    if (!(await panel.isVisible().catch(() => false))) {
      await this.filterButton.click();
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Filters articles by status
   *
   * @param status - Status to filter by
   */
  async filterByStatus(status: string): Promise<void> {
    await this.openFilterPanel();
    await this.statusFilterSelect.selectOption(status);
    await this.waitForLoadingComplete();
  }

  /**
   * Filters articles by campaign
   *
   * @param campaignId - Campaign ID or name to filter by
   */
  async filterByCampaign(campaignId: string): Promise<void> {
    await this.openFilterPanel();
    await this.campaignFilterSelect.selectOption(campaignId);
    await this.waitForLoadingComplete();
  }

  /**
   * Searches articles by keyword
   *
   * @param query - Search query
   */
  async searchArticles(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.waitForTimeout(500); // Debounce delay
    await this.waitForLoadingComplete();
  }

  /**
   * Clears the search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.waitForTimeout(500); // Debounce delay
    await this.waitForLoadingComplete();
  }

  /**
   * Gets the currently selected status filter value
   *
   * @returns Selected status value
   */
  async getSelectedStatusFilter(): Promise<string> {
    await this.openFilterPanel();
    return this.statusFilterSelect.inputValue();
  }

  // ============================================================================
  // Article Detail Methods
  // ============================================================================

  /**
   * Opens an article detail by clicking on a card's title
   *
   * @param index - Index of article card to click (default: 0)
   */
  async openArticleDetail(index = 0): Promise<void> {
    const card = this.articleCards.nth(index);
    // Click on the article title button which has the onClick handler
    // The button has aria-label like "View article: 10 SEO Tips for 2024"
    const titleButton = card.locator('button[aria-label^="View article:"]');
    await titleButton.first().click();
    await this.waitForLoadingComplete();
    await this.assertDetailPanelVisible();
  }

  /**
   * Asserts that the detail panel is visible
   */
  async assertDetailPanelVisible(): Promise<void> {
    await expect(this.detailPanel).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts that the detail panel is hidden
   */
  async assertDetailPanelHidden(): Promise<void> {
    await expect(this.detailPanel).not.toBeVisible();
  }

  /**
   * Closes the detail panel
   */
  async closeDetailPanel(): Promise<void> {
    await this.detailPanelCloseButton.click();
    await this.assertDetailPanelHidden();
  }

  /**
   * Asserts that an inline error is visible in the detail panel
   */
  async assertInlineErrorVisible(): Promise<void> {
    await expect(this.inlineError).toBeVisible({ timeout: 5000 });
  }

  /**
   * Focuses the first article title button for keyboard navigation testing
   */
  async focusFirstArticleTitle(): Promise<void> {
    await this.articleTitleButton.focus();
  }

  /**
   * Presses Enter on the currently focused element to open article detail
   */
  async pressEnterToOpenDetail(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Clicks the regenerate button
   * Note: Does NOT wait for loading to complete - allows tests to check intermediate states
   */
  async clickRegenerate(): Promise<void> {
    // Set up dialog handler BEFORE clicking (confirm appears synchronously)
    this.page.once('dialog', dialog => dialog.accept());
    await this.regenerateButton.click();
  }

  /**
   * Clicks regenerate and waits for completion (modal closes on success)
   */
  async clickRegenerateAndWait(): Promise<void> {
    // Set up dialog handler BEFORE clicking
    this.page.once('dialog', dialog => dialog.accept());
    await this.regenerateButton.click();
    // Wait for modal to close on success
    await this.waitForDetailPanelToClose();
  }

  /**
   * Clicks the deliver button
   */
  async clickDeliver(): Promise<void> {
    await this.deliverButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clicks the approve button
   */
  async clickApprove(): Promise<void> {
    await this.approveButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clicks the reject button
   */
  async clickReject(): Promise<void> {
    await this.rejectButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clicks the preview button
   */
  async clickPreview(): Promise<void> {
    await this.previewButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clicks the back to list button
   */
  async clickBackToList(): Promise<void> {
    await this.backToListButton.click();
    await this.waitForLoadingComplete();
  }

  // ============================================================================
  // Article Content Methods
  // ============================================================================

  /**
   * Gets the article title text from the article card (list view)
   *
   * @returns Article title text
   */
  async getArticleTitle(): Promise<string> {
    const titleElement = this.articleTitle.first();
    await expect(titleElement).toBeVisible();
    return titleElement.textContent() ?? '';
  }

  /**
   * Gets the article title text from the detail panel
   *
   * @returns Article title text from detail panel
   */
  async getDetailPanelTitle(): Promise<string> {
    const titleElement = this.detailPanel.locator('h2').first();
    await expect(titleElement).toBeVisible();
    return titleElement.textContent() ?? '';
  }

  /**
   * Gets the article status badge text
   *
   * @returns Status text
   */
  async getArticleStatus(): Promise<string> {
    const statusBadge = this.statusBadge.first();
    if (await statusBadge.isVisible().catch(() => false)) {
      return statusBadge.textContent() ?? '';
    }
    return '';
  }

  /**
   * Gets the SEO score value from the article card (list view)
   *
   * @returns SEO score text
   */
  async getSeoScore(): Promise<string> {
    const scoreElement = this.seoScore.first();
    if (await scoreElement.isVisible().catch(() => false)) {
      return scoreElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Gets the SEO score value from the detail panel
   *
   * @returns SEO score text from detail panel
   */
  async getDetailPanelSeoScore(): Promise<string> {
    // The SEOScoreDisplay shows the overall score in a text-2xl font-bold span
    const scoreElement = this.detailPanel
      .locator('.text-2xl.font-bold')
      .filter({ hasText: /\d+/ })
      .first();
    if (await scoreElement.isVisible().catch(() => false)) {
      return scoreElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Gets the word count value from the article card (list view)
   *
   * @returns Word count text
   */
  async getWordCount(): Promise<string> {
    const countElement = this.wordCount.first();
    if (await countElement.isVisible().catch(() => false)) {
      return countElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Gets the word count value from the detail panel
   *
   * @returns Word count number (e.g., "1250") - removes any locale formatting
   */
  async getDetailPanelWordCount(): Promise<string> {
    // The word count is shown in the header as "{count} words" in a text-muted span
    // The count may be locale-formatted with commas (e.g., "1,250 words")
    const countElement = this.detailPanel
      .locator('.text-muted')
      .filter({ hasText: /words/i })
      .first();
    if (await countElement.isVisible().catch(() => false)) {
      const text = await countElement.textContent();
      // Extract the number (with optional commas) from text like "1,250 words"
      const match = text?.match(/([\d,]+)\s*words?/);
      // Remove commas and return just the number
      return match?.[1]?.replace(/,/g, '') ?? text ?? '';
    }
    return '';
  }

  /**
   * Gets the primary keyword text
   *
   * @returns Primary keyword text
   */
  async getPrimaryKeyword(): Promise<string> {
    const keywordElement = this.primaryKeyword.first();
    if (await keywordElement.isVisible().catch(() => false)) {
      return keywordElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Gets the article content preview text
   *
   * @returns Content preview text
   */
  async getContentPreview(): Promise<string> {
    const previewElement = this.contentPreview.first();
    if (await previewElement.isVisible().catch(() => false)) {
      return previewElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Asserts that article content is visible in detail panel
   */
  async assertContentVisible(): Promise<void> {
    await expect(this.contentPreview.first()).toBeVisible();
  }

  /**
   * Edits the meta description field
   *
   * @param value - New meta description value
   */
  async editMetaDescription(value: string): Promise<void> {
    await this.metaDescriptionField.fill(value);
  }

  /**
   * Clicks the save button
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
    await this.waitForLoadingComplete();
  }

  // ============================================================================
  // Action Button State Methods
  // ============================================================================

  /**
   * Asserts that regenerate button is visible
   */
  async assertRegenerateButtonVisible(): Promise<void> {
    await expect(this.regenerateButton).toBeVisible();
  }

  /**
   * Asserts that deliver button is visible
   */
  async assertDeliverButtonVisible(): Promise<void> {
    await expect(this.deliverButton).toBeVisible();
  }

  /**
   * Asserts that approve button is visible
   */
  async assertApproveButtonVisible(): Promise<void> {
    await expect(this.approveButton).toBeVisible();
  }

  /**
   * Asserts that reject button is visible
   */
  async assertRejectButtonVisible(): Promise<void> {
    await expect(this.rejectButton).toBeVisible();
  }

  /**
   * Asserts that preview button is visible
   */
  async assertPreviewButtonVisible(): Promise<void> {
    await expect(this.previewButton).toBeVisible();
  }

  /**
   * Checks if regenerate button is enabled
   *
   * @returns True if enabled
   */
  async isRegenerateButtonEnabled(): Promise<boolean> {
    return this.regenerateButton.isEnabled().catch(() => false);
  }

  /**
   * Checks if regenerate button shows loading/regenerating state
   *
   * @returns True if button text contains "Regenerating"
   */
  async isRegenerateButtonLoading(): Promise<boolean> {
    const text = await this.regenerateButton.textContent().catch(() => '');
    return text?.toLowerCase().includes('regenerating') ?? false;
  }

  /**
   * Waits for the detail panel to close (e.g., after regenerate completes)
   */
  async waitForDetailPanelToClose(): Promise<void> {
    await expect(this.detailPanel).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Checks if deliver button is enabled
   *
   * @returns True if enabled
   */
  async isDeliverButtonEnabled(): Promise<boolean> {
    return this.deliverButton.isEnabled().catch(() => false);
  }

  // ============================================================================
  // Campaign Link Methods
  // ============================================================================

  /**
   * Gets the campaign name from the article card
   *
   * @param index - Article card index (default: 0)
   * @returns Campaign name text
   */
  async getCampaignName(index = 0): Promise<string> {
    const card = this.articleCards.nth(index);
    const campaignElement = card.locator(
      '[data-testid="campaign-link"], [data-testid="article-campaign"]'
    );
    if (await campaignElement.isVisible().catch(() => false)) {
      return campaignElement.textContent() ?? '';
    }
    return '';
  }

  /**
   * Clicks the campaign link
   *
   * @param index - Article card index (default: 0)
   */
  async clickCampaignLink(index = 0): Promise<void> {
    const card = this.articleCards.nth(index);
    const campaignElement = card.locator(
      '[data-testid="campaign-link"], [data-testid="article-campaign"]'
    );
    await campaignElement.click();
    await this.waitForLoadingComplete();
  }

  // ============================================================================
  // Status-Specific Assertions
  // ============================================================================

  /**
   * Asserts that an article with specific status is visible
   *
   * @param status - Expected status
   */
  async assertArticleWithStatusVisible(status: string): Promise<void> {
    const statusCard = this.articleCards.filter({ hasText: new RegExp(status, 'i') });
    await expect(statusCard.first()).toBeVisible();
  }

  /**
   * Asserts the current URL contains the articles path
   */
  async assertOnArticlesPage(): Promise<void> {
    await this.waitForURL(/\/dashboard\/articles/);
  }

  /**
   * Asserts the current URL contains an article detail path
   */
  async assertOnArticleDetail(): Promise<void> {
    await this.waitForURL(/\/dashboard\/articles\/[a-f0-9-]+/);
  }
}
