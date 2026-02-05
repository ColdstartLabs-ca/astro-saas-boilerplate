# Revenue Streams

## Overview

AutopilotRank generates revenue through a SaaS subscription model with tiered pricing based on usage (articles generated) and features. This document outlines all revenue streams, pricing strategy, and monetization approach.

> **STATUS:** This document describes the **target pricing** for the AutopilotRank AI SEO product. The current codebase still contains boilerplate pricing ($9/$19/$49/$149) which will be replaced during Milestone 1 of the roadmap. See `docs/technical/systems/billing.md` for current implementation details.

---

## Primary Revenue Streams

### 1. SaaS Subscriptions (80-90% of revenue)

The core revenue driver - recurring subscriptions for platform access.

#### Competitive Pricing Landscape (Feb 2026)

| Competitor    | Lowest Tier         | Articles             | $/Article  | Free Tier                    |
| ------------- | ------------------- | -------------------- | ---------- | ---------------------------- |
| Outrank.so    | $99/mo              | ~30/mo (1/day)       | $3.30      | No (7-day trial)             |
| RankYak       | $99/mo              | ~30/mo (1/day)       | $3.30      | No (3-day trial)             |
| Byword.ai     | $99/mo (or $5 PAYG) | 25/mo                | $3.96      | No (5 free articles)         |
| SEO.ai        | $149/mo             | Unspecified (1 site) | —          | No (free SEO utilities only) |
| Journalist AI | $39-69/mo           | ~100/mo              | $0.39-0.69 | No (3 free articles)         |
| Article Forge | $27/mo              | ~16/mo (25K words)   | $1.69      | No (5-day trial)             |
| ContentMonk   | $49/mo              | 5/mo                 | $9.80      | Basic (14-day Pro trial)     |

**Key insight:** No serious competitor offers a permanent free tier. The market standard is a short trial (3-7 days) or a handful of free articles to try (3-5). $99/mo for ~30 articles is the established price anchor for autopilot tools.

#### Pricing Tiers

| Tier           | Price/Month | Price/Year       | Articles/Month        | $/Article  | Target                          |
| -------------- | ----------- | ---------------- | --------------------- | ---------- | ------------------------------- |
| **Trial**      | $0          | -                | 3 articles (one-time) | -          | Try before buying               |
| **Starter**    | $49/mo      | $468 ($39/mo)    | 30 articles           | $1.63      | Outrank switchers, solopreneurs |
| **Growth**     | $99/mo      | $948 ($79/mo)    | 100 articles          | $0.99      | SMBs, content sites (core tier) |
| **Agency**     | $249/mo     | $2,388 ($199/mo) | 500 articles          | $0.50      | Agencies, teams, multi-site     |
| **Enterprise** | Custom      | Custom           | Unlimited             | Negotiated | Enterprise, high-volume         |

**Annual Discount**: ~20% (effectively "2 months free" messaging)

#### How We Beat Every Competitor

**vs. Outrank ($99/mo, 30 articles, generic quality):**

> "Get the same daily article output for $49/mo — or 3x the articles for the same $99/mo. With content that actually sounds human."

**vs. Byword ($99/mo, 25 articles, no humanizer):**

> "4x the articles at the same price. Plus a humanizer engine that passes AI detection."

**vs. RankYak ($99/mo, 30 articles, small team):**

> "Same daily output at half the price. Or scale to 100 articles/mo for the same $99."

**vs. Journalist AI ($39-69/mo, ~100 articles, no CMS autopilot):**

> "Same volume, same price range, but with native WordPress autopublishing and pre-publication QA that they don't have."

**vs. Agencies ($3,000-5,000/mo for content):**

> "Replace a $3,000/mo agency with a $99/mo subscription. Same output. Better consistency."

#### Tier Rationale

**Free Trial (Acquisition)**:

- 3 free articles on signup, no credit card required
- Enough to experience the quality difference vs. competitors
- Matches market pattern (Byword: 5, Journalist AI: 3, Outrank: 7-day trial)
- No permanent free tier — avoids freeloading and sets value expectation
- Target: 20-25% trial-to-paid conversion (higher than free tier because users self-select)

