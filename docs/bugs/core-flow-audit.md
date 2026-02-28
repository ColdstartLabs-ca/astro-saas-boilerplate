# Core Flow Bug Audit — Production Readiness Report

**Date:** 2026-02-27
**Branch:** feature/core-flow-enhancement
**Scope:** 6 parallel agents × deep code review
**Areas:** Onboarding, Projects, Integrations, Campaigns, Articles, Credits/Billing/Auth

---

## Executive Summary

| Severity | Count | Must fix before launch |
|----------|-------|------------------------|
| 🔴 CRITICAL | 9 | Yes — all |
| 🟠 HIGH | 22 | Yes — most |
| 🟡 MEDIUM | 25 | Recommended |
| 🟢 LOW | 18 | Nice to have |

**Status: ✅ ALL FIXED** — All 74 bugs patched across 7 parallel fix agents. 510 API tests pass (0 failures). `yarn verify` clean.

---

## 🔴 CRITICAL Bugs

### C1 · Privilege Escalation: `create_article_with_credits` RPC callable by any user

**Area:** Credits/Auth
**File:** `supabase/migrations/20260210110000_atomic_article_creation_with_credits.sql:135-136`

`EXECUTE` on `create_article_with_credits` is granted to `authenticated`. The function is `SECURITY DEFINER` and accepts `p_user_id UUID`. Any logged-in user can call it directly via the Supabase client SDK, creating articles and deducting credits from **any other user's account**.

**Fix:** Add a migration immediately:
```sql
REVOKE EXECUTE ON FUNCTION create_article_with_credits(...) FROM authenticated;
```
Pattern already exists in `20250303010000_revoke_credit_rpc_from_authenticated.sql`.

---

### C2 · Webhook Test Mode Bypasses All Signature Verification

**Area:** Credits/Auth
**File:** `server/webhooks/stripe/services/webhook-verification.service.ts:46-73`

When `ENV === 'test'`, the service parses raw request bodies as Stripe events **without verifying any signature**. Any Cloudflare preview deployment with `ENV=test` accepts forged webhook payloads. An attacker can craft a `checkout.session.completed` event with arbitrary `user_id` and `credits` to add credits to any account.

**Fix:** Never skip signature verification based on an env variable. Use a separate `STRIPE_WEBHOOK_SECRET` per environment and always verify.

---

### C3 · Webhook Idempotency TOCTOU Race — Double Billing

**Area:** Credits/Auth
**File:** `server/webhooks/stripe/services/idempotency.service.ts:13-45`

The idempotency check is SELECT-then-INSERT (not atomic). Two concurrent Stripe deliveries of the same `checkout.session.completed` event can both pass the SELECT and both process, resulting in credits being added twice.

**Fix:** Replace with a single atomic operation:
```sql
INSERT INTO webhook_events (event_id, status)
VALUES ($1, 'processing')
ON CONFLICT (event_id) DO NOTHING
RETURNING *;
```
If the INSERT returns no row, the event was already claimed.

---

### C4 · ContentPreferencesSection Never Propagates Changes to Parent

**Area:** Onboarding
**File:** `client/components/onboarding/steps/ContentPreferencesSection.tsx:124-127`

`useCallback` is used as a standalone expression — it **creates** a function but never **calls** it. The parent `OnboardingStepPreferences` never receives updated values; `contentPreferences` stays frozen at defaults. Content style, brand color, image style, and global instructions set during onboarding are silently discarded.

```typescript
// BUG — useCallback doesn't execute, it returns a memoized function
useCallback(() => {
  handleChange(formValues);
}, [formValues, handleChange]);
```

**Fix:** Replace with `useEffect`:
```typescript
useEffect(() => {
  handleChange(formValues);
}, [formValues, handleChange]);
```

---

### C5 · Campaign Start Has No State Guard — Concurrent Starts Possible

**Area:** Campaigns
**File:** `server/services/campaign.service.ts:264-424`

