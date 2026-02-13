# PRD: Onboarding E2E Testing Plan

`Complexity: 5 → MEDIUM mode`

---

## Complexity Assessment

```
COMPLEXITY SCORE: 5 (MEDIUM mode)
+2  Touches 6-10 files (test files, page objects, fixtures)
+2  Complex state logic (multi-step wizard flow, skip/back navigation, API mocking)
+1  External API integration (GSC OAuth mock, Integrations validation mock)
```

---

## Integration Points Checklist

**How will this feature be reached?**
- [x] Entry point identified: `yarn test:e2e` runs Playwright E2E tests
- [x] Caller file identified: `tests/e2e/onboarding.e2e.spec.ts` (existing, to be enhanced)
- [x] Registration/wiring needed: None - tests/pages/OnboardingPage.ts already exists

**Is this user-facing?**
- [ ] NO → This is a testing-only PRD. No UI changes.

**Full test flow:**
1. Playwright starts dev server
2. Fake JWT + Supabase session injected via `test-fixtures.ts`
3. API routes mocked via `page.route()` before navigation
4. Onboarding status mocked as `isComplete: false` to trigger wizard
5. Tests interact with wizard steps, assert UI state, verify API payloads
6. Tests verify error/edge cases (validation, skip confirmation, back navigation)

---

## 1. Context

**Problem:** The existing onboarding E2E test file (`tests/e2e/onboarding.e2e.spec.ts`) covers basic happy paths but has significant gaps in coverage. Missing: form validation, error states, API payload verification, keyboard navigation, stepper visual state, edge cases (back navigation to completed steps), and the "Go to Dashboard" completion flow.

**Files Analyzed:**
- `tests/e2e/onboarding.e2e.spec.ts` - 384 lines, 10 tests covering basics
- `tests/pages/OnboardingPage.ts` - 347 lines, page object with locators + actions
- `tests/test-fixtures.ts` - Global fixtures with auth mocking
- `client/components/onboarding/OnboardingWizard.tsx` - 5-step wizard container
- `client/components/onboarding/steps/OnboardingStep*.tsx` - 5 step components
- `client/hooks/useOnboardingProgress.ts` - Progress mutation hook
- `client/hooks/useOnboardingStatus.ts` - Status query hook
- `client/store/onboardingStore.ts` - Zustand store
- `shared/types/onboarding.types.ts` - Types (OnboardingStep enum 1-5)
- `shared/validation/onboarding.schema.ts` - Zod validation schemas
- `src/pages/api/onboarding/status.ts` - GET status endpoint
- `src/pages/api/onboarding/progress.ts` - PUT progress endpoint
- `src/pages/api/onboarding/complete.ts` - POST complete endpoint
- `server/services/onboarding.service.ts` - Service with DB + test-mode logic

**Current E2E Coverage (10 tests):**
- Stepper: renders 5 steps
- Step 1: form visible, disabled when empty, advance on fill
- Step 2: skip GSC (Skip for now → Skip Anyway)
- Step 3: keywords input visible
- Step 4: skip integrations
- Step 5: completion with dashboard button
- Navigation: back button hidden on step 1, visible on step 2, submit visible

**Gaps Identified:**
1. No form validation tests (empty project name, invalid URL)
2. No API request payload verification (what gets sent to server)
3. No error state handling (API failure, network error)
4. No "Go to Dashboard" button click + redirect test
5. No back navigation between multiple steps
6. No stepper visual state assertions (active/completed/skipped indicators)
7. No keyboard accessibility testing
8. No test for resuming onboarding at a specific step
9. No test for completing all steps without skipping optional ones
10. No loading state visibility tests

---

## 2. Solution

**Approach:**
- Enhance existing `OnboardingPage.ts` with missing locators and assertion methods
- Extend `onboarding.e2e.spec.ts` with new test groups covering gaps
- Add API request interception to verify payloads sent to server
- Add error scenario mocks (500 responses, network failures)
- Follow established patterns from `billing.e2e.spec.ts` and existing onboarding tests

**Key Decisions:**
- All API interactions remain mocked via `page.route()` (no real server calls)
- Reuse existing `setupOnboardingMocks()` helper and extend with error variants
- Add `data-testid` attributes to components only if absolutely needed (prefer existing locators)
- Keep tests independent (each test sets up its own mocks/state)

**Architecture:**

```mermaid
flowchart LR
    subgraph E2E Tests
        T1[Step 1 Tests] --> PO[OnboardingPage]
        T2[Step 2 Tests] --> PO
        T3[Step 3 Tests] --> PO
        T4[Step 4 Tests] --> PO
        T5[Step 5 Tests] --> PO
        TE[Error Tests] --> PO
        TN[Navigation Tests] --> PO
    end

    PO --> BP[BasePage]
    PO --> |page.route| Mocks[API Mocks]
    Mocks --> Status[/api/onboarding/status]
    Mocks --> Progress[/api/onboarding/progress]
    Mocks --> Complete[/api/onboarding/complete]
    Mocks --> Projects[/api/projects]
    Mocks --> Campaigns[/api/campaigns]
    Mocks --> GSC[/api/gsc/connection]
```

