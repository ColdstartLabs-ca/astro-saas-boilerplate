# Core App Flow Production Readiness Report (2026-02-28)

## Scope
- Middleware/auth/session flow
- Dashboard shell + API auth path
- Stripe webhook + cron path
- Current in-flight calendar publishing changes (`planned` -> generation -> scheduled publish)
- Deployment path (Pages + cron worker)

## Validation Executed
- `yarn tsc --noEmit` -> pass
- `yarn vitest run tests/unit/server/services/planned-article-generation.unit.spec.ts tests/unit/server/services/scheduled-publishing.unit.spec.ts` -> pass (21 tests)
- `yarn playwright test tests/e2e/core-app-flow.ci.e2e.spec.ts --project=chromium --reporter=list` -> pass (7 tests)

## Verdict
**No-go for production right now.**

Core happy paths pass, but there are **critical concurrency/consistency bugs** in the new planned-generation and scheduled-publishing flow that can cause duplicate side effects and credit inconsistencies.

## Critical Findings

### 1) Planned article generation is non-atomic and can double-charge / double-generate
**Locations**
- `server/services/planned-article-generation.service.ts:57-173`
- `server/services/planned-article-generation.service.ts:224-318`

**What can break**
- Two concurrent workers (or worker + manual trigger) can process the same `planned` article simultaneously.
- Both can transition to `queued`, both can deduct credits, both can call generation.

**Why this is critical**
- Direct financial impact (double deduction).
- Duplicate generation workload and inconsistent article lifecycle.

**Notes**
- You already have an atomic DB primitive intended for this style of operation (`create_article_with_credits`), including `planned` support in the new migration:
  - `supabase/migrations/20260228000000_add_planned_article_status.sql:41-166`

### 2) Credit ledger write is best-effort (not enforced) after deduction
**Locations**
- `server/services/planned-article-generation.service.ts:154-160`
- `server/services/planned-article-generation.service.ts:300-306`

**What can break**
- Credit balances are updated before insert result is validated for `credit_transactions`.
- If insert fails, balances can change without an auditable transaction row.

**Why this is critical**
- Billing/audit integrity risk.
- Reconciliation and support incident risk under partial DB failures.

### 3) Scheduled publishing can publish the same article multiple times under overlap
**Location**
- `server/services/scheduled-publishing.service.ts:27-104`

**What can break**
- Due articles are selected and delivered without an atomic claim/lock.
- Overlapping cron invocations can run `deliveryService.deliverArticle(article.id)` for the same article before `published_at` is updated.

**Why this is critical**
- Duplicate CMS posts / duplicate outbound webhook effects.
- Hard-to-repair external side effects.

### 4) Deployment can silently skip cron worker and still report success
**Location**
- `scripts/deploy/steps/03-deploy.sh:17-24`

**What can break**
- If `wrangler deploy` for cron worker fails, deploy continues with warning.
- Main app deploy appears successful while all scheduled automation can be dead.

**Why this is critical**
- Operational false-positive deployment for a cron-dependent core flow.

## Critical Redundancy (Risk Multiplier)
- The planned-generation service reimplements credit-deduction logic in application code while a transactional SQL RPC exists for exactly that safety property.
- This redundancy is not just stylistic; it is the reason the concurrency/consistency bugs above are possible.

## Release Gate (Must Fix Before Production)
1. Make planned article promotion + deduction + ledger write atomic (single DB transaction/RPC + claim semantics).
2. Add claim/idempotency semantics to scheduled publishing before calling delivery adapters.
3. Change deploy behavior so cron worker failure blocks release (or explicit/manual approval gate with hard status).
4. Add at least one concurrency integration test for each flow (`planned generation` and `scheduled publish`).
