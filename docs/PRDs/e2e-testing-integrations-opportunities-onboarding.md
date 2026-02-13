# PRD: E2E Testing Plan for Integrations, Opportunities & Onboarding

`Complexity: 8 → HIGH mode`

---

## 1. Context

**Problem:** The Integrations (WordPress/Webhook), Opportunities (GSC-powered SEO analysis), and Onboarding (5-step wizard) features have unit test coverage but zero E2E, API, or integration tests. This creates a coverage gap for user-facing flows, API contracts, and database integrity.

**Files Analyzed:** 50+ files across server/services, src/pages/api, client/components, shared/types, tests/

**Current E2E/API Test Coverage:**
| Feature | Unit Tests | API Tests | E2E Tests | Integration Tests |
|---------|-----------|-----------|-----------|-------------------|
| Integrations | 10 files | 0 | 0 | 0 |
| Opportunities | 2 files | 0 | 0 | 0 |
| Onboarding | 4 files | 1 file (existing) | 0 | 1 file (existing) |
| GSC | 0 | 0 | 0 | 0 |

---

## 2. Solution

**Approach:**
- Create 3 new page objects extending BasePage for E2E tests
- Write 4 API test files covering all 21 API endpoints
- Write 3 E2E test files for user-facing flows
- Write 3 integration test files for database operations and cross-service flows
- Reuse existing TestContext, ApiClient, and BasePage infrastructure

**Key Decisions:**
- API tests seed data directly via `supabaseAdmin` (avoids external service calls during tests)
- E2E tests mock API responses via `page.route()` for GSC/external-dependent flows
- Follow existing patterns from `tests/api/onboarding.api.spec.ts` and `tests/e2e/billing.e2e.spec.ts`

---

## 3. Execution Phases

### Phase 1: Page Objects (Foundation)

**Files (3):**
- `tests/pages/IntegrationsPage.ts` - Page object for /dashboard/integrations
- `tests/pages/OpportunitiesPage.ts` - Page object for /dashboard/opportunities
- `tests/pages/OnboardingPage.ts` - Page object for onboarding wizard

**Implementation:**
- [ ] Extend `BasePage` from `tests/pages/BasePage.ts`
- [ ] Add navigation helpers (goto, waitForLoad)
- [ ] Add locators for key UI elements (cards, modals, forms, buttons)
- [ ] Add interaction methods (fill forms, click actions, filter/search)
- [ ] Add assertion methods (assertExists, assertStatus, assertCount)

**Verification:**
- TypeScript compiles: `npx tsc --noEmit tests/pages/IntegrationsPage.ts`
- Imported successfully in a scratch test

---

### Phase 2: Integrations API Tests

**Files (2):**
- `tests/api/integrations.api.spec.ts` - CRUD + connection test endpoints
- `tests/api/integrations-campaign.api.spec.ts` - Campaign assignment + delivery endpoints

**Test Cases (integrations.api.spec.ts):**

| Describe | Test | Assertion |
|----------|------|-----------|
| GET /api/integrations | should reject unauthenticated | 401 |
| GET /api/integrations | should return empty list | 200, [] |
| GET /api/integrations | should return user integrations | 200, array with items |
| GET /api/integrations | should not return encrypted_credentials | no credentials field |
| POST /api/integrations | should create WordPress integration | 201, type=wordpress |
| POST /api/integrations | should create webhook integration | 201, type=webhook |
| POST /api/integrations | should validate required fields | 400 |
| POST /api/integrations | should reject invalid URL | 400 |
| POST /api/integrations | should reject unknown type | 400 |
| GET /api/integrations/:id | should return by ID | 200 |
| GET /api/integrations/:id | should 404 for other user | 404 |
| PUT /api/integrations/:id | should update name | 200 |
| DELETE /api/integrations/:id | should delete | 204 |
| POST /api/integrations/:id/test | should test connection | 200, result |

**Test Cases (integrations-campaign.api.spec.ts):**