`startGenerationInternal` never checks `campaign.status` before proceeding. Two rapid clicks of "Start" generate two different idempotency keys (client sends none, server generates), both claim successfully because `clearCampaignRunId` is called before the background worker finishes (**C6**), leading to two concurrent workers processing the same campaign and potentially double-deducting credits.

**Fix:** Add an explicit status guard rejecting starts unless `campaign.status` is `'draft'` or `'paused'`.

---

### C6 · `clearCampaignRunId` Called Before Background Processing Completes

**Area:** Campaigns
**File:** `server/services/campaign.service.ts:217-219`

The generation run lock is released synchronously after `startGenerationInternal` returns — before `fireAndForget` begins generating articles. This creates a window where a second `/start` request succeeds while the first is still running.

**Fix:** Move `clearCampaignRunId` into the completion/error path inside the `fireAndForget` loop in `start.ts`.

---

### C7 · Campaign Marked "Completed" Even When All Articles Failed

**Area:** Campaigns
**File:** `src/pages/api/campaigns/[campaignId]/start.ts:143-150`

After `processSequentially`, the campaign is unconditionally set to `completed` if `processedCount === queuedKeywords.length`, regardless of `failureCount`. A campaign where every article fails (e.g., OpenRouter outage) shows "Completed" to the user. Credits were refunded per-article but the user has no indication the campaign needs attention.

**Fix:** Check `failureCount`. If all articles failed, set status to `paused` with a `pause_reason`. Add a `completed_with_errors` status or surface it in the UI.

---

### C8 · SSRF via `validate-sitemap` Endpoint

**Area:** Projects
**File:** `src/pages/api/projects/[projectId]/validate-sitemap.ts:60-69`

The endpoint performs a server-side `fetch()` to a user-supplied URL validated only as `z.string().url()`. Unlike the crawl endpoint which calls `validateUrl()` with SSRF protection, this makes a raw `fetch()` — allowing `http://169.254.169.254/`, internal IPs, and localhost.

**Fix:** Call `validateUrl()` (from `website-crawler.service.ts`) before fetching, or extract it into a shared utility and use it here.

---

### C9 · Webhook Secret Stored in Unencrypted Config Column

**Area:** Integrations
**File:** `shared/types/integration.types.ts:40`, `server/integrations/webhook.adapter.ts:200,320`

`IWebhookConfig` declares an optional `secret?: string`. The webhook adapter explicitly falls back to `webhookConfig.secret` — meaning if any row has the secret in the `config` JSONB column (unencrypted), it is stored in plaintext and could be returned in API responses (the campaign integrations GET/PUT endpoints never call `redactConfig`).

**Fix:**
1. Remove `secret?: string` from `IWebhookConfig`
2. Apply `redactConfig()` in all integration GET endpoints (see H3)
3. Write a migration to move any `config.secret` to `encrypted_credentials`

---

## 🟠 HIGH Bugs

### H1 · Non-Atomic Credit Deduction in Regenerate Endpoint

**Area:** Articles
**File:** `src/pages/api/articles/[articleId]/regenerate.ts:76-123`

Three separate steps: credit balance check → status update to `generating` → credit deduction. Between steps 1 and 3, concurrent requests can overdraw the balance. `generate.ts` solved this with an atomic RPC; `regenerate.ts` was never updated.

**Fix:** Create a `regenerate_article_with_credits` RPC combining status update and credit deduction atomically, or deduct credits before changing status.

---

### H2 · `content_preferences` Silently Overwritten on Project Edit

**Area:** Projects
**File:** `server/services/project.service.ts:216-217`, `client/components/projects/ProjectEditModal.tsx:72-75`

`ProjectEditModal` sends only `{ frequency }` in `content_preferences`. The service replaces the entire column, wiping `articleStyle`, `globalInstructions`, `brandColor`, `imageStyle`, and all other preferences.

