import { test, expect } from '../test-fixtures';
import { OnboardingPage } from '../pages/OnboardingPage';

/**
 * Onboarding Wizard E2E Tests
 *
 * Tests the 5-step onboarding wizard including project creation,
 * GSC connection, keywords upload, integrations, and completion.
 *
 * Default test fixtures provide:
 * - A mock project (mock-project-1)
 * - Onboarding status as complete (isComplete: true)
 *
 * Tests override onboarding status to isComplete: false so the wizard shows.
 * API mocks handle project creation, progress updates, campaign creation, etc.
 */

// =============================================================================
// Mock Data
// =============================================================================

const mockOnboardingStatus = {
  isComplete: false,
  currentStep: 1,
  completedSteps: [] as number[],
  skippedSteps: [] as number[],
};

const mockCreatedProject = {
  id: 'mock-project-1',
  name: 'My Test Project',
  domain: 'https://example.com',
  industry: '',
  user_id: 'test-user-id',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCreatedCampaign = {
  id: 'mock-campaign-1',
  name: 'Onboarding Campaign',
  project_id: 'mock-project-1',
  status: 'active',
  keyword_count: 3,
  created_at: '2024-06-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

// =============================================================================
// Helpers: Mock API overrides
// =============================================================================

/**
 * Override onboarding status to return incomplete (step 1).
 * Must be called BEFORE goto() so the route is registered before the page loads.
 */
async function mockOnboardingIncomplete(page: import('@playwright/test').Page) {
  await page.route('**/api/onboarding/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        onboarding: mockOnboardingStatus,
      }),
    });
  });
}

/**
 * Mock project creation API.
 * Must be called BEFORE goto().
 */
async function mockProjectCreation(page: import('@playwright/test').Page) {
  await page.route('**/api/projects', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { project: mockCreatedProject },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock onboarding progress update API.
 * Must be called BEFORE goto().
 */
async function mockOnboardingProgressUpdate(page: import('@playwright/test').Page) {
  await page.route('**/api/onboarding/progress', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        onboarding: {
          isComplete: false,
          currentStep: 2,
          completedSteps: [1],
          skippedSteps: [],
        },
      }),
    });
  });
}

/**
 * Mock campaign creation API.
 * Must be called BEFORE goto().
 */
async function mockCampaignCreation(page: import('@playwright/test').Page) {
  await page.route('**/api/campaigns**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { campaign: mockCreatedCampaign },
        }),
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { campaigns: [] },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock onboarding complete API.
 * Must be called BEFORE goto().
 */
async function mockOnboardingComplete(page: import('@playwright/test').Page) {
  await page.route('**/api/onboarding/complete', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        onboarding: {
          isComplete: true,
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          skippedSteps: [],
        },
      }),
    });
  });
}

/**
 * Mock GSC connection check API (singular - used by onboarding step 2).
 * Returns no existing connection.
 * Must be called BEFORE goto().
 */
async function mockGscConnectionCheck(page: import('@playwright/test').Page) {
  await page.route('**/api/gsc/connection**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connection: null,
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Register all mocks needed for onboarding wizard tests.
 */
async function setupOnboardingMocks(page: import('@playwright/test').Page) {
  await mockOnboardingIncomplete(page);
  await mockProjectCreation(page);
  await mockOnboardingProgressUpdate(page);
  await mockCampaignCreation(page);
  await mockOnboardingComplete(page);
  await mockGscConnectionCheck(page);
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Onboarding Wizard E2E Tests', () => {
  let onboardingPage: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    onboardingPage = new OnboardingPage(page);
    await setupOnboardingMocks(page);
  });

  test.describe('Stepper', () => {
    test('should display 5-step stepper', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStepperSteps(5);
    });
  });

  test.describe('Step 1 - Project Creation', () => {
    test('should show project creation form', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStep1Visible();
    });

    test('should disable submit button when name is empty', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStep1Visible();

      // Button should be disabled when name is empty
      await expect(onboardingPage.nextButton).toBeDisabled();
    });

    test('should advance to step 2 after filling form', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStep1Visible();

      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });

      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      // Should be on step 2
      await onboardingPage.assertStep2Visible();
    });
  });

  test.describe('Step 2 - GSC Connection (Optional)', () => {
    test('should allow skipping GSC connection', async () => {
      await onboardingPage.goto();

      // Complete step 1
      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });
      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      // Skip step 2 (clicks "Skip for now" → "Skip Anyway")
      await onboardingPage.skipStep2();
      await onboardingPage.waitForStepTransition();

      // Should be on step 3
      await onboardingPage.assertStep3Visible();
    });
  });

  test.describe('Step 3 - Keywords', () => {
    test('should show keywords input', async () => {
      await onboardingPage.goto();

      // Complete step 1
      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });
      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      // Skip step 2
      await onboardingPage.skipStep2();
      await onboardingPage.waitForStepTransition();

      // Should show keywords input
      await onboardingPage.assertStep3Visible();
      const { keywordsInput } = onboardingPage.step3Elements;
      await expect(keywordsInput).toBeVisible();
    });
  });

  test.describe('Step 4 - Integrations (Optional)', () => {
    test('should allow skipping integrations', async () => {
      await onboardingPage.goto();

      // Complete step 1
      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });
      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      // Skip step 2
      await onboardingPage.skipStep2();
      await onboardingPage.waitForStepTransition();

      // Fill step 3 keywords
      await onboardingPage.fillStep3Keywords('seo tools, keyword research, content marketing');
      await onboardingPage.clickStep3Next();
      await onboardingPage.waitForStepTransition();

      // Skip step 4 (clicks "Skip for now" → "Skip Anyway")
      await onboardingPage.skipStep4();
      await onboardingPage.waitForStepTransition();

      // Should be on step 5
      await onboardingPage.assertStep5Visible();
    });
  });

  test.describe('Step 5 - Completion', () => {
    test('should show completion with dashboard button', async () => {
      await onboardingPage.goto();

      // Complete step 1
      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });
      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      // Skip step 2
      await onboardingPage.skipStep2();
      await onboardingPage.waitForStepTransition();

      // Fill step 3
      await onboardingPage.fillStep3Keywords('test keyword');
      await onboardingPage.clickStep3Next();
      await onboardingPage.waitForStepTransition();

      // Skip step 4
      await onboardingPage.skipStep4();
      await onboardingPage.waitForStepTransition();

      // Step 5 should show completion
      await onboardingPage.assertStep5Visible();

      const { goToDashboardButton } = onboardingPage.step5Elements;
      await expect(goToDashboardButton).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should not show back button on step 1', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStep1Visible();
      await onboardingPage.assertBackButtonHidden();
    });

    test('should show submit button on step 1', async () => {
      await onboardingPage.goto();

      await onboardingPage.assertStep1Visible();
      await onboardingPage.assertNextButtonVisible();
    });

    test('should show back button on step 2', async () => {
      await onboardingPage.goto();

      // Complete step 1
      await onboardingPage.fillStep1({
        name: 'My Test Project',
        website: 'https://example.com',
      });
      await onboardingPage.nextButton.click();
      await onboardingPage.waitForStepTransition();

      await onboardingPage.assertStep2Visible();
      await onboardingPage.assertBackButtonVisible();
    });
  });
});
