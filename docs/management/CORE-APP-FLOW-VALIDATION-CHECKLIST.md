# Core App Flow Validation Checklist

> Last Updated: 2026-02-23
> Purpose: Manual QA checklist for all critical user flows. Run before each release.
> Companion to: [`PRE-RELEASE-CHECKLIST.md`](./PRE-RELEASE-CHECKLIST.md)

---

## How to Use

- Work through each section top-to-bottom
- Mark `[x]` when verified on the target environment
- Record failures with a short note: `[ ] Item — FAIL: description`
- Environment tested: `[ ] staging` `[ ] production`

---

## 1. Authentication

### 1.1 Email / Password

- [x] Sign up with new email,
- [x] redirected to dashboard (onboarding opens)
- [ ] Welcome email received after confirmation
- [x] Sign in with verified credentials → dashboard loads
- [x] Sign in with wrong password → error shown, account NOT locked after 1 attempt
- [x] "Forgot password" → reset email received → link works → new password accepted
- [x] Sign out → session cleared, redirected to home
- [x] Expired session → redirected to login, not a blank/broken page

### 1.2 Google OAuth

- [x] "Sign in with Google" → Google popup opens (GIS flow)
- [x] Complete Google OAuth → redirected to dashboard
- [ ] Welcome email received on first OAuth login
- [x] Second login with same Google account → dashboard loads (no duplicate user)
- [ ] OAuth popup blocked by browser → fallback redirect flow works

### 1.3 Session & Security

- [x] Authenticated route `/dashboard` redirects to login when unauthenticated — **automated** `tests/e2e/protected-routes.e2e.spec.ts`
- [ ] JWT token refreshes automatically (no silent logout during active use)
- [x] Accessing another user's resource returns 403, not 404 or 200 — **automated** `tests/api/authorization.api.spec.ts`

---

## 2. Onboarding Wizard (New Users)

> Steps: 1. Project → 2. GSC (optional) → 3. Keywords → 4. Integration → 5. Complete

### 2.1 Happy Path

- [x] Wizard opens automatically for users who haven't completed onboarding
- [ ] **Step 1 – Project**: enter project name → Next → project created (`projects` table)
- [ ] **Step 2 – GSC**: "Skip for now" works; step marked skipped
- [ ] **Step 2 – GSC (connected)**: connect GSC → sites list appears → Next
- [ ] **Step 3 – Keywords**: add 3+ keywords → Next → keywords saved
- [ ] **Step 4 – Integration**: connect WordPress (valid credentials) → connection validated → Next
- [ ] **Step 5 – Complete**: completion screen shown → "Go to Dashboard" → dashboard loads
- [ ] Onboarding marked complete in `profiles.onboarding_completed_at`

### 2.2 Navigation

- [ ] Back button returns to previous step without losing data
- [ ] Closing modal mid-wizard → re-opening wizard resumes at last step
- [ ] Progress stepper shows correct active/completed/skipped states

## 3. Project & Campaign Management

### 3.1 Projects

- [x] Create project → appears in project list → `projects` row created — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Edit project name/settings → changes saved — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Delete project → associated campaigns and articles cascade-deleted — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [ ] Free / Starter users blocked from creating more than 1 project
- [ ] Growth users can create up to 3 projects
- [ ] Agency users can create unlimited projects

### 3.2 Campaigns

- [x] Create campaign inside a project → campaign appears in list — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Edit campaign name / writer model / image model → changes saved — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Delete campaign → keywords removed, articles remain — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [ ] Campaign shows correct status: `draft`, `active`, `paused`, `completed`

### 3.3 Keywords

- [x] Add keywords one by one → each saved to `keywords` table — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Bulk-add keywords (comma/newline separated) → all saved — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [x] Delete a keyword → removed from list — **automated** `tests/api/projects-campaigns.api.spec.ts`
- [ ] Duplicate keyword → rejected with validation error
- [ ] Maximum keyword limit respected (if applicable)