**Fix:** Merge instead of replace: `updates.content_preferences = { ...existingPreferences, ...validated.content_preferences }`.

---

### H3 · Campaign Integrations Endpoints Leak Config Secrets

**Area:** Integrations
**Files:**
- `src/pages/api/campaigns/[campaignId]/integrations.ts:128` (GET)
- `src/pages/api/campaigns/[campaignId]/integrations.ts:269` (PUT)
- `server/services/integration.service.ts:611-617` (`getCampaignIntegrations`)

None of these call `redactConfig()`, unlike `integration.service.ts` `list()` and `getById()` which both do. Integration config data (potentially including secrets) is returned raw.

**Fix:** Apply `redactConfig()` in all three locations.

---

### H4 · No SSRF Protection on Webhook/Integration URLs

**Area:** Integrations
**Files:** `src/pages/api/integrations/index.ts:31-33`, `server/integrations/webhook.adapter.ts:140,197`

Webhook URLs are validated only as `z.string().url()`. Internal IPs, localhost, cloud metadata endpoints are all accepted and fetched server-side.

**Fix:** Add a Zod refinement rejecting private IP ranges, non-HTTPS schemes, and the AWS metadata endpoint. Reuse or extract the `validateUrl()` logic from `website-crawler.service.ts`.

---

### H5 · Update Campaign Schema Allows Arbitrary Status Changes

**Area:** Campaigns
**File:** `shared/validation/campaign.schema.ts:107`, `server/services/campaign-lifecycle.service.ts:486-512`

`PUT /api/campaigns/:id` accepts `{ status: "active" }` with no state machine validation. A `draft` campaign can be set to `active` without queuing keywords or deducting credits. A `completed` campaign can be reset.

**Fix:** Only allow `active → paused` and `paused → active` via the PUT endpoint. Reject all other transitions.

---

### H6 · Outrank Fields Not Forwarded in Campaign Update

**Area:** Campaigns
**File:** `server/services/campaign-lifecycle.service.ts:502-520`

`createCampaignSchema` includes `article_style`, `internal_links_count`, `global_instructions`, `auto_publish`, `include_youtube`, `include_cta`, `include_infographics`, `include_emojis`, `image_style`. The `update` method never maps these from `validated` to `updates`. Users' changes via the settings modal are silently ignored.

**Fix:** Add the outrank fields to the update method's field mapping.

---

### H7 · Scheduled Batch Marks Campaign "Scheduled" Even When All Articles Failed

**Area:** Campaigns
**File:** `server/services/campaign-scheduling.service.ts:374-418,452-460`

After a batch, `keywords.length` is unconditionally reported as `articlesQueued` and the campaign is set back to `scheduled` — even if every article in the batch failed. Failed keywords become `failed` status and are never retried by the scheduler.

**Fix:** Track `successCount`/`failureCount`. If all batch articles fail, pause the campaign with `pause_reason: 'generation_failed'`.

---

### H8 · Batch Limit Service Never Called During Campaign Start

**Area:** Campaigns
**File:** `src/pages/api/campaigns/[campaignId]/start.ts` (entire flow)

`batchLimitCheck` exists and enforces per-tier limits but is never invoked in the campaign start flow. Free users can start unlimited campaigns.

**Fix:** Call `batchLimitCheck.checkAndIncrement(userId, tier)` before proceeding, return 429 if exceeded.

---

### H9 · PATCH Article Endpoint Missing QA Statuses

**Area:** Articles
**File:** `src/pages/api/articles/[articleId]/index.ts:27-39`

The Zod enum for `status` is missing `qa_checking`, `qa_passed`, `qa_failed`, `failed_timeout`. Articles in these states cannot be transitioned via the API, blocking approval of QA-passed articles.

**Fix:** Add the missing statuses to the Zod enum.

---

### H10 · QuickGenerateModal Only Recognizes `draft` as Success