| Describe | Test | Assertion |
|----------|------|-----------|
| GET /api/campaigns/:id/integrations | should return assigned integrations | 200 |
| GET /api/campaigns/:id/integrations | should include autoPublish flag | boolean field |
| PUT /api/campaigns/:id/integrations | should assign integrations | 200 |
| PUT /api/campaigns/:id/integrations | should update autoPublish | 200 |
| PUT /api/campaigns/:id/integrations | should reject other user's integrations | 400/404 |
| POST /api/articles/:id/deliver | should trigger delivery | 200 |
| POST /api/articles/:id/deliver | should support retry flag | 200 |
| GET /api/articles/:id/deliveries | should return delivery records | 200 |

**Verification:**
```bash
npx playwright test tests/api/integrations.api.spec.ts --project api
npx playwright test tests/api/integrations-campaign.api.spec.ts --project api
```

---

### Phase 3: Opportunities & GSC API Tests

**Files (2):**
- `tests/api/opportunities.api.spec.ts` - Opportunities list, detail, update, create-article
- `tests/api/gsc.api.spec.ts` - GSC connection management endpoints

**Test Cases (opportunities.api.spec.ts):**

| Describe | Test | Assertion |
|----------|------|-----------|
| GET /api/opportunities | should reject unauthenticated | 401 |
| GET /api/opportunities | should require projectId | 400 |
| GET /api/opportunities | should return paginated list | 200, pagination |
| GET /api/opportunities | should filter by category | filtered results |
| GET /api/opportunities | should filter by status | filtered results |
| GET /api/opportunities | should filter by type | filtered results |
| GET /api/opportunities | should search by text | matching results |
| GET /api/opportunities | should sort by priority desc | ordered results |
| GET /api/opportunities/:id | should return by ID | 200 |
| GET /api/opportunities/:id | should 404 for other user | 404 |
| PATCH /api/opportunities | should update status | 200 |
| PATCH /api/opportunities | should reject invalid status | 400 |
| POST /api/opportunities/:id/create-article | should create campaign | 200, campaignId |
| POST /api/opportunities/:id/create-article | should reject non-content type | 400 |
| POST /api/opportunities/:id/create-article | should update opportunity status | in_progress |

**Test Cases (gsc.api.spec.ts):**

| Describe | Test | Assertion |
|----------|------|-----------|
| POST /api/gsc/connect | should reject unauthenticated | 401 |
| POST /api/gsc/connect | should require projectId | 400 |
| POST /api/gsc/connect | should return authUrl | 200, authUrl |
| GET /api/gsc/connections | should return connections without tokens | no access_token |
| DELETE /api/gsc/connections/:id | should delete connection | 200/204 |
| DELETE /api/gsc/connections/:id | should 404 for other user | 404 |
| GET /api/gsc/connections/:id/sites | should 404 for non-existent | 404 |

**Verification:**
```bash
npx playwright test tests/api/opportunities.api.spec.ts --project api
npx playwright test tests/api/gsc.api.spec.ts --project api
```

---

### Phase 4: E2E Tests (Browser Flows)

**Files (3):**
- `tests/e2e/integrations.e2e.spec.ts` - Integration CRUD UI flows
- `tests/e2e/opportunities.e2e.spec.ts` - Opportunities browsing/filtering UI
- `tests/e2e/onboarding.e2e.spec.ts` - Full onboarding wizard journey

**Test Cases (integrations.e2e.spec.ts):**

| Describe | Test |
|----------|------|
| Empty State | should display empty state with Add button |
| Create Flow | should open modal and show type selection |
| Create Flow | should fill WordPress form and submit |
| Create Flow | should fill Webhook form and submit |
| Create Flow | should show validation errors |
| Create Flow | should show success toast |
| Management | should display integration cards with status |
| Management | should delete with confirmation |
| Test Connection | should show loading and result |

**Test Cases (opportunities.e2e.spec.ts):**

| Describe | Test |
|----------|------|
| Empty State | should show GSC connection card |
| List | should display opportunities with badges |
| Filtering | should filter by category |
| Filtering | should search opportunities |
| Detail Panel | should open on click |
| Detail Panel | should show metrics and actions |
| Detail Panel | should close on escape |

**Test Cases (onboarding.e2e.spec.ts):**