---

## 4. Article Generation

> 1 credit = 1 article. Credits deducted atomically via `deduct_credits` RPC.

### 4.1 Manual Generation

- [ ] "Generate" on a campaign with keywords and sufficient credits → generation starts
- [ ] Article appears in list with `generating` status
- [ ] Article transitions to `pending_review` when complete
- [ ] Credit balance decremented by correct amount
- [ ] Credit transaction logged in `credit_transactions` (type = `usage`)
- [ ] Article complete email sent to user

### 4.2 Batch Generation

- [ ] Starter (batch limit 5): requesting 6 articles shows validation error
- [ ] Growth (batch limit 25): batch of 20 articles → all generate
- [ ] Agency (batch limit 100): large batch works
- [ ] Batch respects available credit balance (partial batch if insufficient)

### 4.3 Campaign Start (Immediate)

- [ ] "Start Campaign" generates articles for all keywords without schedule
- [ ] Articles created with correct `campaign_id` and `keyword_id`
- [ ] Already-generated keywords skipped (no duplicate articles)

### 4.4 Article Review

- [ ] Open article → full content displayed (title, body, meta)
- [ ] Edit article content → changes saved (`articles` table)
- [ ] SEO score displayed
- [ ] AI detection score displayed (if enabled)
- [ ] Approve article changes its status

### 4.5 Regeneration

- [ ] "Regenerate" on an article → consumes 1 credit → new content generated
- [ ] Old article content replaced after regeneration
- [ ] Credit transaction logged for regeneration
- [ ] Insufficient credits → regeneration blocked with clear message

### 4.6 Article Similarity Check

- [ ] `POST /api/articles/check-similarity` returns similarity score
- [ ] High-similarity articles flagged before generation (if applicable)

---

## 5. Scheduled Publishing

### 5.1 Schedule Setup

- [ ] Set schedule on campaign (daily/weekly frequency, time, timezone)
- [ ] Schedule saved → campaign shows scheduled status
- [x] `POST /api/campaigns/[id]/start-schedule` returns 200 — **automated** `tests/api/schedule.api.spec.ts`

### 5.2 Schedule Operations

- [x] Pause schedule → campaign moves to `paused`, cron skips it — **automated** `tests/api/schedule.api.spec.ts`
- [x] Resume schedule → campaign active again, next run fires — **automated** `tests/api/schedule.api.spec.ts`
- [ ] Cancel schedule → schedule removed, campaign back to draft

### 5.3 Cron Execution

- [x] `POST /api/cron/process-scheduled-campaigns` (with valid `X-Cron-Secret`) returns 200 — **automated** `tests/api/cron/cron-remaining.api.spec.ts`
- [ ] Scheduled campaigns generate articles at correct time
- [ ] Campaigns with 0 credits: auto-paused, user NOT silently failing
- [x] Stale `generating` articles (stuck) recovered by `POST /api/cron/recover-stale-articles` — **automated** `tests/api/cron/cron-remaining.api.spec.ts`

---

## 6. CMS Integration (WordPress Publishing)

**Supported integration types**: WordPress, Webflow, Wix, Shopify, Ghost, Notion, Webhook

### 6.1 Connection Setup

- [ ] Add WordPress integration: enter site URL + Application Password → validate
- [ ] Valid credentials → integration saved, status = `connected`
- [ ] Invalid credentials → clear error message, nothing saved
- [x] `POST /api/integrations/validate` returns 200 on valid, 422 on invalid — **automated** `tests/api/integrations.api.spec.ts`
- [ ] Credentials stored encrypted (AES-256-GCM) in `integrations` table, never in plaintext

### 6.2 Test Connection

- [ ] "Test connection" button on existing integration → success message
- [ ] Test connection with revoked credentials → failure message, integration flagged

### 6.3 Assign Integration to Campaign