---

## 3. Execution Phases

### Phase 1: Enhance OnboardingPage Page Object

**Files (1):**
- `tests/pages/OnboardingPage.ts` - Add missing locators and assertion methods

**Implementation:**
- [ ] Add stepper state assertions (`assertStepActive`, `assertStepCompleted`, `assertStepSkipped`)
- [ ] Add loading indicator locator
- [ ] Add validation error assertion for step 1 (project name required)
- [ ] Add `assertStep4Visible()` method (currently missing assertion for integration options)
- [ ] Add method to assert "Skip Anyway" confirmation dialog is visible
- [ ] Add `waitForApiCall(pattern)` helper to verify API request payloads

**Tests Required:**
N/A - Page object enhancement, verified by usage in Phase 2.

**User Verification:**
- Action: Import OnboardingPage and call new methods in a test
- Expected: TypeScript compiles, locators resolve correctly

---

### Phase 2: Step 1 - Project Creation Tests

**Files (1):**
- `tests/e2e/onboarding.e2e.spec.ts` - Add new test group for step 1

**Implementation:**
- [ ] Test: form validation - empty name shows disabled button (already exists, keep)
- [ ] Test: form validation - project name too long (>100 chars) shows error
- [ ] Test: form validation - invalid domain URL shows error
- [ ] Test: valid domain normalization - "example.com" gets normalized to "https://example.com"
- [ ] Test: API payload verification - POST /api/projects receives correct name + domain
- [ ] Test: API error handling - server returns 500, user sees error state
- [ ] Test: stepper shows step 1 as active, steps 2-5 as pending

**Tests Required:**
| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| `onboarding.e2e.spec.ts` | `should show validation error for name > 100 chars` | Validation error visible, button disabled |
| `onboarding.e2e.spec.ts` | `should show validation error for invalid domain` | Domain error message visible |
| `onboarding.e2e.spec.ts` | `should verify POST /api/projects payload` | Request body contains name + domain |
| `onboarding.e2e.spec.ts` | `should show error when project creation fails` | Error message or toast visible |
| `onboarding.e2e.spec.ts` | `should show step 1 as active in stepper` | Step 1 indicator has active state |

**Verification Plan:**
1. `yarn test:e2e --grep "Step 1"` passes
2. Tests verify both happy path and error scenarios

---

### Phase 3: Step 2 (GSC) + Step 3 (Keywords) Enhanced Tests

**Files (1):**
- `tests/e2e/onboarding.e2e.spec.ts` - Add enhanced tests for steps 2 and 3

**Implementation:**
- [ ] Test: Step 2 - "Skip for now" shows confirmation dialog before skipping
- [ ] Test: Step 2 - stepper updates to show step 2 as skipped after skip
- [ ] Test: Step 2 - Connect GSC button initiates OAuth flow (mock redirect)
- [ ] Test: Step 3 - empty keywords disables submit button
- [ ] Test: Step 3 - keywords count badge updates as user types
- [ ] Test: Step 3 - POST /api/campaigns receives correct keywords
- [ ] Test: Step 3 - campaign creation failure shows error
- [ ] Test: Step 3 - comma and newline separated keywords both work

**Tests Required:**
| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| `onboarding.e2e.spec.ts` | `should show skip confirmation dialog on step 2` | "Skip Anyway" button visible |
| `onboarding.e2e.spec.ts` | `should show step 2 as skipped in stepper after skip` | Stepper step 2 has skipped indicator |
| `onboarding.e2e.spec.ts` | `should disable submit when keywords are empty` | Create Campaign button disabled |
| `onboarding.e2e.spec.ts` | `should verify POST /api/campaigns payload` | Request body contains keywords array |
| `onboarding.e2e.spec.ts` | `should show error when campaign creation fails` | Error message visible |
| `onboarding.e2e.spec.ts` | `should parse comma and newline separated keywords` | Keyword count shows correct number |

**Verification Plan:**
1. `yarn test:e2e --grep "Step 2\|Step 3"` passes
2. API payload verification confirms correct data shape

---

### Phase 4: Step 4 (Integrations) + Step 5 (Completion) Enhanced Tests

**Files (1):**
- `tests/e2e/onboarding.e2e.spec.ts` - Add enhanced tests for steps 4 and 5

**Implementation:**
- [ ] Test: Step 4 - shows WordPress and Webhook integration options
- [ ] Test: Step 4 - selecting WordPress shows form fields (name, URL, username, password)
- [ ] Test: Step 4 - skip confirmation dialog on step 4
- [ ] Test: Step 5 - summary shows completed/skipped steps with correct icons
- [ ] Test: Step 5 - "Go to Dashboard" button calls POST /api/onboarding/complete
- [ ] Test: Step 5 - clicking "Go to Dashboard" closes wizard modal

