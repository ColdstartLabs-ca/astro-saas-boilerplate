# AutopilotRank Product Roadmap

> AI SEO Content Automation Platform - "Outrank's Automation + Surfer's Quality. Finally."

**Last Updated:** 2026-02-13
**Launch Target:** Early March 2026

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

**Not built yet:** Content generation, campaign management, CMS publishing, humanizer, SEO scoring — all core product functionality.

---

## Vision

Build the only AI SEO platform that combines full content automation with human-level quality. Target SMB owners and agencies who need organic traffic growth without hiring writers or managing freelancers.

**Core Differentiators:**

1. Multi-model AI engine (GPT-4, Claude, Gemini) for content variety
2. Humanizer engine for AI-undetectable output
3. Pre-publication QA (plagiarism, AI detection, SEO scoring)
4. Native CMS publishing (WordPress first)
5. GSC integration for data-driven content opportunities

---

## Pricing (Target - For AutopilotRank Product)

**NOTE:** This is the target pricing for the AutopilotRank AI SEO product. The current boilerplate uses a different pricing structure (see `docs/technical/systems/billing.md` for current implementation).

No free tier. 3 free articles on signup (no credit card required).

| Tier    | Price   | Articles/Month | $/Article | Key Features                                     |
| ------- | ------- | -------------- | --------- | ------------------------------------------------ |
| Trial   | $0      | 3 (one-time)   | —         | Try before buying, no CC required                |
| Starter | $49/mo  | 30             | $1.63     | All core features, 1 WordPress site, humanizer   |
| Growth  | $99/mo  | 100            | $0.99     | GSC integration, 3 CMS sites, advanced humanizer |
| Agency  | $249/mo | 500            | $0.50     | White-label, team (5), API, unlimited sites      |

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
- [x] ProjectService: CRUD operations with plan-based project limits (Starter=1, Growth=3, Agency=unlimited)
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

- [ ] Welcome email template (quick start guide)
- [ ] Article generation complete notification
- [ ] Low credits alert (80% threshold)

**Onboarding:**

- [x] Simple in-app onboarding: connect WordPress → enter keywords → generate first article

**Landing Page & Content:**

- [ ] Final landing page polish: competitor comparison table, testimonials (placeholder), trust badges
- [ ] Features page with screenshots/GIFs of actual product
- [ ] Write 2-3 launch blog posts: "Why AI SEO Content", "AutopilotRank vs Outrank", product announcement
- [ ] Update help/FAQ for new product

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

## Post-MVP Phase 1: Product-Market Fit (Months 2-3)

**Goal:** Iterate based on beta feedback. Reach 200 users, 50 paying, validate PMF (Sean Ellis 40%+).

> Priority order: Quality first (what users complain about), then features that drive upgrades.

### P0 — Content Quality (build confidence in the product)

- [ ] Advanced humanizer engine (multi-pass rewriting, style variation)
- [ ] AI detection pass rate target: 95%+
- [ ] Pre-publication QA: plagiarism check, readability score, fact-checking flags
- [ ] Article templates: listicle, how-to, comparison, product review, pillar content

### P1 — Monetization & Retention

- [ ] Annual billing option (20% off — "2 months free")
- [ ] Overage charges: Starter $2.00, Growth $1.50, Agency $0.75 (see [Revenue Streams](../business/business-model-canvas/revenue-streams.md))
- [ ] Upgrade prompts when approaching plan limits (80% threshold)
- [x] Scheduled publishing (drip-feed campaign scheduling — moved to Milestone 6)
- [ ] Bulk actions: approve all, publish all, regenerate

### P1 — Google Search Console Integration ✅ (Moved to Milestone 6)

- [x] OAuth flow for GSC connection (with project ownership verification)
- [x] Identify content opportunities from GSC data
- [ ] Import existing keyword performance data (deeper integration)
- [ ] Auto-suggest article topics from GSC data

### P2 — Nice to Have

