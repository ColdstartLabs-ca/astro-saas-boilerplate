# Article Generation Edge Cases Report

Date: 2026-02-10

Note: requested `/prd-creator` skill was not available in the listed skills for this session, so this report follows a PRD-style fallback.

## Scope

Core article-generation flow only:

- `POST /api/articles/generate`
- `POST /api/campaigns/:campaignId/start`
- `POST /api/articles/:articleId/regenerate`
- `ArticleGenerationService` orchestration

## Matrix (Effort x Impact)

Effort scale:

- `S` = 0.5-1 day
- `M` = 2-5 days
- `L` = 1-2+ weeks

| Impact \ Effort | S (low-hanging fruit) | M | L |
|---|---|---|---|
| High | `E1`, `E2`, `E3`, `E4`, `E5`, `E6` | `E7`, `E8`, `E9` | `E10`, `E11` |
| Medium | `E12` | `E13` | - |
| Low | - | - | - |

## Recommendations (Low-Hanging Fruits First)

### E1. Fix refund inconsistency and duplicate refund path

- Edge case: campaign flow refunds credits twice or with wrong RPC when generation fails.
- Evidence:
  - Service already refunds on failure: `server/services/article-generation.service.ts:160`, `server/services/article-generation.service.ts:382`
  - Campaign catch refunds again with `add_credits_v2`: `src/pages/api/campaigns/[campaignId]/start.ts:100`, `src/pages/api/campaigns/[campaignId]/start.ts:112`
- Impact: High (credit ledger inconsistencies, possible over/under-refunds).
- Effort: `S`
- Suggestion:
  - Keep one refund owner (service layer).
  - Remove campaign-level extra refund call.
  - Add unit/integration test for single-refund guarantee per failed article.

### E2. Block exact duplicate article creation in the same campaign/project

- Edge case: same topic can be generated multiple times by repeated quick-generate calls.
- Evidence:
  - Article insert has no duplicate check: `src/pages/api/articles/generate.ts:130`
  - No unique constraint on articles for keyword/topic: `supabase/migrations/20260205100200_create_articles_table.sql:2`
- Impact: High (duplicate content, wasted credits).
- Effort: `S`
- Suggestion:
  - Before insert, check for existing non-failed article with same normalized keyword in same campaign.
  - Return existing article id or require explicit `forceRegenerate`.
  - Add normalized keyword helper now (lowercase + trim + whitespace collapse).

### E3. Prevent unsafe regenerate races and wrong credit UX

- Edge case: regenerate can run for any status and can be triggered concurrently.
- Evidence:
  - No status precondition before regenerate: `src/pages/api/articles/[articleId]/regenerate.ts:112`
  - Credit cost hardcoded as `campaign.image_preset ? 1 : 0` (may drift from config): `src/pages/api/articles/[articleId]/regenerate.ts:96`
- Impact: High (double charges, racey overwrites, user confusion).
- Effort: `S`
- Suggestion:
  - Allow regenerate only for `failed` or `rejected`.
  - Use conditional update (`WHERE id=? AND status IN (...)`) to acquire a generation lock.
  - Compute image credit cost using shared helper (`getImagePresetCreditCost`) for parity with generate/start flows.

### E4. Add a minimal quality gate before marking article `draft`

- Edge case: poor/truncated output still lands as draft.
- Evidence:
  - No finish-reason validation and no content threshold checks: `server/services/article-generation.service.ts:231`, `server/services/article-generation.service.ts:134`
  - Current quality score is SEO-only and non-blocking: `shared/utils/seo.ts:357`
- Impact: High (low-quality content reaches review/publish path).
- Effort: `S`
- Suggestion:
  - Gate on:
    - `word_count >= 70%` of target
    - minimum heading structure (`>= 3` H2s)
    - non-empty title/meta/slug
    - completion not truncated
  - On fail: mark `failed_quality`, auto-retry once with stricter prompt, then fail hard.

### E5. Enforce article status transition rules

- Edge case: API allows arbitrary status jumps.
- Evidence:
  - PATCH accepts many statuses without transition validation: `src/pages/api/articles/[articleId]/index.ts:17`
  - Direct DB update with payload: `src/pages/api/articles/[articleId]/index.ts:155`
- Impact: High (invalid workflow states, publish without required metadata).
- Effort: `S`
- Suggestion:
  - Add a transition map (state machine) server-side.
  - Require `published_url` and `published_at` when status becomes `published`.
  - Reject invalid jumps with explicit error codes.

### E6. Make pause/resume actually control campaign execution

- Edge case: pausing campaign in UI does not stop background loop.
- Evidence:
  - Pause button toggles campaign status: `client/components/dashboard/views/campaign-detail/CampaignDetailHeader.tsx:75`
  - Worker loop does not re-check campaign status between keywords: `src/pages/api/campaigns/[campaignId]/start.ts:56`
