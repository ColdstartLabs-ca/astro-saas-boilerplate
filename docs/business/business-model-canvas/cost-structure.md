# Cost Structure

## Overview

The cost structure outlines all costs involved in operating AutopilotRank. The business model is designed to have low fixed costs and scalable variable costs that grow with customer revenue.

---

## Cost Categories

### 1. Variable Costs (Scale with Revenue)

These costs increase as customer usage grows but should decrease as a percentage of revenue over time due to economies of scale.

#### 1.1 AI Model Usage (Largest Variable Cost)

**Providers**: Google (Gemini via OpenRouter), Anthropic (Claude via OpenRouter), Black Forest Labs (Flux via Replicate)

**Writer Models (OpenRouter) — as of Feb 2026:**

| Preset       | Model                    | Input $/M | Output $/M | Cost/Article (worst) |
| ------------ | ------------------------ | --------- | ---------- | -------------------- |
| **Budget**   | Gemini 2.5 Flash Lite    | $0.10     | $0.40      | **$0.004**           |
| **Balanced** | Gemini 3 Flash Preview   | $0.50     | $3.00      | **$0.025**           |
| **Pro**      | Gemini 3 Pro Preview     | $2.00     | $12.00     | **$0.10**            |
| **Ultra**    | Claude Sonnet 4.6        | $3.00     | $15.00     | **$0.129**           |

**Image Models (Replicate) — 2-3 images per article:**

| Preset       | Model        | Cost/Image | Cost/3 Images |
| ------------ | ------------ | ---------- | ------------- |
| **Budget**   | Flux Schnell | $0.003     | **$0.009**    |
| **Balanced** | Flux 2 Dev   | $0.025     | **$0.075**    |
| **Pro**      | Flux 2 Pro   | $0.055     | **$0.165**    |
| **Ultra**    | Flux 2 Max   | $0.07      | **$0.21**     |

**Total per article: $0.013 (Budget+Budget) to $0.339 (Ultra+Ultra)**

**Assumptions**:

- 500 customers × 100 articles/month = 50,000 articles
- At $0.10/article average (most users on budget/balanced) = $5,000/month
- At 5,000 customers × 100 articles = 500,000 articles
- At $0.10/article = $50,000/month

**Optimization Strategies**:

- Default presets route to cost-effective Gemini models ($0.004-$0.025/article)
- Premium models (Sonnet 4.6) reserved for Ultra tier at higher credit cost
- Monitor OpenRouter/Replicate pricing; trigger credit cost adjustment if margins drop below 3x
- Negotiate volume discounts at scale
- Target: Maintain $0.05/article blended average

#### 1.2 Infrastructure Costs

**Scale with Usage**:

| Resource                 | Cost Model        | Unit Cost              | Monthly at 5K Customers |
| ------------------------ | ----------------- | ---------------------- | ----------------------- |
| **Cloudflare Workers**   | Per request       | $0.50/million requests | $500-1,000              |
| **Supabase Database**    | Compute + storage | Tiered                 | $2,000-5,000            |
| **CDN Bandwidth**        | Per GB            | $0.08/GB               | $1,000-3,000            |
| **File Storage (R2/S3)** | Per GB            | $0.015/GB              | $500-1,000              |
| **Total Infrastructure** |                   |                        | **$4,000-10,000**       |

**Notes**:

- Cloudflare Workers is extremely cost-effective at scale
- Supabase scales with compute and storage needs
- Costs grow sub-linearly with customer count

#### 1.3 Payment Processing

**Stripe Fees**:

- 2.9% + $0.30 per transaction
- For $100K MRR = ~$3,000/month
- For $500K MRR = ~$15,000/month

**International Cards**: +1% fee

#### 1.4 Customer Support (Tiered)

**Cost per Customer**:

- Free trial: $0 (community, self-service)
- Starter tier: $0.50-1/month
- Growth tier: $1-3/month
- Agency tier: $3-5/month
- Enterprise tier: $10-20/month

**At 5,000 customers**:

- 2,000 Starter × $1 = $2,000
- 2,000 Growth × $2 = $4,000
- 900 Agency × $4 = $3,600
- 100 Enterprise × $15 = $1,500
- **Total**: ~$9,000-10,000/month

#### 1.5 SEO Tool APIs

