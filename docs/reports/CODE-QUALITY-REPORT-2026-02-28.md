# Code Quality Report — AutopilotRank

**Date:** 2026-02-28
**Branch:** `feature/calendar-publishing`
**Scope:** Core app flow + recent calendar publishing & blog webhook features
**Previous report:** `docs/reports/DEAD-CODE-REPORT-2026-02-25.md`
**Previous prod-readiness:** `docs/management/PRODUCTION-READINESS-CORE-FLOW-2026-02-28.md`

---

## TL;DR — Production Readiness

| Area | Status |
|------|--------|
| Critical bugs from 2026-02-28 prod report | ✅ **All 3 fixed** |
| Core article generation flow | ✅ Prod-ready |
| Calendar publishing (new) | ✅ Atomic + idempotent |
| Cron worker deploy (new) | ✅ Now fail-closed |
| New blog webhook feature | ✅ Signature-verified |
| Dead code accumulation | ⚠️ 5 safe-to-delete items |
| SOLID violations | ⚠️ Technical debt (no prod risk today) |

**Verdict:** Core app is production-ready. No blocking bugs in critical paths. Debt items below are maintainability concerns, not blockers.

---

## Part 1: Previous Critical Bugs — Fixed ✅

### Bug 1: Planned article generation was non-atomic (double-charge risk)
**Was:** Two concurrent workers could both transition the same `planned` article to `queued`, deducting credits twice.
**Now:** `promotePlannedArticleWithCredits()` calls the `promote_planned_article_with_credits` Supabase RPC, which is a single atomic DB transaction. Returns `already_promoted` (empty result set) if the article was already claimed by another worker.
**File:** `server/services/planned-article-generation.service.ts:289-315`

### Bug 2: Credit ledger write was best-effort (billing audit risk)
**Was:** Credits deducted before validating the `credit_transactions` insert succeeded.
**Now:** The RPC handles both in one transaction — no partial state possible.

### Bug 3: Scheduled publishing could duplicate-publish under concurrent cron overlap
**Was:** Articles delivered without an atomic claim.
**Now:** `claimArticleForPublishing()` uses optimistic concurrency: UPDATE ... WHERE `attempt_count = <expected_value>` — only one worker gets a non-zero rowcount. Others skip.
**File:** `server/services/scheduled-publishing.service.ts:115-149`

### Bug 4: Cron worker deploy failure was silent
**Was:** `wrangler deploy` failure for cron worker logged a warning but deployment continued, leaving automation dead.
**Now:** Deploy script runs `wrangler deploy` without `|| true` — failure is blocking.
**File:** `scripts/deploy/steps/03-deploy.sh:17-23`

---

## Part 2: New Features — Code Review

### Calendar Publishing

All calendar components are properly wired and used:

| Component | Status |
|-----------|--------|
| `CalendarView.tsx` | ✅ Rendered from `DashboardSidebar` |
| `MonthView / WeekView / DayView` | ✅ Conditionally rendered inside CalendarView |
| `PlanContentModal.tsx` | ✅ Campaign-aware content planner |
| `ArticleDetailModal.tsx` | ✅ Generate-Now + status wired to API |
| `CampaignDropdown / CalendarFilters / CampaignLegend` | ✅ All wired |

### Blog Webhook (`/api/webhooks/article-published`)

- HMAC-SHA256 signature verification — good
- Zod schema validates payload before any DB write — good
- `renderMarkdownToHtml` reuses `blog.service.ts` — no duplication
- Route is covered by the `/api/webhooks/*` wildcard in `PUBLIC_API_ROUTES` — correct
- `server/blog.ts` properly merges MDX + DB posts; imported by blog pages and sitemap

### Cron Endpoints

Both new cron endpoints (`generate-planned-articles`, `publish-scheduled-articles`) verify `x-cron-secret` header, delegate to the service layer, and are mapped in the cron worker's `wrangler.toml`. Pattern is consistent with existing cron endpoints.

---

## Part 3: Dead Code — Current State

### Items Still Present From Feb 25 Report

The previous dead code report identified ~30 files as candidates. Status update:

| File | Old Status | Current Status | Action |
|------|-----------|---------------|--------|
| `server/services/delivery.service.ts` | Listed as dead export | ✅ USED (scheduled-publishing + article-generation) | None |
| `server/services/qa.service.ts` | Listed as dead export | ✅ USED (article-generation) | None |
| `server/services/provider-credit-tracker.service.ts` | Listed as dead | ✅ USED (provider-manager) | None |
| `server/services/sitemap-page.service.ts` | Listed as dead | ✅ USED (sitemap-pages API) | None |
| `server/services/provider-manager.service.ts` | Listed as dead | ✅ USED (email-provider-manager) | None |
| `server/utils/retry.ts` | Listed as dead | ✅ USED (image-generation, replicate) | None |
| `server/supabase/supabaseUtils.ts` | Listed as dead | ⚠️ Still dead | **DELETE** |
| `server/services/failure-metrics.service.ts` | Listed as dead | ⚠️ Still dead | **DELETE** |
| `client/hooks/useAdminBlog.ts` | Listed as dead | ✅ USED (admin blog components) | None |
| Audiences/competitors/example-articles routes | Listed as dead | ✅ **Deleted** (no longer in codebase) | Done |

> **Note:** The Feb 25 report had several false positives — the scanner incorrectly flagged services that are actually used. The critical confirmed dead items are documented below.

### Confirmed Dead Items — Safe to Delete Now

**1. `server/supabase/supabaseUtils.ts`**
Generic CRUD functions (`getItems`, `addItem`, `updateItem`, `deleteItem`) that are legacy boilerplate. Direct Supabase client calls are used throughout instead. Zero production imports.

**2. `server/services/failure-metrics.service.ts`** (429 lines)
Full failure analytics service with `getFailureMetrics`, `getFailuresByStage`, `getRecentFailures`, etc. Not imported by any production code. Note: `logFailureMetrics` in `article-generation.service.ts` is a private method that uses `console.error` (for Baselime), NOT this service. The `AdminController` references a `/failure-metrics` route but calls `adminStatsService.getFailureMetrics()` — not this service. This service is orphaned.

**3. `client/hooks/useLogout.ts`**
Empty file (0 bytes). Delete.

**4. `src/pages/api/protected/example/index.ts`**
Boilerplate API route example with placeholder `// TODO: Add your business logic here` comments. Should never be shipped to production.

**5. `src/pages/api/admin/cleanup-quick-generate-campaigns.ts`**
One-time cleanup utility for legacy auto-generated campaigns. Never called from any client or cron. Safe to delete.

**Total: 5 items / ~434 lines of dead code**

### Items That Were Boilerplate (Check Feb 25 Report)

Groups 1–4 from the Feb 25 report (boilerplate utils, dead UI components, debug scripts) were not verified in this run. Treat those recommendations as still open unless manually confirmed deleted.

---

## Part 4: SOLID Violations & Code Smells

These are maintainability concerns. **None cause production bugs today**, but they accumulate risk for future changes.

### SRP Violations — God Objects

#### `server/services/article-generation.service.ts` — 1,251 lines ⭐⭐⭐ HIGH PRIORITY

Single class handles 7+ distinct responsibilities:
1. Outline generation & retry
2. Full article body generation
3. Image generation orchestration
4. QA checking & retry
5. Error classification & recovery
6. Metadata extraction & SEO scoring
7. Credit refunds & database persistence

Directly imports 7+ external services (`openaiEmbeddingsService`, `articleQualityGateService`, `qaService`, `imageGenerationService`, `deliveryService`, `getEmailService`, `supabaseAdmin`). Hard to test in isolation, change one concern without affecting others.

**Suggested decomposition:**
```
ArticleOutlineGenerator      → outline generation + retry
ArticleBodyGenerator         → full content generation
ArticleImageOrchestrator     → image generation
ArticleQAValidator           → QA checks + retry
ArticleErrorRecovery         → failure handling + credit refunds
Main service                 → orchestrate via injected dependencies
```

---

#### `server/controllers/SubscriptionController.ts` — 797 lines ⭐⭐⭐ HIGH PRIORITY

Controller holds 4 unrelated operations, each 100-200 lines with complex Stripe schedule management logic inline. Business logic belongs in a service, not a controller.

**DRY violation (HIGH):** `tierCreditsMap` defined identically at lines ~154-159 and ~512-517:
```typescript
// Lines 154-159 (in isDowngrade)
const tierCreditsMap: Record<string, number> = { starter: 30, growth: 100, agency: 500 };

// Lines 512-517 (in previewChange) — exact duplicate
const tierCreditsMap: Record<string, number> = { starter: 30, growth: 100, agency: 500 };
```
**Fix:** Extract to `shared/config/subscription.config.ts`.