**Tests Required:**
| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| `onboarding.e2e.spec.ts` | `should show WordPress and Webhook options on step 4` | Both option cards visible |
| `onboarding.e2e.spec.ts` | `should show form fields when WordPress selected` | Name, URL, username, password fields visible |
| `onboarding.e2e.spec.ts` | `should show completion summary with correct step states` | Completed checkmarks, skipped indicators |
| `onboarding.e2e.spec.ts` | `should call complete API when clicking Go to Dashboard` | POST /api/onboarding/complete intercepted |
| `onboarding.e2e.spec.ts` | `should close wizard after completion` | Modal no longer visible |

**Verification Plan:**
1. `yarn test:e2e --grep "Step 4\|Step 5"` passes
2. Complete endpoint called with correct method

---

### Phase 5: Navigation + Full Flow Tests

**Files (1):**
- `tests/e2e/onboarding.e2e.spec.ts` - Add navigation and full flow tests

**Implementation:**
- [ ] Test: back button navigates to previous step content
- [ ] Test: back button from step 3 shows step 2 content (not step 1)
- [ ] Test: no back button on step 5 (completion)
- [ ] Test: close button behavior - allowed after step 1 complete
- [ ] Test: full happy path - complete all 5 steps without skipping
- [ ] Test: full path with all skips - skip optional steps (2 + 4)
- [ ] Test: resume at step 3 - mock status with currentStep=3, completedSteps=[1,2]

**Tests Required:**
| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| `onboarding.e2e.spec.ts` | `should navigate back from step 3 to step 2` | Step 2 content visible after back |
| `onboarding.e2e.spec.ts` | `should not show back button on completion step` | Back button hidden |
| `onboarding.e2e.spec.ts` | `should complete full flow without skipping` | All steps completed, completion screen shown |
| `onboarding.e2e.spec.ts` | `should complete flow with all optional steps skipped` | Steps 2,4 skipped, completion shown |
| `onboarding.e2e.spec.ts` | `should resume onboarding at step 3` | Step 3 content visible on load |

**Verification Plan:**
1. `yarn test:e2e --grep "Navigation\|Full Flow"` passes
2. Full flow test exercises all 5 steps end-to-end

---

## 4. Checkpoint Protocol

After each phase, run:
```bash
# Automated checkpoint
yarn verify          # Type checking + lint
yarn test:e2e --grep "Onboarding"  # E2E tests
```

Spawn `prd-work-reviewer` agent after each phase.

---

## 5. Mock Strategy Reference

### Existing Mocks (from `setupOnboardingMocks`)
| Route | Method | Response |
|-------|--------|----------|
| `/api/onboarding/status` | GET | `{onboarding: {isComplete: false, currentStep: 1}}` |
| `/api/projects` | POST | `{data: {project: mockCreatedProject}}` |
| `/api/onboarding/progress` | PUT | `{onboarding: {isComplete: false, currentStep: 2}}` |
| `/api/campaigns` | POST | `{data: {campaign: mockCreatedCampaign}}` |
| `/api/onboarding/complete` | POST | `{onboarding: {isComplete: true, currentStep: 5}}` |
| `/api/gsc/connection` | GET | `{connection: null}` |

### New Mocks Needed
| Route | Method | Scenario | Response |
|-------|--------|----------|----------|
| `/api/projects` | POST | Error scenario | `{error: {message: "Server error"}}` (500) |
| `/api/campaigns` | POST | Error scenario | `{error: {message: "Server error"}}` (500) |
| `/api/onboarding/status` | GET | Resume at step 3 | `{onboarding: {isComplete: false, currentStep: 3, completedSteps: [1,2]}}` |
| `/api/integrations/validate` | POST | WordPress validation | `{data: {valid: true}}` |

### Dynamic Progress Mock
The existing progress mock always returns step 2. For multi-step tests, use a dynamic mock:
```typescript
let currentMockStep = 1;
await page.route('**/api/onboarding/progress', async route => {
  const body = JSON.parse(route.request().postData() || '{}');
  currentMockStep = body.currentStep || currentMockStep + 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      onboarding: {
        isComplete: false,
        currentStep: currentMockStep,
        completedSteps: body.completedSteps || [],
        skippedSteps: body.skippedSteps || [],
      },
    }),
  });
});
```

---

## 6. Acceptance Criteria

- [ ] All existing 10 tests continue to pass (no regressions)
- [ ] 20+ new test cases added covering all identified gaps
- [ ] Each onboarding step has at least: happy path, validation, error handling
- [ ] API payload verification for key endpoints (projects, campaigns, complete)
- [ ] Navigation tests cover back/forward/skip/resume flows
- [ ] Full end-to-end flow test exercises all 5 steps
- [ ] `yarn verify` passes
- [ ] All automated checkpoint reviews passed