**Third-Party Data**:

| Tool            | Monthly Cost     | Usage                    |
| --------------- | ---------------- | ------------------------ |
| **SEMrush API** | $500-2,000       | Keyword research         |
| **DataForSEO**  | $500-1,000       | SERP data, rank tracking |
| **GSC API**     | Free             | Performance data         |
| **Total**       | **$1,000-3,000** | Grows slowly with usage  |

---

## 2. Fixed Costs (Relatively Stable)

These costs remain relatively stable regardless of customer count until step-function increases (e.g., new office, new team member).

### 2.1 Personnel Costs (Largest Fixed Cost)

#### Phase 1 (Months 1-6): $10K-15K/month

| Role                    | Count | Monthly Cost        |
| ----------------------- | ----- | ------------------- |
| Founders (sweat equity) | 2-3   | $0-5,000 (expenses) |
| Contractors             | 1-2   | $5,000-10,000       |
| **Total**               |       | **$10K-15K**        |

#### Phase 2 (Months 7-18): $40K-60K/month

| Role             | Count | Monthly Cost   | Notes               |
| ---------------- | ----- | -------------- | ------------------- |
| CEO/Founder      | 1     | $8,000-12,000  | Modest salary       |
| CTO/Founder      | 1     | $8,000-12,000  | Modest salary       |
| Engineers        | 4-5   | $30,000-40,000 | $7-8K each          |
| Growth Marketer  | 1-2   | $6,000-10,000  | Content, ads        |
| Customer Success | 1     | $4,000-6,000   | Support, onboarding |
| Contractors      | 2-3   | $5,000-10,000  | Design, content     |
| **Total**        | 10-14 | **$60K-90K**   |

_Includes payroll taxes, benefits (~20%)_

#### Phase 3 (Months 19-36): $150K-250K/month

| Role                       | Count | Monthly Cost     | Notes              |
| -------------------------- | ----- | ---------------- | ------------------ |
| CEO                        | 1     | $15,000-20,000   | Market rate        |
| CTO                        | 1     | $15,000-20,000   | Market rate        |
| VPs (Marketing, Sales, CS) | 3     | $30,000-45,000   | $10-15K each       |
| Engineers                  | 10-15 | $120,000-150,000 | $8-12K each        |
| Growth Team                | 5-6   | $40,000-60,000   | Marketing, content |
| Customer Success           | 4-5   | $30,000-40,000   | CSMs, support      |
| Sales                      | 2-3   | $20,000-35,000   | Sales reps         |
| Operations                 | 2-3   | $15,000-25,000   | Ops, finance, HR   |
| **Total**                  | 30-40 | **$285K-395K**   |

_Includes payroll taxes, benefits, equity (~25-30% overhead)_

### 2.2 Office & Facilities

**Remote-First Philosophy**: No office until necessary

| Item                      | Monthly Cost      | Phase              |
| ------------------------- | ----------------- | ------------------ |
| **Home Office Stipend**   | $100-200/employee | All phases         |
| **Co-working (optional)** | $500-2,000        | Phase 3 (optional) |
| **Office (optional)**     | $5,000-15,000     | Phase 4 (optional) |
| **Team Retreats**         | $10K-30K annually | All phases         |

**Strategy**: Stay remote as long as possible for flexibility and cost savings.

### 2.3 Software & Tools

**Essential Tools**:

| Category          | Tools                            | Monthly Cost |
| ----------------- | -------------------------------- | ------------ |
| **Development**   | GitHub, Linear, CI/CD            | $500-1,000   |
| **Design**        | Figma, Adobe Creative            | $200-500     |
| **Communication** | Slack, Zoom, Loom                | $500-1,000   |
| **Analytics**     | PostHog, Amplitude, Baselime     | $500-1,000   |
| **Support**       | Intercom, Notion, Help Scout     | $500-1,000   |
| **Marketing**     | Ahrefs/SEMrush, ConvertKit       | $500-1,000   |
| **Finance**       | Ramp, Brex, QuickBooks           | $200-500     |
| **Legal**         | Attorney fees (monthly retainer) | $1,000-2,000 |
| **Total**         |                                  | **$4K-8K**   |

### 2.4 Marketing & Advertising

**Paid Acquisition**:

