# AutopilotRank Product Roadmap

> AI SEO Content Automation Platform - "Outrank's Automation + Surfer's Quality. Finally."

**Last Updated:** 2026-02-05
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

### Milestone 3: Humanizer Engine (v1)

> **Why third:** Runs as a post-processing step on generated articles. Can be built independently once generation works.
> **Depends on:** Milestone 2 (needs generated articles to process)

- [ ] Post-generation rewriting pass to remove AI patterns
- [ ] Remove common AI phrases ("In today's digital landscape", "It's important to note", etc.)
- [ ] Vary sentence structure, add natural transitions
- [ ] AI detection scoring integration (GPTZero or Originality.ai API)
- [ ] Store AI detection score on article record

---

### Milestone 4: Campaign Management UI

> **Why fourth:** Users need a way to organize keywords and trigger generation in bulk.
> **Depends on:** Milestone 2 (generation pipeline must work)

- [ ] Campaign CRUD: name, target keywords (manual input + CSV upload), settings (model, tone, word count)
- [ ] Campaign dashboard: list campaigns, article counts, status overview
- [ ] Article queue: generate articles from campaign keywords (sequential, credit-deducted)
- [ ] Article status flow: `queued` → `generating` → `draft` → `reviewed` → `published`

---

### Milestone 5: Article Management Dashboard

> **Why fifth:** Users need to review, edit, and approve articles before publishing.
> **Depends on:** Milestone 4 (needs campaigns and articles to display)

- [ ] Article list view: filter by campaign, status, date
- [ ] Article detail view: full content with inline editing (rich text or Markdown)
- [ ] Basic SEO score display (keyword density, heading structure, word count, meta description)
- [ ] AI detection score display
- [ ] Approve/reject workflow before publishing
- [ ] Credit usage tracking per campaign

---

### Milestone 6: WordPress Publishing

> **Why sixth:** Publishing is the final step in the user flow. Can be built in parallel with Milestone 5.
> **Depends on:** Milestone 1 (projects table), Milestone 2 (articles exist)
> **Can parallelize with:** Milestone 5

- [ ] WordPress REST API integration (Application Passwords auth)
- [ ] Connect WordPress site flow: URL + credentials, test connection, save to `projects`
- [ ] Publish article as draft or published post
- [ ] Map article metadata (title, slug, categories, tags, featured image, meta description)
- [ ] Publishing status sync (reflect WordPress status back in dashboard)

---

### Milestone 7: Polish, Emails & Onboarding

> **Why last:** Polish comes after core functionality works end-to-end.
> **Depends on:** Milestones 1-6 complete

**Emails:**

- [ ] Welcome email template (quick start guide)
- [ ] Article generation complete notification
- [ ] Low credits alert (80% threshold)

**Onboarding:**

- [ ] Simple in-app onboarding: connect WordPress → enter keywords → generate first article

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
M1 Foundation
├── M2 AI Generation Engine
│   ├── M3 Humanizer
│   ├── M4 Campaign Management UI
│   │   └── M5 Article Dashboard
│   └── M6 WordPress Publishing (parallel with M5)
└────────── M7 Polish & Launch (after M1-M6)
```

### MVP Risk Mitigation

| Risk                             | Impact | Mitigation                                                      |
| -------------------------------- | ------ | --------------------------------------------------------------- |
| AI generation quality too low    | High   | Multi-model routing, humanizer pass, manual edit before publish |
| OpenRouter API downtime          | High   | Direct API fallback to Anthropic/OpenAI                         |
| WordPress integration complexity | Medium | Start with REST API + Application Passwords (simplest auth)     |
| Slow generation time             | Medium | Async generation with notification when complete                |
| Low beta signups                 | Medium | Personal outreach, SEO communities, free tier as hook           |

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
- [ ] Scheduled publishing (queue articles for future dates)
- [ ] Bulk actions: approve all, publish all, regenerate

### P1 — Google Search Console Integration

- [ ] OAuth flow for GSC connection
- [ ] Import existing keyword performance data
- [ ] Identify content opportunities (keywords ranking 5-20 with low impressions)
- [ ] Auto-suggest article topics from GSC data

### P2 — Nice to Have

- [ ] Brand voice customization (tone, style, vocabulary preferences)
- [ ] Image generation for articles (DALL-E/Stability AI integration)
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

| Date       | Change                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-05 | **Milestone 2 AI Content Engine completed!** OpenRouter integration (GPT-4o, Claude, Gemini), 2-step article generation pipeline (outline→article), Quick Generate UI, credit deduction/refund, async via `waitUntil()`, 41 new tests. PRD moved to `docs/PRDs/done/`.           |
| 2026-02-05 | **Test refactoring complete!** Fixed old plan references across all tests (hobby→starter, business→agency, pro→growth). Updated credit amounts (30/100/500) and rollover (3x). Created `tests/fixtures/plan-fixtures.ts` for DRY test configuration. All 616 unit tests passing. |
| 2026-02-05 | **Milestone 1 Foundation completed!** Database tables created (projects, campaigns, articles, keywords), billing reconfigured (3 plans: Starter $49/30cr, Growth $99/100cr, Agency $249/500cr), credit system updated to article-based. PRD moved to `docs/PRDs/done/`.          |
| 2026-02-05 | Restructured MVP into 7 ordered milestones with dependency graph; consolidated pricing/financials to revenue-streams.md; added priority levels to post-MVP phases                                                                                                                |
| 2026-02-04 | Created unified roadmap for AutopilotRank pivot, split into MVP (4 weeks) and Post-MVP phases                                                                                                                                                                                    |