- [ ] Assign integration to campaign → `campaign_integrations` row created
- [ ] Campaign without integration → articles generated but not auto-published

### 6.4 Publish to WordPress

- [ ] "Deliver" article → published to WordPress as draft or live (per campaign settings)
- [ ] Delivery appears in `article_deliveries` table
- [ ] Delivery history viewable on article page
- [ ] Duplicate delivery blocked (same article + same integration)
- [ ] Delivery with revoked credentials → graceful error, delivery status = `failed`

### 6.5 Other CMS Types (smoke test)

- [ ] Webhook integration: POST to custom URL with JSON payload on deliver
- [ ] Shopify: blog post created via REST API on deliver
- [ ] Ghost: post created via Ghost Admin API on deliver

---

## 7. Credit System

### 7.1 Free Tier (Trial)

- [ ] New user starts with 3 credits
- [ ] Generate 3 articles → credits reach 0
- [ ] 4th generation attempt → blocked, upgrade prompt shown
- [ ] Credits NOT refreshed monthly for free users
- [ ] Free users capped at max 3 credits (can't buy packs on free tier — verify)

### 7.2 Low Credit Warning

- [ ] Trigger: credits fall below 20% of plan allocation
- [ ] Dashboard shows low-credits toast/banner
- [ ] Low credits email sent (one-time, not repeated every request)
- [ ] `sendLowCreditAlert` logs correctly, no duplicate sends in same session

### 7.3 Credit Packs (One-Time Purchase)

- [ ] "Buy Credits" → Stripe checkout for correct pack (Small/Medium/Large)
- [ ] Stripe checkout in live mode uses `pk_live_*` key
- [ ] Complete checkout → `checkout.session.completed` webhook fires
- [ ] Credits added to balance (`type = 'purchase'` in `credit_transactions`)
- [ ] `purchased_credits` column updated (survives subscription renewal)
- [ ] Balance displayed correctly on dashboard (subscription + purchased)

### 7.4 Subscription Renewal (Monthly Credits)

- [ ] `invoice.paid` webhook → `add_credits` RPC called → new cycle credits granted
- [ ] Rollover: unused credits from previous cycle roll over, capped at plan max
  - Starter: current + rollover ≤ 90
  - Growth: current + rollover ≤ 300
  - Agency: no rollover
- [ ] Transaction logged with type = `subscription`
- [ ] Double-grant NOT occurring (no duplicate credits on renewal)

### 7.5 Credit Refund on Failure

- [ ] Generation fails mid-process → credits refunded automatically
- [ ] Clawback transaction logged (type = `refund`)
- [ ] `clawback_credits` RPC called correctly on failure path

### 7.6 Credit History

- [x] `GET /api/credits/history` returns paginated transaction log — **automated** `tests/api/credits.api.spec.ts`
- [x] Each entry shows: amount, type, description, timestamp — **automated** `tests/api/credits.api.spec.ts`
- [x] Negative amounts for usage; positive for purchase/subscription/refund — **automated** `tests/api/credits.api.spec.ts`

---

## 8. Subscription Management

### 8.1 Upgrade (Free → Paid)

- [ ] "Upgrade" from pricing page → Stripe checkout (correct plan price ID)
- [ ] Complete checkout → subscription created in Stripe + mirrored in `subscriptions` table
- [ ] User's plan credits granted immediately (`subscription` credit transaction)
- [ ] Dashboard shows new plan name and credit balance
- [ ] Receipt email sent by Stripe

### 8.2 Plan Change (Upgrade/Downgrade)

- [ ] `POST /api/subscription/change` → preview endpoint shows proration
- [ ] Confirm change → Stripe subscription updated
- [ ] `customer.subscription.updated` webhook → `subscriptions` table updated
- [ ] Upgrade: additional credits granted pro-rata (if applicable)
- [ ] Downgrade: effective at end of current period (no immediate credit removal)
- [ ] Scheduled downgrade shown in dashboard ("Downgrading to X on DATE")

### 8.3 Cancellation

- [ ] "Cancel subscription" → confirmation dialog
- [ ] Confirm → Stripe sets `cancel_at_period_end = true`
- [ ] Dashboard shows "Canceling on DATE" banner
- [ ] After period end: subscription → `canceled`, user → free tier credits
- [ ] "Resume" before period end → cancellation reversed

### 8.4 Stripe Customer Portal

- [x] `GET /api/portal` → redirect to Stripe-hosted portal — **automated** `tests/api/portal.api.spec.ts`
- [ ] Portal shows: current plan, payment method, invoice history
- [ ] Update payment method in portal → Stripe updates, dashboard reflects new method

### 8.5 Stripe Webhooks

- [x] `checkout.session.completed` → credits granted, subscription created — **automated** `tests/api/webhooks.api.spec.ts`
- [x] `customer.subscription.updated` → `subscriptions` table synced — **automated** `tests/api/webhooks.api.spec.ts`
- [x] `customer.subscription.deleted` → user moved to free tier — **automated** `tests/api/webhooks.api.spec.ts`
- [x] `invoice.paid` → monthly credits refreshed — **automated** `tests/api/webhooks.api.spec.ts`
- [x] `invoice.payment_failed` → subscription flagged, user notified by Stripe — **automated** `tests/api/webhooks.api.spec.ts`
- [x] Webhook signature validation passes (correct `STRIPE_WEBHOOK_SECRET`) — **automated** `tests/api/webhooks.api.spec.ts`
- [ ] Failed webhook replays succeed (idempotent handlers)
- [x] `POST /api/cron/recover-webhooks` reschedules any missed events — **automated** `tests/api/cron/cron-remaining.api.spec.ts`

---

## 9. Google Search Console Integration

### 9.1 OAuth Connect

- [x] "Connect GSC" → initiates OAuth flow (`POST /api/gsc/connect`) — **automated** `tests/api/gsc.api.spec.ts`
- [ ] Google OAuth consent → redirects to `/api/gsc/callback`
- [ ] Callback stores refresh token, connection appears in `gsc_connections`
- [ ] Disconnect button removes connection

### 9.2 Site List

- [x] After connecting, `GET /api/gsc/connections/[id]/sites` returns verified sites — **automated** `tests/api/gsc.api.spec.ts`
- [ ] User selects site → saved as active site for opportunity analysis

### 9.3 Keyword Opportunities

- [x] `POST /api/opportunities/analyze` triggers GSC data fetch — **automated** `tests/api/opportunities.api.spec.ts`
- [ ] Opportunities appear in list (low-competition, position 4-20 keywords)
- [x] `POST /api/cron/analyze-opportunities` processes opportunities in background — **automated** `tests/api/cron/analyze-opportunities.api.spec.ts`
- [ ] "Create Article" from opportunity → article generation starts
- [x] `POST /api/opportunities/[id]/create-article` returns article ID — **automated** `tests/api/opportunities.api.spec.ts`

---

## 10. Email Notifications

- [ ] **Welcome email**: received after first-time signup (email confirm or OAuth)
  - Contains: quick start guide, CTA to dashboard
- [ ] **Article complete**: received when article generation finishes
  - Contains: article title, keyword, campaign name, "Review Article" CTA
- [ ] **Low credits alert**: received when credits drop below 20% threshold
  - Contains: credits remaining, plan total, "Upgrade" and "Buy Credits" CTAs
  - NOT sent more than once per session/threshold crossing
- [ ] **Payment success**: received after successful Stripe checkout
  - Contains: order summary, credits added, plan name
- [ ] **Subscription updated**: received after plan upgrade or downgrade
  - Contains: new plan details, credits adjustment, effective date
- [ ] **Password reset**: received after "Forgot password" request
  - Contains: reset link (24 hr expiry), warning to ignore if not requested
- [ ] **Support confirmation**: received after submitting support contact form
  - Contains: reference number, expected response time
- [ ] Emails render correctly in Gmail, Outlook (check mobile view)
- [ ] From address is `noreply@autopilotrank.com` (Cloudflare routes to admin)
- [ ] Support link (`support@autopilotrank.com`) in email footer works

---

## 11. Settings & Account

### 11.1 Profile Settings

- [ ] Update display name → saved, reflected in dashboard header
- [ ] Change password (email users) → email confirmation sent
- [ ] Account deletion (if implemented) → user data removed

### 11.2 API Keys

- [x] `GET /api/settings/api-keys` → existing keys listed — **automated** `tests/api/settings.api.spec.ts`
- [x] Generate new API key → key shown once, saved hashed — **automated** `tests/api/settings.api.spec.ts`
- [x] Revoke key → no longer usable — **automated** `tests/api/settings.api.spec.ts`

### 11.3 RSS/Atom Feed

- [x] `GET /api/settings/feed/token` → generates feed token — **automated** `tests/api/settings.api.spec.ts`
- [x] `GET /api/feeds/[userId]/articles.xml` → valid XML feed of user's articles — **automated** `tests/api/settings.api.spec.ts`
- [x] Feed requires valid token (unauthorized access returns 401) — **automated** `tests/api/settings.api.spec.ts`

### 11.4 Email Preferences

- [x] `GET /api/email/preferences` → current preferences loaded — **automated** `tests/api/settings.api.spec.ts`
- [x] Toggle notification types → saved, respected on next email send — **automated** `tests/api/settings.api.spec.ts`

---

## 12. Admin Panel

- [x] `GET /api/admin/stats` → returns platform-wide stats (total users, articles, revenue) — **automated** `tests/api/admin.api.spec.ts`
- [x] `GET /api/admin/users` → paginated user list with filters — **automated** `tests/api/admin.api.spec.ts`
- [x] `GET /api/admin/users/[id]` → user detail (subscription, credits, activity) — **automated** `tests/api/admin.api.spec.ts`
- [x] `POST /api/admin/credits/adjust` → add/remove credits for user → transaction logged — **automated** `tests/api/admin.api.spec.ts`
- [x] `GET /api/admin/failure-metrics` → article generation failure rates — **automated** `tests/api/admin.api.spec.ts`
- [x] Admin routes return 403 for non-admin users — **automated** `tests/api/admin.api.spec.ts`

---

## 13. Health & Monitoring

- [x] `GET /api/health` returns 200 with `{ status: "ok" }` (or equivalent) — **automated** `tests/api/health.api.spec.ts`
- [x] `GET /api/health/stripe` returns 200 (Stripe connection verified) — **automated** `tests/api/health.api.spec.ts`
- [x] `GET /api/models` returns available AI writer models — **automated** `tests/api/health.api.spec.ts`
- [ ] Errors appear in Baselime within minutes of occurrence
- [ ] Analytics events (signup, generation, purchase) appear in Amplitude

---

## 14. Edge Cases & Error Handling

### 14.1 Insufficient Credits

- [ ] Generation with 0 credits → 402 response, clear user message, NO credit deducted
- [ ] Scheduled campaign hits 0 credits → campaign auto-paused, user notified
- [ ] Buying credits while generation is in-flight → no race condition

### 14.2 Generation Failures

- [ ] AI provider timeout → article marked `failed`, credits refunded
- [ ] AI provider error (5xx) → article marked `failed`, credits refunded
- [ ] Partial failure in batch → failed articles refunded, successful ones kept
- [ ] Stale `generating` articles (stuck > N minutes) → recovered by cron

### 14.3 CMS / Integration Errors

- [ ] Publish to WordPress with expired credentials → delivery fails gracefully
- [ ] WordPress site unreachable → timeout error, not unhandled exception
- [ ] Delivery failure → error visible on article, retry possible

### 14.4 Rate Limiting

- [ ] Public endpoint (unauthenticated): 10 requests/5 min per IP → 429 after threshold
- [ ] Authenticated endpoint: 50 requests/5 min per user → 429 after threshold
- [ ] 429 response includes `Retry-After` header

### 14.5 Concurrent Requests

- [ ] Two simultaneous generation requests for same campaign → no duplicate articles
- [ ] Simultaneous credit deductions → no over-spending (atomic RPC)
- [ ] Simultaneous webhook deliveries (same event) → idempotency key prevents duplicate

### 14.6 Input Validation

- [ ] XSS in article content → sanitized before storage and display
- [ ] SQL injection in search/filter params → rejected by Zod validation
- [ ] Overly long text inputs → truncated or rejected with validation error

---

## 15. Cron Jobs (Requires Cloudflare Worker)

> All cron endpoints require `X-Cron-Secret` header matching `CRON_SECRET` env var.

| Endpoint                                       | Trigger     | Expected Outcome                          |
| ---------------------------------------------- | ----------- | ----------------------------------------- |
| `POST /api/cron/process-scheduled-campaigns`   | Every 5 min | Scheduled campaigns processed             |
| `POST /api/cron/recover-stale-articles`        | Hourly      | Stuck articles refunded                   |
| `POST /api/cron/recover-webhooks`              | Hourly      | Failed Stripe webhooks replayed           |
| `POST /api/cron/check-expirations`             | Daily       | Expiring credits flagged                  |
| `POST /api/cron/reconcile`                     | Daily       | Subscription state reconciled with Stripe |
| `POST /api/cron/analyze-opportunities`         | Daily       | GSC opportunities refreshed               |
| `POST /api/cron/check-opportunity-performance` | Weekly      | Opportunity rankings checked              |

- [x] All cron endpoints return 200 with valid secret — **automated** `tests/api/cron/cron-remaining.api.spec.ts`, `tests/api/cron/analyze-opportunities.api.spec.ts`, `tests/api/cron/check-opportunity-performance.api.spec.ts`
- [x] All cron endpoints return 401 with invalid/missing secret — **automated** `tests/api/cron/cron-remaining.api.spec.ts`, `tests/api/cron/analyze-opportunities.api.spec.ts`, `tests/api/cron/check-opportunity-performance.api.spec.ts`
- [x] No cron endpoint is callable by unauthenticated public (not in `PUBLIC_API_ROUTES`) — **automated** `tests/api/cron/cron-remaining.api.spec.ts`

---

## 16. SEO & Public Pages

- [x] Homepage (`/`) loads, meta title/description correct — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] Pricing page (`/pricing`) shows correct plan prices — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] Blog index (`/blog`) lists posts — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] Individual blog post (`/blog/[slug]`) loads, OG tags populated — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] Legal pages (`/privacy`, `/terms`) load correctly — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] `sitemap.xml` accessible and lists public pages + blog posts — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] `robots.txt` blocks `/api/` and `/dashboard/` — **automated** `tests/e2e/public-pages.e2e.spec.ts`
- [x] `IndexNow` ping fires on new content (`POST /api/seo/indexnow`) — **automated** `tests/api/seo.api.spec.ts`

---

## Sign-off

| Flow Area               | Tester | Date | Status |
| ----------------------- | ------ | ---- | ------ |
| Authentication          |        |      |        |
| Onboarding              |        |      |        |
| Projects & Campaigns    |        |      |        |
| Article Generation      |        |      |        |
| Scheduled Publishing    |        |      |        |
| CMS Integration         |        |      |        |
| Credit System           |        |      |        |
| Subscription Management |        |      |        |
| GSC Integration         |        |      |        |
| Email Notifications     |        |      |        |
| Admin Panel             |        |      |        |
| Edge Cases              |        |      |        |
| Cron Jobs               |        |      |        |