**Area:** Articles
**File:** `client/components/articles/QuickGenerateModal.tsx:121,235`

Checks `article.status === 'draft'` for success. With QA enabled, generation succeeds with `qa_passed` — the modal never shows the success state and appears frozen.

**Fix:** Check for `['draft', 'qa_passed', 'qa_failed'].includes(article.status)` or any non-`generating` terminal state.

---

### H11 · Article Delivery Has No Status Validation

**Area:** Articles/Integrations
**File:** `src/pages/api/articles/[articleId]/deliver.ts:29-45`

Only checks article ownership. An article in `generating`, `queued`, or `failed` status can be delivered to WordPress/webhooks.

**Fix:** Validate status before delivery: only allow `approved`, `reviewed`, `qa_passed`, `draft`.

---

### H12 · Double Credit Allocation on First Subscription Payment

**Area:** Credits
**File:** `src/pages/api/webhooks/stripe/index.ts:164-168`

Both `invoice.payment_succeeded` and `invoice.paid` are mapped to `handleInvoicePaymentSucceeded`. Stripe sends both events for the same payment — each has a different event ID, so idempotency (tracked by event ID) doesn't prevent both from processing and adding credits.

**Fix:** Handle only `invoice.paid`. Remove the duplicate handler for `invoice.payment_succeeded` or add deduplication on `ref_id` in `credit_transactions`.

---

### H13 · `UserRepository.addCredits` Race Condition

**Area:** Credits
**File:** `shared/repositories/user.repository.ts:213-235`

Read-modify-write without a row lock. Concurrent credit additions can overwrite each other.

**Fix:** Use atomic SQL: `UPDATE profiles SET subscription_credits_balance = subscription_credits_balance + $amount WHERE id = $userId`.

---

### H14 · `decrement_credits` Legacy RPC Missing `FOR UPDATE` Lock

**Area:** Credits
**File:** `supabase/migrations/20250221000000_secure_credits.sql:148-182`

SELECT-then-UPDATE without `FOR UPDATE`. Unlike `decrement_credits_with_log` which correctly locks the row, this function allows concurrent calls to both see sufficient balance and both decrement.

**Fix:** Add `FOR UPDATE` to the SELECT, or drop this legacy function if unused.

---

### H15 · New Users Get 10 Free Credits Instead of Configured 3

**Area:** Credits
**File:** `shared/repositories/user.repository.ts:171`

`createWithDefaults` hardcodes `subscription_credits_balance: 10`. The config specifies `DEFAULT_FREE_CREDITS = 3`.

**Fix:** Use `getFreeUserCredits()` from `@shared/config/subscription.utils` instead of the hardcoded value.

---

### H16 · No CSRF Protection on Billing Endpoints

**Area:** Credits
**Files:** `checkout/index.ts`, `subscription/change/index.ts`, `subscriptions/cancel/index.ts`, `portal/index.ts`

No CSRF tokens. If the Supabase JWT is ever readable from cookies (middleware fallback), a cross-site form submission could trigger subscription cancellation.

**Fix:** Confirm `verifyApiAuth` only accepts the `Authorization` header (not cookies) for API routes. If cookies are used as fallback, add CSRF token validation.

---

### H17 · Checkout `clientSecret` Leaked for Hosted UI Mode

**Area:** Credits
**File:** `src/pages/api/checkout/index.ts:237-241`

`clientSecret` is always included in the response, even for hosted checkout where it is unnecessary and should not be exposed to browser JavaScript.

**Fix:** `clientSecret: uiMode === 'embedded' ? session.client_secret : undefined`

---

### H18 · Unhandled `JSON.parse` in 6 API Routes

**Area:** Projects
**Files:** `projects/index.ts:28`, `projects/[projectId]/index.ts:43,68`, `audiences/index.ts:43`, `competitors/index.ts:43`, `example-articles/index.ts:43`