| Channel               | Budget       | Phase    |
| --------------------- | ------------ | -------- |
| **Google Search Ads** | $5K-10K      | Phase 2+ |
| **LinkedIn Ads**      | $3K-5K       | Phase 2+ |
| **YouTube Ads**       | $2K-3K       | Phase 2+ |
| **Retargeting**       | $1K-2K       | Phase 2+ |
| **Total**             | **$11K-20K** |          |

**Content Marketing**:

- Blog content creation (contractors): $2K-5K/month
- YouTube production: $1K-3K/month
- Community management: Built into CS cost

**Events & Conferences**:

- SEO conference sponsorships: $5K-20K annually
- Booth presence: $10K-30K annually
- Speaking engagements: Cost of travel only

### 2.5 Professional Services

| Service           | Monthly Cost |
| ----------------- | ------------ |
| **Legal Counsel** | $1,000-2,000 |
| **Accounting**    | $500-1,000   |
| **Bookkeeping**   | $500-1,000   |
| **Total**         | **$2K-4K**   |

---

## 3. One-Time Costs

### 3.1 Initial Setup

| Item                          | Cost       |
| ----------------------------- | ---------- |
| **Legal Setup (Corporation)** | $500-2,000 |
| **Domain & Branding**         | $500-1,000 |
| **Initial Infrastructure**    | $500-1,000 |
| **Tool Setup**                | $500-1,000 |
| **Total**                     | **$2K-5K** |

### 3.2 Intellectual Property

| Item                       | Cost                |
| -------------------------- | ------------------- |
| **Trademark Registration** | $1K-3K per class    |
| **Patent (optional)**      | $20K-50K per patent |
| **Copyright Registration** | $100-500 per work   |

### 3.3 Fundraising Costs

| Activity                  | Cost     |
| ------------------------- | -------- |
| **Legal Fees (Seed)**     | $10K-20K |
| **Legal Fees (Series A)** | $30K-50K |
| **Diligence Expenses**    | $5K-10K  |
| **Travel & Meetings**     | $5K-10K  |

---

## 4. Cost Projections by Phase

### Phase 1: Launch (Months 1-6)

**Target**: 50 customers, $6K MRR

| Category                  | Monthly Cost | Annual Run Rate |
| ------------------------- | ------------ | --------------- |
| **Personnel**             | $10K-15K     | $120K-180K      |
| **Infrastructure**        | $500-1K      | $6K-12K         |
| **Software/Tools**        | $1K-2K       | $12K-24K        |
| **Marketing**             | $2K-3K       | $24K-36K        |
| **Professional Services** | $1K-2K       | $12K-24K        |
| **Total**                 | **$14K-23K** | **$174K-276K**  |

**Burn Rate**: $14K-23K/month
**Runway (on $100K)**: 4-7 months

### Phase 2: Growth (Months 7-18)

**Target**: 600 customers, $90K MRR

| Category                  | Monthly Cost  | Annual Run Rate |
| ------------------------- | ------------- | --------------- |
| **Personnel**             | $60K-90K      | $720K-1,080K    |
| **Infrastructure**        | $2K-5K        | $24K-60K        |
| **Software/Tools**        | $3K-5K        | $36K-60K        |
| **Marketing**             | $10K-20K      | $120K-240K      |
| **Professional Services** | $2K-4K        | $24K-48K        |
| **Office (optional)**     | $0-1K         | $0-12K          |
| **Total**                 | **$77K-125K** | **$924K-1.5M**  |

**Burn Rate**: $77K-125K/month
**Revenue**: $90K/month
**Net Burn**: -$13K to +$35K/month (near break-even)

### Phase 3: Scale (Months 19-36)

**Target**: 2,500 customers, $425K MRR

| Category                  | Monthly Cost   | Annual Run Rate |
| ------------------------- | -------------- | --------------- |
| **Personnel**             | $285K-395K     | $3.4M-4.7M      |
| **Infrastructure**        | $10K-30K       | $120K-360K      |
| **Software/Tools**        | $5K-10K        | $60K-120K       |
| **Marketing**             | $20K-40K       | $240K-480K      |
| **Professional Services** | $3K-5K         | $36K-60K        |
| **Office (optional)**     | $5K-15K        | $60K-180K       |
| **Total**                 | **$328K-495K** | **$3.9M-5.9M**  |

