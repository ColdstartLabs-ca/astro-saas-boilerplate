import { test, expect } from '../test-fixtures';
import { OpportunitiesPage } from '../pages/OpportunitiesPage';

/**
 * Opportunities Page E2E Tests
 *
 * Consolidated tests for the opportunities list view.
 * Tests focus on critical user flows rather than individual UI elements.
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

const allOpportunities = [mockContentOpportunity1, mockTechnicalOpportunity];

// =============================================================================
// Helpers: Mock API overrides
// =============================================================================

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

async function mockOpportunitiesWithData(
  page: import('@playwright/test').Page,
  opportunities: Record<string, unknown>[]
) {
  await page.route('**/api/opportunities**', async route => {
    const url = route.request().url();

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

  test.describe('GSC Connection', () => {
    test('should display GSC connection card when not connected', async () => {
      await opportunitiesPage.goto();
      await opportunitiesPage.assertGscConnectionCardVisible();
    });

    test('should handle empty opportunities with GSC connected', async ({ page }) => {
      await mockGscConnected(page);
      await opportunitiesPage.goto();
      await opportunitiesPage.assertEmptyStateVisible();
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
      await expect(opportunitiesPage.opportunityCards).toHaveCount(2);
    });

    test('should filter by category', async () => {
      await opportunitiesPage.goto();
      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.filterByCategory('Content');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(1);

      await opportunitiesPage.filterByCategory('All');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(2);
    });

    test('should search opportunities', async () => {
      await opportunitiesPage.goto();
      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.search('running shoes');
      await expect(opportunitiesPage.opportunityCards).toHaveCount(1);

      await opportunitiesPage.clearSearch();
      await expect(opportunitiesPage.opportunityCards).toHaveCount(2);
    });
  });

  test.describe('Detail Panel', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should open and close detail panel', async () => {
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
  });

  test.describe('Actions', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should show action buttons in detail panel', async () => {
      await opportunitiesPage.goto();
      await opportunitiesPage.waitForOpportunitiesLoad();

      await opportunitiesPage.openFirstOpportunity();
      await opportunitiesPage.assertDetailPanelVisible();

      await expect(opportunitiesPage.markCompleteButton).toBeVisible();
      await expect(opportunitiesPage.dismissButton).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await mockGscConnected(page);
      await mockOpportunitiesWithData(page, allOpportunities);
    });

    test('should support keyboard navigation', async () => {
      await opportunitiesPage.goto();
      await opportunitiesPage.waitForOpportunitiesLoad();

      const firstCard = opportunitiesPage.opportunityCards.first();
      await expect(firstCard).toHaveAttribute('role', 'button');
      await expect(firstCard).toHaveAttribute('tabindex', '0');
    });
  });
});
