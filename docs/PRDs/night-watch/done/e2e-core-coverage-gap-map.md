# PRD: Core App E2E Coverage Gap Map

## Context

Current browser E2E coverage exists for landing, auth modal behavior, onboarding, integrations, opportunities, and pricing interactions. However, several enabled core routes and conversion-critical flows are not covered by browser E2E tests.

This PRD defines the uncovered surface and a prioritized plan to close the highest-risk gaps.

## Problem

Regression risk is concentrated in core dashboard and conversion paths that currently have no direct browser E2E coverage or only smoke-level localization checks.

## Goals

- Map enabled core app routes to current browser E2E coverage.
- Define the uncovered routes/features that must receive E2E tests.
- Prioritize implementation by user/business risk.
- Establish clear acceptance criteria for coverage completion.

## Non-Goals

- Replacing API/integration/unit suites.
- Full exhaustive edge-case testing in E2E.
- Covering disabled routes (`/dashboard/keywords`, `/dashboard/optimization`, `/dashboard/calendar`, `/dashboard/backlinks`, `/dashboard/analytics`) until enabled.

## Current Coverage (Browser E2E)

- `tests/e2e/landing.e2e.spec.ts`
- `tests/e2e/auth.e2e.spec.ts`
- `tests/e2e/billing.e2e.spec.ts` (primarily `/pricing` behavior)
- `tests/e2e/onboarding.e2e.spec.ts`
- `tests/e2e/integrations.e2e.spec.ts`
- `tests/e2e/opportunities.e2e.spec.ts`
- `tests/e2e/auth/localized.spec.ts`
- `tests/e2e/dashboard/localized.spec.ts` (localized smoke checks)

## Uncovered Core Areas Requiring E2E

### P0 (Highest Priority)

1. Campaigns core flow

- Routes: `/dashboard/campaigns`, `/dashboard/campaigns/:campaignId`
- Why: Core content production workflow; major user value path.
- Minimum scenarios:
  - list renders for authenticated user
  - create campaign modal happy path
  - open campaign detail
  - start/pause/resume schedule actions
  - add/remove keyword in campaign detail

2. Authenticated billing/account flow

- Route: `/dashboard/billing`
- Why: Revenue-critical account management surface.
- Minimum scenarios:
  - free user state renders correctly
  - subscribed state renders correctly
  - “Manage Subscription” and “View Invoices” actions trigger expected navigation/calls
  - refresh updates visible subscription/credits data

3. Checkout success/failure lifecycle pages

- Routes: `/checkout`, `/success`, `/canceled`, `/subscription/confirmed`
- Why: Conversion funnel and post-purchase trust.
- Minimum scenarios:
  - checkout page render + basic plan selection behavior
  - success page renders expected confirmation and dashboard CTA
  - canceled page renders recovery CTA
  - subscription confirmed page renders and links back to dashboard/billing

### P1

4. Articles workflow

- Route: `/dashboard/articles`
- Why: Operational publishing flow and QA handoff.
- Minimum scenarios:
  - article list loads
  - filter/status interaction
  - open article detail/preview path
  - regenerate/deliver action visibility and basic execution feedback

5. Settings and support functional coverage

- Routes: `/dashboard/settings`, `/dashboard/support`
- Why: Account safety and support path reliability.
- Minimum scenarios:
  - settings form fields render and save path shows success/failure feedback
  - support/contact flow submission success + validation failure

### P2

6. Admin surfaces

- Routes: `/dashboard/admin`, `/dashboard/admin/users`, `/dashboard/admin/blog`
- Why: lower traffic but high operational impact.
- Minimum scenarios:
  - admin guard behavior (non-admin blocked, admin allowed)
  - users list render
  - blog list render and open editor route

## Key Risk Note

Many existing dashboard E2E tests are fixture-heavy with mocked route responses. These are useful for deterministic UI checks, but do not replace true end-to-end backend path validation.

Implementation should keep two lanes:

- deterministic UI E2E (mocked where needed)
- critical real-path E2E (minimal mocks, real API/database where feasible)

## Proposed Test Suite Additions

- `tests/e2e/campaigns.e2e.spec.ts` (P0)
- `tests/e2e/dashboard-billing.e2e.spec.ts` (P0)
- `tests/e2e/checkout-lifecycle.e2e.spec.ts` (P0)
- `tests/e2e/articles.e2e.spec.ts` (P1)
- `tests/e2e/settings-support.e2e.spec.ts` (P1)
- `tests/e2e/admin.e2e.spec.ts` (P2)

## Acceptance Criteria

1. New specs exist for all P0 areas and run under Playwright `chromium` project.
2. P0 tests validate at least one full happy-path flow per route group listed above.
3. P0 tests include at least one failure/guard case per route group.
4. CI includes P0 E2E specs in required checks.
5. Test docs updated with route-to-spec mapping and mocking policy.

## Rollout Plan

1. Implement P0 specs first and gate merges on them.
2. Add P1 specs in next iteration once P0 is stable.
3. Add P2 admin coverage after role-fixture maturity.

## Route Coverage Snapshot

Enabled dashboard routes in `client/config/dashboardRoutes.ts`:

- Covered: `/dashboard/integrations`, `/dashboard/opportunities`, `/dashboard/onboarding` (plus localized smoke for dashboard/settings/support)
- Uncovered (core enabled): `/dashboard/campaigns`, `/dashboard/campaigns/:campaignId`, `/dashboard/articles`, `/dashboard/billing` (functional), `/dashboard/settings` (functional), `/dashboard/support` (functional), `/dashboard/admin`, `/dashboard/admin/users`, `/dashboard/admin/blog`

## Dependencies

- Stable authenticated test fixture strategy.
- Test data setup/teardown for campaigns/articles/subscriptions.
- Stripe-safe test mode for checkout lifecycle verification.

## Open Questions

1. Which P0 scenarios must run against real backend vs mocked APIs?
2. Should admin E2E run in a separate CI job with dedicated admin fixture credentials?
3. Do we enforce per-route coverage thresholds in CI, or keep PRD checklist-based governance initially?
