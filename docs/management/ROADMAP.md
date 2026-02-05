# AutopilotRank Product Roadmap

> AI SEO Content Automation Platform - "Outrank's Automation + Surfer's Quality. Finally."

**Last Updated:** 2026-02-04
**Launch Target:** Early March 2026 (4 weeks)

---

## Current State

The codebase has a production-tested SaaS boilerplate with:

- **Auth**: Email/password, Google OAuth (Supabase)
- **Billing**: Stripe subscriptions + one-time credit packs
- **Credit System**: Per-user balance, transaction history, rollover
- **Dashboard Shell**: Main dashboard, billing, history, settings, support, admin panel
- **Monitoring**: Baselime error tracking, Amplitude analytics, GA4
- **Email**: Brevo (primary) + Resend (fallback)
- **Deployment**: Cloudflare Pages + Workers
- **Blog**: MDX-based system (structure exists, no content)
- **Legal**: Privacy policy, terms of service, help/FAQ

**What does NOT exist yet:** Content generation, keyword research, campaign management, CMS publishing, humanizer, SEO scoring - all core AutopilotRank functionality.

---

## Vision

Build the only AI SEO platform that combines full content automation with human-level quality. Target SMB owners and agencies who need organic traffic growth without the overhead of hiring writers or managing freelancers.

**Core Differentiators:**
1. Multi-model AI engine (GPT-4, Claude, Gemini) for content variety
2. Humanizer engine for AI-undetectable output
3. Pre-publication QA (plagiarism, AI detection, SEO scoring)
4. Native CMS publishing (WordPress first)
5. GSC integration for data-driven content opportunities

---

## MVP (4 Weeks - Launch by Early March 2026)

**Goal:** Ship a working product that generates SEO articles from keywords, lets users review/edit, and publishes to WordPress. Validate with 50 beta users.

**Target Metrics:**
- 50 trial users (3 free articles each)
- 10-20 paying customers
- $500-$1,500 MRR
- <2 min article generation time
- Content passes AI detection >80% of the time

### Pricing (MVP)

No free tier. 3 free articles on signup (no credit card) to try the product.

| Tier | Price | Articles/Month | $/Article | Key Features |
|------|-------|----------------|-----------|--------------|
| Trial | $0 | 3 (one-time) | — | Try before buying, no CC required |
| Starter | $49/mo | 30 | $1.63 | All core features, 1 WordPress site, humanizer |
| Growth | $99/mo | 100 | $0.99 | GSC integration, 3 CMS sites, advanced humanizer |
| Agency | $249/mo | 500 | $0.50 | White-label, team (5), API, unlimited sites |

**Competitive positioning:**
- **Starter at $49** = Outrank's daily output (30/mo) at half their $99 price
- **Growth at $99** = 3x Outrank's output at the same $99 price point
- **Agency at $249** = 500 articles vs. hiring an agency at $3,000-5,000/mo

Annual discount: 20% off (~2 months free). See [Revenue Streams](../business/business-model-canvas/revenue-streams.md) for full pricing rationale.

### Week 1: Rebrand + AI Integration

**Rebrand & Landing Page**

- [x] Update app name, logos, meta tags from boilerplate to AutopilotRank
- [x] Rewrite landing page: hero, pain points, solution, features, pricing, FAQ
- [ ] Update pricing page with new tiers (Starter/Growth/Agency) + competitor comparison
- [ ] Update Stripe products and price IDs for article-based plans
- [ ] Reconfigure credit system: 1 credit = 1 article generation

**AI Content Generation Foundation**

- [ ] Set up OpenRouter integration for multi-model access (GPT-4, Claude, Gemini)
- [ ] Build article generation pipeline: keyword + parameters -> structured outline -> full article
- [ ] Implement model selection (auto-route by content type, or user choice)
- [ ] Basic prompt engineering for SEO-optimized articles (headings, keyword placement, meta description)
- [ ] Article storage schema: campaigns, articles (title, content, status, keyword, model used, SEO score)

### Week 2: Campaign System + Humanizer

**Campaign Management**

- [ ] Campaign CRUD: name, target keywords (manual input + CSV upload), settings (model, tone, word count)
- [ ] Campaign dashboard: list campaigns, article counts, status overview
- [ ] Article queue: generate articles from campaign keywords (sequential, credit-deducted)
- [ ] Article status flow: `queued` -> `generating` -> `draft` -> `reviewed` -> `published`

**Humanizer Engine (v1)**

- [ ] Post-generation rewriting pass to remove AI patterns
- [ ] Remove common AI phrases ("In today's digital landscape", "It's important to note", etc.)
- [ ] Vary sentence structure, add natural transitions
- [ ] AI detection scoring integration (GPTZero or Originality.ai API)
- [ ] Display AI detection score on article detail page