Invalid JSON bodies throw `SyntaxError`, caught by the generic handler, and returned as opaque 500s. Should be a 400 with a clear message.

**Fix:** Wrap `JSON.parse` in try/catch returning `errorResponse('VALIDATION_ERROR', 'Invalid JSON in request body', 400)`, or switch to `withAuthAndBody`.

---

### H19 · `VALID_ONBOARDING_STEPS` Missing PREFERENCES; `MAX_STEP` Wrong

**Area:** Onboarding
**File:** `shared/validation/onboarding.schema.ts:17-28`

`VALID_ONBOARDING_STEPS` skips `OnboardingStep.PREFERENCES` (step 4). `MAX_STEP = 5` but COMPLETION is step 6. Any server-side validation of step numbers rejects valid steps.

**Fix:** Add `OnboardingStep.PREFERENCES` to the array and set `MAX_STEP = 6`.

---

### H20 · No Abort-on-Unmount for 3 Onboarding Step Fetches

**Area:** Onboarding
**Files:**
- `OnboardingStepProject.tsx:114-115,315-367`
- `OnboardingStepGSC.tsx:83-147`
- `OnboardingStepKeywords.tsx:152-233`

In-flight requests (crawl, GSC connection, keyword suggestions) are not aborted when the user navigates back/forward. State updates on unmounted components cause warnings and memory leaks.

**Fix:** Add `AbortController` cleanup to all three effects.

---

### H21 · QA Service Ignores Custom Config Thresholds

**Area:** Articles
**File:** `server/services/qa.service.ts:170-226 vs 283,357,413,540`

`runQAChecks` creates `finalConfig` by merging caller config with defaults, but the individual check methods (`checkPlagiarism`, `checkReadability`, `checkAILikelihood`) use `DEFAULT_QA_CONFIG` directly. Per-project QA thresholds are silently ignored.

**Fix:** Pass `finalConfig` to each check method instead of using the module-level default.

---

### H22 · SSRF Redirect Bypass in Website Crawler

**Area:** Projects
**File:** `server/services/website-crawler.service.ts:262`

`validateUrl()` checks the hostname before fetching but uses `redirect: 'follow'`. An attacker can set up DNS to point to a public IP initially, then redirect to `http://169.254.169.254/`. The redirect is followed without re-validating.

**Fix:** Use `redirect: 'manual'` and validate each redirect URL before following.

---

## 🟡 MEDIUM Bugs

### M1 · Double-Click Creates Duplicate Campaigns/Integrations (Onboarding)
**File:** `OnboardingStepKeywords.tsx`, `OnboardingStepIntegrations.tsx`
Async submit handlers have no ref-based guard against concurrent execution.

### M2 · Back Navigation Loses All Form Data (Onboarding)
**File:** `OnboardingWizard.tsx:76-119`
Step components re-mount with fresh state. Keywords, preferences, and integration form data lost on back.

### M3 · `OnboardingStepPreferences` Calls `onComplete()` When `projectId` Is Null
**File:** `OnboardingStepPreferences.tsx:45-63`
Silently advances without saving preferences if `projectId` is missing from store.

### M4 · Campaign Detail View Doesn't Poll Campaign Metadata
**File:** `client/hooks/useCampaignDetail.ts:206-212`
Articles poll every 5s when active, but campaign status/metadata has no polling. User sees stale "Active" for up to 30s after completion.

### M5 · Keyword Deletion Ignores Keyword Status
**File:** `server/services/campaign-keyword.service.ts:129-158`
Keywords in `queued` or `generating` status (credits already deducted, article in progress) can be deleted, creating orphaned articles.

### M6 · Campaign Delete Doesn't Block Active Generation
**File:** `server/services/campaign-lifecycle.service.ts:578-594`
Deleting an active campaign cascades DB records but the background worker keeps running, hitting errors. Credits for queued-but-not-yet-generated articles are lost.

