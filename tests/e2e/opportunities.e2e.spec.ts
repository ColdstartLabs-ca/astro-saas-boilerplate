import { test, expect } from '../test-fixtures';
import { OpportunitiesPage } from '../pages/OpportunitiesPage';

/**
 * Opportunities Page E2E Tests
 *
 * Tests the opportunities list view, filtering, searching,
 * detail panel interactions, and actions.
 *
 * Default test fixtures provide:
 * - A mock project (mock-project-1)
 * - No GSC connection (empty connections)
 * - No opportunities (empty list)
 *
 * Tests that need GSC connection or opportunity data override
 * these defaults via route mocks registered in beforeEach.
 */

// =============================================================================
// Mock Data
// =============================================================================

const mockGscConnection = {
  id: 'mock-gsc-1',
  project_id: 'mock-project-1',
  google_email: 'test@gmail.com',
  site_url: 'https://test.com',
  status: 'active',
  last_synced_at: '2024-06-01T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockContentOpportunity1 = {
  id: 'mock-opp-1',
  project_id: 'mock-project-1',
  type: 'content_gap',
  category: 'content',
  title: 'Best running shoes for beginners',
  description: 'Content gap detected for "best running shoes for beginners".',
  query: 'best running shoes for beginners',
  page_url: null,
  status: 'open',
  priority_score: 85,
  estimated_impact: 'high',
  metrics: {
    impressions: 1500,
    clicks: 0,
  },
  action_type: null,
  action_ref_id: null,
  created_at: '2024-06-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

const mockContentOpportunity2 = {
  id: 'mock-opp-3',
  project_id: 'mock-project-1',
  type: 'low_hanging_fruit',
  category: 'content',
  title: 'Improve running gear guide',
  description: 'Low-hanging fruit opportunity for "running gear guide".',
  query: 'running gear guide',
  page_url: 'https://test.com/gear-guide',
  status: 'open',
  priority_score: 72,
  estimated_impact: 'medium',
  metrics: {
    position: 12.5,
    ctr: 0.02,
    impressions: 800,
    clicks: 16,
  },
  action_type: null,
  action_ref_id: null,
  created_at: '2024-06-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

const mockTechnicalOpportunity = {
  id: 'mock-opp-2',
  project_id: 'mock-project-1',
  type: 'low_ctr',
  category: 'technical',
  title: 'Low CTR on homepage',
  description: 'Homepage has below-average CTR for its position.',
  query: 'home page optimization',
  page_url: 'https://test.com',
  status: 'open',
  priority_score: 65,
  estimated_impact: 'medium',
  metrics: {
    position: 5.2,
    ctr: 0.015,
    impressions: 3000,
    clicks: 45,
  },
  action_type: null,
  action_ref_id: null,
  created_at: '2024-06-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

const allOpportunities = [
  mockContentOpportunity1,
  mockTechnicalOpportunity,
  mockContentOpportunity2,
];

// =============================================================================
// Helpers: Mock API overrides
// =============================================================================

/**
 * Override GSC connections mock to return an active connection.
 * Must be called BEFORE goto() so the route is registered before the page loads.
 */
async function mockGscConnected(page: import('@playwright/test').Page) {
  await page.route('**/api/gsc/connections**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { connections: [mockGscConnection] },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Override opportunities mock to return provided data.
 * Must be called BEFORE goto() so the route is registered before the page loads.
 */
async function mockOpportunitiesWithData(
  page: import('@playwright/test').Page,
  opportunities: Record<string, unknown>[]
) {
  await page.route('**/api/opportunities**', async route => {
    const url = route.request().url();

    // Handle PATCH for status updates (both /api/opportunities?opportunityId=xxx and /api/opportunities/xxx)
    if (route.request().method() === 'PATCH') {
      const firstOpp = opportunities[0] ?? {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { opportunity: { ...firstOpp, status: 'completed' } },
        }),
      });
      return;
    }

    // Handle POST for create-article
    if (route.request().method() === 'POST' && url.includes('create-article')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { campaignId: 'mock-campaign-1', opportunityId: opportunities[0]?.id },
        }),
      });
      return;
    }

    // Handle GET list
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { opportunities, total: opportunities.length },
        }),
      });
      return;
    }

    await route.fallback();
  });
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Opportunities Page E2E Tests', () => {
  let opportunitiesPage: OpportunitiesPage;

  test.beforeEach(async ({ page }) => {
    opportunitiesPage = new OpportunitiesPage(page);
  });

  test.describe('Empty State', () => {
    test('should display GSC connection card when not connected', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.assertGscConnectionCardVisible();
      await opportunitiesPage.assertOpportunityCardsVisible(0);
    });

    test('should show connect GSC button', async () => {
      await opportunitiesPage.goto();

      await expect(opportunitiesPage.connectGscButton).toBeVisible();
    });
  });

  test.describe('Opportunities List', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should display opportunity cards', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();
      await expect(opportunitiesPage.opportunityCards).toHaveCount(3);
    });

    test('should display type badges', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      const typeBadges = opportunitiesPage.opportunityTypeBadge;
      await expect(typeBadges.first()).toBeVisible();
    });

    test('should show priority scores', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      const priorityScores = opportunitiesPage.priorityScore;
      await expect(priorityScores.first()).toBeVisible();
    });
  });

  test.describe('Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should filter by Content category', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.filterByCategory('Content');

      // 2 content opportunities should remain
      await expect(opportunitiesPage.opportunityCards).toHaveCount(2);
    });

    test('should filter by Technical category', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.filterByCategory('Technical');

      // 1 technical opportunity should remain
      await expect(opportunitiesPage.opportunityCards).toHaveCount(1);
    });

    test('should reset filter with All', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      // Filter to content
      await opportunitiesPage.filterByCategory('Content');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(2);

      // Reset to all
      await opportunitiesPage.filterByCategory('All');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(3);
    });
  });

  test.describe('Search', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should search opportunities by title', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.search('running shoes');

      // Only the "Best running shoes for beginners" opportunity matches
      await expect(opportunitiesPage.opportunityCards).toHaveCount(1);
    });

    test('should clear search and show all results', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      // Search to filter
      await opportunitiesPage.search('running shoes');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(1);

      // Clear search
      await opportunitiesPage.clearSearch();

      // All opportunities should return
      await expect(opportunitiesPage.opportunityCards).toHaveCount(3);
    });

    test('should show no results for non-matching query', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.search('non-existent query xyz123');

      // No cards should match
      await expect(opportunitiesPage.opportunityCards).toHaveCount(0);

      // Search input should still be functional
      await expect(opportunitiesPage.searchInput).toBeVisible();
    });
  });

  test.describe('Detail Panel', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should open detail panel on opportunity click', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();

      await opportunitiesPage.assertDetailPanelVisible();

      // Verify metrics section is visible
      await expect(opportunitiesPage.metricsSection).toBeVisible();
    });

    test('should close detail panel with close button', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      await opportunitiesPage.closeDetailPanel();

      await opportunitiesPage.assertDetailPanelHidden();
    });

    test('should close detail panel with Escape key', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      await opportunitiesPage.closeDetailPanelWithEscape();

      await opportunitiesPage.assertDetailPanelHidden();
    });

    test('should display opportunity metrics in detail panel', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      const metricsSection = opportunitiesPage.metricsSection;
      await expect(metricsSection).toBeVisible();

      // Detail panel shows Position, CTR, Impressions, Clicks labels
      await expect(metricsSection).toContainText(/position/i);
      await expect(metricsSection).toContainText(/ctr/i);
      await expect(metricsSection).toContainText(/impressions/i);
      await expect(metricsSection).toContainText(/clicks/i);
    });
  });

  test.describe('Actions', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should show create article button for content opportunities', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      // The inline "Create Article" button appears on content opportunity rows
      const createButtons = opportunitiesPage.page.getByRole('button', { name: /create article/i });
      await expect(createButtons.first()).toBeVisible();
    });

    test('should show mark complete button in detail panel', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      await expect(opportunitiesPage.markCompleteButton).toBeVisible();
    });

    test('should show dismiss button in detail panel', async () => {
      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      await expect(opportunitiesPage.dismissButton).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty list gracefully when no GSC connection', async () => {
      await opportunitiesPage.goto();

      // Default mock: no GSC → shows connection card
      await opportunitiesPage.assertGscConnectionCardVisible();
    });

    test('should handle empty opportunities with GSC connected', async ({ page }) => {
      await mockGscConnected(page);
      // Default opportunities mock returns empty array

      await opportunitiesPage.goto();

      // Should show empty state message
      await opportunitiesPage.assertEmptyStateVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);

      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      // Check for "SEO Opportunities" heading
      const heading = opportunitiesPage.page.getByRole('heading', { name: /opportunities/i });
      await expect(heading.first()).toBeVisible();
    });

    test('should support keyboard navigation on opportunity rows', async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);

      await opportunitiesPage.goto();

      await opportunitiesPage.waitForOpportunitiesLoad();

      // Opportunity rows have role="button" and tabIndex=0
      const firstCard = opportunitiesPage.opportunityCards.first();
      await expect(firstCard).toHaveAttribute('role', 'button');
      await expect(firstCard).toHaveAttribute('tabindex', '0');
    });
  });
});