- [ ] Brand voice customization (tone, style, vocabulary preferences)
- [x] Image generation for articles (multi-provider: DALL-E, Stability AI, Flux — completed in Milestone 5)
- [ ] Internal linking suggestions within campaigns
- [ ] Keyword research API integration (DataForSEO or Keywords Everywhere)
- [ ] Keyword clustering (group related keywords into campaigns)
- [ ] Campaign analytics dashboard
- [ ] Content calendar view
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

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-16 | **Milestone 7 Launch Readiness completed!** Full launch gate implementation: (1) **Emails** — Updated WelcomeEmail and LowCreditsEmail for AutopilotRank, added ArticleCompleteEmail, wired email triggers in generation pipeline and low-credit alerts. (2) **Content** — Updated help page with AutopilotRank guidance, refreshed FAQ and features page, added 3 launch blog posts. (3) **Testing** — 7 new E2E test files covering critical paths (campaign→generate→review), billing flow, mobile responsiveness, blog, features, and help. (4) **Monitoring** — Baselime alert configuration documented. PRD moved to `docs/PRDs/night-watch/done/`. |
| 2026-02-16 | **Blog pages redesigned!** BlogGrid React island with search, category filters, pagination, and adaptive grid (2-col for few posts, 3-col for many). BlogSearch component added. Blog post pages now render markdown via marked with proper prose typography, reading progress bar, SEO meta tags, cover image, and bottom CTA. Updated hero copy from image upscaling to SEO content.                                                                                                                                                                                                                                                                    |
| 2026-02-16 | **CI improvements!** Fixed CI failures for launch readiness PR. Added dependency pinning and lint error fixes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-02-16 | **Night-watch 1.1.5 added!** Telegram notifications, gitignore configuration improvements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-02-13 | **Integrations Deep Dive PRD completed!** Competitive analysis of 14 SEO tools (Outrank, RankYa, Surfer SEO, Semrush, Ahrefs, etc.). Prioritized integration roadmap: Zapier/Make (Phase 1), Shopify/Webflow (Phase 2-3), Notion (Phase 3, market gap!), RSS Feed (Phase 1). Adapter pattern (`ICMSAdapter`) enables rapid new CMS integration. Integration frequency: WordPress 71%, GSC 57%, Zapier 50%, Shopify 29%.                                                                                                                                                                                                                                   |
| 2026-02-13 | **Programmatic SEO (pSEO) Strategy PRD completed!** 5-category pSEO system design: Alternatives, Comparisons, Use Cases, Free Tools, Feature Deep-dives. Data-driven JSON pattern following blog system. Category-specific sitemaps + per-page JSON-LD (FAQPage, SoftwareApplication, BreadcrumbList). SEO.astro component adoption. 30%+ traffic opportunity from low-competition keywords ($5-26 CPC).                                                                                                                                                                                                                                                  |
| 2026-02-13 | **Onboarding Flow completed!** 5-step wizard (Project → GSC → Keywords → Integrations → Complete). OnboardingStore for progress persistence. Auto-redirect on dashboard entry for new users. All onboarding components with i18n. Full test coverage (11 test files). Migration: user_onboarding table.                                                                                                                                                                                                                                                                                                                                                   |
| 2026-02-13 | **E2E testing improvements!** Fixed accessibility issues (aria-label on project name input). Multiple test fixes for reliable CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-02-13 | **More integrations!** Expanded integration framework with additional adapters and connection types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-02-12 | **Milestone 6 Integrations & Scheduling completed!** WordPress + webhook integration framework with encrypted credentials. Campaign scheduling (8 frequencies, batch size, timezone-aware). GSC OAuth integration with opportunities analysis. Cron worker for automated drip-feed generation. Schedule management UI (start/pause/resume). Auto-pause on insufficient credits. 82 scheduling unit tests. PR review: 10 security/quality fixes applied (IDOR prevention, OAuth state binding, timezone math, error handling).                                                                                                                             |
| 2026-02-09 | **Milestone 5 Article Management Dashboard completed!** ArticleList component refactor with filtering, search, inline editing. ArticleDetailModal with full Markdown content editing + live preview. AIDetectionScore component added. Approval workflow migration (approved/rejected/reviewed statuses). API endpoints for article updates (PUT/PATCH). Credit tracking already existed from Milestone 4.                                                                                                                                                                                                                                                |
| 2026-02-09 | **Image generation improvements!** Enhanced image generation service with better prompts. CampaignDetailView updated for image handling with 200+ lines of new functionality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-02-09 | **Subscription fixes!** Two critical payment bug fixes: (1) Release existing Stripe subscription schedule before applying upgrade to prevent downgrade override, (2) Remove direct credit reset from schedule completion handler to prevent double-granting credits. Tests added.                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-02-09 | **UI enhancements across dashboard!** OverviewView reorganized (416 lines). New DashboardCard component. CampaignDetailView improvements. BrandLink component. i18n updates for dashboard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-02-09 | **SEOScoreDisplay component added!** Shows SEO metrics including keyword density, heading structure, word count. Admin controller updates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-02-06 | **Milestone 3 Humanizer completed!** Integrated comprehensive AI pattern avoidance into article generation prompt (24+ patterns from Wikipedia's "Signs of AI writing"). Forbidden words/phrases, sentence variation, personality injection. Prompt-based approach (no post-processing needed).                                                                                                                                                                                                                                                                                                                                                           |
| 2026-02-06 | **Milestone 4 Campaign Management completed!** Full campaign CRUD with keywords, bulk generation (sequential), CampaignService, API endpoints, React Query hooks. UI: CampaignsView (list), CampaignDetailView (detail with stats/table), NewCampaignModal (2-step + CSV + tabs). All gaps fixed: progress tracking, sequential gen, keyword status updates, campaign completion, credit refunds. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                         |
| 2026-02-05 | **Milestone 2 AI Content Engine completed!** OpenRouter integration (GPT-4o, Claude, Gemini), 2-step article generation pipeline (outline→article), Quick Generate UI, credit deduction/refund, async via `waitUntil()`, 41 new tests. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-02-05 | **Test refactoring complete!** Fixed old plan references across all tests (hobby→starter, business→agency, pro→growth). Updated credit amounts (30/100/500) and rollover (3x). Created `tests/fixtures/plan-fixtures.ts` for DRY test configuration. All 616 unit tests passing.                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-02-05 | **Milestone 1 Foundation completed!** Database tables created (projects, campaigns, articles, keywords), billing reconfigured (3 plans: Starter $49/30cr, Growth $99/100cr, Agency $249/500cr), credit system updated to article-based. PRD moved to `docs/PRDs/done/`.                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-02-05 | Restructured MVP into 7 ordered milestones with dependency graph; consolidated pricing/financials to revenue-streams.md; added priority levels to post-MVP phases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-02-04 | Created unified roadmap for AutopilotRank pivot, split into MVP (4 weeks) and Post-MVP phases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