**Burn Rate**: $328K-495K/month
**Revenue**: $425K/month
**Net Income**: +$130K to -$70K/month
**Gross Margin**: ~85% (after variable costs)

---

## 5. Unit Economics

### 5.1 Cost Per Article

**Variable Costs Only**:

| Cost Component          | Cost per Article   |
| ----------------------- | ------------------ |
| **AI Writer**           | $0.004-0.129       |
| **AI Images (×3)**      | $0.009-0.21        |
| **Infrastructure**      | $0.01-0.05         |
| **Support Allocation**  | $0.02-0.10         |
| **Total Variable Cost** | **$0.04-0.49**     |

**Blended average (most users on budget/balanced)**: $0.08-0.12 per article

### 5.2 Cost Per Customer (CAC)

**Self-Serve Customers**:

- Marketing + Sales: $80-100
- Payback period: 1-2 months (on $49/month subscription)
- LTV:CAC ratio: 8:1 to 12:1

**Sales-Assisted Customers**:

- Marketing + Sales: $250-400
- Payback period: 2-4 months
- LTV:CAC ratio: 10:1 to 15:1

**Enterprise Customers**:

- Marketing + Sales: $1,500-3,000
- Payback period: 6-12 months
- LTV:CAC ratio: 20:1 to 40:1

---

## 6. Margins & Profitability

### 6.1 Gross Margin

**Revenue**: $49/month for Starter plan (30 articles)

**Variable Costs** (assuming balanced writer + balanced images avg):

- AI generation: $3.00 (30 × $0.10 blended avg)
- Infrastructure: $1
- Support allocation: $1
- **Total COGS**: $5.00

**Gross Margin**: ($49 - $5.00) / $49 = **90%**

**Target**: 85%+ gross margin at scale

### 6.2 Contribution Margin

**Revenue**: $49/month

**Variable Costs**: $6.50

**Contribution Margin**: $42.50/month (87%)

**Use**: Covers fixed costs and profit

### 6.3 EBITDA Margin

**At $1M ARR**:

- Revenue: $83K/month
- COGS (40%): $33K
- Gross Profit: $50K (60%)
- OpEx: $125K/month
- EBITDA: -$75K (-90%)

**At $5M ARR**:

- Revenue: $417K/month
- COGS (20%): $83K
- Gross Profit: $334K (80%)
- OpEx: $350K/month
- EBITDA: -$16K (-4%)

**At $10M ARR** (Break-even):

- Revenue: $833K/month
- COGS (15%): $125K
- Gross Profit: $708K (85%)
- OpEx: $500K/month
- EBITDA: +$208K (+25%)

---

## 7. Cost Optimization Strategies

### 7.1 AI Cost Optimization

**Current State**:

- Tiered presets: Gemini Flash Lite ($0.004) → Sonnet 4.6 ($0.129)
- Default preset (budget) already routes to cheapest models
- Blended avg ~$0.08-0.12/article including images

**Optimization Path**:

1. **Most users default to budget/balanced** — already $0.01-0.10/article
2. **Monitor model pricing** — Gemini/Replicate prices trend downward
3. **Volume discounts** from OpenRouter/Replicate at scale: 10-20% reduction
4. **Cache common patterns** and reuse: 20-30% reduction

**Target**: Maintain $0.05/article blended average as usage scales

### 7.2 Infrastructure Optimization

**Current**: Cloudflare Pages + Astro 5 SSR

- $0.50/million requests
- Excellent cost-efficiency at scale
- Global edge performance

**Optimization**: Further optimize Cloudflare Workers usage

- Cache aggressively at edge
- Optimize bundle sizes for 10ms CPU limit
- Leverage R2 for storage over S3

### 7.3 Support Optimization

**Current**: 1 support person per 500 customers

**Optimization**:

- Better in-app guidance: 50% ticket reduction
- Community support: 30% ticket deflection
- AI-powered chat: 40% ticket automation

**Target**: 1 support person per 1,500 customers (3x efficiency)

### 7.4 Customer Acquisition Cost Optimization

**Current**: CAC $80-300 depending on segment

**Optimization**:

