# AutopilotRank Product Roadmap

> AI SEO Content Automation Platform - "One platform. Full pipeline. Keyword in, published article out."

**Last Updated:** 2026-03-01
**Launch Target:** Early March 2026 🚀

---

## Current State

**Done (from boilerplate):**

- [x] Auth: Email/password, Google OAuth (Supabase)
- [x] Billing: Stripe subscriptions + one-time credit packs
- [x] Credit system: Per-user balance, transaction history, rollover
- [x] Dashboard shell: Main dashboard, billing, history, settings, support, admin panel
- [x] Monitoring: Baselime error tracking, Amplitude analytics, GA4
- [x] Email: Brevo (primary) + Resend (fallback)
- [x] Deployment: Cloudflare Pages + Workers
- [x] Blog: MDX-based system (structure exists, no content)
- [x] Legal: Privacy policy, terms of service, help/FAQ
- [x] Landing page: Rebranded hero, pain points, solution, features, pricing, FAQ

**Recent Progress (Feb 2026):**

- [x] i18n: pt-BR translations, regional currency display, hreflang SEO
- [x] pSEO: 6 free tools, 22 comparison pages, 20 alternative pages, 14 use-cases, 8 GEO guides
- [x] Security: Comprehensive audit report with remediation recommendations
- [x] Testing: E2E pruning (291 passing), API test expansion, CI workflow
- [x] Brand: Complete AutopilotRank rebrand (removed all boilerplate/MIU references)
- [x] Outrank PRD Series: 6 PRDs created, PRD 1 (schema) implemented

**Recent Progress (Mar 2026):**

