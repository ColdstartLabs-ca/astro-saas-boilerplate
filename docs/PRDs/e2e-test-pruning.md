# PRD: E2E Test Pruning & Fix

**Complexity: 5 → MEDIUM mode**

---

## 1. Context

**Problem:** 18 E2E test files with significant redundancy, low-value tests, and 7 broken files that need fixing.

**Files Analyzed:** All 18 files in `tests/e2e/`, plus `tests/test-fixtures.ts`, `tests/pages/BillingPage.ts`, `tests/pages/ArticlesPage.ts`, `tests/pages/CampaignsPage.ts`.

**Current State:**
- 18 E2E spec files totaling ~8,000+ lines
- 3 billing test files with heavy overlap
- `help.e2e.spec.ts` overlaps with `settings-support.e2e.spec.ts`
- `critical-path.e2e.spec.ts` duplicates campaigns/articles tests with near-worthless assertions
- Several tests use `.catch(() => false)` or always-true assertions, making them no-ops
- 7 files actively broken with Playwright errors

---

## 2. Solution

**Approach:**
- Delete redundant/low-value test files entirely (3 files)
- Consolidate overlapping test coverage where possible
- Fix the remaining broken tests with targeted selector/assertion fixes
- Remove always-passing no-op tests

**Key Decisions:**
- Keep `billing.e2e.spec.ts` + `dashboard-billing.e2e.spec.ts` (different scopes: public pricing vs authenticated billing dashboard), delete `billing-flow.e2e.spec.ts` (redundant)
- Delete `critical-path.e2e.spec.ts` entirely (weak assertions, duplicates campaigns + articles)
- Delete `help.e2e.spec.ts` (covered by `settings-support.e2e.spec.ts`)
- Fix broken tests by addressing strict mode violations and stale content assertions

---

## 3. Detailed Analysis

### Files to DELETE (3 files, ~1,000 lines removed)

| File | Lines | Reason |
|------|-------|--------|
| `billing-flow.e2e.spec.ts` | 309 | Overlaps `billing.e2e.spec.ts` (pricing page) + `dashboard-billing.e2e.spec.ts` (credit balance). Has always-passing test: `expect(isWarningVisible \|\| !hasAnyToast \|\| true).toBe(true)` |
| `critical-path.e2e.spec.ts` | 494 | Every test just checks "body has text" and "page loaded". Duplicates campaigns + articles navigation with worthless assertions |
| `help.e2e.spec.ts` | 189 | Fully covered by `settings-support.e2e.spec.ts` which tests the same `/help` page with better assertions |

### Files to FIX (7 files)

#### 3.1 `blog.e2e.spec.ts` — 3 failures / 6 passing

**Root cause:** Strict mode violations — `page.locator('h1')` resolves to 2 elements (blog post has h1 in both header and article body after recent blog redesign).

**Errors captured:**
```
Error: strict mode violation: locator('h1') resolved to 2 elements:
  1) <h1 class="font-display text-3xl..."> in header
  2) <h1>AutopilotRank vs Outrank: Feature Comparison</h1> in article body
```

**Fix direction:** Use `.first()` or scope the h1 locator to the header section: `page.locator('header h1')` or `page.locator('h1').first()`.

**Affected tests:**
- `should render blog post detail page` (line 59)
- `should have back to blog link` (line 89)
- `should render comparison post` (line 114)

---

#### 3.2 `features.e2e.spec.ts` — 3 failures / 3 passing

**Root causes:**
1. **Stale content assertions** — Feature card text has changed since tests were written. Tests check for hardcoded strings like `'Multi-Model AI Engine'`, `'24+ AI pattern'`, `'HMAC signing'`, `'8 frequency options'` that no longer match the UI.
2. **Strict mode violation** — `page.locator('a[href="/pricing"]')` resolves to 3 elements (nav, CTA section, footer).

**Errors captured:**
```
Error: strict mode violation: locator('a[href="/pricing"]') resolved to 3 elements:
  1) <a href="/pricing" ...> in nav
  2) <a href="/pricing" ...> "See Pricing" in CTA
  3) <a href="/pricing" ...> "Pricing Plans" in footer
```

**Fix direction:**
- Read the actual `/features` page content and update assertions to match current copy
- Scope the pricing link locator: `page.locator('section a[href="/pricing"]').first()` or use `getByRole('link', { name: 'See Pricing' })`

**Affected tests:**
- `should display feature cards with updated descriptions` (line 33)
- `should display How It Works section` (line 67)
- `should have CTA section with correct links` (line 83)

