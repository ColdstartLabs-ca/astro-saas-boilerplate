# PRD: Code Quality Refactoring Report (API + Client)

**Date:** 2026-02-15  
**Owner:** Night Watch  
**Scope:** `server/`, `client/`, `shared/`, `src/` (quality-impacting seams)

---

## Context
AutopilotRank has grown quickly and now has clear quality hotspots across both API and client layers. Core compile and build steps pass, but maintainability, architectural boundaries, and test reliability have started to regress in ways that increase release risk.

This PRD defines the current quality baseline, highlights critical findings, and proposes a phased refactoring plan that preserves feature delivery velocity while reducing defect risk.

## Problem
The current codebase shows four compounding quality risks:

1. **Architecture drift** between client and server boundaries.
2. **Test reliability gaps** in critical service suites.
3. **High component/service complexity** in key execution paths.
4. **Operational quality debt** (lint/i18n debt, large bundles, warning-heavy builds).

## Goals
- Restore a reliable quality baseline for API and client.
- Remove client-to-server import leakage.
- Reduce high-risk complexity in largest modules.
- Make failing unit suites green and resilient to query-chain changes.
- Establish objective acceptance criteria for quality gates.

## Non-Goals
- Full redesign of product UX.
- Rewriting all legacy modules in one milestone.
- Replacing existing testing stack/tooling.

---

## Current Baseline (Measured)

### 1. Typecheck / Build / Test
- `npm run tsc`: **PASS**
- `npm run build`: **PASS with warnings**
- `npm run test:unit`: **FAIL**
  - `12` failed tests, `2580` passed, `14` skipped

### 2. Lint Snapshot
- Total warnings: **766**
- Area breakdown:
  - `client`: **736**
  - `server`: **29**
  - `shared`: **1**
- Top warning rules:
  - `i18next/no-literal-string`: **730**
  - `@typescript-eslint/no-explicit-any`: **25**
  - `react-hooks/exhaustive-deps`: **6**

### 3. Complexity / Size Hotspots
- `server/services/campaign.service.ts`: 1442 LOC
- `server/controllers/CronController.ts`: 877 LOC
- `server/controllers/AdminController.ts`: 827 LOC
- `client/components/dashboard/views/NewCampaignModal.tsx`: 927 LOC
- `client/components/articles/ArticleList.tsx`: 800 LOC

Targeted complexity checks flagged:
- `NewCampaignModal`: complexity `62`
- `ArticleList`: complexity `46`
- `CampaignService.update`: complexity `42`
- Multiple API controller methods > `15`

### 4. Bundle Hotspots (Build Output)
Largest generated client chunks include:
- `index.*.js`: ~1.04 MB
- `CampaignsPageClient.*.js`: ~0.39 MB
- `GlobalUI.*.js`: ~0.21 MB

---

## Findings (Prioritized)

### P0
1. **Client imports server modules (boundary violation).**
- `client/components/admin/blog/BlogPostForm.tsx` imports `generateSlug` from `@server/services/blog.service`.
- `client/services/stripeService.ts` imports from `@server/supabase/supabaseClient`.
- Impact: bundling fragility, accidental server-only dependency bleed, architectural inconsistency.

2. **Unit test baseline is red in critical API services.**
- `tests/unit/services/webhook-event.service.unit.spec.ts`: 11 failing tests.
- `tests/unit/server/services/opportunity-performance.service.unit.spec.ts`: 1 failing test.
- Root issue pattern: brittle Supabase fluent-chain mocks diverged from service query shape.

### P1
3. **Admin users search semantics are incorrect under pagination.**
- Current flow paginates profiles first, then filters email in-memory.
- Reported `total` does not represent post-filter rows.

4. **Bulk article actions can report false success.**
- Bulk approve/reject checks only promise rejection, not `response.ok`.
- HTTP 4xx/5xx responses can be misclassified as success.

5. **Opportunity no-GSC path can mask DB update failure.**
- `checkPerformance` no-GSC branch updates DB but does not validate update error before returning success.

6. **Campaign generation still has post-RPC consistency gaps.**
- Atomic RPC is used for article+credit creation, but follow-up keyword/campaign state transitions remain outside the same transaction.

### P2
7. **i18n circular dependency warning in build.**
- `src/i18n/utils.ts` re-exports client hook.
- `client/hooks/useTranslations.ts` imports from `src/i18n/utils.ts`.
- Build warns about chunk-level circular dependency and potential execution-order issues.

8. **Hook dependency warnings indicate stale-state risk.**
- Reported in `ArticleDetailModal`, `BillingPageClient`, `ProjectOnboarding`, and `CampaignIntegrationsSection`.

9. **High client i18n literal-string debt.**
- 730 warnings concentrated in UI-heavy files and admin flows.