- [x] Content calendar system: replace/merge mode, campaign dropdown, calendar publishing, generate-now, auto-approve
- [x] Auto-approve feature for articles + enhanced settings UI
- [x] Article list: search, pagination, limit param
- [x] Blog system upgraded: DB + MDX hybrid (webhook creates `blog_posts`, pages render both sources)
- [x] Dead code cleanup: 550+ instances removed, orphaned boilerplate, dead components (#31)
- [x] Code quality refactoring: DRY violations fixed, `useCRUD` hook factory extracted
- [x] AI detection score: heuristic scoring, on-demand analysis, external provider wired (PR #32 — in review)
- [x] Article generation enrichment v2: YouTube embedding, internal linking, citations, research enrichment (PR #33 — in review)
- [x] Campaign autopilot simplification PRD drafted (issue #36 on board, Ready)

---

## Vision

Build the only platform that owns the **full SEO content lifecycle**: keyword discovery → AI generation → optimization → CMS publishing. One subscription replaces 4 separate tools (keyword tool + AI writer + SEO optimizer + publisher). Target SMB owners and agencies who need organic traffic growth without hiring writers, managing freelancers, or stitching together multiple tools.

**Full Workflow Pipeline (the core bet):**

```
Research → Generate → Optimize → Publish → Track → Iterate
  (GSC)     (AI+HMZ)   (QA/SEO)  (WP/WH)   (GSC)   (Refresh)
```

**Core Differentiators:**

1. **Full pipeline ownership** — keyword in, published article out, no manual steps
2. Multi-model AI engine (GPT-4, Claude, Gemini) for content variety
3. Humanizer engine for AI-undetectable output
4. Pre-publication QA (AI detection, SEO scoring, readability)
5. Native CMS publishing (WordPress native + webhooks for 6 platforms)
6. GSC integration as moat (competitors lack direct Google data connection)

---

## Pricing (Target - For AutopilotRank Product)

**NOTE:** This is the target pricing for the AutopilotRank AI SEO product. The current boilerplate uses a different pricing structure (see `docs/technical/systems/billing.md` for current implementation).

No free tier. 3 free articles on signup (no credit card required).

| Tier    | Price   | Articles/Month | $/Article | Key Features                                            |
| ------- | ------- | -------------- | --------- | ------------------------------------------------------- |
| Trial   | $0      | 3 (one-time)   | —         | Try before buying, no CC required                       |
| Starter | $49/mo  | 30             | $1.63     | All core features, unlimited projects, humanizer        |
| Growth  | $99/mo  | 100            | $0.99     | GSC integration, unlimited projects, advanced humanizer |
| Agency  | $249/mo | 500            | $0.50     | White-label, team (5), API, unlimited projects          |

Annual discount: 20% off (~2 months free).

**Competitive positioning:** Starter at $49 = Outrank's output at half their $99. Growth at $99 = 3x Outrank's output at the same price. Agency at $249 = replaces a $3K-5K/mo agency.

> Full competitive analysis, overage pricing, add-ons, unit economics, and revenue projections are in [Revenue Streams](../business/business-model-canvas/revenue-streams.md) — that is the **source of truth** for all pricing decisions.

---

## MVP — Implementation Order

**Goal:** Ship a working product that generates SEO articles from keywords, lets users review/edit, and publishes to WordPress. Validate with 50 beta users.

**Target Metrics:** 50 trial users, 10-20 paying, $500-$1.5K MRR, <2 min generation, >80% AI detection pass rate.

> Each milestone depends on the previous one. Complete them in order.
> Tasks within a milestone can be parallelized.

---

### Milestone 1: Foundation (Database + Billing Reconfiguration) ✅

> **Why first:** Everything else depends on having the right DB schema and billing configured.
> **Completed:** 2026-02-05

**Database Schema** — Create migrations for the core domain tables:

- [x] `projects` table — user's connected sites (name, domain, CMS type, credentials)
- [x] `campaigns` table — keyword groups with settings (name, project_id, model, tone, word count, status)
- [x] `articles` table — generated content (campaign_id, title, content, keyword, status, model_used, seo_score, ai_detection_score, word_count, published_url)
- [x] `keywords` table — campaign keywords (campaign_id, keyword, search_volume, status)

**Billing Reconfiguration:**

- [ ] Update Stripe products and price IDs for Starter/Growth/Agency tiers (manual - requires Stripe Dashboard access)
- [x] Reconfigure credit system: 1 credit = 1 article generation
- [x] Update pricing page with new tiers + competitor comparison

---

### Milestone 2: AI Content Generation Engine ✅

> **Why second:** This is the core product. Everything downstream (humanizer, campaigns, publishing) consumes its output.
> **Completed:** 2026-02-05

**Project Management:** PRD: `docs/PRDs/done/project-management.md`

- [x] DB migration: add `industry` and `content_preferences` columns to `projects` table
- [x] ProjectService: CRUD operations — unlimited projects for all plans
- [x] API endpoints: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`
- [x] Project onboarding wizard: 3-step flow (basic info → CMS type → content preferences)
- [x] Project selector in dashboard sidebar (switch active project)
- [x] Auto-show onboarding when user has zero projects

**OpenRouter Integration:**

- [x] Set up OpenRouter API client with auth, error handling, retries
- [x] Implement model selection: GPT-4o, Claude Sonnet, Gemini Flash (auto-route or user choice)

**Article Generation Pipeline:** PRD: `docs/PRDs/done/ai-content-engine.md`

- [x] Build pipeline: keyword + parameters → structured outline → full article (2-step LLM pipeline)
- [x] Prompt engineering for SEO-optimized output (headings, keyword placement, meta description)
- [x] Store generated articles with metadata (model used, generation time, token count)
- [x] Credit deduction on generation start, refund on failure
- [x] Async generation with `ctx.waitUntil()` + client polling every 3s
- [x] Quick Generate UI in dashboard (React Hook Form + Zod)
- [x] API endpoints: `POST /api/articles/generate`, `GET /api/articles/:id`, `GET /api/articles`
- [x] i18n strings for all user-facing text (52 keys)
- [x] 41 tests passing (OpenRouter, ArticleGeneration, QuickGenerate component)

---

### Milestone 3: Humanizer Engine (v1) ✅

> **Why third:** Runs as a post-processing step on generated articles. Can be built independently once generation works.
> **Depends on:** Milestone 2 (needs generated articles to process)
> **Completed:** 2026-02-06

- [x] Humanizer instructions integrated into article generation prompt
- [x] Comprehensive AI pattern avoidance (24+ patterns from Wikipedia's "Signs of AI writing")
- [x] Sentence variation, personality injection, soulful writing guidance
- [x] Forbidden words/phrases list (additionally, serves as, underscores, crucial, pivotal, etc.)
- [x] Forbidden patterns (em dashes, rule of three, "-ing" phrases, promotional language, etc.)
- [x] Natural writing techniques (contractions, conjunctions at start, specific details, opinions)

**Note:** Implemented as prompt engineering rather than post-processing — more efficient, no extra API calls, better results.

---

### Milestone 4: Campaign Management UI ✅

> **Why fourth:** Users need a way to organize keywords and trigger generation in bulk.
> **Depends on:** Milestone 2 (generation pipeline must work)
> **Completed:** 2026-02-06

**Backend:**

- [x] Campaign CRUD: name, target keywords (manual input + CSV upload), settings (model, tone, word count)
- [x] CampaignService: full CRUD + keyword management + bulk generation orchestration
- [x] API endpoints: GET/POST/PUT/DELETE `/api/campaigns`, keywords, start generation
- [x] React Query hooks: `useCampaigns`, `useCampaignDetail`
- [x] Campaign types: `shared/types/campaign.types.ts`
- [x] 20+ unit tests for service layer

**Frontend:**

- [x] Campaign list view with cards, empty state, loading skeleton
- [x] Campaign detail view with stats grid, article queue table, search, progress bar
- [x] New Campaign modal with 2-step form (info + settings), working tabs, CSV upload
- [x] i18n wired for all user-facing text
- [x] Sequential generation with proper keyword status updates
- [x] Credit refunds on generation failure
- [x] Campaign auto-completes when all keywords processed

---

### Milestone 5: Article Management Dashboard ✅

> **Why fifth:** Users need to review, edit, and approve articles before publishing.
> **Depends on:** Milestone 4 (needs campaigns and articles to display)
> **Completed:** 2026-02-09

- [x] Article list view: filter by campaign, status, date, search functionality
- [x] Article detail view: full content with inline editing (Markdown with live preview)
- [x] Basic SEO score display (keyword density, heading structure, word count, meta description)
- [x] AI detection score display
- [x] Approve/reject workflow before publishing (status: approved, rejected, reviewed)
- [x] Credit usage tracking per campaign (already implemented in Milestone 4 - displayed in CampaignDetailView)

---

### Milestone 6: Integrations & Scheduling ✅

> **Why sixth:** CMS publishing and scheduled generation complete the end-to-end automation loop.
> **Depends on:** Milestone 4 (campaigns), Milestone 2 (articles)
> **Completed:** 2026-02-12

**Integrations Framework:** PRD: `docs/PRDs/campaign-scheduling.md`

- [x] Integration service with encrypted credentials (AES-256-GCM)
- [x] WordPress REST API adapter (Application Passwords auth, test connection, publish)
- [x] Webhook adapter (POST with HMAC-SHA256 signing)
- [x] Campaign-integration linking (many-to-many with enable/disable)
- [x] Auto-publish on article completion (configurable per campaign)
- [x] Integration management UI: create, edit, delete, test connection
- [x] Integration form modal with create/edit modes (locked fields in edit mode)
- [x] IDOR prevention: ownership validation on all integration and campaign operations

**Campaign Scheduling (Drip-Feed):**

- [x] Schedule configuration: 8 frequency options (3x daily to every 2 weeks)
- [x] Batch size, preferred hour, timezone support (13 common timezones)
- [x] Schedule API endpoints: start-schedule, pause-schedule, resume-schedule
- [x] Cron worker for processing scheduled campaigns (Cloudflare Workers Cron Trigger)
- [x] Proper timezone math (Intl.DateTimeFormat-based, DST-safe)
- [x] Schedule settings in campaign settings modal (with editability controls)
- [x] Schedule actions wired in campaign detail UI (start/pause/resume with toast notifications)
- [x] Auto-pause on insufficient credits with warning banner and buy-credits link
- [x] SEO velocity advisory (soft warnings for high publication rates)
- [x] 82 unit tests for scheduling configuration

**Google Search Console Integration:**

- [x] OAuth 2.0 flow with project ownership verification in state parameter
- [x] GSC connection management (connect, disconnect, refresh tokens)
- [x] GSC sites endpoint for listing verified properties
- [x] Upsert conflict handling (user_id + project_id composite key)
- [x] Opportunities analysis from GSC data

**Database:**

- [x] `integrations` table with encrypted credentials column
- [x] `campaign_integrations` junction table
- [x] `gsc_connections` table with OAuth tokens
- [x] Campaign scheduling columns (schedule_frequency, batch_size, timezone, hour, next_run_at)
- [x] ScheduleValidationError domain error class (returns 400, not 500)

---

### Milestone 7: Polish, Emails & Onboarding

> **Why last:** Polish comes after core functionality works end-to-end.
> **Depends on:** Milestones 1-6 complete

**Emails:**

- [x] Welcome email template (quick start guide) — `WelcomeEmail.tsx`
- [x] Article generation complete notification — `ArticleCompleteEmail.tsx`
- [x] Low credits alert — `LowCreditsEmail.tsx`

**Onboarding:**

- [x] Simple in-app onboarding: connect WordPress → enter keywords → generate first article

**Landing Page & Content:**

- [ ] Final landing page polish: competitor comparison table, testimonials (placeholder), trust badges — not implemented
- [ ] Features page screenshots/GIFs of actual product — page exists, no real product screenshots
- [x] Launch blog posts — 20 posts in `content/blog/` (including AutopilotRank vs Outrank, GSC integration, etc.)
- [x] Help/FAQ updated for new product

**Testing:**

- [ ] End-to-end flow: signup → create campaign → generate article → review → publish to WordPress
- [ ] Credit deduction and billing flow verification
- [ ] Mobile responsive check on all new pages
- [ ] Monitoring alerts for generation failures

---

### MVP Dependency Graph

```
M1 Foundation ✅
├── M2 AI Generation Engine ✅
│   ├── M3 Humanizer ✅
│   ├── M4 Campaign Management UI ✅
│   │   └── M5 Article Dashboard ✅
│   └── M6 Integrations & Scheduling ✅
└────────── M7 Polish & Launch
```

### MVP Risk Mitigation

| Risk                             | Impact | Mitigation                                                                                |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| AI generation quality too low    | High   | Multi-model routing, humanizer pass, manual edit before publish                           |
| OpenRouter API downtime          | High   | Direct API fallback to Anthropic/OpenAI                                                   |
| WordPress integration complexity | Medium | ~~Start with REST API + Application Passwords~~ DONE - adapter with encrypted credentials |
| Slow generation time             | Medium | Async generation with notification when complete                                          |
| Low beta signups                 | Medium | Personal outreach, SEO communities, free tier as hook                                     |

### Launch Checklist (after all milestones complete)

- [ ] Recruit 50 beta users (Reddit r/SEO, r/content_marketing, r/Entrepreneur, Indie Hackers)
- [ ] Product Hunt launch prep (listing, assets, description)
- [ ] Social media announcements
- [ ] Launch day monitoring

---

## Outrank Feature Parity Initiative

> **Status:** In Progress
> **Goal:** Achieve feature parity with Outrank.so to validate competitive positioning
> **Series:** 6 PRDs implementing core Outrank capabilities

**PRD 1: Schema & Data Model Foundation** ✅ (Completed 2026-02-25)

- [x] 7 migrations: projects/campaigns extended, 5 new tables
- [x] TypeScript types and Zod schemas (`shared/types/outrank.types.ts` + campaign/article fields)
- [x] 5 service classes (audiences, competitors, example articles, sitemap pages, content strategy)
- [x] 10 API endpoints for CRUD operations

**PRD 2: Website Intelligence** (Partial)

- [x] Sitemap import and parsing (`sitemap-page.service.ts`, validate-sitemap endpoint)
- [x] Website crawl for content analysis (`POST /api/projects/:id/crawl` via `website-crawler.service.ts`)
- [x] Page metadata extraction (title, description from crawl)
- [ ] Competitor favicon fetching

**PRD 3: DataForSEO Integration** (Draft)

- [ ] Keyword research API integration
- [ ] Search volume data
- [ ] Keyword difficulty scores
- [ ] SERP analysis data

**PRD 4: Enhanced Onboarding** ✅ (Completed)

- [x] Onboarding Enhancement PRD created for additive improvements
- [x] Website auto-populate from crawl (crawl endpoint wired in onboarding)
- [x] Content preferences section
- [x] Language, country, sitemap URL, blog URL fields

**PRD 5: Content Strategy Generator** (Partial)

- [ ] AI-powered content strategy generation (endpoint stub exists, AI not wired)
- [x] Topic clustering from GSC data (`opportunity-analysis.service.ts` — `topic_cluster` opportunity type)
- [x] Content gap analysis (`opportunity-analysis.service.ts` — `content_gap` opportunity type + OpportunitiesView UI)
- [ ] Editorial calendar recommendations (calendar exists, strategy-driven recommendations not yet linked)

**PRD 6: Enhanced Article Generation** (Partial — PR #33 in review)

- [ ] Article style presets — DB column + type exist (`informative|how-to|listicle|opinion|tutorial|review|comparison`), **not wired to prompts**
- [x] Internal linking configuration (implemented in PR #33)
- [ ] Global instructions per campaign — DB column exists, **not appended to AI prompts**
- [x] YouTube embedding toggle (implemented in PR #33)
- [x] Citations / trust signals (implemented in PR #33)
- [ ] CTA, infographic, emoji toggles — DB columns exist (`include_cta`, `include_infographics`, `include_emojis`), **not used in prompts**
- [ ] Image style selection — DB column exists (`image_style`), **not consumed by image generation**

> PRDs are in `docs/PRDs/outrank-*.md`. Implementation tracking in each PRD.

---

## Positioning & Launch Cleanup Initiative

> **Status:** Completed 2026-02-27
> **Goal:** Fix all landing page / product gaps before launch. Pivot core value prop to full-workflow positioning.

**PRD: Landing & Product Gap Cleanup** ✅ (`docs/PRDs/landing-product-gap-cleanup.md`)

- [x] Pivot value prop from "quality automation" → "full workflow ownership" across all docs
- [x] Fix Growth plan article count (150→100) on landing page
- [x] Fix Agency plan claim ("Unlimited"→"500/mo") on landing page
- [x] Fix pricing meta description ($9-$149 → $49-$249)
- [x] Remove unsubstantiated aggregateRating (4.8/12) from JSON-LD
- [x] Soften unverified "95%+ pass rate" claim
- [x] Remove Webflow "coming soon" (adapter is fully built)
- [x] Update feature matrix in value-proposition.md (✅→🔜 for unbuilt features)
- [x] Update landing page headlines to pipeline messaging

---

## Post-MVP Phase 1: Product-Market Fit (Months 2-3)

**Goal:** Iterate based on beta feedback. Reach 200 users, 50 paying, validate PMF (Sean Ellis 40%+).

> Priority order: Quality first (what users complain about), then features that drive upgrades.

### ✅ P0 — Content Performance Analytics (closes the full-workflow loop)

> **Status:** Done — PRD: `content-performance-analytics.md`

- [x] **PRD:** `content-performance-analytics.md`
- [x] Per-article performance dashboard: clicks, impressions, position, CTR (pulled from GSC by article URL)
- [x] Article → published URL linkage (capture `published_url` when auto-publishing, allow manual input)
- [x] Analytics dashboard view (enabled at `/dashboard/analytics`)
- [x] Campaign-level aggregate: total clicks/impressions for all articles in campaign
- [ ] "Top performing articles" sort/filter in article list
- [ ] Basic rank tracking — `article_performance_snapshots` table + GSC sync exist, UI rank display not implemented

### P0 — Content Quality (build confidence in the product)

- [ ] Advanced humanizer engine (multi-pass rewriting, style variation)
- [x] Pre-publication QA: plagiarism check, readability score, fact-checking flags — all implemented in QA pipeline
- [ ] Article templates wired to prompts — DB types exist (`listicle`, `how-to`, `comparison`, `review`), **not applied in generation prompts**

### P1 — Monetization & Retention

- [ ] Annual billing option (20% off — "2 months free") — monthly only in `subscription.config.ts`
- [ ] Overage charges: Starter $2.00, Growth $1.50, Agency $0.75 (see [Revenue Streams](../business/business-model-canvas/revenue-streams.md))
- [ ] Upgrade prompts when approaching plan limits (80% threshold)
- [x] Scheduled publishing (drip-feed campaign scheduling — moved to Milestone 6)
- [ ] Bulk actions: approve all, publish all, regenerate — no batch endpoints implemented

### P1 — Google Search Console Integration ✅ (Moved to Milestone 6)

- [x] OAuth flow for GSC connection (with project ownership verification)
- [x] Identify content opportunities from GSC data
- [ ] Import existing keyword performance data (deeper integration)
- [ ] Auto-suggest article topics from GSC data

### P2 — Nice to Have

- [ ] Brand voice customization (tone, style, vocabulary preferences)
- [x] Image generation for articles (multi-provider: DALL-E, Stability AI, Flux — completed in Milestone 5)
- [x] Internal linking suggestions within campaigns (implemented in PR #33)
- [ ] Keyword research API integration (DataForSEO or Keywords Everywhere)
- [ ] Keyword clustering (group related keywords into campaigns)
- [ ] Campaign analytics dashboard (→ moved to P0 above as Content Performance Analytics)
- [x] Content calendar view (completed: month/week/day views, publishing, generate-now, replace/merge mode)
- [ ] Export articles (Markdown, HTML, DOCX)
- [ ] Webflow CMS API publishing
- [ ] Shopify blog publishing
- [ ] Referral program (give 3 free articles, get 3 free articles)

---

## Post-MVP Phase 2: Scaling (Months 4-6)

**Goal:** 600 customers, $30K-50K MRR, build competitive moat.

### P0 — Scale & Reliability

- [ ] Article generation queue with retry logic and dead-letter handling
- [ ] Rate limiting per tier for API and generation
- [ ] Automatic failover between AI models on errors
- [ ] Bulk generation: 100-1000 articles from keyword list + template
- [ ] Template system: define article structure, vary by keyword

### P1 — SEO Tools & Content Marketing

- [ ] On-page SEO audit for generated articles (detailed scoring)
- [ ] SERP analysis: top 10 content analysis for target keyword
- [ ] Rank tracking (basic): monitor positions for published article keywords
- [ ] "AutopilotRank vs Outrank.so" comparison page
- [ ] "AutopilotRank vs Surfer SEO" / Byword / Jasper comparison pages
- [ ] "Best AI SEO Tools 2026" roundup page

### P2 — Engagement & Retention

- [ ] Drip onboarding sequence (7 emails over 14 days)
- [ ] Weekly content digest email
- [ ] Monthly usage summary email
- [ ] Win-back campaigns for churned users
- [ ] Dynamic schema markup generation (FAQ, HowTo, Article)
- [ ] Automated internal linking across campaign articles

---

## Growth Phase (Months 7-12)

**Goal:** 2,500 customers, $200K+ MRR, agency partner program.

### P0 — Agency & Team (unlock Agency tier value)

- [ ] Team accounts: invite members, role-based permissions (Admin, Editor, Viewer)
- [ ] White-label: remove AutopilotRank branding, custom domain
- [ ] Client management: separate workspaces per client
- [ ] Agency partner program: 20-30% revenue share for resellers

### P1 — Platform Distribution

- [ ] WordPress.org plugin (manage campaigns from WP admin)
- [ ] Shopify App Store listing
- [ ] Public REST API + API key management + developer docs
- [ ] Webhook callbacks for async generation

### P2 — Enterprise & Paid Acquisition

- [ ] SSO (SAML/OIDC)
- [ ] SLA agreements, dedicated CSM
- [ ] Google Search Ads ($5-10K/mo), LinkedIn Ads ($3-5K/mo)
- [ ] AppSumo lifetime deal for awareness burst

---

## Scale Phase (Months 13-24)

**Goal:** 8,000 customers, $1M+ MRR, Series A readiness.

- [ ] Multi-language content generation (Spanish, French, German, Portuguese)
- [ ] AI-powered content refresh (auto-update aging articles)
- [ ] Brand voice fine-tuning (learn from existing content)
- [ ] Competitive content analysis (why competitor content ranks)
- [ ] Backlink network: AI-powered niche matching, outreach templates
- [ ] Marketplace integrations: Zapier/Make, HubSpot, Google Docs, Notion, Ghost
- [ ] International expansion: i18n dashboard, localized landing pages, local payments

---

## Tech Stack

| Component      | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Frontend       | Astro 5 + React 18 (islands)                          |
| Backend / API  | Astro SSR + Cloudflare Workers                        |
| Database       | Supabase (PostgreSQL)                                 |
| Auth           | Supabase Auth (email, Google OAuth)                   |
| Payments       | Stripe (subscriptions + one-time)                     |
| AI Models      | OpenRouter (GPT-4, Claude, Gemini)                    |
| Email          | Brevo + Resend                                        |
| Monitoring     | Baselime + Amplitude + GA4                            |
| Deployment     | Cloudflare Pages                                      |
| CMS Publishing | WordPress REST API (MVP), Webflow, Shopify (post-MVP) |

---

## Key References

> Financial details (revenue projections, unit economics, LTV, CAC, margins) live in [Revenue Streams](../business/business-model-canvas/revenue-streams.md) — **single source of truth** for all numbers.

- [Revenue Streams](../business/business-model-canvas/revenue-streams.md) — Pricing, unit economics, revenue projections, LTV/CAC
- [Value Proposition](../business/business-model-canvas/value-proposition.md) — Competitive positioning
- [Customer Segments](../business/business-model-canvas/customer-segments.md) — Target personas
- [Lean Product Playbook](../business/business-model-canvas/lean-product-playbook.md) — PMF strategy
- [Cost Structure](../business/business-model-canvas/cost-structure.md) — Infrastructure costs
- [Landing Page Spec](../business/landing-page.md) — Landing page design specification

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-01 | **Article generation enrichment v2!** YouTube embedding, internal linking, and citations/trust signals added to article generation pipeline (PR #33). AI detection score wired end-to-end: heuristic scoring, on-demand analysis, and external provider integration (PR #32). Content calendar system completed with replace/merge mode, campaign dropdown, calendar publishing, auto-approve, and generate-now. Auto-approve feature added to article settings. Article list gains search, pagination, limit param. Blog upgraded to DB+MDX hybrid. Dead code cleanup (#31 — 550+ instances). Code quality refactoring (useCRUD hook factory, DRY violations). Campaign autopilot simplification PRD drafted and queued on board (issue #36, Ready). |
| 2026-02-27 | **Value prop pivot + landing cleanup!** Pivoted core positioning from "quality automation" to "full workflow ownership" (keyword→generate→optimize→publish). Fixed all landing page discrepancies: Growth 150→100 articles/mo, Agency "Unlimited"→500/mo, pricing meta $9-$149→$49-$249, removed fake aggregateRating, softened unverified 95% claim, unblocked Webflow (adapter was already built). Updated feature matrix in value-proposition.md (15+ unbuilt features changed from ✅ to 🔜). Elevated content performance analytics to P0 — closes the full-workflow loop via existing GSC integration. Created CURRENT-FEATURES.md for quick reference. |
| 2026-02-25 | **Outrank PRD Series launched!** 6-PRD series for Outrank feature parity created: (1) Schema & Data Model Foundation, (2) Website Intelligence, (3) DataForSEO Integration, (4) Enhanced Onboarding, (5) Content Strategy Generator, (6) Enhanced Article Generation. PRD 1 implemented: 7 migrations, TypeScript types, Zod schemas, 5 service classes, 10 API routes for target audiences, competitors, example articles, sitemap pages, and content strategies. Onboarding enhancement PRD created for additive improvements to onboarding flow. DEV-ONBOARDING.md added with comprehensive developer guide.                                               |
| 2026-02-25 | **Dead Code Report completed!** Comprehensive analysis of 920 files identified 550+ instances of dead code (41 CRITICAL, 482 HIGH, 34 MEDIUM). Key findings: 34 orphaned boilerplate files (image compression, bulk processing), 11 dead UI components, 3 dead stores/hooks, 6 unreachable API endpoints from incomplete PRDs. Calendar system PRD created for content scheduling with month/week/day views.                                                                                                                                                                                                                                                  |
| 2026-02-24 | **E2E Tests 100% passing!** All e2e tests now passing with comprehensive fixes to auth, checkout, billing, and features test suites. Reduced test code by 720 lines while improving reliability.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-02-24 | **Landing page polish!** Fixed `&apos;` rendering bugs and improved pain point card design. Hero copy refined. Updated blog posts for better SEO.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-02-23 | **API Testing Expansion!** Added §4 article generation API tests and updated validation checklists. In-memory Supabase mock enabled for Playwright API tests. Skip conditions added for tests requiring real DB/external access.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-02-23 | **Dashboard fixes!** Stripped locale prefix in dashboard React router for i18n support. Added `/api/health/*` to public routes. Fixed duplicate React keys in CalendarView day headers. Persisted onboarding dismissed flag in localStorage. Added pt-BR translation for humanizer FAQ key. Removed invalid useMemo hook from FooterAstro. Fixed auth callback pages CSS layout. Resolved merge conflict in Layout.astro (favicon + hreflang/canonical).                                                                                                                                                                                                      |
| 2026-02-18 | **Brand cleanup complete!** Replaced all SaaS Boilerplate and MyImageUpscaler references with AutopilotRank branding. Updated logger service name assertion to autopilotrank-api. Pre-release content and SEO polish pass completed. Fixed non-existent autopilotrank-vs-jasper slug in comparisons data. Skipp updates for onboarding flow.                                                                                                                                                                                                                                                                                                                  |
| 2026-02-18 | **Cloudflare Workers deployment fixes!** Resolved secret injection and CSP issues for production deployment. Merged i18n-geo-expansion and pseo-scale-geo-expansion PRs. OAUTH_STATE_SECRET renamed to GSC_STATE_SECRET for clarity.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-02-18 | **i18n Geo Expansion completed!** pt-BR locale (96.4% complete, 19 translation files), regional currency display (8 currencies: BRL, INR, GBP, EUR, AUD, PHP, PKR, IDR), hreflang SEO links, sitemap index. Zustand localeStore, LocaleInit component. Merged PR #11.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-02-18 | **pSEO Scale & GEO Expansion completed!** 6 interactive tools (MetaDescriptionTool, TitleTagTool, SeoRoiCalculator, ReadingLevelChecker, ContentLengthAnalyzer), scaled content (22 comparisons, 20 alternatives, 14 use-cases, 8 GEO guides), 5 blog posts. Tool component registry for scalability. Merged PR #10.                                                                                                                                                                                                                                                                                                                                          |
| 2026-02-18 | **Security Audit Report completed!** Comprehensive audit: 1 CRITICAL (live API keys in .env.api), 3 HIGH (unencrypted OAuth tokens, CSP weaknesses), 6 MEDIUM findings. 18-page report with remediation recommendations. Merged PR #6.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-02-18 | **Tests Quality improvements!** Test quality PRD with CI workflow (.github/workflows/test.yml). E2E test pruning (fixed 7 broken files, removed 3 redundant: billing-flow, critical-path, help). 291 tests passing. Page object enhancements (ArticlesPage, BillingPage, CampaignsPage). Merged PR #9.                                                                                                                                                                                                                                                                                                                                                        |
| 2026-02-18 | **E2E test improvements!** Improved admin tests reliability and reorganized PRDs. Moved e2e-articles-skip-onboarding PRD to done. PRDs reorganized for better clarity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-02-16 | **Milestone 7 Launch Readiness completed!** Full launch gate implementation: (1) **Emails** — Updated WelcomeEmail and LowCreditsEmail for AutopilotRank, added ArticleCompleteEmail, wired email triggers in generation pipeline and low-credit alerts. (2) **Content** — Updated help page with AutopilotRank guidance, refreshed FAQ and features page, added 3 launch blog posts. (3) **Testing** — 7 new E2E test files covering critical paths (campaign→generate→review), billing flow, mobile responsiveness, blog, features, and help. (4) **Monitoring** — Baselime alert configuration documented. PRD moved to `docs/PRDs/night-watch/done/`.     |
| 2026-02-16 | **Blog pages redesigned!** BlogGrid React island with search, category filters, pagination, and adaptive grid (2-col for few posts, 3-col for many). BlogSearch component added. Blog post pages now render markdown via marked with proper prose typography, reading progress bar, SEO meta tags, cover image, and bottom CTA. Updated hero copy from image upscaling to SEO content.                                                                                                                                                                                                                                                                        |
| 2026-02-16 | **CI improvements!** Fixed CI failures for launch readiness PR. Added dependency pinning and lint error fixes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-02-16 | **Night-watch 1.1.5 added!** Telegram notifications, gitignore configuration improvements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-02-13 | **Integrations Deep Dive PRD completed!** Competitive analysis of 14 SEO tools (Outrank, RankYa, Surfer SEO, Semrush, Ahrefs, etc.). Prioritized integration roadmap: Zapier/Make (Phase 1), Shopify/Webflow (Phase 2-3), Notion (Phase 3, market gap!), RSS Feed (Phase 1). Adapter pattern (`ICMSAdapter`) enables rapid new CMS integration. Integration frequency: WordPress 71%, GSC 57%, Zapier 50%, Shopify 29%.                                                                                                                                                                                                                                       |
| 2026-02-13 | **Programmatic SEO (pSEO) Strategy PRD completed!** 5-category pSEO system design: Alternatives, Comparisons, Use Cases, Free Tools, Feature Deep-dives. Data-driven JSON pattern following blog system. Category-specific sitemaps + per-page JSON-LD (FAQPage, SoftwareApplication, BreadcrumbList). SEO.astro component adoption. 30%+ traffic opportunity from low-competition keywords ($5-26 CPC).                                                                                                                                                                                                                                                      |
| 2026-02-13 | **Onboarding Flow completed!** 5-step wizard (Project → GSC → Keywords → Integrations → Complete). OnboardingStore for progress persistence. Auto-redirect on dashboard entry for new users. All onboarding components with i18n. Full test coverage (11 test files). Migration: user_onboarding table.                                                                                                                                                                                                                                                                                                                                                       |
| 2026-02-13 | **E2E testing improvements!** Fixed accessibility issues (aria-label on project name input). Multiple test fixes for reliable CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-02-13 | **More integrations!** Expanded integration framework with additional adapters and connection types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-02-12 | **Milestone 6 Integrations & Scheduling completed!** WordPress + webhook integration framework with encrypted credentials. Campaign scheduling (8 frequencies, batch size, timezone-aware). GSC OAuth integration with opportunities analysis. Cron worker for automated drip-feed generation. Schedule management UI (start/pause/resume). Auto-pause on insufficient credits. 82 scheduling unit tests. PR review: 10 security/quality fixes applied (IDOR prevention, OAuth state binding, timezone math, error handling).                                                                                                                                 |
| 2026-02-09 | **Milestone 5 Article Management Dashboard completed!** ArticleList component refactor with filtering, search, inline editing. ArticleDetailModal with full Markdown content editing + live preview. AIDetectionScore component added. Approval workflow migration (approved/rejected/reviewed statuses). API endpoints for article updates (PUT/PATCH). Credit tracking already existed from Milestone 4.                                                                                                                                                                                                                                                    |
| 2026-02-09 | **Image generation improvements!** Enhanced image generation service with better prompts. CampaignDetailView updated for image handling with 200+ lines of new functionality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-02-09 | **Subscription fixes!** Two critical payment bug fixes: (1) Release existing Stripe subscription schedule before applying upgrade to prevent downgrade override, (2) Remove direct credit reset from schedule completion handler to prevent double-granting credits. Tests added.                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-02-09 | **UI enhancements across dashboard!** OverviewView reorganized (416 lines). New DashboardCard component. CampaignDetailView improvements. BrandLink component. i18n updates for dashboard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-02-09 | **SEOScoreDisplay component added!** Shows SEO metrics including keyword density, heading structure, word count. Admin controller updates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-02-06 | **Milestone 3 Humanizer completed!** Integrated comprehensive AI pattern avoidance into article generation prompt (24+ patterns from Wikipedia's "Signs of AI writing"). Forbidden words/phrases, sentence variation, personality injection. Prompt-based approach (no post-processing needed).                                                                                                                                                                                                                                                                                                                                                               |
| 2026-02-06 | **Milestone 4 Campaign Management completed!** Full campaign CRUD with keywords, bulk generation (sequential), CampaignService, API endpoints, React Query hooks. UI: CampaignsView (list), CampaignDetailView (detail with stats/table), NewCampaignModal (2-step + CSV + tabs). All gaps fixed: progress tracking, sequential gen, keyword status updates, campaign completion, credit refunds. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                             |
| 2026-02-05 | **Milestone 2 AI Content Engine completed!** OpenRouter integration (GPT-4o, Claude, Gemini), 2-step article generation pipeline (outline→article), Quick Generate UI, credit deduction/refund, async via `waitUntil()`, 41 new tests. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-02-05 | **Test refactoring complete!** Fixed old plan references across all tests (hobby→starter, business→agency, pro→growth). Updated credit amounts (30/100/500) and rollover (3x). Created `tests/fixtures/plan-fixtures.ts` for DRY test configuration. All 616 unit tests passing.                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-02-05 | **Milestone 1 Foundation completed!** Database tables created (projects, campaigns, articles, keywords), billing reconfigured (3 plans: Starter $49/30cr, Growth $99/100cr, Agency $249/500cr), credit system updated to article-based. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-02-05 | Restructured MVP into 7 ordered milestones with dependency graph; consolidated pricing/financials to revenue-streams.md; added priority levels to post-MVP phases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-02-04 | Created unified roadmap for AutopilotRank pivot, split into MVP (4 weeks) and Post-MVP phases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
