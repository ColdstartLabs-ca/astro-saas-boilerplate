# PR Production Readiness Review

- Date: 2026-02-28
- Branch reviewed: `feature/calendar-publishing`
- Scope: critical production blockers only
- Verdict: **Not ready for production**

## Critical Blockers

### 1) Failed deliveries are marked as published (data integrity bug)
- Severity: **P0**
- Location: `server/services/scheduled-publishing.service.ts:58-67`, `server/services/scheduled-publishing.service.ts:69-74`
- Evidence:
  - The code updates article status to `published` and sets `published_at` immediately after `deliverArticle(...)`.
  - It then checks delivery results and can still classify the run as failed (`successful === 0 && failed > 0`) after already marking as published.
- Production impact:
  - Articles can be permanently marked published even when delivery failed everywhere.
  - Retry flow is effectively bypassed for these failures.

### 2) Scheduled publishing cron is not wired (feature path never runs)
- Severity: **P0**
- Location: `workers/cron/index.ts:45-63`, `workers/cron/wrangler.toml:11-24`, `src/pages/api/cron/publish-scheduled-articles/index.ts:1-35`
- Evidence:
  - New endpoint `/api/cron/publish-scheduled-articles` exists.
  - Cron worker/router has no pattern mapped to that endpoint.
  - `wrangler.toml` includes generation cron (`2/5 * * * *`) but no scheduled-publish cron route.
- Production impact:
  - `scheduled_publish_at` will not trigger automatic publishing in production.

### 3) Migration `20260228000000_add_planned_article_status.sql` regresses previously-fixed credit RPCs
- Severity: **P0**
- Location: `supabase/migrations/20260228000000_add_planned_article_status.sql:47`, `:62`, `:176`, `:193`, `:252`
- Evidence:
  - `transaction_id` switched back to `BIGINT` while prior fix established UUID (`supabase/migrations/20260211000200_fix_transaction_id_type.sql:30`, `:45`, `:131`, `:148`).
  - Batch RPC uses `RETURNING id INTO v_article_ids` on multi-row insert (`...:252`) instead of `array_agg` pattern from the prior fix (`20260211000200...:185-196`).
  - Trusted operation flag (`set_config('app.trusted_credit_operation', 'true', true)`) is missing in this migration’s recreated RPCs, but present in prior fixed version (`20260211000200...:48`, `:151`).
- Production impact:
  - Campaign/start generation credit RPCs are at high risk of runtime failure and/or being blocked by credit-protection trigger logic.

## Validation Run

- `yarn vitest run tests/unit/server/services/content-planning.unit.spec.ts tests/unit/server/services/planned-article-generation.unit.spec.ts tests/unit/server/services/article-status-transitions.unit.spec.ts tests/unit/client/utils/calendarHelpers.unit.spec.ts` -> passed (106/106)
- `yarn playwright test tests/api/content-planning.api.spec.ts --project=api` -> passed
- `yarn playwright test tests/e2e/content-planning.e2e.spec.ts --project=chromium` -> passed (17/17)

Note: passing tests do not cover the migration regressions above nor the missing scheduled-publish cron wiring.