### Week 3: Dashboard + WordPress Publishing

**Dashboard - Content Management**

- [ ] Article list view: filter by campaign, status, date
- [ ] Article detail view: full content with inline editing
- [ ] Basic SEO score display (keyword density, heading structure, word count, meta description)
- [ ] Approve/reject workflow before publishing
- [ ] Credit usage tracking per campaign

**WordPress Publishing**

- [ ] WordPress REST API integration (Application Passwords auth)
- [ ] Connect WordPress site flow: URL + credentials, test connection
- [ ] Publish article as draft or published post
- [ ] Map article metadata (title, slug, categories, tags, featured image, meta description)
- [ ] Publishing status sync (reflect WordPress status back in dashboard)

### Week 4: Polish + Launch

**Landing Page & Content**

- [ ] Final landing page polish: competitor comparison table, testimonials (placeholder), trust badges
- [ ] Features page with screenshots/GIFs of actual product
- [ ] Write 2-3 launch blog posts (MDX): "Why AI SEO Content", "AutopilotRank vs Outrank", product announcement
- [ ] Update help/FAQ for new product

**Email & Onboarding**

- [ ] Welcome email template (quick start guide)
- [ ] Article generation complete notification
- [ ] Low credits alert (80% threshold)
- [ ] Simple in-app onboarding: connect WordPress -> enter keywords -> generate first article

**Testing & Deployment**

- [ ] End-to-end flow testing: signup -> create campaign -> generate article -> review -> publish to WordPress
- [ ] Credit deduction and billing flow verification
- [ ] Mobile responsive check on all new pages
- [ ] Production environment setup and deployment
- [ ] Monitoring alerts for generation failures

**Launch**

- [ ] Recruit 50 beta users (Reddit r/SEO, r/content_marketing, r/Entrepreneur, Indie Hackers)
- [ ] Product Hunt launch prep (listing, assets, description)
- [ ] Social media announcements
- [ ] Launch day monitoring

### MVP Feature Summary

| Feature | Priority | Status |
|---------|----------|--------|
| Auth (email + Google) | P0 | Done (boilerplate) |
| Stripe billing (subscriptions) | P0 | Done (boilerplate) |
| Credit system (article-based) | P0 | Done (needs reconfig) |
| Dashboard shell | P0 | Done (boilerplate) |
| Monitoring & analytics | P1 | Done (boilerplate) |
| Landing page (AutopilotRank) | P0 | To build |
| Multi-model AI generation | P0 | To build |
| Campaign management | P0 | To build |
| Article editor/review | P0 | To build |
| Humanizer engine (v1) | P1 | To build |
| AI detection scoring | P1 | To build |
| WordPress publishing | P0 | To build |
| Basic SEO scoring | P1 | To build |
| Blog posts (launch) | P2 | To build |
| Onboarding flow | P1 | To build |

### MVP Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI generation quality too low | High | Multi-model routing, humanizer pass, manual edit before publish |
| OpenRouter API downtime | High | Direct API fallback to Anthropic/OpenAI |
| WordPress integration complexity | Medium | Start with REST API + Application Passwords (simplest auth) |
| Slow generation time | Medium | Async generation with notification when complete |
| Low beta signups | Medium | Personal outreach, SEO communities, free tier as hook |

---

## Post-MVP Phase 1: Product-Market Fit (Months 2-3)

**Goal:** Iterate based on beta feedback. Reach 200 users, 50 paying customers, validate PMF with Sean Ellis test (40%+ "very disappointed").

### Content Quality Improvements

- [ ] Advanced humanizer engine (multi-pass rewriting, style variation)
- [ ] AI detection pass rate target: 95%+
- [ ] Pre-publication QA: plagiarism check, readability score, fact-checking flags
- [ ] Brand voice customization (tone, style, vocabulary preferences)
- [ ] Article templates: listicle, how-to, comparison, product review, pillar content
- [ ] Image generation for articles (DALL-E/Stability AI integration)
- [ ] Internal linking suggestions within campaigns

### Keyword Research

- [ ] Keyword research API integration (DataForSEO or Keywords Everywhere)
- [ ] Search volume and keyword difficulty display
- [ ] Keyword clustering (group related keywords into campaigns)
- [ ] Competitor keyword gap analysis (basic)
- [ ] Keyword suggestions based on seed keywords

### Google Search Console Integration

- [ ] OAuth flow for GSC connection
- [ ] Import existing keyword performance data
- [ ] Identify content opportunities (keywords ranking 5-20 with low impressions)
- [ ] Auto-suggest article topics from GSC data
- [ ] Track ranking changes for published articles

