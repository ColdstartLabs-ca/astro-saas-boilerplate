import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for Onboarding Wizard
 *
 * Provides methods for interacting with the multi-step onboarding flow,
 * including project creation, GSC connection, keywords upload, and completion.
 *
 * The wizard is a Modal rendered at /dashboard/onboarding.
 * Steps 1-5: Project, GSC, Keywords, Integrations, Complete.
 */
export class OnboardingPage extends BasePage {
  // ============================================================================
  // Locators
  // ============================================================================

  /**
   * Gets the stepper progress indicator
   */
  get stepper(): Locator {
    return this.page.locator('[data-testid="onboarding-stepper"]');
  }

  /**
   * Gets stepper step indicators (scoped to desktop layout to avoid double-counting)
   */
  get stepperSteps(): Locator {
    return this.page.locator('[data-testid="stepper-desktop"] [data-testid="stepper-step"]');
  }

  /**
   * Gets the back button ("Back to previous step")
   */
  get backButton(): Locator {
    return this.page.getByRole('button', { name: /back|previous/i });
  }

  /**
   * Gets the next/continue/submit button (matches various step submit buttons)
   */
  get nextButton(): Locator {
    return this.page.getByRole('button', { name: /create project|create campaign|continue|next|proceed/i });
  }

  /**
   * Gets a generic skip button (matches "Skip for now")
   */
  get skipButton(): Locator {
    return this.page.getByRole('button', { name: /skip for now/i });
  }

  /**
   * Gets step 1 (project creation) form elements
   */
  get step1Fields() {
    const nameInput = this.page.getByLabel(/project name/i);
    const websiteInput = this.page.getByLabel(/website domain/i);

    return {
      nameInput,
      websiteInput,
    };
  }

  /**
   * Gets step 2 (GSC connection) elements
   */
  get step2Elements() {
    const connectButton = this.page.getByRole('button', { name: /connect google search console/i });
    const skipButton = this.page.getByRole('button', { name: /skip for now/i });

    return {
      connectButton,
      skipButton,
    };
  }

  /**
   * Gets step 3 (keywords upload) elements
   */
  get step3Elements() {
    const keywordsInput = this.page.locator('#keywords-input');
    const nextButton = this.page.getByRole('button', { name: /create campaign/i });

    return {
      keywordsInput,
      nextButton,
    };
  }

  /**
   * Gets step 4 (integrations) elements
   */
  get step4Elements() {
    const skipButton = this.page.getByRole('button', { name: /skip for now/i });
    const nextButton = this.page.getByRole('button', { name: /connect wordpress|connect webhook|continue/i });

    return {
      skipButton,
      nextButton,
    };
  }

  /**
   * Gets step 5 (completion) elements
   */
  get step5Elements() {
    const goToDashboardButton = this.page.getByRole('button', { name: /go to dashboard/i });

    return {
      goToDashboardButton,
    };
  }

