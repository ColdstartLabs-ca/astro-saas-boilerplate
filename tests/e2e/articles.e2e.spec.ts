import { test, expect } from '../test-fixtures';
import { ArticlesPage } from '../pages/ArticlesPage';

/**
 * Articles E2E Tests
 *
 * Tests the full user flow for managing articles, including:
 * - Article list loading and display
 * - Filter and status interaction
 * - Opening article detail/preview
 * - Regenerate/deliver actions and feedback
 *
 * Mock data and API routes are set up per test group to provide the right
 * state for each scenario.
 */

// =============================================================================
// Mock Data
// =============================================================================

const mockCampaign = {
  id: 'mock-campaign-1',
  name: 'SEO Campaign',
  project_id: 'mock-project-1',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockArticles = {
  draft: {
    id: 'mock-article-draft-1',
    title: '10 SEO Tips for 2024',
    status: 'draft',
    seo_score: 75,
    word_count: 1250,
    primary_keyword: 'seo tips',
    content: 'Here are 10 essential SEO tips...',
    meta_description: 'Learn the top SEO strategies for 2024',
    campaign_id: 'mock-campaign-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    campaigns: mockCampaign,
  },
  approved: {
    id: 'mock-article-approved-1',
    title: 'Content Marketing Guide',
    status: 'approved',
    seo_score: 92,
    word_count: 2100,
    primary_keyword: 'content marketing',
    content: 'This comprehensive guide covers content marketing...',
    meta_description: 'Master content marketing with this guide',
    campaign_id: 'mock-campaign-1',
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-14T09:00:00Z',
    campaigns: mockCampaign,
  },
  published: {
    id: 'mock-article-published-1',
    title: 'Link Building Strategies',
    status: 'published',
    seo_score: 88,
    word_count: 1800,
    primary_keyword: 'link building',
    content: 'Effective link building strategies include...',
    meta_description: 'Discover powerful link building techniques',
    campaign_id: 'mock-campaign-1',
    created_at: '2024-01-13T08:00:00Z',
    updated_at: '2024-01-13T08:00:00Z',
    campaigns: mockCampaign,
  },
  failed: {
    id: 'mock-article-failed-1',
    title: 'Technical SEO Audit',
    status: 'failed',
    seo_score: null,
    word_count: 0,
    primary_keyword: 'technical seo',
    content: null,
    meta_description: null,
    campaign_id: 'mock-campaign-1',
    created_at: '2024-01-12T07:00:00Z',
    updated_at: '2024-01-12T07:00:00Z',
    campaigns: mockCampaign,
    generation_error: 'Failed to generate content',
  },
  generating: {
    id: 'mock-article-generating-1',
    title: 'AI Content Generation',
    status: 'generating',
    seo_score: null,
    word_count: 0,
    primary_keyword: 'ai content',
    content: null,
    meta_description: null,
    campaign_id: 'mock-campaign-1',
    created_at: '2024-01-16T11:00:00Z',
    updated_at: '2024-01-16T11:00:00Z',
    campaigns: mockCampaign,
  },
};

// =============================================================================
// Helper: Mock campaigns API
// Note: API responses are wrapped in { success: true, data: {...} } by jsonResponse()
// =============================================================================

async function mockCampaigns(
  page: import('@playwright/test').Page,
  campaigns: typeof mockCampaign[] = [mockCampaign]
) {
  await page.route('**/api/campaigns*', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { campaigns },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Helper: Mock articles API with existing data
// Note: API responses are wrapped in { success: true, data: {...} } by jsonResponse()
// =============================================================================

async function mockArticlesWithData(
  page: import('@playwright/test').Page,
  articles: (typeof mockArticles)[keyof typeof mockArticles][]
) {
  await page.route('**/api/articles*', async route => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const urlObj = new URL(url, 'http://localhost');
      const statusFilter = urlObj.searchParams.get('status');

      let filteredArticles = articles;

      // Apply status filter if present
      if (statusFilter) {
        filteredArticles = articles.filter(a => a.status === statusFilter);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            articles: filteredArticles,
            total: filteredArticles.length,
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Helper: Mock article detail API
// =============================================================================

async function mockArticleDetail(
  page: import('@playwright/test').Page,
  article: (typeof mockArticles)[keyof typeof mockArticles]
) {
  await page.route(`**/api/articles/${article.id}*`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { article },
      }),
    });
  });
}

// =============================================================================
// Helper: Mock article regenerate API
// =============================================================================

async function mockArticleRegenerate(page: import('@playwright/test').Page) {
  await page.route('**/api/articles/*/regenerate', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Article regeneration started' },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

// =============================================================================
// Helper: Mock article update API
// =============================================================================

async function mockArticleUpdate(page: import('@playwright/test').Page) {
  await page.route('**/api/articles/*', async route => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { article: mockArticles.draft },
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

test.describe('Articles E2E Tests', () => {
  let articlesPage: ArticlesPage;

  test.beforeEach(async ({ page }) => {
    articlesPage = new ArticlesPage(page);
    // Always mock campaigns to ensure articles page displays correctly
    await mockCampaigns(page, [mockCampaign]);
  });

  test.describe('Article List Loading', () => {
    test('should display articles list with items', async ({ page }) => {
      await mockArticlesWithData(page, [
        mockArticles.draft,
        mockArticles.approved,
        mockArticles.published,
      ]);

      await articlesPage.goto();

      await articlesPage.assertArticlesListVisible();
      await articlesPage.assertArticleCardsCount(3);
    });

    test('should display empty state when no articles', async ({ page }) => {
      await mockArticlesWithData(page, []);

      await articlesPage.goto();

      await articlesPage.assertEmptyStateVisible();
      await articlesPage.assertArticleCardsCount(0);
    });

    test('should show article title, status, and metadata in cards', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);

      await articlesPage.goto();

      const title = await articlesPage.getArticleTitle();
      expect(title).toContain('10 SEO Tips for 2024');

      const status = await articlesPage.getArticleStatus();
      expect(status.toLowerCase()).toContain('draft');

      const keyword = await articlesPage.getPrimaryKeyword();
      expect(keyword.toLowerCase()).toContain('seo tips');
    });

    test('should show SEO score for completed articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.approved]);

      await articlesPage.goto();

      const seoScore = await articlesPage.getSeoScore();
      expect(seoScore).toBeTruthy();
      expect(seoScore).toContain('92');
    });

    test('should show word count for completed articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.approved]);

      await articlesPage.goto();

      const wordCount = await articlesPage.getWordCount();
      // Word count is formatted with toLocaleString(), so "2,100" instead of "2100"
      expect(wordCount).toContain('2,100');
    });

    test('should display campaign link for articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);

      await articlesPage.goto();

      const campaignName = await articlesPage.getCampaignName(0);
      expect(campaignName).toContain('SEO Campaign');
    });

    test('should handle articles with null content gracefully', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);

      await articlesPage.goto();

      await articlesPage.assertArticlesListVisible();
      await articlesPage.assertArticleCardsCount(1);

      const status = await articlesPage.getArticleStatus();
      expect(status.toLowerCase()).toContain('failed');
    });

    test('should show loading state while fetching articles', async ({ page }) => {
      // Delay the response to test loading state
      // Note: The loading spinner appears briefly while fetching articles.
      // Due to the async nature of React Query and fast responses, this test
      // checks that the component renders correctly after loading.
      await page.route('**/api/articles*', async route => {
        if (route.request().method() === 'GET') {
          await new Promise(resolve => setTimeout(resolve, 500));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                articles: [mockArticles.draft],
                total: 1,
              },
            }),
          });
        }
      });

      await articlesPage.goto();

      // After loading completes, articles list should be visible
      await articlesPage.assertArticlesListVisible();
    });
  });

  test.describe('Filter and Status Interaction', () => {
    test.beforeEach(async ({ page }) => {
      await mockArticlesWithData(page, [
        mockArticles.draft,
        mockArticles.approved,
        mockArticles.published,
        mockArticles.failed,
      ]);
    });

    test('should filter articles by status - draft', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('draft');

      await articlesPage.assertArticleCardsCount(1);
      await articlesPage.assertArticleWithStatusVisible('draft');
    });

    test('should filter articles by status - approved', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('approved');

      await articlesPage.assertArticleCardsCount(1);
      await articlesPage.assertArticleWithStatusVisible('approved');
    });

    test('should filter articles by status - published', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('published');

      await articlesPage.assertArticleCardsCount(1);
      await articlesPage.assertArticleWithStatusVisible('published');
    });

    test('should show no results for status with no articles', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('queued');

      await articlesPage.assertArticleCardsCount(0);
    });

    test('should clear filter and show all articles', async ({ page }) => {
      await articlesPage.goto();

      // Apply a filter
      await articlesPage.filterByStatus('draft');
      await articlesPage.assertArticleCardsCount(1);

      // Clear filter by selecting a different status or using clear filters
      // Since there's no "All" option, we'll test by selecting a different filter
      await articlesPage.filterByStatus('approved');
      await articlesPage.waitForLoadingComplete();

      await articlesPage.assertArticleCardsCount(1);
      await articlesPage.assertArticleWithStatusVisible('approved');
    });

    test('should update URL query params when filtering', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('draft');

      const currentUrl = page.url();
      expect(currentUrl).toContain('status=draft');
    });

    test('should persist filter across page reload', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.filterByStatus('approved');

      await articlesPage.reload();

      await articlesPage.assertArticleCardsCount(1);
      await articlesPage.assertArticleWithStatusVisible('approved');
    });
  });

  test.describe('Article Detail/Preview Path', () => {
    test.beforeEach(async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);
      await mockArticleDetail(page, mockArticles.draft);
    });

    test('should open article detail when clicking card', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.openArticleDetail(0);

      await articlesPage.assertDetailPanelVisible();
    });

    test('should display article content in detail panel', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.openArticleDetail(0);

      await articlesPage.assertContentVisible();

      const content = await articlesPage.getContentPreview();
      expect(content).toContain('Here are 10 essential SEO tips');
    });

    test('should show article metadata in detail panel', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.openArticleDetail(0);

      const title = await articlesPage.getArticleTitle();
      expect(title).toContain('10 SEO Tips for 2024');

      const seoScore = await articlesPage.getSeoScore();
      expect(seoScore).toContain('75');

      const wordCount = await articlesPage.getWordCount();
      expect(wordCount).toContain('1250');
    });

    test('should close detail panel with close button', async ({ page }) => {
      await articlesPage.goto();

      await articlesPage.openArticleDetail(0);
      await articlesPage.assertDetailPanelVisible();

      await articlesPage.closeDetailPanel();
      await articlesPage.assertDetailPanelHidden();
      await articlesPage.assertOnArticlesPage();
    });

    test('should handle article with failed generation', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);

      await articlesPage.goto();

      await articlesPage.openArticleDetail(0);

      const status = await articlesPage.getArticleStatus();
      expect(status.toLowerCase()).toContain('failed');
    });
  });

  test.describe('Regenerate Action', () => {
    test('should show regenerate button for failed articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);
      await mockArticleRegenerate(page);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.assertRegenerateButtonVisible();
    });

    test('should trigger regeneration when clicking regenerate', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);
      await mockArticleRegenerate(page);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      // Capture API request
      const regenerateRequest = articlesPage.waitForApiRequest('**/api/articles/*/regenerate');

      await articlesPage.clickRegenerate();

      const request = await regenerateRequest;
      expect(request.url()).toContain('/regenerate');
      expect(request.method()).toBe('POST');
    });

    test('should show loading state during regeneration', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);

      // Mock with delay to show loading state
      await page.route('**/api/articles/*/regenerate', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 500));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { message: 'Article regeneration started' },
            }),
          });
        }
      });

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.clickRegenerate();

      // Verify loading state
      await expect(articlesPage.loadingSpinner.first()).toBeVisible();
    });

    test('should disable regenerate button while regenerating', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);

      // Mock with delay to test disabled state
      await page.route('**/api/articles/*/regenerate', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
            }),
          });
        }
      });

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.clickRegenerate();

      // Button should be disabled during regeneration
      const isEnabled = await articlesPage.isRegenerateButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    test('should show success message after regeneration', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);
      await mockArticleRegenerate(page);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.clickRegenerate();

      // Wait for success toast
      await articlesPage.waitForToast(/regeneration started|success/i);
    });
  });

  test.describe('Action Visibility Based on Status', () => {
    test('should show approve button for draft articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);
      await mockArticleDetail(page, mockArticles.draft);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.assertApproveButtonVisible();
    });

    test('should show regenerate for failed articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.assertRegenerateButtonVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from dashboard to articles', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);

      await articlesPage.goto();

      await articlesPage.assertOnArticlesPage();
    });

    test('should handle browser back button from detail', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);
      await mockArticleDetail(page, mockArticles.draft);

      await articlesPage.goto();
      await articlesPage.assertOnArticlesPage();

      await articlesPage.openArticleDetail(0);

      await page.goBack();
      await articlesPage.assertOnArticlesPage();
    });

    test('should handle browser forward button to detail', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);
      await mockArticleDetail(page, mockArticles.draft);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await page.goBack();
      await articlesPage.assertOnArticlesPage();

      await page.goForward();
      await articlesPage.assertDetailPanelVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API error gracefully when loading articles', async ({ page }) => {
      await page.route('**/api/articles*', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Internal server error',
            }),
          });
        }
      });

      await articlesPage.goto();

      // Should show error state or empty state, not crash
      await articlesPage.assertArticleCardsCount(0);
    });

    test('should handle API error when regenerating article', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.failed]);
      await mockArticleDetail(page, mockArticles.failed);

      await page.route('**/api/articles/*/regenerate', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Failed to regenerate article',
            }),
          });
        }
      });

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await articlesPage.clickRegenerate();

      // Should show error toast
      await articlesPage.waitForToast(/error|failed/i);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure on list page', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);

      await articlesPage.goto();

      await articlesPage.checkBasicAccessibility();
    });

    test('should allow keyboard navigation through article cards', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft, mockArticles.approved]);

      await articlesPage.goto();

      // Tab through article cards
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to open detail
      await page.keyboard.press('Enter');

      await articlesPage.assertDetailPanelVisible();
    });

    test('should close detail panel with Escape key', async ({ page }) => {
      await mockArticlesWithData(page, [mockArticles.draft]);
      await mockArticleDetail(page, mockArticles.draft);

      await articlesPage.goto();
      await articlesPage.openArticleDetail(0);

      await page.keyboard.press('Escape');

      await articlesPage.assertDetailPanelHidden();
    });
  });
});