| Describe | Test |
|----------|------|
| Stepper | should display 5-step stepper |
| Step 1 | should show project creation form |
| Step 1 | should validate required fields |
| Step 1 | should advance to step 2 |
| Step 2 (Optional) | should allow skipping |
| Step 3 | should show keywords input |
| Step 4 (Optional) | should allow skipping |
| Step 5 | should show completion with dashboard link |
| Auto-complete | should skip wizard for users with projects |

**Verification:**
```bash
npx playwright test tests/e2e/integrations.e2e.spec.ts --project chromium
npx playwright test tests/e2e/opportunities.e2e.spec.ts --project chromium
npx playwright test tests/e2e/onboarding.e2e.spec.ts --project chromium
```

---

### Phase 5: Integration Tests (Database & Cross-Service)

**Files (3):**
- `tests/integration/integrations.integration.spec.ts` - Encryption, cascading deletes, RLS
- `tests/integration/opportunities.integration.spec.ts` - Opportunity CRUD, GSC snapshots, RLS
- `tests/integration/onboarding-autocompletion.integration.spec.ts` - Auto-complete edge case

**Test Cases (integrations.integration.spec.ts):**

| Test | Assertion |
|------|-----------|
| should store encrypted credentials | not plaintext |
| should cascade delete campaign_integrations | junction records removed |
| should cascade delete integration_deliveries | delivery records removed |
| RLS: user can read own integrations | data returned |
| RLS: user cannot read other user integrations | empty/error |

**Test Cases (opportunities.integration.spec.ts):**

| Test | Assertion |
|------|-----------|
| should enforce priority_score range 0-100 | constraint error |
| should enforce type CHECK constraint | constraint error |
| RLS: user can read own opportunities | data returned |
| RLS: user cannot read other user opportunities | empty/error |
| should update opportunity status when article created | in_progress |

**Test Cases (onboarding-autocompletion.integration.spec.ts):**

| Test | Assertion |
|------|-----------|
| should start at step 1 for new user | currentStep=1, isComplete=false |
| should auto-complete for user with existing projects | isComplete=true, currentStep=5 |
| should handle unique constraint violation | returns existing record |

**Verification:**
```bash
npx playwright test tests/integration/integrations.integration.spec.ts --project integration
npx playwright test tests/integration/opportunities.integration.spec.ts --project integration
npx playwright test tests/integration/onboarding-autocompletion.integration.spec.ts --project integration
```

---

## 4. Dependency Graph

```
Phase 1 (Page Objects) ──────────────────> Phase 4 (E2E Tests)
Phase 2 (Integrations API) ─ independent
Phase 3 (Opportunities API) ─ independent
Phase 2+3 patterns ──────────────────────> Phase 5 (Integration Tests)
```

Phases 1, 2, 3 can run in parallel. Phase 4 depends on Phase 1. Phase 5 depends on patterns from 2+3.

---

## 5. Test Data Strategy

- **API Tests**: `TestContext.createUser()` + direct DB seeding via `supabaseAdmin`
- **E2E Tests**: Authenticated fixtures + `page.route()` mocks for API responses
- **Integration Tests**: `TestContext` + `supabaseAdmin` for direct DB operations

---

## 6. Critical Files to Reuse

| File | Purpose |
|------|---------|
| `tests/pages/BasePage.ts` | Base class for all 3 new page objects |
| `tests/helpers/test-context.ts` | User/resource lifecycle management |
| `tests/helpers/api-client.ts` | Fluent API assertions |
| `tests/api/onboarding.api.spec.ts` | Canonical API test pattern |
| `tests/e2e/billing.e2e.spec.ts` | Canonical E2E test pattern |
| `tests/integration/onboarding.integration.spec.ts` | Canonical integration test pattern |

---

## 7. Acceptance Criteria

- [ ] All 13 new test files created
- [ ] All API endpoints have auth + validation + happy path + error tests
- [ ] All E2E tests pass in chromium project
- [ ] All integration tests pass with single worker
- [ ] `yarn verify` passes
- [ ] No existing tests broken

---

## 8. Total Test Count Estimate

| Category | Files | Estimated Tests |
|----------|-------|-----------------|
| Page Objects | 3 | 0 (infrastructure) |
| API Tests | 4 | ~55 |
| E2E Tests | 3 | ~30 |
| Integration Tests | 3 | ~20 |
| **Total** | **13** | **~105 tests** |
