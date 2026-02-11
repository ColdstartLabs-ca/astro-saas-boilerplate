# Credits Economy Implementation Review (Server <-> UI)

**Date:** 2026-02-11  
**Reference PRD:** `docs/PRDs/credits-economy.md`

## Scope
I reviewed the current implementation path for credit pricing and display across:
- Shared pricing config/constants
- Article generation and campaign services
- Article generate/regenerate APIs
- UI model selectors and credit summaries

## Executive Summary
The campaign bulk-generation flow is mostly aligned with the new pricing model, but the single-article paths (`/api/articles/generate` and `/api/articles/[articleId]/regenerate`) are still using old base pricing (`1 + image addon`). This creates server/UI inconsistencies and opens a critical credit accounting bug in failure/refund scenarios.

## Findings (ordered by severity)

### 1) Critical: Single-article endpoints still charge fixed base `1` instead of writer preset cost
- `src/pages/api/articles/generate.ts:73`
- `src/pages/api/articles/generate.ts:75`
- `src/pages/api/articles/[articleId]/regenerate.ts:72`
- `src/pages/api/articles/[articleId]/regenerate.ts:74`

Both endpoints compute cost as `1 + imageCreditCost`. This bypasses writer tier pricing (`1/1/2/3`) and is not aligned with `calculateArticleCreditCost(writer, image)` used elsewhere.

Impact:
- Undercharging for `pro`/`ultra` writers.
- Server-side pricing differs by endpoint (campaign start vs quick/single generate).

### 2) Critical: Refund path can diverge from charged amount (credit loss or credit minting)
- `server/services/article-generation.service.ts:559`
- `server/services/article-generation.service.ts:561`
- `server/services/article-generation.service.ts:627`
- `server/services/article-generation.service.ts:629`
- `shared/config/ai-models.config.ts:128`
- `shared/config/ai-models.config.ts:130`

Refund uses `getWriterPresetCreditCost(writerModel) + imageCreditCost`, but `getWriterPresetCreditCost()` returns `0` for invalid/missing preset keys.

Because charge and refund formulas differ across routes:
- If writer model is omitted/invalid: user can be under-refunded.
- If writer model is provided as `pro`/`ultra` on routes that charged base `1`: refund can exceed charge.

### 3) High: Quick Generate path does not reliably propagate writer preset, defaults to `pro` model behavior
- `client/components/articles/QuickGenerateModal.tsx:109`
- `client/components/articles/QuickGenerateModal.tsx:137`
- `src/pages/api/articles/generate.ts:57`
- `src/pages/api/articles/generate.ts:60`
- `server/services/article-generation.service.ts:308`
- `server/services/article-generation.service.ts:357`
- `shared/config/ai-models.config.ts:73`
- `shared/config/ai-models.config.ts:122`

`QuickGenerateModal` defaults `model: 'auto'` and then sends `undefined`; API does not fetch/use campaign `ai_model`; generation resolves missing/unknown model to default writer preset (`pro`).

Impact:
- Actual generation model and billed model can diverge.
- Not deterministic from user-selected campaign settings.

### 4) High: Campaign credit usage UI stats miss real article statuses
- `server/services/campaign.service.ts:189`
- `server/services/campaign.service.ts:212`
- `server/services/article-generation.service.ts:248`
- `server/services/article-generation.service.ts:252`
- `server/controllers/CronController.ts:680`
- `client/components/dashboard/views/campaign-detail/CampaignCreditUsage.tsx:10`

Credit aggregation switch handles `failed` only, while generation emits `qa_passed`, `qa_failed`, `failed_quality`, `failed_timeout`.

Impact:
- Credit usage/refund cards can be incorrect in campaign detail UI.

### 5) Medium: PRD-required cost visibility in model selectors is incomplete
- `client/components/dashboard/views/NewCampaignModal.tsx:347`
- `client/components/dashboard/views/NewCampaignModal.tsx:365`
- `client/components/dashboard/views/campaign-detail/CampaignSettingsModal.tsx:153`
- `client/components/dashboard/views/campaign-detail/CampaignSettingsModal.tsx:165`
- `client/components/ui/ModelSelect.tsx:120`
- `client/components/ui/ModelSelect.tsx:195`

Gaps vs PRD:
- Credit badges not enabled in New Campaign / Campaign Settings selectors.
- Trigger button does not show selected option credit cost.
- No “Included” treatment for zero-addon options.

### 6) Medium: Credit copy and formulas in UI still reflect old image pricing text/hardcoded assumptions
- `client/components/dashboard/views/NewCampaignModal.tsx:106`
- `client/components/dashboard/views/NewCampaignModal.tsx:376`
- `client/components/articles/QuickGenerateModal.tsx:162`
- `client/components/articles/QuickGenerateModal.tsx:488`

Examples:
- Old text: “premium presets cost 1 additional credit”.
- Hardcoded total in quick generate: `1 + imageCreditCost`.

### 7) Medium: Legacy `auto` model assumptions remain in tests and logic
- `tests/integration/campaign-start-idempotency.integration.spec.ts:38`
- `tests/integration/campaign-start-idempotency.integration.spec.ts:58`

Legacy expectations still assume `1 credit per keyword` for `model: 'auto'`, which conflicts with new preset-based pricing and can hide regressions.

## What is correctly wired
- Central pricing constants exist and match PRD matrix:
  - `shared/constants/credit-costs.constants.ts`
- Campaign bulk generation computes per-article credits using shared helper:
  - `server/services/campaign.service.ts:626`
- New campaign modal computes per-article total as writer + image addon:
  - `client/components/dashboard/views/NewCampaignModal.tsx:104`
  - `client/components/dashboard/views/NewCampaignModal.tsx:107`

## Recommended Fix Order
1. Unify charge formula in single-article endpoints to `calculateArticleCreditCost(writerPreset, imagePreset)`.
2. Make refunds use the exact charged amount (prefer persisted `articles.credits_used` or charge transaction amount), not recomputed inputs.
3. Quick Generate: always resolve writer preset explicitly (campaign default or explicit selector) and pass it end-to-end.
4. Update campaign credit stats aggregation to include `qa_*`, `failed_quality`, and `failed_timeout` statuses.
5. Finish PRD UI requirements for model cost visibility (badges + trigger + total summary in settings modal).
6. Update stale copy/tests that still assume old `1 + image` behavior.

## Validation Performed
Executed targeted unit tests:
- `tests/unit/api/models.unit.spec.ts`
- `tests/unit/shared/config/ai-models.config.unit.spec.ts`
- `tests/unit/shared/config/image-models.config.unit.spec.ts`
- `tests/unit/api/articles-regenerate.unit.spec.ts`
- `tests/unit/components/NewCampaignModal.unit.spec.tsx`

Result: all passed, but current coverage does not catch the critical charge/refund divergence above.
