# AutopilotRank — Current Features

> **Last Updated:** 2026-02-27
> Source of truth: `shared/config/subscription.config.ts` (plans/pricing) · `client/config/dashboardRoutes.ts` (enabled features)

This document lists what is **actually built and live** vs what is **planned**. Use this to avoid false claims in marketing.

---

## Plans & Pricing

| Plan           | Price   | Articles/Month           | Rollover Cap             | Sites     |
| -------------- | ------- | ------------------------ | ------------------------ | --------- |
| **Free/Trial** | $0      | 3 (one-time, no refresh) | 3                        | 1         |
| **Starter**    | $49/mo  | 30                       | 90 (3×)                  | 1         |
| **Growth**     | $99/mo  | 100                      | 300 (3×)                 | 3         |
| **Agency**     | $249/mo | 500                      | None (use it or lose it) | Unlimited |

**Credit packs (one-time, never expire):** 10 for $9.99 · 25 for $19.99 · 50 for $34.99

**Credit cost per article:**

- Budget writer (no image): 1 credit
- Balanced writer + image: 2 credits
- Pro writer + image: 3 credits
- Ultra writer + Ultra image: 5 credits

---

## Full Workflow Status

```
Research   →   Generate   →   Optimize   →   Publish   →   Track   →   Iterate
 Partial         ✅             Partial         ✅          ❌ TODO      ❌ TODO
```

---

## ✅ Live Features

### Content Generation

- **Multi-model AI** — 4 tiers: Budget (Gemini Flash), Balanced (GPT-4o mini), Pro (GPT-4o), Ultra (Claude Opus 4.6)
- **Humanizer engine** — AI-pattern avoidance baked into generation prompt (24+ patterns)
- **Pre-publication QA** — SEO score, AI detection score, readability, word count displayed per article
- **Bulk generation** — Campaign-based batch generation from keyword queue
- **Article templates** — Blog article (default). More types 🔜
- **Image generation** — AI images (DALL-E, Stability AI, Flux) generated per article (costs extra credits)

### Campaign Management

- **Keyword input** — Manual entry, CSV bulk upload
- **GSC keyword discovery** — Opportunities view: surfaces high-impression, low-CTR keywords from Google Search Console
- **Campaign scheduling** — 8 frequencies (3× daily → every 2 weeks), batch size, timezone-aware, DST-safe
- **Auto-pause on low credits** — Campaigns pause automatically with buy-credits prompt
- **Article review queue** — Approve/reject articles before publishing

### Publishing (CMS Integrations)

- **WordPress** — Native REST API integration (Application Passwords auth), publish as draft or live
- **Webflow** — Webhook adapter (push on publish)
- **Shopify** — Webhook adapter
- **Ghost** — Webhook adapter
- **Notion** — Webhook adapter
- **Wix** — Webhook adapter
- **Custom webhooks** — HMAC-SHA256 signed POST to any endpoint
- **Auto-publish mode** — Publish approved articles automatically after QA
- **Review mode** — Queue for manual approval before publish
- **Scheduled drip-feed** — Articles published gradually on schedule

### GSC Integration

- **OAuth 2.0 connection** — Per-project, with token refresh
- **Opportunities dashboard** — Shows keywords worth targeting based on your GSC data
- **Multi-property support** — Connect different GSC properties per project

### Platform

- **Auth** — Google OAuth (primary) + email/password
- **Billing** — Stripe subscriptions + one-time credit packs, upgrade/downgrade, rollover
- **Credit system** — Per-user balance, transaction history, refunds on generation failure
- **Dashboard** — Overview, Campaigns, Articles, Integrations, Opportunities, Billing, Settings, Support
- **Onboarding wizard** — 6-step flow: Project → GSC → Keywords → Preferences → Integration → Complete
- **Admin panel** — User management, blog admin
- **Email notifications** — Welcome, article complete, low credits alert
- **i18n** — English (default) + pt-BR
- **Monitoring** — Baselime error tracking, Amplitude, GA4

---

## 🔜 Planned (Not Yet Built)

### Dashboard Sections (disabled — `enabled: false` in dashboardRoutes.ts)

| Section                  | Path                      | Code Status                                                |
| ------------------------ | ------------------------- | ---------------------------------------------------------- |
| **Keywords Research**    | `/dashboard/keywords`     | UI exists (`_disabled/KeywordsView.tsx`), no backend       |
| **Content Optimization** | `/dashboard/optimization` | UI exists (`_disabled/OptimizationView.tsx`), no backend   |
| **Publishing Calendar**  | `/dashboard/calendar`     | Full UI exists (`_disabled/CalendarView.tsx`), PRD written |
| **Backlink Exchange**    | `/dashboard/backlinks`    | UI stub exists, no backend                                 |
| **Analytics & Tracking** | `/dashboard/analytics`    | Stub only (13 lines), **P0 priority**                      |

### Content Performance Analytics (P0 — closes full-workflow loop)

> The GSC OAuth is already built. This is primarily a data-pull + UI layer.
> PRD needed: `docs/PRDs/content-performance-analytics.md`

- Per-article performance: clicks, impressions, position, CTR (from GSC by article URL)
- Article → published URL linkage
- Campaign-level aggregate metrics
- Basic rank tracking per keyword

### Keyword & Research Features

- Standalone keyword research tool (volume, difficulty, CPC)
- SERP analysis (top 10 competitor content analysis)
- DataForSEO integration (Outrank PRD 3)
- Keyword clustering

### Content Quality

- Advanced humanizer (multi-pass post-processing)
- Plagiarism check
- Fact-checking flags
- Brand voice customization
- More article templates (listicle, how-to, comparison, product review, pillar)

### Agency Features

- White-label reports _(listed on Agency plan as "coming soon")_
- Team accounts (up to 5 members)
- Client management workspaces

### Other

- Annual billing (20% off)
- Overage charges (instead of hard stop)
- Export articles (Markdown, HTML, DOCX)
- Webflow CMS API publishing (currently webhook only)
- Shopify blog publishing (currently webhook only)
- Content refresh recommendations
- Internal linking automation across campaigns
- WordPress.org plugin

---

## Known Marketing Claims to Keep Accurate

| Claim                          | Status              | Notes                                            |
| ------------------------------ | ------------------- | ------------------------------------------------ |
| "100 articles/mo" (Growth)     | ✅ Accurate         | Was wrong at "150" — fixed 2026-02-27            |
| "500 articles/mo" (Agency)     | ✅ Accurate         | Was wrong at "Unlimited" — fixed 2026-02-27      |
| "White-label reports" (Agency) | 🔜 Coming soon      | Now correctly labelled in pricing                |
| "Webflow integration"          | ✅ Live via webhook | No longer "coming soon"                          |
| AI detection pass rate         | Qualitative only    | "High pass rates" — no hard % until tested       |
| Social proof stats             | None claimed        | aggregateRating removed until real reviews exist |
| "Unlimited articles"           | ❌ Never claim      | All plans have limits                            |
