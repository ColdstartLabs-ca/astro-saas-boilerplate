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
   * Gets close button on detail panel
   */
  get detailPanelCloseButton(): Locator {
    return this.detailPanel
      .getByRole('button', { name: /close|cancel/i })
      .or(this.detailPanel.locator('button').filter({ hasText: /^(✕|×|Close)$/ }));
  }

  /**
   * Gets status filter dropdown
   */
  get statusFilterSelect(): Locator {
    return this.page.locator('[data-testid="status-filter"], select').first();
  }

  /**
   * Gets campaign filter dropdown (if available)
   */
  get campaignFilterSelect(): Locator {
    return this.page.locator('[data-testid="campaign-filter"], select').nth(1);
  }

  /**
   * Gets search input field
   */
  get searchInput(): Locator {
    return this.page
      .getByPlaceholder(/search articles/i)
      .or(this.page.locator('input[type="search"], input[placeholder*="search"]'));
  }

  /**
   * Gets regenerate button in detail panel
   */
  get regenerateButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /regenerate/i });
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
   * Gets article title
   */
  get articleTitle(): Locator {
    return this.page.locator('[data-testid="article-title"], h2, h3').first();
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
   * Gets primary keyword tag
   */
  get primaryKeyword(): Locator {
    return this.page.locator('[data-testid="primary-keyword"], [data-testid="article-keyword"]');
  }

  /**
   * Gets loading spinner
   */
  get loadingSpinner(): Locator {
    return this.page.locator('[data-loading], .animate-spin, [aria-busy="true"]');
  }

  /**
   * Gets article content preview
   */
  get contentPreview(): Locator {
    return this.page.locator(
      '[data-testid="article-content-preview"], .article-content, [data-testid="article-body"]'
    );
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
   * Filters articles by status
   *
   * @param status - Status to filter by
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilterSelect.selectOption(status);
    await this.waitForLoadingComplete();
  }

  /**
   * Filters articles by campaign
   *
   * @param campaignId - Campaign ID or name to filter by
   */
  async filterByCampaign(campaignId: string): Promise<void> {
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
    return this.statusFilterSelect.inputValue();
  }

  // ============================================================================
  // Article Detail Methods
  // ============================================================================

  /**
   * Opens an article detail by clicking on a card
   *
   * @param index - Index of article card to click (default: 0)
   */
  async openArticleDetail(index = 0): Promise<void> {
    const card = this.articleCards.nth(index);
    await card.click();
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
   * Clicks the regenerate button
   */
  async clickRegenerate(): Promise<void> {
    await this.regenerateButton.click();
    await this.waitForLoadingComplete();
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
   * Gets the article title text
   *
   * @returns Article title text
   */
  async getArticleTitle(): Promise<string> {
    const titleElement = this.articleTitle.first();
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
   * Gets the SEO score value
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
   * Gets the word count value
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