- Impact: High (unexpected continued credit burn while paused).
- Effort: `S`
- Suggestion:
  - Before each keyword generation, re-fetch campaign status; stop if paused.
  - Keep unprocessed keywords `queued`/`pending` for resume.

### E7. Make queue + credit operations atomic

- Edge case: partial writes can leave orphaned/stuck states if one step fails.
- Evidence:
  - Quick generate inserts article then deducts credits in separate calls: `src/pages/api/articles/generate.ts:130`, `src/pages/api/articles/generate.ts:149`
  - Campaign start performs multi-step mutations and deduction without transaction: `server/services/campaign.service.ts:593`, `server/services/campaign.service.ts:626`
- Impact: High (stuck `queued/generating`, credit/accounting drift).
- Effort: `M`
- Suggestion:
  - Move critical multi-step operations into a single SQL RPC transaction.
  - Return deterministic operation result (queued ids + ledger id) for observability.

### E8. Add idempotency + locking for campaign start

- Edge case: concurrent start requests can duplicate queued articles and double-charge.
- Evidence:
  - Reads pending keywords then inserts articles with no start lock/idempotency key: `server/services/campaign.service.ts:560`, `server/services/campaign.service.ts:610`
  - Lookup by keyword expects single queued article and can break if duplicates exist: `src/pages/api/campaigns/[campaignId]/start.ts:69`
- Impact: High (duplicate content + unstable processing loop).
- Effort: `M`
- Suggestion:
  - Add idempotency key support at API layer.
  - Add DB lock on campaign row (`FOR UPDATE`) and "generation_run_id" to guard one active start per campaign.

### E9. Add stale-job recovery for `queued/generating`

- Edge case: fire-and-forget background work can die mid-run and leave stuck records.
- Evidence:
  - Background execution depends on `waitUntil` or local fire-and-forget: `src/pages/api/campaigns/[campaignId]/start.ts:136`, `src/pages/api/articles/generate.ts:156`
  - No sweeper/retry path for stale article generation statuses in current flow.
- Impact: High (silent failures, no auto-recovery).
- Effort: `M`
- Suggestion:
  - Cron job to detect stale `generating`/`queued` by age.
  - Retry with attempt cap and mark terminal `failed_timeout`.
  - Emit alert when stale count crosses threshold.

### E10. Semantic dedup for near-duplicate topics

- Edge case: exact keyword checks do not catch "same intent, different wording".
- Evidence:
  - Keyword uniqueness is campaign-scoped exact text only: `supabase/migrations/20260205100300_create_keywords_table.sql:14`
  - No cross-campaign/project dedup strategy in article pipeline.
- Impact: High (multiple cannibalizing articles on same intent).
- Effort: `L`
- Suggestion:
  - Store `topic_fingerprint` (embedding/hash) per article.
  - Before generation, compare against recent project articles and block/warn if similarity exceeds threshold.

### E11. Build full pre-publication QA pipeline

- Edge case: low factual quality/plagiarism/AI-detection risks remain.
- Evidence:
  - Technical doc marks QA system as not implemented: `docs/technical/systems/content-generation-engine.md:39`
- Impact: High (brand/reputation and SEO performance risk).
- Effort: `L`
- Suggestion:
  - Add QA stages for plagiarism, fact consistency flags, readability, AI-likelihood.
  - Route failed checks to auto-rewrite or human review queue.

### E12. Normalize keyword uniqueness at DB level (case/spacing)

- Edge case: campaign create can still accept case/spacing variants of same keyword.
- Evidence:
  - Unique constraint is case-sensitive text: `supabase/migrations/20260205100300_create_keywords_table.sql:14`
  - Campaign create inserts raw trimmed keywords and ignores only exact duplicate error: `server/services/campaign.service.ts:345`, `server/services/campaign.service.ts:357`
- Impact: Medium
- Effort: `S`
- Suggestion:
  - Add `keyword_normalized` column and unique index on `(campaign_id, keyword_normalized)`.
  - Populate as `lower(trim(regexp_replace(keyword, '\s+', ' ', 'g')))`.

### E13. Add structured failure taxonomy and metrics

- Edge case: failures are stored as free-text only, hard to triage by stage/provider.
- Evidence:
  - `generation_error` stores message only: `server/services/article-generation.service.ts:394`
- Impact: Medium
- Effort: `M`
- Suggestion:
  - Add fields: `failure_stage`, `provider`, `http_status`, `attempt_count`, `is_retryable`.
  - Dashboards: fail rate by stage/model, median generation time, timeout rate.

## Suggested Execution Order

1. `E1`, `E2`, `E3`, `E4`, `E5`, `E6`
2. `E7`, `E8`, `E9`
3. `E12`, `E13`
4. `E10`, `E11`

## Success Metrics

- Duplicate article rate per project (exact + semantic).
- Generation success rate (`draft` within SLA).
- Stale generation count (`queued/generating` older than threshold).
- Refund mismatch incidents (credits consumed vs refunded).
- Quality pass rate before manual review.
