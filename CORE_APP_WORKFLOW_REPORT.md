# Core App Workflow Audit (Critical/High Only)

Date: 2026-02-25

## Scope
End-to-end path required for user value delivery:
1. Campaign/article trigger
2. Queue + credit charging
3. Article generation + QA gating
4. Delivery to integrations
5. Recovery for stuck/failed generation

## Critical/High Findings

### 1) Critical: Duplicate campaign workers could falsely fail keywords (`Article not found for keyword`)
- Impact: During retries/repeated start calls, multiple background workers could process the same queued keywords, causing noisy failures and incorrect keyword failure states.
- Evidence: Runtime logs like:
  - `[Campaign] Failed to generate article for keyword ... Error: Article not found for keyword ...`
- Root cause: Worker loop did not atomically claim keywords before processing.
- Fix implemented:
  - Atomic claim `queued -> generating` before processing each keyword.
  - If claim fails, worker skips keyword (already owned by another worker).
  - If keyword was claimed but article record is missing in queued state, keyword is returned to `queued` (not hard-failed).
- Code:
  - `src/pages/api/campaigns/[campaignId]/start.ts` (worker loop claim/skip/requeue safeguards)

### 2) High: Stale recovery could re-pick recently retried items and distort retry accounting
- Impact: Stale cron could recover wrong items too aggressively and create retry/accounting drift.
- Root causes:
  - Stale selection previously keyed only by `created_at` (instead of latest attempt activity).
  - Retry catch path could overwrite attempt tracking after generation had already handled failure state.
- Fix implemented:
  - Stale selector now uses `last_attempt_at` first, with `created_at` fallback only when `last_attempt_at` is null.
  - Recovery path tracks whether generation was actually started; only pre-generation failures update attempt tracking.
  - Recovery fetch now includes `campaign_id`/`project_id` directly to avoid follow-up fetch inconsistencies.
- Code:
  - `server/services/cron-article-recovery.service.ts`

### 3) High: Retryability gap for `failed_quality` blocked recovery path
- Impact: Quality-gate failures could get stuck without valid regenerate route/UI path.
- Fix implemented:
  - API regenerate now explicitly accepts `failed_quality`.
  - Article modal now exposes regenerate for `failed_quality` and approve/reject for `qa_passed`.
- Code:
  - `src/pages/api/articles/[articleId]/regenerate.ts`
  - `client/components/articles/ArticleDetailModal.tsx`

### 4) High reliability: Background task rejections could leak as unhandled rejection noise
- Impact: Background tasks produced noisy unhandled rejection behavior in local/test and potentially obscured true operational failures.
- Fix implemented:
  - `fireAndForget()` now always attaches a guarded `.catch()` before `waitUntil` handoff.
- Code:
  - `src/pages/api/_utils.ts`

## Verification (Post-fix)

### Unit/service focused
- `npx vitest run tests/unit/api/cron-recover-stale-articles.unit.spec.ts tests/unit/api/articles-regenerate.unit.spec.ts server/services/__tests__/campaign-schedule.service.test.ts`
- Result: **49 passed, 0 failed**

### API flow (generation + batch + integrations + schedule + cron)
- `npx playwright test tests/api/article-generation.api.spec.ts tests/api/article-batch-campaign.api.spec.ts tests/api/integrations-campaign.api.spec.ts tests/api/schedule.api.spec.ts tests/api/cron/cron-remaining.api.spec.ts --project=api`
- Result: **128 passed, 14 skipped, 0 failed**

### Type safety
- `npm run tsc`
- Result: **passed**

## Current Production-Blocking Status
No open production-blocking issue found in the audited core workflow after the above fixes.