---

#### 3.3 `help.e2e.spec.ts` — 1 failure / 7 passing

**Root cause:** Strict mode violation — `page.locator('nav')` resolves to 2 nav elements (site nav + help page sticky nav).

**Note:** This file is marked for DELETION (redundant with `settings-support.e2e.spec.ts`). No fix needed.

---

#### 3.4 `dashboard-billing.e2e.spec.ts` — 7 failures / 24 passing

**Root causes:**
1. **Missing `{ page }` destructuring** (line 629) — Test `'should have accessible navigation elements'` declares `async () =>` but uses `page` variable, causing ReferenceError.
2. **Stale selectors** — Tests for subscription states expect specific UI elements (`data-testid="modal"`, `div[role="dialog"]`) that don't match current billing page components.
3. **Error handling tests** (lines 540-574) — Expect error states/retry buttons that may not exist in current UI.

**Fix direction:**
- Line 629: Change `async () =>` to `async ({ page }) =>`
- Subscription detail tests: Inspect actual billing page to verify selectors for plan name, status badge, cancel button
- Error handling tests: Verify if error states are rendered or remove tests if error boundary handles differently
- Cancel modal test: Check if cancel flow uses a modal or navigates to Stripe portal

**Affected tests:**
- `should show subscription details for active subscription` (line 328)
- `should display trial subscription correctly` (line 428)
- `should show error state when data fetch fails` (line 540)
- `should show retry button on error` (line 557)
- `should handle portal API error gracefully` (line 574)
- `should have accessible navigation elements` (line 629) — **BUG: missing `{ page }`**
- `should open cancel modal when clicking cancel subscription` (line 667)

---

#### 3.5 `checkout-lifecycle.e2e.spec.ts` — needs investigation

**Known issues from code review:**
- Many tests use `.catch(() => false)` patterns making them effectively no-ops (always pass regardless of UI state)
- Tests check for `data-testid` selectors on checkout success/canceled pages that may not exist
- Conditional logic masks real failures

**Fix direction:**
- Run tests and capture actual failures
- Remove `.catch(() => false)` patterns — let tests fail properly
- Verify page content for `/checkout/success`, `/checkout/canceled`, `/subscription-confirmed` routes
- Remove no-op conditional tests or replace with real assertions

---

#### 3.6 `campaigns.e2e.spec.ts` — needs investigation

**Known issues from code review:**
- `CampaignsPage` page object uses selectors like `[data-testid="campaign-card"]` and `.bg-surface.border.border-border.rounded-xl` — need to verify against actual UI
- Modal interactions reference `[data-testid="modal"]` which may not exist
- Schedule action tests may reference UI elements that have changed

**Fix direction:**
- Run tests and capture actual failures
- Compare page object selectors against actual campaign dashboard components
- Update `CampaignsPage.ts` selectors as needed

---

#### 3.7 `articles.e2e.spec.ts` — needs investigation

**Known issues from code review:**
- Heavy reliance on `data-testid` selectors: `article-card`, `articles-list`, `article-detail-panel`, `article-status-badge`
- 998 lines — many assertions may reference UI that has changed
- Similar pattern to campaigns — page object may have stale selectors

**Fix direction:**
- Run tests and capture actual failures
- Compare `ArticlesPage.ts` selectors against actual articles dashboard components
- Update page object and test assertions

---

### Low-Value Tests to Clean Up (within kept files)

| File | Test | Issue |
|------|------|-------|
| `landing.e2e.spec.ts` | `should load and render content` | Near-duplicate of `should have page structure` |
| `landing.e2e.spec.ts` | `landing page snapshot` | Just checks `screenshot.byteLength > 0` — no value |
| `features.e2e.spec.ts` | `features page snapshot` | Same — just checks byte length |
| `checkout-lifecycle.e2e.spec.ts` | Multiple tests | `.catch(() => false)` no-op patterns |

---

## 4. Execution Phases

### Phase 1: Delete Redundant Files

**Files:**
- `tests/e2e/billing-flow.e2e.spec.ts` — DELETE
- `tests/e2e/critical-path.e2e.spec.ts` — DELETE
- `tests/e2e/help.e2e.spec.ts` — DELETE

**Implementation:**
- [ ] Delete the 3 files
- [ ] Run remaining E2E tests to confirm no regressions

**Verification:**
- Remaining tests still pass (no shared dependencies)

---