  /**
   * Gets validation error messages (red text paragraphs)
   */
  get validationErrors(): Locator {
    return this.page.locator('p.text-red-400');
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigates to onboarding page
   */
  async goto(path?: string): Promise<void> {
    await super.goto(path ?? '/dashboard/onboarding');
    await this.waitForPageLoad();
  }

  // ============================================================================
  // Step Interaction Methods
  // ============================================================================

  /**
   * Fills step 1 (project creation) form
   */
  async fillStep1(data: {
    name?: string;
    website?: string;
  }): Promise<void> {
    const { nameInput, websiteInput } = this.step1Fields;

    if (data.name !== undefined) {
      await nameInput.fill(data.name);
    }

    if (data.website !== undefined) {
      await websiteInput.fill(data.website);
    }
  }

  /**
   * Clicks connect GSC button in step 2
   */
  async clickConnectGsc(): Promise<void> {
    const { connectButton } = this.step2Elements;
    await connectButton.click();
  }

  /**
   * Skips step 2 (GSC) by clicking "Skip for now" → "Skip Anyway" in confirmation
   */
  async skipStep2(): Promise<void> {
    const { skipButton } = this.step2Elements;
    await skipButton.click();

    // Wait for confirmation dialog and click "Skip Anyway"
    const skipAnyway = this.page.getByRole('button', { name: /skip anyway/i });
    await expect(skipAnyway).toBeVisible({ timeout: 3000 });
    await skipAnyway.click();
  }

  /**
   * Fills step 3 (keywords) input
   */
  async fillStep3Keywords(keywords: string): Promise<void> {
    const { keywordsInput } = this.step3Elements;
    await keywordsInput.fill(keywords);
  }

  /**
   * Clicks next/submit button in step 3 ("Create Campaign & Continue")
   */
  async clickStep3Next(): Promise<void> {
    const { nextButton } = this.step3Elements;
    await nextButton.click();
  }

  /**
   * Skips step 4 (Integrations) by clicking "Skip for now" → "Skip Anyway"
   */
  async skipStep4(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await skipButton.click();

    // Wait for confirmation dialog and click "Skip Anyway"
    const skipAnyway = this.page.getByRole('button', { name: /skip anyway/i });
    await expect(skipAnyway).toBeVisible({ timeout: 3000 });
    await skipAnyway.click();
  }

  /**
   * Clicks next button in step 4
   */
  async clickStep4Next(): Promise<void> {
    const { nextButton } = this.step4Elements;
    await nextButton.click();
  }

  /**
   * Clicks go to dashboard button in step 5
   */
  async clickGoToDashboard(): Promise<void> {
    const { goToDashboardButton } = this.step5Elements;
    await goToDashboardButton.click();
  }

  /**
   * Clicks back button
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  // ============================================================================
  // Assertion Methods
  // ============================================================================

  /**
   * Asserts stepper shows specific number of steps
   */
  async assertStepperSteps(stepCount = 5): Promise<void> {
    await expect(this.stepper).toBeVisible();
    await expect(this.stepperSteps).toHaveCount(stepCount);
  }

  /**
   * Asserts step 1 is visible (project name input visible)
   */
  async assertStep1Visible(): Promise<void> {
    const { nameInput } = this.step1Fields;
    await expect(nameInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts step 2 is visible (connect GSC button visible)
   */
  async assertStep2Visible(): Promise<void> {
    const { connectButton } = this.step2Elements;
    await expect(connectButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts step 3 is visible (keywords input visible)
   */
  async assertStep3Visible(): Promise<void> {
    const { keywordsInput } = this.step3Elements;
    await expect(keywordsInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts step 4 is visible (skip or connect button visible)
   */
  async assertStep4Visible(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await expect(skipButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts step 5 (completion) is visible
   */
  async assertStep5Visible(): Promise<void> {
    const { goToDashboardButton } = this.step5Elements;
    await expect(goToDashboardButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts validation errors are visible
   */
  async assertValidationErrors(expectedErrors: string[]): Promise<void> {
    const errors = this.validationErrors;
    const errorCount = await errors.count();
    if (expectedErrors.length > 0) {
      expect(errorCount).toBeGreaterThan(0);
    }

    for (const errorPattern of expectedErrors) {
      const matchingError = errors.filter({ hasText: new RegExp(errorPattern, 'i') }).first();
      await expect(matchingError).toBeVisible();
    }
  }

  /**
   * Asserts back button is visible
   */
  async assertBackButtonVisible(): Promise<void> {
    await expect(this.backButton).toBeVisible();
  }

  /**
   * Asserts back button is hidden (on first step)
   */
  async assertBackButtonHidden(): Promise<void> {
    await expect(this.backButton).toBeHidden();
  }

  /**
   * Asserts skip button is visible
   */
  async assertSkipButtonVisible(): Promise<void> {
    await expect(this.skipButton).toBeVisible();
  }

  /**
   * Asserts next/continue button is visible
   */
  async assertNextButtonVisible(): Promise<void> {
    await expect(this.nextButton).toBeVisible();
  }

  /**
   * Waits for step transition to complete
   */
  async waitForStepTransition(): Promise<void> {
    await this.page.waitForTimeout(500);
  }

  /**
   * Waits for onboarding wizard to close
   */
  async waitForWizardClose(): Promise<void> {
    await this.page.waitForTimeout(1000);
  }

  /**
   * Checks if user has any project (auto-complete check)
   */
  async hasExistingProjects(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard') && !url.includes('/onboarding');
  }
}