**Starter Tier ($49/mo — "The Outrank Killer")**:

- 30 articles/mo = Outrank's daily output at HALF their price
- Perfect for solopreneurs publishing 1 article/day
- All core features: multi-model AI, humanizer, WordPress publishing
- This is the switching tier: "Why pay $99 for the same thing?"
- Margin: ~92% ($0.15/article cost × 30 = $4.50 cost)

**Growth Tier ($99/mo — Core Revenue Driver)**:

- 100 articles/mo = 3x Outrank's output at the SAME price
- The "sweet spot" for SMBs and content sites scaling organic traffic
- Unlocks: GSC integration, advanced humanizer, 3 CMS sites, scheduled publishing
- Anchors against Outrank/RankYak/Byword directly on their $99 price point
- Margin: ~85% ($0.15/article cost × 100 = $15 cost)

**Agency Tier ($249/mo — "The Scaling Machine")**:

- 500 articles/mo = supports 5-10 client sites
- White-label, team accounts (up to 5), API access, unlimited CMS sites
- Positioned well below custom agency pricing but well above per-article tools
- Margin: ~70% ($0.15/article cost × 500 = $75 cost)

**Enterprise Tier (Custom — $1,000-5,000/mo)**:

- Unlimited articles, SSO, custom integrations, dedicated CSM, SLA
- Custom pricing based on volume, team size, integration needs
- Margin: ~70% (higher service delivery costs)

### 2. Usage-Based Overage Charges (5-10% of revenue)

For customers who need occasional bursts beyond their plan.

#### Overage Pricing

| Tier       | Overage Rate  | Explanation                                           |
| ---------- | ------------- | ----------------------------------------------------- |
| Starter    | $2.00/article | Premium to per-article base, nudges upgrade to Growth |
| Growth     | $1.50/article | 50% above per-article base rate                       |
| Agency     | $0.75/article | Volume discount on overage                            |
| Enterprise | Custom        | Negotiated based on volume                            |

**Rationale**:

- Overage rates make the next tier obviously better value
- Starter overage at $2.00 makes Growth ($0.99/article) look like a steal
- Growth overage at $1.50 makes Agency ($0.50/article) the clear upgrade
- Creates natural upgrade pressure without hard-blocking users

**Example**:

- Starter customer (30 articles) generates 45 articles
- First 30 included in plan
- Next 15 at $2.00 = $30.00 overage → total $79/mo
- Upsell: "Upgrade to Growth for $99/mo and get 100 articles — you're almost paying that already"

### 3. Add-on Products & Services (5-10% of revenue)

#### Premium Add-ons

| Add-on               | Price        | Description                                                   |
| -------------------- | ------------ | ------------------------------------------------------------- |
| **SEO Suite**        | +$49/mo      | Advanced keyword research, rank tracking, competitor analysis |
| **Image Generation** | +$29/mo      | AI-generated images for articles (DALL-E integration)         |
| **Human Review**     | +$99/mo      | Professional editing & fact-checking queue                    |
| **CMS Integrations** | +$19/mo each | Premium connectors (Shopify, Webflow custom)                  |
| **White-Label**      | +$99/mo      | Remove AutopilotRank branding, custom domain                  |

#### Professional Services

| Service                | Price           | Delivery                                  | Margin |
| ---------------------- | --------------- | ----------------------------------------- | ------ |
| **Onboarding Package** | $500 one-time   | 2-hour training, setup assistance         | 60%    |
| **Campaign Setup**     | $1,500 one-time | Full campaign build, 100 initial articles | 50%    |
| **Custom Training**    | $250/hour       | Team training, best practices             | 70%    |
| **Migration Services** | $2,500+         | Migrate from competitor platform          | 60%    |

**Note**: Professional services are minimal - product-led growth preferred

---

## Secondary Revenue Streams

### 4. Agency Partner Program (3-5% of revenue)

Recruit agencies as resellers of the AutopilotRank platform.

#### Commission Structure

| Tier                  | Revenue Share  | Requirements                            |
| --------------------- | -------------- | --------------------------------------- |
| **Referral**          | 20% first year | Basic signup, no ongoing involvement    |
| **Reseller**          | 25% recurring  | White-label, handles billing            |
| **Strategic Partner** | 30% recurring  | Minimum 10 active clients, co-marketing |