### M7 · Progress Bar Shows `published / total` Instead of `completed / total`
**File:** `client/components/dashboard/views/campaign-detail/CampaignProgress.tsx:20-22`
Progress is 0% for campaigns where articles are in `draft` (review) status — which is the normal flow for most users.

### M8 · SEO Score Calculation on Every List Request
**File:** `src/pages/api/articles/index.ts:80-93`
Runs `calculateOverallSEOScore` (full content parse) on every list request for articles without a stored score. Risk of exceeding Cloudflare's 10ms CPU limit with many articles.

### M9 · Cron Recovery Refunds `null` Credits
**File:** `server/services/cron-article-recovery.service.ts:139-145`
No fallback for `article.credits_used === null`. Passed directly to SQL RPC which may throw or silently do nothing.

### M10 · Cosine Similarity Computed in Request Path (CPU Risk)
**File:** `server/services/openai-embeddings.service.ts:161-183`
Up to 50 × 1536 vector operations during article generation. Could exceed Cloudflare's 10ms CPU limit for projects with many articles.

### M11 · Duplicate Campaign/Integration Delivery (No Concurrency Guard)
**File:** `server/services/delivery.service.ts:66-349`
No guard against concurrent delivery runs for the same article. Auto-delivery + manual deliver can publish duplicate posts.

### M12 · `ConnectionTestError` Returns Opaque 500
**File:** `src/pages/api/_utils.ts:247-286`
`ConnectionTestError` is not handled in `handleApiError` switch. Users see "An unexpected error occurred" instead of the actual connection error message.

### M13 · `IntegrationFormModal` Only Supports WordPress and Webhook
**File:** `client/components/dashboard/views/integrations/IntegrationFormModal.tsx:48-73`
Users who created Wix, Ghost, Shopify, or other integration types during onboarding cannot edit them from the dashboard.

### M14 · Race Condition in Sub-Resource Count Checks
**Area:** Projects
**File:** `project-audience.service.ts:69-81`, `project-competitor.service.ts:77-88`, `project-example-article.service.ts:69-81`
COUNT + INSERT is not atomic. Concurrent requests can exceed the per-resource limit.

### M15 · `activeProjectId` Not Scoped Per User in localStorage
**File:** `client/store/projectStore.ts:11-23`
User A's project ID persists when User B logs in on the same device. UX degradation (flash of empty state).

### M16 · `validate-sitemap` Uses HEAD Request (Many Servers Return 405)
**File:** `src/pages/api/projects/[projectId]/validate-sitemap.ts:66`
HEAD requests are rejected by many CDNs and static hosts, causing false negatives for valid sitemaps.

### M17 · Upgrade Credits Cap Not Enforced (`maxRollover` Not Passed)
**File:** `server/webhooks/stripe/handlers/subscription.handler.ts:417-421`
`calculateUpgradeCredits` called without `maxRollover`. Agency plan's "no rollover" intent is never enforced during upgrades.

### M18 · Webhook Idempotency Silently Disabled on DB Error
**File:** `src/pages/api/webhooks/stripe/index.ts:97-105`
If the idempotency service throws (DB down), `idempotencyEnabled = false` and processing continues. All Stripe retries during a DB outage process multiple times.

### M19 · Arbitrary Client Metadata Injected Into Stripe Session
**File:** `src/pages/api/checkout/index.ts:12-18,185-188`
`metadata: z.record(z.unknown())` from the client is spread into Stripe session metadata, including the `credits` key that fallback code paths use for allocation.

### M20 · Subscription Sync Doesn't Update `subscriptions` Table on `payment_failed`
**File:** `server/services/subscription-sync.service.ts:268-283`
Only `profiles.subscription_status` updated to `past_due`. The `subscriptions` table retains its previous status, causing divergence.

### M21 · `checkExpirations` Cron Has No Query Limit
**File:** `server/services/cron-subscription-sync.service.ts:88-95`
Fetches ALL expired subscriptions with no limit. Could OOM during a bulk expiration event.