**DRY violation (MEDIUM):** Period calculation from `billing_cycle_anchor` duplicated in `change()` (lines ~272-296) and `previewChange()` (lines ~560-570).

---

#### `server/services/opportunity-analysis.service.ts` — 959 lines ⭐⭐ MEDIUM PRIORITY

Single service mixes 5 distinct subdomains:
1. Rule-based opportunity detection
2. Topic clustering with embeddings (100+ line algorithm at lines 460-541)
3. AI enrichment via OpenRouter
4. Priority scoring
5. Merge/deduplication

The clustering algorithm is complex enough to warrant its own `TopicClusteringEngine` class with independent tests.

---

#### `server/services/blog.service.ts` — 680 lines ⭐ LOW-MEDIUM

Three distinct resource types (posts, categories, media) in one service. No violation of SRP at method level (each method has one job), but the class has 3 independent responsibilities. Low urgency given the stable nature of blog CRUD.

---

#### `client/hooks/useAdminBlog.ts` — 509 lines ⭐ LOW-MEDIUM

Contains 10 independent hooks in one file (`usePosts`, `usePost`, `useCreatePost`, `useUpdatePost`, `useDeletePost`, `useCategories`, `useMedia`, `useUploadMedia`, `useUpdateMedia`, `useDeleteMedia`). Each should be in its own file under `client/hooks/blog/`.

This hook IS used by admin blog components (confirmed), so this is an organizational concern only.

---

### Missing Abstraction — Tight Coupling

**`integration.service.ts` — Manual config redaction (MEDIUM):**
`redactConfig()` manually deletes the `secret` field using `delete (result as ...).secret`. If a new secret field is added to the integration config schema, it will be silently exposed.

**Better pattern:** Allowlist-based Zod schema that explicitly permits only safe fields:
```typescript
const SafeIntegrationConfigSchema = z.object({
  site_url: z.string().optional(),
  // only non-secret fields
}).strict();
```

---

### Silent Error Swallowing

**`server/services/article-generation.service.ts` — Semantic dedup (MEDIUM):**
```typescript
try {
  const similarityResult = await openaiEmbeddingsService.checkSimilarity(...);
} catch (error) {
  console.error('[Semantic Dedup] Failed to check similarity:', error);
  // Continue with generation - semantic dedup is a safety net
}
```
If the OpenAI embeddings API is down, users have no visibility. At minimum, this should be surfaced as a warning in the article generation error log. Currently it's silent except in Baselime.

---

### TODOs in Production Code

**`src/pages/api/protected/example/index.ts` — 3 TODO comments:**
This is a boilerplate route that should be deleted (also listed in Dead Code above). Do not ship example routes with placeholder logic.

---

## Part 5: Convention Audit

| Rule | Status |
|------|--------|
| `process.env` direct usage | ✅ None found in production code |
| `clientEnv`/`serverEnv` used for all env access | ✅ Correct |
| New cron routes in `PUBLIC_API_ROUTES` | ✅ `/api/cron/*` wildcard covers them |
| New webhook routes in `PUBLIC_API_ROUTES` | ✅ `/api/webhooks/*` wildcard covers them |
| RLS on all tables | ✅ (last confirmed in Feb 2026 — `dispute_events` + `provider_usage` use service-role-only policies) |
| Single DB transaction for credit mutations | ✅ All credit changes go via RPC |

---

## Summary: Action Items

### Delete Now (Low Risk, Zero Functional Impact)
- [ ] `server/supabase/supabaseUtils.ts`
- [ ] `server/services/failure-metrics.service.ts`
- [ ] `client/hooks/useLogout.ts`
- [ ] `src/pages/api/protected/example/index.ts`
- [ ] `src/pages/api/admin/cleanup-quick-generate-campaigns.ts`

### Short-Term Refactoring (Technical Debt)
- [ ] Extract `tierCreditsMap` from `SubscriptionController` to `subscription.config.ts`
- [ ] Replace manual config redaction in `integration.service.ts` with Zod allowlist schema
- [ ] Split `useAdminBlog.ts` into `client/hooks/blog/` individual files

### Long-Term Architecture (No Urgency — Plan When Capacity Allows)
- [ ] Decompose `ArticleGenerationService` into focused sub-services with DI
- [ ] Extract Stripe scheduling logic from `SubscriptionController` to a `SubscriptionScheduleService`
- [ ] Extract `TopicClusteringEngine` from `OpportunityAnalysisService`

---

*Generated: 2026-02-28 — Next review recommended after next major feature cycle.*
