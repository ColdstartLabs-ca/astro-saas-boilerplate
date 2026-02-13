import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Opportunities page
 *
 * Provides methods for interacting with the opportunities list UI,
 * including filtering, searching, and detail panel interactions.
 */
export class OpportunitiesPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Gets the GSC connection card (shown when no GSC connection)
   */
  get gscConnectionCard(): Locator {
    return this.page.locator('[data-testid="gsc-connection-card"]');
  }

  /**
   * Gets the connect GSC button
   */
  get connectGscButton(): Locator {
    return this.gscConnectionCard.getByRole('button', { name: /connect|link gsc/i });
  }

  /**
   * Gets the opportunities list container
   */
  get opportunitiesList(): Locator {
    return this.page.locator('[data-testid="opportunities-list"], [data-testid="opportunity-card"]');
  }

  /**
   * Gets individual opportunity cards
   */
  get opportunityCards(): Locator {
    return this.page.locator('[data-testid="opportunity-card"]');
  }

  /**
   * Gets the empty state container
   */
  get emptyState(): Locator {
    return this.page.locator('[data-testid="opportunities-empty-state"]');
  }

  /**
   * Gets the detail panel (slide-over)
   */
  get detailPanel(): Locator {
    return this.page.locator('[data-testid="opportunity-detail-panel"]');
  }

  /**
   * Gets close button on detail panel
   */
  get detailPanelCloseButton(): Locator {
    return this.detailPanel.getByRole('button', { name: 'Close' });
  }

  /**
   * Gets category filter dropdown/buttons
   */
  get categoryFilterSelect(): Locator {
    return this.page.locator('select').first();
  }

  /**
   * Gets search input field
   */
  get searchInput(): Locator {
    return this.page.getByPlaceholder(/search opportunities/i);
  }

  /**
   * Gets create article button (for content opportunities)
   */
  get createArticleButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /create article/i });
  }

  /**
   * Gets mark complete button
   */
  get markCompleteButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /mark complete/i });
  }

  /**
   * Gets dismiss button
   */
  get dismissButton(): Locator {
    return this.detailPanel.getByRole('button', { name: /dismiss/i });
  }

  /**
   * Gets opportunity type icon/badge
   */
  get opportunityTypeBadge(): Locator {
    return this.page.locator('[data-testid="opportunity-type-badge"]');
  }

  /**
   * Gets opportunity category badge
   */
  get categoryBadge(): Locator {
    return this.page.locator('[data-testid="opportunity-category-badge"]');
  }

  /**
   * Gets priority score indicator
   */
  get priorityScore(): Locator {
    return this.page.locator('[data-testid="priority-score"]');
  }

  /**
   * Gets opportunity title
   */
  get opportunityTitle(): Locator {
    return this.page.locator('[data-testid="opportunity-title"]');
  }

  /**
   * Gets metrics section
   */
  get metricsSection(): Locator {
    return this.page.locator('[data-testid="opportunity-metrics"]');
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigates to opportunities page
   *
   * @param waitForLoad - Whether to wait for page load (default: true)
   */
  async goto(path?: string): Promise<void> {
    await super.goto(path ?? '/dashboard/opportunities');
    await this.waitForPageLoad();
  }

  // ============================================================================
  // GSC Connection Methods
  // ============================================================================

  /**
   * Clicks the connect GSC button
   */
  async clickConnectGsc(): Promise<void> {
    await this.connectGscButton.click();
  }

  /**
   * Asserts GSC connection card is visible
   */
  async assertGscConnectionCardVisible(): Promise<void> {
    await expect(this.gscConnectionCard).toBeVisible();
  }

  // ============================================================================
  // Filtering and Search Methods
  // ============================================================================

  /**
   * Filters opportunities by category
   *
   * @param category - Category to filter by (e.g., 'Content', 'Technical')
   */
  async filterByCategory(category: string): Promise<void> {
    const valueMap: Record<string, string> = { All: 'all', Content: 'content', Technical: 'technical' };
    const value = valueMap[category] ?? category.toLowerCase();
    await this.categoryFilterSelect.selectOption(value);
  }

  /**
   * Searches opportunities by text
   *
   * @param searchText - Text to search for
   */
  async search(searchText: string): Promise<void> {
    await this.searchInput.fill(searchText);
  }

  /**
   * Clears search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  // ============================================================================
  // Opportunity Interaction Methods
  // ============================================================================

  /**
   * Clicks an opportunity card to open detail panel
   *
   * @param opportunityTitle - Title or identifier of the opportunity
   */
  async openOpportunity(opportunityTitle: string): Promise<void> {
    const card = this.opportunityCards.filter({ hasText: opportunityTitle }).first();
    await card.click();
  }

  /**
   * Clicks first opportunity card
   */
  async openFirstOpportunity(): Promise<void> {
    await this.opportunityCards.first().click();
  }

  /**
   * Closes the detail panel
   */
  async closeDetailPanel(): Promise<void> {
    if (await this.detailPanel.isVisible()) {
      await this.detailPanelCloseButton.click();
      await expect(this.detailPanel).toBeHidden({ timeout: 3000 });
    }
  }

  /**
   * Closes the detail panel using Escape key
   */
  async closeDetailPanelWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.detailPanel).toBeHidden({ timeout: 3000 });
  }

  /**
   * Clicks create article button for content opportunity
   */
  async clickCreateArticle(): Promise<void> {
    await this.createArticleButton.click();
  }

  /**
   * Clicks mark complete button
   */
  async clickMarkComplete(): Promise<void> {
    await this.markCompleteButton.click();
  }

  /**
   * Clicks dismiss button
   */
  async clickDismiss(): Promise<void> {
    await this.dismissButton.click();
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
   * Asserts at least one opportunity card is visible
   *
   * @param count - Minimum expected count (default: 1)
   */
  async assertOpportunityCardsVisible(count = 1): Promise<void> {
    const cards = this.opportunityCards;
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
   * Asserts detail panel is visible
   */
  async assertDetailPanelVisible(): Promise<void> {
    await expect(this.detailPanel).toBeVisible({ timeout: 5000 });
  }

  /**
   * Asserts detail panel is hidden
   */
  async assertDetailPanelHidden(): Promise<void> {
    await expect(this.detailPanel).toBeHidden();
  }

  /**
   * Asserts opportunity has specific category
   *
   * @param opportunityTitle - Title of the opportunity
   * @param category - Expected category
   */
  async assertOpportunityCategory(opportunityTitle: string, category: string): Promise<void> {
    const card = this.opportunityCards.filter({ hasText: opportunityTitle }).first();
    const badge = card.locator('[data-testid="opportunity-category-badge"]');
    await expect(badge).toContainText(category);
  }

  /**
   * Asserts opportunity has specific priority score
   *
   * @param opportunityTitle - Title of the opportunity
   * @param minScore - Minimum expected score
   * @param maxScore - Maximum expected score
   */
  async assertPriorityScoreInRange(
    opportunityTitle: string,
    minScore: number,
    maxScore: number
  ): Promise<void> {
    const card = this.opportunityCards.filter({ hasText: opportunityTitle }).first();
    const scoreElement = this.priorityScore;
    await expect(scoreElement).toBeVisible();

    const scoreText = await scoreElement.textContent();
    const score = parseInt(scoreText?.replace('/100', '').trim() || '0', 10);
    expect(score).toBeGreaterThanOrEqual(minScore);
    expect(score).toBeLessThanOrEqual(maxScore);
  }

  /**
   * Asserts metrics section contains expected data
   *
   * @param metrics - Object with expected metric keys and values
   */
  async assertMetrics(metrics: Partial<Record<string, number | string>>): Promise<void> {
    await expect(this.metricsSection).toBeVisible();

    for (const [key, value] of Object.entries(metrics)) {
      const metricLocator = this.metricsSection.filter({
        hasText: new RegExp(key, 'i')
      }).first();
      await expect(metricLocator).toBeVisible();
      await expect(metricLocator).toContainText(String(value));
    }
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
   * Gets opportunity cards data
   *
   * @returns Array of opportunity titles
   */
  async getOpportunityTitles(): Promise<string[]> {
    const cards = this.opportunityCards;
    const count = await cards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = await card.locator('[data-testid="opportunity-title"]').textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Counts visible opportunity cards
   */
  async getOpportunityCount(): Promise<number> {
    return await this.opportunityCards.count();
  }

  /**
   * Checks if opportunity with given title exists
   *
   * @param title - Opportunity title to check
   */
  async hasOpportunityTitled(title: string): Promise<boolean> {
    const titles = await this.getOpportunityTitles();
    return titles.some(t => t.includes(title));
  }

  /**
   * Gets current search input value
   */
  async getSearchValue(): Promise<string> {
    const input = this.searchInput;
    return await input.inputValue();
  }

  /**
   * Waits for detail panel to open
   */
  async waitForDetailPanel(): Promise<void> {
    await expect(this.detailPanel).toBeVisible({ timeout: 5000 });
  }

  /**
   * Waits for opportunities to load
   */
  async waitForOpportunitiesLoad(): Promise<void> {
    await this.waitForLoadingComplete();
    await expect(this.opportunityCards.first()).toBeVisible({ timeout: 10000 });
  }
}