#### Program Benefits

**For Partners**:

- Recurring revenue sharing
- White-label dashboard
- Co-branded marketing materials
- Partner training and certification
- Lead generation from AutopilotRank

**For AutopilotRank**:

- Customer acquisition at lower CAC
- Credibility through partner endorsement
- Access to partner's client base
- Market expansion into new segments

### 5. Marketplace & Integrations (2-3% of revenue)

Revenue from app stores and integration marketplaces.

#### Potential Channels

| Channel                     | Revenue Share             | Est. Annual Revenue |
| --------------------------- | ------------------------- | ------------------- |
| **Shopify App Store**       | 80/20 (Shopify)           | $10-50K             |
| **WordPress Plugin Repo**   | 100% (donations accepted) | $0-5K               |
| **AppSumo (Lifetime Deal)** | 70/30 (AppSumo)           | $50-100K (one-time) |
| **Zapier/Make**             | Revenue sharing           | $5-10K              |

**Strategy**: Use marketplaces for acquisition, not primary revenue

### 6. Affiliate Program (1-2% of revenue)

Commission-based referrals from content creators, SEO influencers, and customers.

#### Affiliate Structure

| Tier                  | Commission                     | Cookie Duration               |
| --------------------- | ------------------------------ | ----------------------------- |
| **Standard**          | 20% first year                 | 60 days                       |
| **VIP**               | 30% first year                 | 90 days (for high performers) |
| **Customer Referral** | Account credit (3 months free) | -                             |

#### Promotional Guidelines

- Allowed: Blog posts, YouTube reviews, social media
- Prohibited: Paid ads on brand keywords, false claims
- Resources: Banners, copy templates, tracking links

---

## Future Revenue Opportunities

### 7. Content Marketplace (Year 2+)

Connect businesses needing content with human editors for AI-polishing.

#### Model

| Service           | Price (to customer) | Editor Pay | Margin |
| ----------------- | ------------------- | ---------- | ------ |
| **AI Polishing**  | $15/article         | $10        | 33%    |
| **Human Rewrite** | $50/article         | $35        | 30%    |
| **Full Creation** | $100/article        | $70        | 30%    |

**Opportunity**: Service revenue, not take-rate on existing SaaS

### 8. Data & Insights (Year 3+)

Aggregate, anonymized data products for SEO industry.

#### Potential Products

- Keyword difficulty database
- Content performance benchmarks
- Industry trend reports
- API access to data

**Model**: High-margin, pure profit after infrastructure

---

## Revenue Model Economics

### Unit Economics

#### Customer Metrics

| Metric                        | Value                              |
| ----------------------------- | ---------------------------------- |
| **Average ARPU**              | $120/month (blended)               |
| **ARPA (Starter)**            | $39/month (after annual discount)  |
| **ARPA (Growth)**             | $79/month (after annual discount)  |
| **ARPA (Agency)**             | $199/month (after annual discount) |
| **ARPA (Enterprise)**         | $2,000/month (average)             |
| **Average Customer Lifetime** | 24 months                          |

#### Cost Per Article (AI Generation)

| Component                        | Cost           | Notes                           |
| -------------------------------- | -------------- | ------------------------------- |
| LLM generation (outline + draft) | $0.05-0.15     | Via OpenRouter, model-dependent |
| Humanizer pass                   | $0.02-0.05     | Second LLM call for rewriting   |
| SEO scoring                      | $0.01          | Lightweight analysis            |
| **Total per article**            | **$0.08-0.21** | Average ~$0.15                  |

#### Margin by Tier

| Tier                      | Revenue | Cost (at avg $0.15/article) | Gross Margin |
| ------------------------- | ------- | --------------------------- | ------------ |
| **Starter** (30 articles) | $49/mo  | $4.50                       | 91%          |
| **Growth** (100 articles) | $99/mo  | $15.00                      | 85%          |
| **Agency** (500 articles) | $249/mo | $75.00                      | 70%          |

#### Acquisition & Retention