### P3
10. **Large bundle warnings require chunking strategy improvements.**
- Several route bundles exceed practical size targets, affecting initial load and cache churn.

---

## Refactoring Strategy

## Phase 1: Stabilize Correctness Baseline (P0)
**Objective:** Make tests reliable and stop cross-layer leakage.

### API
- Fix failing unit suites:
  - `tests/unit/services/webhook-event.service.unit.spec.ts`
  - `tests/unit/server/services/opportunity-performance.service.unit.spec.ts`
- Introduce shared fluent-query mock helpers for Supabase chains (`select`, `eq`, `in`, `update`, `single`, `maybeSingle`, etc.).

### Client
- Remove `@server/*` imports from `client/**`.
- Move shared utility logic/types to `shared/**`.
- Add import boundary lint rule to block future regressions.

### Exit Criteria
- Unit tests green for targeted suites.
- No `@server/*` imports remain in `client/**`.
- CI gate includes boundary-lint enforcement.

---

## Phase 2: Fix Runtime Quality Risks (P1)
**Objective:** Eliminate misleading success states and inconsistent data behavior.

### API
- Correct admin users search query flow: search-first then paginate, with accurate `total` semantics.
- Validate update errors in `OpportunityPerformanceService` no-GSC branch.
- Fold campaign keyword/campaign state transitions into transactional flow where feasible.

### Client
- Refactor bulk approve/reject flow to evaluate `response.ok` per request.
- Add structured error aggregation and UI feedback for partial failures.

### Exit Criteria
- Admin search returns consistent `users` + `total` under filters.
- Opportunity no-GSC path cannot silently report success on failed update.
- Bulk actions surface true success/failure counts.

---

## Phase 3: Reduce Complexity in Core Modules (P1/P2)
**Objective:** Improve maintainability and reduce bug density in hotspot files.

### API Targets
- Split `CampaignService` into use-case services:
  - campaign lifecycle
  - keyword management
  - scheduling execution
- Split `CronController` into route-specific handlers.
- Split `AdminController` into stats/users/subscription/failure-metrics handlers.

### Client Targets
- Decompose `NewCampaignModal` into step components + orchestration hook.
- Decompose `ArticleList` into:
  - filters/persistence hook
  - bulk actions hook
  - table row/presentational components

### Exit Criteria
- No single target file > 700 LOC.
- Target hotspot functions under complexity threshold 15-20.
- Existing behavior preserved with regression tests.

---

## Phase 4: i18n + Hook Hygiene (P2)
**Objective:** Reduce lint debt and stale-render risks.

### Work
- Resolve `useTranslations` cycle by extracting shared translation core and one-way imports.
- Address `react-hooks/exhaustive-deps` warnings with stable callbacks/memoization.
- Prioritize i18n literal extraction in top 10 offender files.

### Exit Criteria
- No circular i18n warning in build.
- `react-hooks/exhaustive-deps` warnings = 0.
- `i18next/no-literal-string` reduced by at least 60% in first pass.

---

## Phase 5: Bundle Optimization (P3)
**Objective:** Reduce oversized client chunks and improve load performance.

### Work
- Add route-level dynamic imports for heavy dashboard/admin sections.
- Tune `manualChunks` strategy for translation/utility/vendor split.
- Re-check largest chunks and LCP-impacting routes.

### Exit Criteria
- Largest chunk under 700 KB (minified) target.
- Dashboard routes show reduced initial JS payload.

---

## Acceptance Criteria (Program-Level)
1. `npm run tsc` passes.
2. `npm run test:unit` passes.
3. No `@server/*` imports from `client/**`.
4. No i18n circular warning in build output.
5. Top hotspot files are decomposed and complexity reduced.
6. Lint warnings reduced from current baseline by at least 50%.

---

## Risks
- Refactor scope may compete with feature delivery timelines.
- Service decomposition can introduce temporary regressions without tight test coverage.
- i18n extraction is labor-intensive and may require copy/content review.

## Mitigations
- Execute in small PR slices per phase.
- Keep high-risk behavior behind regression tests before/after each refactor.
- Use strict rollout sequencing: baseline -> correctness -> decomposition -> optimization.

---

## Suggested Execution Order
1. Phase 1 (baseline + boundaries)
2. Phase 2 (runtime correctness)
3. Phase 3 (complexity split)
4. Phase 4 (i18n/hook hygiene)
5. Phase 5 (bundle optimization)

---

## Open Questions
1. Should `i18next/no-literal-string` be enforced strictly in all admin/internal views, or phased by route?
2. What bundle-size budget should be hard-failed in CI?
3. Do we want a temporary exception window for legacy modules while Phase 3 is in progress?