- Improve organic SEO: 50% reduction in paid CAC
- Referral program: Lower CAC, higher quality
- Product-led growth: Viral loops reduce CAC
- Partner program: Shift acquisition cost to partners

**Target**: 30% reduction in blended CAC by Year 3

---

## 8. Cost Risks & Mitigation

### 8.1 AI Price Increases

**Risk**: Google, Anthropic, or Replicate raise prices

**Probability**: Low-Medium (15-25% — prices have been trending down)

**Impact**: Medium (10-30% COGS increase on affected tier)

**Mitigation**:

- Multi-model, multi-provider strategy (Google, Anthropic, Replicate)
- Env-based model overrides allow instant swap to cheaper alternatives
- Credit cost adjustment triggers defined (e.g., bump image credits if Flux 2 Pro exceeds $0.08/image)
- 85%+ margins at worst case provide large buffer before any price pass-through
- Negotiate volume contracts at scale

### 8.2 Infrastructure Cost Overruns

**Risk**: Usage grows faster than revenue

**Probability**: Low (10%)

**Impact**: Medium (10-20% margin compression)

**Mitigation**:

- Usage monitoring and alerting
- Rate limiting and fair use policies
- Pre-payment for reserved capacity
- Architecture optimization for efficiency

### 8.3 Personnel Cost Inflation

**Risk**: Engineering salary inflation, hiring competition

**Probability**: High (50%+)

**Impact**: Medium (10-20% OpEx increase)

**Mitigation**:

- Equity compensation (startup premium)
- Remote-first (access to global talent)
- Contractor to full-time conversion
- Performance-based bonuses vs. base salary

### 8.4 Customer Acquisition Cost Escalation

**Risk**: Paid channel costs increase, competition intensifies

**Probability**: High (70%+)

**Impact**: High (20-30% CAC increase)

**Mitigation**:

- Diversify acquisition channels
- Invest in organic (SEO, content, community)
- Improve product-led growth
- Increase focus on referrals and partnerships
- Improve conversion rates (more value from same traffic)

---

## 9. Break-Even Analysis

### 9.1 Monthly Break-Even

**Fixed Costs** (Phase 2): $77K-125K/month

**Contribution Margin per Customer**:

- Average ARPU: $150/month
- Variable costs: $30/month
- Contribution: $120/month

**Break-Even Customers**: $100K / $120 = **833 customers**

**Break-Even MRR**: 833 × $150 = **$125K MRR**

### 9.2 Time to Break-Even

**Current Runway**: $500K raised

**Burn Rate**: $50K-100K/month (Phase 2)

**Runway**: 5-10 months

**Revenue Growth Target**:

- Month 0: $0 MRR
- Month 6: $6K MRR
- Month 12: $40K MRR
- Month 18: $125K MRR (break-even)

**Time to Break-Even**: 18 months from launch

---

## 10. Cost Summary

### Unit Economics (at Scale)

| Metric                         | Value        |
| ------------------------------ | ------------ |
| **Cost per Article**           | $0.10-0.15   |
| **Variable Cost per Customer** | $20-35/month |
| **Contribution Margin**        | 70-85%       |
| **CAC (Blended)**              | $100-150     |
| **LTV**                        | $3,000-5,000 |
| **LTV:CAC Ratio**              | 20:1 to 30:1 |

### Operating Model (at $5M ARR)

| Metric              | Value       | % of Revenue |
| ------------------- | ----------- | ------------ |
| **Revenue**         | $417K/month | 100%         |
| **COGS (Variable)** | $83K/month  | 20%          |
| **Gross Margin**    | $334K/month | 80%          |
| **OpEx**            | $350K/month | 84%          |
| **EBITDA**          | -$16K/month | -4%          |
| **Gross Margin %**  | 80%         |              |
| **EBITDA Margin %** | -4%         |              |

### Path to Profitability

| ARR  | Gross Margin | OpEx  | EBITDA Margin |
| ---- | ------------ | ----- | ------------- |
| $1M  | 60%          | $1.5M | -90%          |
| $3M  | 70%          | $1.8M | -37%          |
| $5M  | 80%          | $4.2M | -4%           |
| $8M  | 85%          | $5M   | +7%           |
| $10M | 85%          | $6M   | +15%          |

**Profitability**: $8-10M ARR (15-20 months from launch at current trajectory)