### Dashboard Enhancements

- [ ] Article performance tracking (if GSC connected)
- [ ] Campaign analytics: articles generated, published, credits used
- [ ] Content calendar view (scheduled publications)
- [ ] Bulk actions: approve all, publish all, regenerate
- [ ] Export articles (Markdown, HTML, DOCX)

### Publishing Expansion

- [ ] Webflow CMS API publishing
- [ ] Shopify blog publishing
- [ ] Webhook publishing (generic - for any CMS with webhook support)
- [ ] Scheduled publishing (queue articles for future dates)
- [ ] Draft review mode (push as draft, user approves in CMS)

### Billing & Growth

- [ ] Annual billing option (20% off — "2 months free")
- [ ] Overage charges: Starter $2.00, Growth $1.50, Agency $0.75 (nudges upgrades)
- [ ] Upgrade prompts when approaching plan limits (80% threshold)
- [ ] Referral program (give 3 free articles, get 3 free articles)

---

## Post-MVP Phase 2: Growth (Months 4-6)

**Goal:** 600 customers, $30K-50K MRR, build competitive moat.

### Programmatic SEO at Scale

- [ ] Bulk generation: 100-1000 articles from keyword list + template
- [ ] Template system: define article structure, vary by keyword
- [ ] Dynamic schema markup generation (FAQ, HowTo, Article)
- [ ] Automated internal linking across campaign articles
- [ ] Topical authority mapping (cluster content around pillar pages)

### Advanced SEO Tools

- [ ] On-page SEO audit for generated articles (detailed scoring)
- [ ] SERP analysis: top 10 content analysis for target keyword
- [ ] Content optimization suggestions (NLP-based keyword recommendations)
- [ ] Rank tracking (basic): monitor positions for published article keywords
- [ ] Automated content refresh recommendations (when rankings drop)

### SEO Content & Comparison Pages

- [ ] "AutopilotRank vs Outrank.so" comparison page
- [ ] "AutopilotRank vs Surfer SEO" comparison page
- [ ] "AutopilotRank vs Byword" comparison page
- [ ] "AutopilotRank vs Jasper" comparison page
- [ ] "Best AI SEO Tools 2026" roundup page
- [ ] Use case landing pages: SMBs, agencies, e-commerce, content sites
- [ ] Consistent blog cadence: 2-4 posts/week

### Platform Reliability

- [ ] Article generation queue with retry logic and dead-letter handling
- [ ] Rate limiting per tier for API and generation
- [ ] Generation time monitoring and alerting
- [ ] Automatic failover between AI models on errors
- [ ] 99.9% uptime target with status page

### Email & Notifications

- [ ] Weekly content digest email (articles generated, published, performance)
- [ ] Credit expiration warnings (7 days before)
- [ ] Monthly usage summary
- [ ] Drip onboarding sequence (7 emails over 14 days)
- [ ] Win-back campaigns for churned users

---

## Growth Phase (Months 7-12)

**Goal:** 2,500 customers, $200K+ MRR, agency partner program, marketplace presence.

### Agency & Team Features

- [ ] Team accounts: invite members, role-based permissions (Admin, Editor, Viewer)
- [ ] White-label: remove AutopilotRank branding, custom domain
- [ ] Client management: separate workspaces per client
- [ ] Agency pricing tier (custom)
- [ ] Agency partner program: 20-30% revenue share for resellers
- [ ] Shared credit pools with allocation per team member

### WordPress Plugin

- [ ] WordPress.org plugin (manage campaigns from WP admin)
- [ ] Media Library integration for AI-generated images
- [ ] Gutenberg block for inline content generation
- [ ] Plugin distribution via WordPress.org repository

### Shopify App

- [ ] Shopify OAuth integration
- [ ] Product description generation at scale
- [ ] Blog post publishing to Shopify
- [ ] Shopify App Store listing

### API Access

- [ ] Public REST API for content generation
- [ ] API key management portal
- [ ] Developer documentation
- [ ] Webhook callbacks for async generation
- [ ] API pricing tiers (Developer free 100/mo, Starter $49/2000, Pro $199/10000)

### Enterprise Readiness

- [ ] SSO (SAML/OIDC)
- [ ] Custom integrations consulting
- [ ] SLA agreements
- [ ] Dedicated CSM for Enterprise accounts
- [ ] Advanced compliance (SOC 2 readiness)
- [ ] Custom AI model fine-tuning per customer

### Paid Acquisition

