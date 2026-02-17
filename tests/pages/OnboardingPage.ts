import { Locator, expect, Request } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Interface for captured API request data
 */
export interface ICapturedApiRequest {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

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
   * Gets the wizard modal/container
   */
  get wizardModal(): Locator {
    return this.page.locator('[data-testid="onboarding-wizard"], [data-testid="modal"]');
  }

  /**
   * Gets the stepper progress indicator
   * Note: Uses "onboarding-stepper" when skipped steps exist, "stepper-progress" otherwise
   */
  get stepper(): Locator {
    return this.page.locator('[data-testid="onboarding-stepper"], [data-testid="stepper-progress"]');
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
   * Gets the loading indicator/spinner in the wizard
   */
  get loadingIndicator(): Locator {
    return this.page.locator(
      '[data-testid="onboarding-loading"], [data-loading], .animate-spin, [aria-busy="true"]'
    );
  }

  /**
   * Gets the error toast notification
   */
  get errorToast(): Locator {
    return this.page.locator(
      '[data-sonner-toast][data-type="error"], [role="alert"].error, .toast-error, [data-testid="error-toast"]'
    );
  }

  /**
   * Gets the skip confirmation dialog ("Skip Anyway" modal)
   */
  get skipConfirmationDialog(): Locator {
    return this.page.locator('[data-testid="skip-confirmation-dialog"], [role="dialog"]').filter({
      hasText: /skip anyway|are you sure/i,
    });
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
    const wordpressOption = this.page.locator('[data-testid="integration-wordpress"], button:has-text("WordPress")');
    const webhookOption = this.page.locator('[data-testid="integration-webhook"], button:has-text("Webhook")');

    return {
      skipButton,
      nextButton,
      wordpressOption,
      webhookOption,
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
    return this.page.locator('p.text-red-400, [data-testid="validation-error"], .error-message');
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
   * Skips step 2 (GSC) by clicking "Skip for now" -> "Skip Anyway" in confirmation
   */
  async skipStep2(): Promise<void> {
    const { skipButton } = this.step2Elements;
    await skipButton.click();

    // Wait for confirmation dialog and click "Skip Anyway"
    await this.clickSkipAnyway();
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
   * Skips step 4 (Integrations) by clicking "Skip for now" -> "Skip Anyway"
   */
  async skipStep4(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await skipButton.click();

    // Wait for confirmation dialog and click "Skip Anyway"
    await this.clickSkipAnyway();
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

  /**
   * Clicks the "Skip Anyway" button in the skip confirmation dialog
   */
  async clickSkipAnyway(): Promise<void> {
    const skipAnyway = this.page.getByRole('button', { name: /skip anyway/i });
    await expect(skipAnyway).toBeVisible({ timeout: 3000 });
    await skipAnyway.click();
  }

  // ============================================================================
  // Assertion Methods
  // ============================================================================

  /**
   * Asserts wizard modal is visible
   */
  async assertWizardVisible(): Promise<void> {
    await expect(this.wizardModal).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts wizard modal is closed/hidden
   */
  async assertWizardClosed(): Promise<void> {
    await expect(this.wizardModal).toBeHidden({ timeout: 5000 });
  }

  /**
   * Asserts stepper shows specific number of steps
   */
  async assertStepperSteps(stepCount = 5): Promise<void> {
    await expect(this.stepper).toBeVisible();
    await expect(this.stepperSteps).toHaveCount(stepCount);
  }

  /**
   * Asserts a specific step shows as active
   *
   * @param stepNumber - Step number (1-5)
   */
  async assertStepActive(stepNumber: number): Promise<void> {
    const step = this.stepperSteps.nth(stepNumber - 1);
    await expect(step).toBeVisible();

    // Check for active state - look for bg-accent class on the circle div inside the step
    const isActive = await step.evaluate(el => {
      // Check the circle div inside the step for bg-accent class
      const circle = el.querySelector('.bg-accent');
      return (
        el.getAttribute('data-state') === 'active' ||
        el.getAttribute('aria-current') === 'step' ||
        el.classList.contains('active') ||
        el.classList.contains('bg-blue-600') ||
        el.classList.contains('bg-primary') ||
        circle !== null
      );
    });

    expect(isActive).toBe(true);
  }

  /**
   * Asserts a step shows as completed (checkmark)
   *
   * @param stepNumber - Step number (1-5)
   */
  async assertStepCompleted(stepNumber: number): Promise<void> {
    const step = this.stepperSteps.nth(stepNumber - 1);
    await expect(step).toBeVisible();

    // Check for completed state - uses emerald-500 color class and Check icon
    const isCompleted = await step.evaluate(el => {
      const html = el.innerHTML;
      const hasCheckmark = el.querySelector('svg, [data-icon="check"], [data-testid="check-icon"]');
      const hasEmeraldClass = html.includes('emerald-500') || html.includes('emerald-400');
      return (
        el.getAttribute('data-state') === 'completed' ||
        el.classList.contains('completed') ||
        el.classList.contains('bg-green') ||
        hasEmeraldClass ||
        hasCheckmark !== null
      );
    });

    expect(isCompleted).toBe(true);
  }

  /**
   * Asserts a step shows as skipped
   *
   * @param stepNumber - Step number (1-5)
   */
  async assertStepSkipped(stepNumber: number): Promise<void> {
    const step = this.stepperSteps.nth(stepNumber - 1);
    await expect(step).toBeVisible();

    // Check for skipped state - amber color classes indicate skipped
    const isSkipped = await step.evaluate(el => {
      const html = el.innerHTML;
      const hasAmberClass = html.includes('text-amber-400') || html.includes('amber');
      const hasSkipIcon = html.includes('skip-forward') || html.includes('SkipForward');
      return (
        el.getAttribute('data-state') === 'skipped' ||
        el.classList.contains('skipped') ||
        el.getAttribute('data-skipped') === 'true' ||
        hasAmberClass ||
        hasSkipIcon
      );
    });

    expect(isSkipped).toBe(true);
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
   * Asserts step 4 is visible (integration options visible)
   */
  async assertStep4Visible(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await expect(skipButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts integration options (WordPress and Webhook) are visible on step 4
   */
  async assertIntegrationOptionsVisible(): Promise<void> {
    const { wordpressOption, webhookOption } = this.step4Elements;
    await expect(wordpressOption).toBeVisible({ timeout: 5000 });
    await expect(webhookOption).toBeVisible({ timeout: 5000 });
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
   *
   * @param expectedErrors - Array of error message patterns to check for
   */
  async assertValidationErrors(expectedErrors: string[]): Promise<void> {
    const errors = this.validationErrors;
    const errorCount = await errors.count();

    if (expectedErrors.length > 0) {
      expect(errorCount).toBeGreaterThan(0);
    }

    for (const errorPattern of expectedErrors) {
      const matchingError = errors.filter({ hasText: new RegExp(errorPattern, 'i') }).first();
      await expect(matchingError).toBeVisible({ timeout: 3000 });
    }
  }

  /**
   * Asserts validation error is visible for a specific field
   *
   * @param fieldName - Name of the field with the error
   * @param errorMessage - Expected error message pattern
   */
  async assertFieldValidationError(fieldName: string, errorMessage?: string): Promise<void> {
    // Find the field container (parent div with space-y-2 class)
    const field = this.page.getByLabel(new RegExp(fieldName, 'i'));
    // Go up to the parent container that has the error message as a sibling
    const fieldParent = field.locator('xpath=../..');
    const errorInContainer = fieldParent.locator('p.text-red-400, .error-message, [data-testid="validation-error"]');

    if (errorMessage) {
      await expect(errorInContainer.filter({ hasText: new RegExp(errorMessage, 'i') })).toBeVisible({ timeout: 3000 });
    } else {
      await expect(errorInContainer.first()).toBeVisible({ timeout: 3000 });
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
   * Asserts skip confirmation dialog is visible
   */
  async assertSkipConfirmationVisible(): Promise<void> {
    await expect(this.skipConfirmationDialog).toBeVisible({ timeout: 3000 });
  }

  /**
   * Asserts an error message is displayed (toast or inline)
   *
   * @param message - Optional error message pattern to match
   */
  async assertErrorVisible(message?: string): Promise<void> {
    if (message) {
      // Check both toast and inline errors
      const errorWithMessage = this.page.locator(
        `[data-sonner-toast][data-type="error"], [role="alert"], .error-message, p.text-red-400`
      ).filter({ hasText: new RegExp(message, 'i') });

      await expect(errorWithMessage.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Check for any error indicator
      await expect(this.errorToast.or(this.validationErrors.first())).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Asserts loading indicator is visible
   */
  async assertLoadingVisible(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible({ timeout: 3000 });
  }

  /**
   * Asserts loading indicator is hidden
   */
  async assertLoadingHidden(): Promise<void> {
    await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 });
  }

  // ============================================================================
  // API Request Helpers
  // ============================================================================

  /**
   * Waits for an API call matching a URL pattern and returns the request body
   *
   * @param pattern - URL pattern to match (string or regex)
   * @returns Promise resolving with the request body
   */
  async waitForApiCall(pattern: string | RegExp): Promise<unknown> {
    const request = await this.page.waitForRequest(pattern);
    return this.parseRequestBody(request);
  }

  /**
   * Captures an API request for verification
   *
   * @param pattern - URL pattern to match (string or regex)
   * @returns Promise resolving with captured request data
   */
  async captureApiRequest(pattern: string | RegExp): Promise<ICapturedApiRequest> {
    const request = await this.page.waitForRequest(pattern);

    return {
      url: request.url(),
      method: request.method(),
      body: this.parseRequestBody(request),
      headers: request.headers(),
    };
  }

  /**
   * Sets up request interception to capture the next matching request
   *
   * @param pattern - URL pattern to match
   * @returns Promise that resolves when request is captured
   */
  async interceptApiRequest(pattern: string | RegExp): Promise<ICapturedApiRequest> {
    return new Promise(resolve => {
      this.page.on('request', async request => {
        const url = request.url();
        const matches = typeof pattern === 'string'
          ? url.includes(pattern)
          : pattern.test(url);

        if (matches) {
          resolve({
            url: request.url(),
            method: request.method(),
            body: this.parseRequestBody(request),
            headers: request.headers(),
          });
        }
      });
    });
  }

  /**
   * Parses request body safely
   */
  private parseRequestBody(request: Request): unknown {
    const postData = request.postData();
    if (!postData) {
      return null;
    }

    try {
      return JSON.parse(postData);
    } catch {
      return postData;
    }
  }

  // ============================================================================
  // Wait Methods
  // ============================================================================

  /**
   * Waits for step transition to complete
   */
  async waitForStepTransition(): Promise<void> {
    // Wait for loading to appear and then disappear
    await this.page.waitForTimeout(300);
    await this.assertLoadingHidden().catch(() => {
      // Loading might have already finished, that's okay
    });
  }

  /**
   * Waits for onboarding wizard to close
   */
  async waitForWizardClose(): Promise<void> {
    await this.assertWizardClosed();
  }

  /**
   * Checks if user has any project (auto-complete check)
   */
  async hasExistingProjects(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard') && !url.includes('/onboarding');
  }
}