| Metric                    | Target    |
| ------------------------- | --------- |
| **CAC (Self-Serve)**      | $80       |
| **CAC (Sales-Assisted)**  | $300      |
| **CAC (Enterprise)**      | $1,500    |
| **CAC Payback**           | <6 months |
| **Monthly Churn**         | <5%       |
| **Net Revenue Retention** | >110%     |
| **Trial-to-Paid**         | 20-25%    |

#### LTV Calculations

| Segment                   | ARPU   | Lifetime | LTV     | LTV:CAC |
| ------------------------- | ------ | -------- | ------- | ------- |
| **Solopreneur (Starter)** | $39    | 15 mo    | $585    | 7.3:1   |
| **SMB (Growth)**          | $79    | 18 mo    | $1,422  | 17.8:1  |
| **Agency**                | $199   | 24 mo    | $4,776  | 15.9:1  |
| **Enterprise**            | $2,000 | 36 mo    | $72,000 | 48:1    |
| **Blended**               | $120   | 20 mo    | $2,400  | 12:1    |

### Revenue Projections

#### Year 1 (Launch Phase)

| Quarter | Customers | ARPU | MRR    | ARR (run rate) |
| ------- | --------- | ---- | ------ | -------------- |
| Q1      | 50        | $120 | $6K    | $72K           |
| Q2      | 150       | $130 | $19.5K | $234K          |
| Q3      | 350       | $140 | $49K   | $588K          |
| Q4      | 600       | $150 | $90K   | $1.08M         |

**Year 1 Ending**: 600 customers, $90K MRR, $1.08M ARR run rate

#### Year 2 (Growth Phase)

| Quarter | Customers | ARPU | MRR   | ARR (run rate) |
| ------- | --------- | ---- | ----- | -------------- |
| Q1      | 900       | $155 | $140K | $1.68M         |
| Q2      | 1,300     | $160 | $208K | $2.5M          |
| Q3      | 1,800     | $165 | $297K | $3.56M         |
| Q4      | 2,500     | $170 | $425K | $5.1M          |

**Year 2 Ending**: 2,500 customers, $425K MRR, $5.1M ARR run rate

#### Year 3 (Scale Phase)

| Quarter | Customers | ARPU | MRR    | ARR (run rate) |
| ------- | --------- | ---- | ------ | -------------- |
| Q1      | 3,500     | $175 | $613K  | $7.36M         |
| Q2      | 4,700     | $180 | $846K  | $10.15M        |
| Q3      | 6,200     | $185 | $1.15M | $13.8M         |
| Q4      | 8,000     | $190 | $1.52M | $18.24M        |

**Year 3 Ending**: 8,000 customers, $1.52M MRR, $18.24M ARR run rate

---

## Pricing Strategy

### Pricing Philosophy

**Competitor-Anchored Value Pricing**:

- Every tier is positioned to directly undercut a named competitor
- Starter ($49) = "Outrank for half the price"
- Growth ($99) = "3x Outrank's output for the same $99 everyone else charges"
- Agency ($249) = "Replace a $3,000/mo agency"
- Compare to hiring writers ($50-200/article) — our $0.50-1.63/article is 97-99% cheaper

**No Free Tier, Strong Trial**:

- 3 free articles on signup (no credit card required)
- Matches market standard (Byword: 5 free, Journalist AI: 3 free)
- Avoids the "free tier graveyard" where users never convert
- Higher conversion rate (20-25%) than perpetual free tiers (10-15%)
- Users who try 3 articles and see quality will pay — those who won't were never going to

**Overage as Upgrade Engine**:

- Overage pricing deliberately makes the next tier the obvious choice
- Starter overage ($2.00/article) makes Growth ($0.99/article) irresistible
- Growth overage ($1.50/article) makes Agency ($0.50/article) the clear move

### Pricing Psychology

**Anchoring**:

- Show Agency tier first on pricing page (makes Growth look affordable)
- Show per-article cost for each tier (Growth at $0.99 vs. Outrank at $3.30)
- Compare to agency costs ($3,000-5,000/mo) on the same page

**Competitive Framing**:

- Pricing page includes "vs Competitors" comparison table
- Each tier card shows "Switch from [Competitor] and save $X/year"
- Calculator widget: "How much would you save vs. your current solution?"