### Phase 2: Fix `blog.e2e.spec.ts`

**Files:**
- `tests/e2e/blog.e2e.spec.ts`

**Implementation:**
- [ ] Fix all `page.locator('h1')` to `page.locator('h1').first()` or scope to header
- [ ] Remove `landing page snapshot`-style worthless tests if present
- [ ] Verify blog post slugs still exist

**Verification:**
- `npx playwright test tests/e2e/blog.e2e.spec.ts` — all pass

---

### Phase 3: Fix `features.e2e.spec.ts`

**Files:**
- `tests/e2e/features.e2e.spec.ts`
- `src/pages/features.astro` (read only — to get current content)

**Implementation:**
- [ ] Read actual features page to get current copy
- [ ] Update feature card text assertions to match current content
- [ ] Fix `a[href="/pricing"]` strict mode: scope or use `.first()`
- [ ] Remove `features page snapshot` test (no value)

**Verification:**
- `npx playwright test tests/e2e/features.e2e.spec.ts` — all pass

---

### Phase 4: Fix `dashboard-billing.e2e.spec.ts`

**Files:**
- `tests/e2e/dashboard-billing.e2e.spec.ts`
- Billing dashboard React components (read only — to verify selectors)

**Implementation:**
- [ ] Fix line 629: `async () =>` → `async ({ page }) =>`
- [ ] Inspect actual billing page components to verify selectors
- [ ] Fix subscription detail test selectors
- [ ] Fix/remove error handling tests if UI handles errors differently
- [ ] Fix cancel modal test — verify if cancel uses modal or Stripe portal redirect

**Verification:**
- `npx playwright test tests/e2e/dashboard-billing.e2e.spec.ts` — all pass

---

### Phase 5: Fix `checkout-lifecycle.e2e.spec.ts`

**Files:**
- `tests/e2e/checkout-lifecycle.e2e.spec.ts`
- Checkout page components (read only)

**Implementation:**
- [ ] Run tests and capture actual errors
- [ ] Remove `.catch(() => false)` no-op patterns
- [ ] Fix selectors to match actual checkout/success/canceled pages
- [ ] Remove always-passing conditional tests

**Verification:**
- `npx playwright test tests/e2e/checkout-lifecycle.e2e.spec.ts` — all pass

---

### Phase 6: Fix `campaigns.e2e.spec.ts`

**Files:**
- `tests/e2e/campaigns.e2e.spec.ts`
- `tests/pages/CampaignsPage.ts`
- Campaign dashboard React components (read only)

**Implementation:**
- [ ] Run tests and capture actual errors
- [ ] Inspect actual campaign dashboard to verify selectors
- [ ] Update `CampaignsPage.ts` page object selectors as needed
- [ ] Fix test assertions

**Verification:**
- `npx playwright test tests/e2e/campaigns.e2e.spec.ts` — all pass

---

### Phase 7: Fix `articles.e2e.spec.ts`

**Files:**
- `tests/e2e/articles.e2e.spec.ts`
- `tests/pages/ArticlesPage.ts`
- Articles dashboard React components (read only)

**Implementation:**
- [ ] Run tests and capture actual errors
- [ ] Inspect actual articles dashboard to verify selectors
- [ ] Update `ArticlesPage.ts` page object selectors as needed
- [ ] Fix test assertions

**Verification:**
- `npx playwright test tests/e2e/articles.e2e.spec.ts` — all pass

---

### Phase 8: Clean Up Low-Value Tests

**Files:**
- `tests/e2e/landing.e2e.spec.ts`

**Implementation:**
- [ ] Remove `should load and render content` (duplicate of `should have page structure`)
- [ ] Remove `landing page snapshot` test (worthless — just checks byte length)

**Verification:**
- `npx playwright test tests/e2e/landing.e2e.spec.ts` — remaining tests pass

---

## 5. Acceptance Criteria

- [ ] 3 redundant files deleted (~1,000 lines removed)
- [ ] All 7 broken test files pass
- [ ] No-op/always-passing tests removed
- [ ] Low-value snapshot tests removed
- [ ] `npx playwright test` runs all remaining E2E tests successfully
- [ ] `yarn verify` passes

## 6. Summary

| Action | Files | Lines Removed |
|--------|-------|---------------|
| DELETE redundant | 3 | ~1,000 |
| FIX broken | 7 | net ~0 (edits) |
| CLEAN low-value | 2 | ~30 |
| **Total** | **12 touched** | **~1,030 removed** |