### M22 · `handleTogglePause` Uses PUT Instead of Dedicated Endpoint
**File:** `client/components/dashboard/views/CampaignDetailView.tsx:119-127`
Direct status write via PUT endpoint. Will break if state validation is added to that endpoint (as recommended in H5).

### M23 · `invoice.payment_failed` Subscription Sync Incomplete
**File:** `server/services/subscription-sync.service.ts:268-283`
Only profiles updated on payment failure; `subscriptions` table not updated to `past_due`.

### M24 · Scheduled Batch Uses Awaited Sequential Processing (CPU Risk)
**File:** `server/services/campaign-scheduling.service.ts:371-418`
Multiple articles processed sequentially within a single Cloudflare request. Accumulated CPU time for DB + JSON operations could exceed 10ms limit.

### M25 · `decrement_credits` Refund Clawback Could Go Negative
**File:** `server/webhooks/stripe/handlers/payment.handler.ts:336-366`
No verification that `clawback_from_transaction_v2` prevents negative balances when the user already spent the credits being clawed back.

---

## 🟢 LOW Bugs

### L1 · Dual Schema Definitions for Project Create/Update (Drift Risk)
**File:** `project.service.ts:36-120` vs `shared/validation/project.schema.ts:200-275`
Rules differ: `name` min 1 (service) vs 2 (shared); domain validation stricter in shared. API uses service schema; shared schema is dead code.

### L2 · No UUID Validation on Path Parameters (Multiple Routes)
All `[projectId]`, `[integrationId]`, `[articleId]` routes. Non-UUID values cause 500 from Postgres instead of a clean 400.

### L3 · `articles.project_id` is `ON DELETE SET NULL` (Orphaned Articles)
**File:** Migration `20260206100000_add_article_generation_columns.sql:8`
Quick-generate articles survive project deletion with `project_id = NULL`. UI warns users articles will be deleted, but some won't be.

### L4 · `isSkipping` State Never Reset in Onboarding Integration/GSC Steps
**File:** `OnboardingStepIntegrations.tsx:382-385`, `OnboardingStepGSC.tsx:226-229`
Set to `true` on skip, component unmounts before reset. Fragile pattern if steps are ever kept alive.

### L5 · `OnboardingStepperProgress` Comments Say "5 steps" (There Are 6)
**File:** `OnboardingStepperProgress.tsx:6,23` and `OnboardingStepComplete.tsx:4`

### L6 · `onKeyPress` Deprecated — Use `onKeyDown`
**File:** `client/components/dashboard/views/CampaignsView.tsx:222`

### L7 · `createCampaignSchema` `keywords.min(1)` Before `.optional()` — Misleading Validation
**File:** `shared/validation/campaign.schema.ts:65-70`
Says "at least one keyword required" but actually allows zero via `.optional()`.

### L8 · Hardcoded Tailwind Colors (Raw Palette, Not Tokens)
**Files:** All onboarding components, `PricingCard.tsx:243`
`emerald-*`, `amber-*`, `red-*`, `purple-*` used instead of `success`, `warning`, `error` tokens. Violates CLAUDE.md.

### L9 · `IntegrationFormModal` Only Edits WordPress/Webhook
`CampaignIntegrationsSection` and `IntegrationsView` show webhook icon for all non-WordPress integrations.

### L10 · `deleteIntegration` Hook Expects JSON but API Returns 204
**File:** `client/hooks/useIntegrations.ts:80-85`
`apiFetch` tries to parse JSON from a 204 No Content response. May throw spurious error even though deletion succeeded.

### L11 · `updateIntegration` Hook Accesses Wrong Response Shape
**File:** `client/hooks/useIntegrations.ts:67`
Expects `data.data.integration` but API returns `data.data` (flat). Returns `undefined` until query invalidation.