**Loss Aversion**:

- "Save $240/year" for annual Starter, "Save $240/year" for annual Growth
- Message as "2 months free" rather than percentage
- Show what competitors charge for the same output

### Discount Policies

**Standard Discounts**:

- Annual prepayment: 20% off (~2 months free)
- Non-profit: 25% off
- Education: 30% off

**Sales Discounts**:

- End of quarter: Up to 20% for Enterprise deals
- Multi-year: Additional 10% for 2-year commits
- Volume: Custom pricing for 100+ seats

**No Discounts**:

- Never discount monthly plans
- Never discount below Starter annual ($39/mo)
- Never discount Enterprise without multi-year or volume commit

---

## Billing & Collections

### Billing Methods

| Method                 | Availability | Take Rate |
| ---------------------- | ------------ | --------- |
| **Credit Card**        | All plans    | 85%       |
| **Direct Debit (ACH)** | Business+    | 10%       |
| **Invoice/Wire**       | Enterprise   | 5%        |
| **Crypto**             | N/A          | 0%        |

### Payment Processing

**Primary**: Stripe

- Supports all major cards
- Handles international payments
- Built-in fraud protection
- Subscription management

**Secondary**: Stripe Connect for partners

- Commission payouts
- Partner accounts
- Marketplace functionality

### Collection Strategy

**Dunning Process**:

- Day 1: Payment failed, friendly retry notification
- Day 3: Automatic retry
- Day 5: Second retry + "update card" email
- Day 7: Final retry + account suspension warning
- Day 10: Account suspended (content paused)
- Day 30: Account canceled

**Recovery Rates**:

- Day 1-3: 70% recovered
- Day 3-7: 20% recovered
- Day 7-30: 5% recovered
- Beyond Day 30: 5% recovered (manual outreach)

---

## Revenue Recognition

### ASC 606 Compliance

**Subscription Revenue**:

- Recognized ratably over subscription period
- Not recognized upfront (even for annual prepay)
- Deferred revenue liability on balance sheet

**Setup Fees**:

- Recognized over subscription term
- Not all at signup

**Professional Services**:

- Recognized when delivered
- Separate from subscription

### Key Metrics for SaaS

**MRR (Monthly Recurring Revenue)**:

- Base metric for business health
- New MRR + Expansion MRR - Churn MRR = Net New MRR

**ARR (Annual Recurring Revenue)**:

- MRR × 12
- Used for valuation, benchmarking

**Bookings**:

- Total value of contracts signed
- Includes both recurring and non-recurring

**Billings**:

- Cash collected from customers
- Important for cash flow management

---

## Revenue Optimization

### A/B Testing Priorities

1. **Trial Size**
   - 3 free articles vs. 5 free articles
   - Impact on trial-to-paid conversion rate
   - Does more articles help or hurt urgency?

2. **Pricing Page Layout**
   - Per-article cost prominent vs. monthly price prominent
   - Competitor comparison table above vs. below pricing cards
   - "Most Popular" badge on Growth vs. Starter

3. **Annual Discount Messaging**
   - "Save 20%" vs. "2 months free" vs. "$240/year savings"
   - Annual toggle placement and default state

4. **Upgrade Triggers**
   - When to show "you're close to your limit" (60% vs. 80%)
   - Overage warning vs. hard block + upgrade CTA
   - Timing of prompts (in-app vs. email)

### Expansion Revenue Strategy

**In-Product Triggers**:

- 80% of plan used → gentle upgrade reminder
- Plan limit hit → hard block with upgrade CTA
- Feature request → if it's in higher tier, show upgrade path

**Email Triggers**:

- Monthly usage summary → "You're close to your limit"
- Success email → "Scale this success with upgrade"
- Feature announcement → "Available in higher tiers"

**Sales Touch**:

- For Business+ customers
- Quarterly business reviews
- Expansion opportunities discussion

### Churn Reduction = Revenue Protection

Every 1% reduction in churn = significant ARR impact.

**Focus Areas**:

- Onboarding success (first month is highest churn risk)
- Ongoing value delivery (usage-based success)
- Proactive retention (identify at-risk customers)
- Win-back campaigns (targeted offers)