- [ ] Google Search Ads for high-intent keywords ($5-10K/mo)
- [ ] LinkedIn Ads targeting agency owners ($3-5K/mo)
- [ ] Retargeting campaigns
- [ ] AppSumo lifetime deal for awareness burst

---

## Scale Phase (Months 13-24)

**Goal:** 8,000 customers, $1M+ MRR, market leadership, Series A readiness.

### Advanced AI Features

- [ ] Brand voice fine-tuning (learn from existing content)
- [ ] Multi-language content generation (Spanish, French, German, Portuguese)
- [ ] AI-powered content refresh (automatically update aging articles)
- [ ] Competitive content analysis (analyze why competitor content ranks)
- [ ] Predictive keyword targeting (ML model for ranking probability)

### Backlink Network

- [ ] AI-powered niche matching for link exchanges
- [ ] Quality filters (DR, traffic thresholds)
- [ ] Outreach email templates for link building
- [ ] Backlink tracking and monitoring

### Marketplace & Integrations

- [ ] Zapier/Make integration
- [ ] HubSpot CRM integration
- [ ] Google Docs export
- [ ] Notion publishing
- [ ] Ghost CMS publishing
- [ ] Custom webhook system for any platform

### Data & Insights Products

- [ ] Industry benchmark reports (anonymized, aggregated)
- [ ] Content performance prediction scoring
- [ ] Keyword opportunity database

### International Expansion

- [ ] Multi-language dashboard (i18n)
- [ ] Region-specific keyword databases
- [ ] Local payment methods
- [ ] Localized landing pages

---

## Revenue Projections

| Quarter | Paying Customers | ARPU | MRR | ARR (run rate) |
|---------|------------------|------|-----|----------------|
| Q1 Y1 (Launch) | 50 | $120 | $6K | $72K |
| Q2 Y1 | 150 | $130 | $19.5K | $234K |
| Q3 Y1 | 350 | $140 | $49K | $588K |
| Q4 Y1 | 600 | $150 | $90K | $1.08M |
| Q2 Y2 | 1,300 | $160 | $208K | $2.5M |
| Q4 Y2 | 2,500 | $170 | $425K | $5.1M |

**Break-even:** ~15 Starter customers ($49 x 15 = $735 MRR vs ~$300-500/mo infrastructure at early stage)

---

## Unit Economics

| Metric | Target |
|--------|--------|
| Cost per article (AI) | $0.08-0.21 (avg ~$0.15) |
| Gross margin (Starter) | 91% |
| Gross margin (Growth) | 85% |
| Gross margin (Agency) | 70% |
| CAC (self-serve) | <$80 |
| CAC (sales-assisted) | <$300 |
| LTV (Starter) | $585 (15 mo x $39/mo annual) |
| LTV (Growth) | $1,422 (18 mo x $79/mo annual) |
| LTV (Agency) | $4,776 (24 mo x $199/mo annual) |
| LTV:CAC (blended) | >12:1 |
| Monthly churn | <5% |
| Trial-to-paid conversion | 20-25% |

---

## PMF Validation Metrics

| Metric | Weak | Approaching | Strong | Target |
|--------|------|-------------|--------|--------|
| Sean Ellis Test | <30% | 30-39% | 40%+ | 40% |
| 30-day Retention | <20% | 20-40% | 40%+ | 45% |
| NPS | <0 | 0-30 | 30+ | 40 |
| Trial-to-Paid | <10% | 10-15% | 15%+ | 15% |
| Organic Growth | <10% | 10-25% | 25%+ | 20% |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Astro 5 + React 18 (islands) |
| Backend / API | Astro SSR + Cloudflare Workers |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email, Google OAuth) |
| Payments | Stripe (subscriptions + one-time) |
| AI Models | OpenRouter (GPT-4, Claude, Gemini) |
| Email | Brevo + Resend |
| Monitoring | Baselime + Amplitude + GA4 |
| Deployment | Cloudflare Pages |
| CMS Publishing | WordPress REST API (MVP), Webflow, Shopify (post-MVP) |

---

## Key References

- [Lean Product Playbook](../business/business-model-canvas/lean-product-playbook.md) - PMF strategy
- [Value Proposition](../business/business-model-canvas/value-proposition.md) - Competitive positioning
- [Customer Segments](../business/business-model-canvas/customer-segments.md) - Target personas
- [Revenue Streams](../business/business-model-canvas/revenue-streams.md) - Pricing and unit economics
- [Landing Page Spec](../business/landing-page.md) - Landing page design specification
- [Cost Structure](../business/business-model-canvas/cost-structure.md) - Infrastructure costs

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-04 | Created unified roadmap for AutopilotRank pivot, split into MVP (4 weeks) and Post-MVP phases |
