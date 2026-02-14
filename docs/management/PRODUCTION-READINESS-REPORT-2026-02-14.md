# Production Readiness Report

Date: 2026-02-14
Project: `autopilotrank.com`
Reviewer: Codex

## Verdict

**Not ready for production launch yet.**

The core flow implementation is substantial and many controls are present, but current test evidence and release-state gaps indicate meaningful launch risk.

## What I inspected

- Core request/middleware/auth flow
  - `src/middleware.ts`
  - `lib/middleware/auth.ts`
  - `lib/middleware/securityHeaders.ts`
  - `server/rateLimit.ts`
- Core business flow endpoints
  - `src/pages/api/checkout/index.ts`
  - `src/pages/api/webhooks/stripe/index.ts`
  - `src/pages/api/articles/generate.ts`
  - `src/pages/api/onboarding/status.ts`
  - `src/pages/api/onboarding/progress.ts`
  - `src/pages/api/onboarding/complete.ts`
  - `src/pages/api/campaigns/[campaignId]/integrations.ts`
  - `src/pages/api/integrations/index.ts`
  - `src/pages/api/integrations/[integrationId]/index.ts`
  - `src/pages/api/opportunities/index.ts`
  - `src/pages/api/opportunities/[id]/index.ts`
  - `src/pages/api/opportunities/[id]/create-article.ts`
  - `src/pages/api/gsc/connect.ts`
  - `src/pages/api/gsc/callback.ts`
  - `src/pages/api/gsc/connections/index.ts`
- Scheduling/ops flow
  - `server/controllers/CronController.ts`
  - `workers/cron/index.ts`
  - `workers/cron/wrangler.toml`
- Delivery/release controls
  - `.github/workflows/deploy.yml`
  - `docs/management/PRE-RELEASE-CHECKLIST.md`

## Execution evidence

### 1) Baseline verification

Command run:

- `yarn verify`

Result:

- Passed (`tsc`, `eslint`, `i18n` all complete)
- Lint produced **966 warnings** (0 errors). This is not a launch blocker by itself but indicates debt in quality guardrails.

### 2) API regression suite

Command run:

- `yarn test:api`

Result:

- **Failed**
- Summary: **27 failed, 228 passed, 1 skipped**
- Failures concentrated in key feature areas:
  - GSC connections
  - Integrations + campaign integration assignment
  - Opportunities listing/detail/update/create-article

This is a major blocker for launch confidence because these are user-facing, revenue-adjacent flow surfaces.

## Blockers (must-fix before production)

1. **Core API test regressions remain unresolved**
   - Evidence: `yarn test:api` failing with 27 tests.
   - Impact: breaks confidence in onboarding-to-delivery journey and integrations lifecycle.

2. **Release readiness checklist still shows multiple production-critical items incomplete**
   - Evidence: `docs/management/PRE-RELEASE-CHECKLIST.md` has unresolved items across domain/DNS, secrets, Stripe live mode, auth verification, monitoring, cron hardening, and manual critical-path testing.
   - Impact: operational launch risk even if code is stable.

3. **Deployment branch mismatch risk**
   - Evidence: CI deploy triggers on `master` in `.github/workflows/deploy.yml`, while checklist references validating against `main`.
   - Impact: risk of deploying from unintended branch or not deploying expected code.

## High-risk issues to address

1. **Webhook idempotency has a permissive fallback path**
   - File: `src/pages/api/webhooks/stripe/index.ts`
   - Behavior: if idempotency check errors, processing continues with idempotency disabled.
   - Risk: duplicate side effects under datastore/idempotency table outage scenarios.

2. **Shared secret used for unrelated security contexts**
   - Files: `src/pages/api/gsc/callback.ts`, `server/services/gsc.service.ts`, `server/controllers/CronController.ts`
   - Behavior: `CRON_SECRET` is used both for cron endpoint auth and OAuth state signing.
   - Risk: secret reuse increases blast radius if leaked/rotated incorrectly.

3. **CSP remains permissive in production**
   - File: `shared/config/security.ts`
   - Behavior: allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`.
   - Risk: larger XSS exploit surface than necessary for production.

4. **Rate limiting remains single-instance in-memory**
   - File: `server/rateLimit.ts`
   - Behavior: per-instance memory map only.
   - Risk: distributed bypass across edges/instances at scale.

## Medium-risk issues

1. **Health check is shallow for production monitoring**
   - File: `src/pages/api/health/index.ts`
   - Current check: DB reachability only.
   - Gap: no readiness checks for Stripe webhook config, email provider availability, AI provider availability, or cron heartbeat status.

2. **Operational docs show drift/outdated context in cron area**
   - File: `workers/cron/README.md`
   - Observed references to previous project naming/Next.js context.
   - Risk: operator error during incident response/deployment.

## What looks strong

- Strong separation of middleware/auth/handler concerns.
- Clear atomic credit+article creation strategy in `src/pages/api/articles/generate.ts`.
- Ownership checks in most mutating routes.
- Good test volume overall; substantial unit/integration footprint exists.
- Dedicated cron worker implementation exists and includes auth header usage.

## Recommendation

**No-go for production launch today (2026-02-14).**

## Minimum path to “go”

1. Fix or rebaseline all 27 failing API tests and rerun `yarn test:api` clean.
2. Complete production-critical checklist items in `docs/management/PRE-RELEASE-CHECKLIST.md` (especially Stripe live config, secrets, domain, webhook validation, cron deployment verification).
3. Resolve deploy branch policy (`master` vs `main`) and verify release branch is unambiguous.
4. Decouple OAuth state secret from cron auth secret and rotate both.
5. Tighten CSP for production and document any required exceptions.
6. Run full prelaunch gates: `yarn verify`, `yarn test:unit`, `yarn test:e2e` in production-like env, then manual critical-path test pass.