### L12 · Auto-Analyze Can Fire During Form Submission (Onboarding)
**File:** `OnboardingStepProject.tsx:373-389`
Debounced analyze doesn't check `isSubmitting`. Can set form fields after submission.

### L13 · Silent 200 on Delete of Non-Existent Sub-Resources
**File:** `project-audience.service.ts:101-112`, etc.
Delete of non-existent audience/competitor/example article returns `{ success: true }` instead of 404.

### L14 · `upsert ignoreDuplicates` Returns Misleading Add Count
**File:** `project-audience.service.ts:85-95`, etc.
`data.length` may equal total input even when duplicates existed. Reports "0 duplicates" incorrectly.

### L15 · `contentStrategyService.updateStatus` Has No Ownership Check
**File:** `server/services/content-strategy.service.ts:88-101`
Latent authorization gap — no `userId` param, no ownership verification.

### L16 · `QuickGenerateModal` Hardcodes Writer Cost as 1 Credit
**File:** `client/components/articles/QuickGenerateModal.tsx:161-170`
Pro/ultra presets charge 2-3 credits but modal always shows "1 credit".

### L17 · Article Deletion Doesn't Block Generating Status
**File:** `src/pages/api/articles/[articleId]/index.ts:177-200`
Deleting a `generating` article causes the background worker to fail when updating the now-deleted record.

### L18 · `BillingErrorBoundary` Navigates Away on `mailto:` Link
**File:** `client/components/stripe/BillingErrorBoundary.tsx:94-97`
`window.location.href = mailto:...` loses checkout context. Use `window.open()` instead.

---

## Priority Fix Order for Launch

### Block 1 — Security Vulnerabilities (Fix Immediately)
1. **C1** — Revoke `create_article_with_credits` from `authenticated`
2. **C2** — Remove webhook signature bypass in test mode
3. **C3** — Make idempotency check atomic
4. **C8** — Add SSRF protection to `validate-sitemap`
5. **H4** — Add SSRF protection to webhook/integration URLs
6. **C9** — Remove webhook secret from unencrypted config column + apply `redactConfig` everywhere
7. **H16** — Verify CSRF protection on billing endpoints
8. **H17** — Don't leak `clientSecret` for hosted checkout

### Block 2 — Data Loss & Credit Integrity (Fix Before First Payment)
9. **C4** — Fix `useCallback` → `useEffect` in `ContentPreferencesSection`
10. **H2** — Merge (not replace) `content_preferences` on project update
11. **H1** — Make article regeneration credit deduction atomic
12. **H13** — Fix `addCredits` race condition
13. **H14** — Add `FOR UPDATE` to `decrement_credits`
14. **H12** — Deduplicate `invoice.paid` + `invoice.payment_succeeded`
15. **H15** — Fix initial credit grant (10 → 3)
16. **M19** — Remove client-controlled `credits` from Stripe session metadata

### Block 3 — Campaign State Machine (Fix Before Beta)
17. **C5** — Add status guard to `startGenerationInternal`
18. **C6** — Move `clearCampaignRunId` to background completion path
19. **C7** — Handle all-articles-failed case
20. **H5** — Validate status transitions in campaign PUT endpoint
21. **H6** — Forward outrank fields in campaign update
22. **H7** — Handle all-batch-failed in scheduled campaigns
23. **H8** — Enforce batch limits on campaign start

### Block 4 — Article & Delivery Quality
24. **H9** — Add QA statuses to PATCH status enum
25. **H10** — Fix `QuickGenerateModal` success detection
26. **H11** — Validate article status before delivery
27. **M11** — Add delivery concurrency guard
28. **H21** — Pass `finalConfig` to QA check methods

### Block 5 — Cleanup & Polish
29. Remaining HIGH (H18–H22), MEDIUM, and LOW issues

---

*Report generated by 6 parallel bug-hunter agents. Each agent read every line of assigned files and cross-referenced types, services, and API routes.*
