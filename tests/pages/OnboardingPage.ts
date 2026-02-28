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
 * Steps 1-6: Project, GSC, Keywords, Preferences, Integrations, Complete.
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
    // Scope to modal to avoid conflicts with header elements
    const modal = this.wizardModal;
    const nameInput = modal.getByLabel(/project name/i);
    const websiteInput = modal.getByLabel(/website url/i);
    const industrySelect = modal.getByLabel(/industry/i);
    const descriptionTextarea = modal.getByLabel(/description/i);
    const languageSelect = modal.getByLabel(/^language$/i);
    const countrySelect = modal.getByLabel(/^country$/i);
    const sitemapInput = modal.getByLabel(/sitemap url/i);
    const blogInput = modal.getByLabel(/blog url/i);
    const analyzeButton = modal.getByRole('button', { name: /analyze/i });

    return {
      nameInput,
      websiteInput,
      industrySelect,
      descriptionTextarea,
      languageSelect,
      countrySelect,
      sitemapInput,
      blogInput,
      analyzeButton,
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
   * Gets step 4 (preferences) elements
   */
  get step4Elements() {
    const skipButton = this.page.getByRole('button', { name: /skip.*use defaults/i });
    const saveButton = this.page.getByRole('button', { name: /save & continue/i });

    return {
      skipButton,
      saveButton,
    };
  }

  /**
   * Gets step 5 (integrations) elements
   */
  get step5Elements() {
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
   * Gets step 6 (completion) elements
   */
  get step6Elements() {
    const goToDashboardButton = this.page.getByRole('button', { name: /go to dashboard/i });

    return {
      goToDashboardButton,
    };
  }

  /**
   * Gets validation error messages (red text paragraphs)
   */
  get validationErrors(): Locator {
    return this.page.locator('p.text-red-400, p.text-error, [data-testid="validation-error"], .error-message');
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
    industry?: string;
    description?: string;
    language?: string;
    country?: string;
    sitemapUrl?: string;
    blogUrl?: string;
  }): Promise<void> {
    const {
      nameInput,
      websiteInput,
      industrySelect,
      descriptionTextarea,
      languageSelect,
      countrySelect,
      sitemapInput,
      blogInput,
    } = this.step1Fields;

    if (data.name !== undefined) {
      await nameInput.fill(data.name);
    }

    if (data.website !== undefined) {
      await websiteInput.fill(data.website);
    }

    if (data.industry !== undefined) {
      await industrySelect.selectOption(data.industry);
    }

    if (data.description !== undefined) {
      await descriptionTextarea.fill(data.description);
    }

    if (data.language !== undefined) {
      await languageSelect.selectOption(data.language);
    }

    if (data.country !== undefined) {
      await countrySelect.selectOption(data.country);
    }

    if (data.sitemapUrl !== undefined) {
      await sitemapInput.fill(data.sitemapUrl);
    }

    if (data.blogUrl !== undefined) {
      await blogInput.fill(data.blogUrl);
    }
  }

  /**
   * Clicks the "Analyze" button in step 1
   */
  async clickAnalyzeWebsite(): Promise<void> {
    const { analyzeButton } = this.step1Fields;
    await analyzeButton.click();
  }

  /**
   * Asserts that the Analyze button is visible in step 1
   */
  async assertAnalyzeButtonVisible(): Promise<void> {
    const { analyzeButton } = this.step1Fields;
    await expect(analyzeButton).toBeVisible();
  }

  /**
   * Asserts that the Analyze button is hidden in step 1
   */
  async assertAnalyzeButtonHidden(): Promise<void> {
    const { analyzeButton } = this.step1Fields;
    await expect(analyzeButton).toBeHidden();
  }

  /**
   * Asserts that all enhanced step 1 fields are visible
   */
  async assertEnhancedStep1FieldsVisible(): Promise<void> {
    const {
      nameInput,
      websiteInput,
      industrySelect,
      descriptionTextarea,
      languageSelect,
      countrySelect,
      sitemapInput,
      blogInput,
    } = this.step1Fields;

    await expect(nameInput).toBeVisible();
    await expect(websiteInput).toBeVisible();
    await expect(industrySelect).toBeVisible();
    await expect(descriptionTextarea).toBeVisible();
    await expect(languageSelect).toBeVisible();
    await expect(countrySelect).toBeVisible();
    await expect(sitemapInput).toBeVisible();
    await expect(blogInput).toBeVisible();
  }

  /**
   * Asserts that sitemap URL has the expected value (auto-suggested)
   */
  async assertSitemapUrlValue(expected: string): Promise<void> {
    const { sitemapInput } = this.step1Fields;
    await expect(sitemapInput).toHaveValue(expected);
  }

  /**
   * Asserts that blog URL has the expected value (auto-suggested)
   */
  async assertBlogUrlValue(expected: string): Promise<void> {
    const { blogInput } = this.step1Fields;
    await expect(blogInput).toHaveValue(expected);
  }

  /**
   * Asserts that description has the expected value (auto-filled from crawl)
   */
  async assertDescriptionValue(expected: string): Promise<void> {
    const { descriptionTextarea } = this.step1Fields;
    await expect(descriptionTextarea).toHaveValue(expected);
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
   * Skips step 4 (Preferences) by clicking "Skip, use defaults"
   * No confirmation dialog for this step
   */
  async skipStep4(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await skipButton.click();
    // No confirmation dialog for Preferences step
  }

  /**
   * Clicks save button in step 4 (Preferences)
   */
  async clickStep4Save(): Promise<void> {
    const { saveButton } = this.step4Elements;
    await saveButton.click();
  }

  /**
   * Skips step 5 (Integrations) by clicking "Skip for now" -> "Skip Anyway"
   */
  async skipStep5(): Promise<void> {
    const { skipButton } = this.step5Elements;
    await skipButton.click();

    // Wait for confirmation dialog and click "Skip Anyway"
    await this.clickSkipAnyway();
  }

  /**
   * Clicks next button in step 5 (Integrations)
   */
  async clickStep5Next(): Promise<void> {
    const { nextButton } = this.step5Elements;
    await nextButton.click();
  }

  /**
   * Clicks go to dashboard button in step 6
   */
  async clickGoToDashboard(): Promise<void> {
    const { goToDashboardButton } = this.step6Elements;
    await goToDashboardButton.click();
  }

  /**
   * Clicks back button (accepts the window.confirm dialog that appears)
   */
  async clickBack(): Promise<void> {
    this.page.once('dialog', dialog => void dialog.accept());
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
  async assertStepperSteps(stepCount = 6): Promise<void> {
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
   * Asserts step 4 is visible (preferences skip button visible)
   */
  async assertStep4Visible(): Promise<void> {
    const { skipButton } = this.step4Elements;
    await expect(skipButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts step 5 is visible (integration options visible)
   */
  async assertStep5Visible(): Promise<void> {
    const { skipButton } = this.step5Elements;
    await expect(skipButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts integration options (WordPress and Webhook) are visible on step 5
   */
  async assertIntegrationOptionsVisible(): Promise<void> {
    const { wordpressOption, webhookOption } = this.step5Elements;
    await expect(wordpressOption).toBeVisible({ timeout: 5000 });
    await expect(webhookOption).toBeVisible({ timeout: 5000 });
  }

  /**
   * Asserts step 6 (completion) is visible
   */
  async assertStep6Visible(): Promise<void> {
    const { goToDashboardButton } = this.step6Elements;
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
    // Scope to modal to avoid conflicts with header elements
    const modal = this.wizardModal;
    // Find the field container (parent div with space-y-2 class)
    const field = modal.getByLabel(new RegExp(fieldName, 'i'));
    // Go up to the parent container that has the error message as a sibling
    // For domain field: input -> div.relative -> div.flex -> div.space-y-2
    // The error p.text-red-400 is a direct child of div.space-y-2
    const fieldParent = field.locator('xpath=../../..');
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
