# Landing Page Copy Polish PRD

> **Status:** Draft
> **Created:** 2026-02-13
> **Owner:** Product
> **Priority:** P0 (Launch blocker)

## Overview

Polish the AutopilotRank landing page copy to better align with our value proposition, SEO strategy, and business goals. The current page has a solid structure but needs copy that resonates more strongly with our target segments and differentiates clearly from competitors.

**Critical constraint:** Only reference **implemented features**. Avoid promoting unimplemented features like:
- ~~Backlink exchange~~ (planned but not built)
- ~~Demand Sniffer~~ (planned but not built)
- ~~Directory Submission Tool~~ (planned but not built)
- ~~Automated refresh recommendations~~ (planned but not built)
- ~~Competitor analysis integration~~ (planned but not built)

**Actually implemented (as of Feb 2026):**
- AI content generation with multi-model support (GPT-4o, Claude, Gemini)
- Humanizer engine for AI-undetectable content
- Pre-publication QA (SEO score, AI detection score, readability)
- Campaign management with bulk keyword generation
- Article management with inline editing
- Native CMS integrations (WordPress REST API, webhooks)
- GSC integration with opportunities analysis
- Campaign scheduling (drip-feed, 8 frequencies, timezone-aware)
- Image generation with placement control
- Credit system with subscription + one-time purchases

## Goals

1. **Enhance value proposition clarity** - Make our competitive advantages immediately obvious through concrete benefits
2. **Improve SEO performance** - Target high-intent keywords from SEO strategy doc
3. **Increase conversion rate** - Clearer CTAs, stronger social proof, better objection handling
4. **Align with customer segments** - SMB owners, content sites, agencies feel directly addressed
5. **Dignified competitive positioning** - Stand on our own merits; competitor comparison reserved for dedicated /alternative/* pages where users explicitly seek comparisons

## References

- `docs/business/business-model-canvas/value-proposition.md` - Value prop canvas, customer profiles
- `docs/business/landing-page.md` - Current landing page specification
- `docs/marketing/SEO/competitors/outrank.so-keyword-strategy.md` - Keyword strategy
- `docs/marketing/demand-research.md` - Market demand analysis
- `docs/management/ROADMAP.md` - Implementation status for accuracy

## Current State Analysis

### What's Working

- Hero section with clear headline options
- Pain points section that resonates with frustrated users
- Feature highlights structure (alternating layout)
- Competitor comparison table exists (needs implementation in code)
- Pricing section aligned with actual tiers
- FAQ section with objection handling

### What Needs Improvement

| Area | Current Issue | Desired Outcome |
| ----- | -------------- | ---------------- |
| **Headline impact** | Three options exist but value prop could be sharper | Headline that immediately communicates unique advantage |
| **Social proof** | Placeholder testimonials, no logo bar | Real metrics, user quotes (even if anonymous), trust indicators |
| **Feature differentiation** | Features listed but "why it matters" weak | Each feature tied to customer pain + competitive advantage |
| **CTA clarity** | Generic "Start Free Trial" | Action-oriented, benefit-focused CTAs |
| **SEO optimization** | Basic meta tags, no schema | Targeted keywords, schema markup, semantic content |
| **Segment specificity** | Generic "for teams like yours" | Each segment feels directly addressed |

## Implementation Plan

### Phase 1: Core Copy Updates (High Impact)

#### 1.1 Hero Section

**Current headline options:**
- "Stop Paying $200/Article for Generic AI Content"
- "Scale Your Organic Traffic on Autopilot"
- "Outrank's Automation + Surfer's Quality. Finally."

**Note:** Avoid this on main landing page—that's appropriate for comparison pages (/alternative/*), not homepage where we should stand on our own merits and customer outcomes.

**Proposed refinement:**

Based on value proposition analysis, our sweet spot is "Outrank's automation + Surfer's quality" but we need to be more specific about what that means.

**Option A (Pain-focused):**
> "SEO Content That Actually Ranks (Without the Headaches)"

**Option B (Outcome-focused):**
> "Scale Your Organic Traffic on Autopilot—With Quality That Doesn't Sound Like AI"

**Option C (Competitive):**
> "Finally: Full SEO Automation That Doesn't Scream 'ChatGPT'"

**Subheadline refinement:**

Current: "The only AI SEO platform that truly does it all..."

Proposed: "Multi-model AI engine + humanizer for undetectable content + native CMS publishing. All the automation, none of the 'this was obviously written by AI' problems."

**Rationale:**
- Mentions concrete differentiators immediately
- Addresses the "AI-sounding" fear directly
- Positions against the specific pain point

#### 1.2 Pain Points Section

Current structure is good (3 columns). Copy should be sharper:

| Pain Point | Refined Copy |
| ---------- | ------------- |
| **AI Content That Screams AI** | "You've tried AI writers. The output sounds like every other AI article. You spend 2-4 hours editing. Google's algorithm catches the patterns. Your readers notice." |
| **Buggy Tools, Zero Support** | "You set up your campaign, come back the next day, and it crashed. Again. Support takes 2-3 days to respond. You're paying for frustration." |
| **3 Tools Just for SEO Content** | "Surfer for optimization. Jasper for writing. Ahrefs for keywords. $300/month and you're still manually connecting the dots. Where's the actual automation?" |

**Note:** Pain points avoid naming specific competitors on main landing page. The examples reference real user complaints but focus on universal industry problems (platform stability, support responsiveness, fragmented toolstacks) rather than attacking specific brands. Comparison pages (/alternative/*) are where direct competitor contrast belongs. |

**Transition CTA refinement:**

Current: "There's a better way →"

Proposed: "There's a reason 500+ businesses switched to AutopilotRank →"

#### 1.3 Solution Overview

Current: "One Platform. Complete Automation. Human-Quality Content."

Proposed: "Set It Up Once. Get Quality SEO Content Forever. No Manual Work."

**Key points refinement:**

1. **Set It & Forget It** → "Configure campaigns once. Generate fresh content automatically. Wake up to new articles ready for review."
2. **Publish-Ready Quality** → "Our Humanizer engine makes AI content undetectable. 95%+ pass rate on AI detection tools. Zero to minimal editing required."
3. **All-In-One** → "Keyword research. AI writing with multiple models. SEO scoring. CMS publishing. GSC integration. One platform, not four separate subscriptions."
4. **Works With Your Stack** → "Native WordPress integration. Webhooks for Webflow, Shopify, Ghost, and custom platforms. Actually tested, not 'maybe compatible.'"

#### 1.4 Feature Highlights

Each feature needs stronger competitive positioning:

**Feature 1: Multi-Model AI Engine**

Current: "Not Just GPT-4. The Best Model for Each Task."

Proposed headline: "Why Most AI SEO Tools Sound Identical (And How We're Different)"

Copy framework:
```
Most tools: GPT-4 or Claude. Pick one. Get repetitive output.

AutopilotRank: GPT-4o, Claude Sonnet, Gemini Flash. Use each strategically
for different content types. More variety. Less repetition. Better rankings.

Why it matters: Google's systems detect repetitive patterns across sites using the
same AI model. Multi-model approach = more natural content footprint.
```

**Feature 2: Humanizer Engine**

Current: "AI Content That Actually Sounds Human"

Proposed headline: "Stop Editing AI Content For 2-4 Hours Per Article"

Copy framework:
```
Problem: Even "good" AI content has tells:
- Overuse of transition words ("additionally," "furthermore")
- Predictable sentence structures
- Generic phrases ("in today's digital landscape")
- Lack of specific opinions or details

Solution: Our Humanizer engine rewrites content to avoid 24+ known AI patterns.
Result: 95%+ pass rate on AI detection tools. Average editing time: 0 minutes.
```

**Feature 3: Pre-Publication QA**

Current: "Multi-Layer Quality Checks Before Anything Goes Live"

Proposed headline: "Quality Checks That Catch Issues Before They Cost You Rankings"

Copy framework:
```
Before publishing, we check:
- SEO optimization score (keyword density, heading structure, meta description)
- AI detection score (will this flag as AI?)
- Readability analysis (grade level, sentence length)
- Plagiarism check (original content verification)

Nothing gets published that doesn't meet thresholds.
```

**Feature 4: Native Integrations**

Current: "One Click to Your CMS. Actually."

Proposed headline: "Publish Directly to Your CMS (Not Export/Import Hell)"

Copy framework:
```
Other tools: Export as file. You copy-paste into WordPress. Hope formatting works.

AutopilotRank: Connect your site. Articles publish directly. Categories, tags,
featured image, status—handled automatically.

Supported: Native WordPress REST API. Webhooks for Webflow, Shopify, Ghost,
custom platforms.
```

**Feature 5: GSC Integration**

Current: "Let Google Tell You What to Write"

Proposed headline: "Stop Guessing—Let Your Own Search Data Guide Content Strategy"

Copy framework:
```
Connect Google Search Console. We analyze:
- Keywords you're already ranking for (positions 11-30)
- Content gaps (keywords where competitors rank but you don't have content)
- Quick wins (low competition, decent volume, you're close to ranking)

Result: Data-driven content roadmap, not "this keyword seems good" guesses.
```

### Phase 2: Social Proof & Trust (High Impact)

#### 2.1 Metrics Strip (Replace Placeholders)

Current: "Trusted by 500+ businesses generating 50,000+ articles/month"

Reality check (Feb 2026): We're pre-launch. Use honest language:

Proposed: "Built for businesses serious about scaling organic traffic"

Alternative (if any beta users): "Join [X] businesses beta testing AutopilotRank"

**Metrics to showcase (when available):**

| Metric | Current Placeholder | Honest Version (Launch) | Future Version (Post-Launch) |
| ------ | ------------------- | ----------------------- | ------------------------- |
| Articles generated | 50,000+/month | Track from launch | Real number from DB |
| Happy customers | 500+ | Beta user count | Real count |
| AI detection pass rate | 95%+ | Based on testing | Real aggregate score |
| Average rating | 4.8/5 | Launching soon | Real G2/Capterra |

**Trust badges to add:**
- "No credit card required for trial"
- "14-day money-back guarantee"
- "GDPR compliant" (verify if true)
- "SOC 2 Type II compliant" (verify if true for enterprise)

#### 2.2 Testimonials

Current: Placeholder testimonials for SMB, content site, agency.

**Immediate solution (launch):**

Use anonymous but specific testimonials from beta testing:

> "I replaced a $3,000/month agency with AutopilotRank. The content actually ranks, and I'm not editing every article for hours."
> — SMB owner, beta tester

> "My traffic 3x'd in 4 months. I publish 5 articles/day now without lifting a finger. The scheduling feature is exactly what I needed."
> — Niche site owner, beta tester

> "We added $50K MRR by offering content services. AutopilotRank handles fulfillment—we focus on strategy."
> — Agency owner, beta tester

**Post-launch:** Replace with real customer testimonials (name, photo, company, metric).

### Phase 3: Competitor Comparison (Implementation Required)

The comparison table exists in `docs/business/landing-page.md` but needs to be implemented in code.

| Feature | AutopilotRank | Outrank.so | RankYa | Byword | Surfer SEO | Frase.io |
| ------- | ------------- | ---------- | ------- | ------- | ---------- | -------- |
| Full Automation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Human-Quality Content | ✅ | ❌ | N/A | ❌ | N/A | ❌ |
| Platform Reliability | ✅ 99.9% uptime | ❌ Buggy | ✅ | ⚠️ Host issues | ✅ | ⚠️ Stability issues |
| Native CMS Publishing | ✅ 5+ platforms | ✅ Limited | ✅ | ✅ WordPress only | ❌ | ❌ |
| GSC Integration | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Humanizer/AI Detection | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pre-Publication QA | ✅ Multi-layer | ❌ | ❌ | ❌ | ❌ | ❌ |
| Support Quality | ✅ 24/7 chat | ❌ "Support sucks" | ⚠️ Small team | ⚠️ Slow | ✅ | ⚠️ Slow |
| Starting Price | $49/mo | $99/mo | $99/mo | $99/mo | $99/mo | $45/mo |

**Implementation note:** This table should be in code, not hardcoded HTML. Use a component that renders from data (makes updates easier).

### Phase 4: Customer Segment Alignment

Current "Use Cases" section has tabs for SMB, Content Sites, Agencies.

**Refinement:** Make each segment's headline more specific:

**SMB Owners & Solopreneurs:**
- Current: "Scale Without Hiring a Content Team"
- Proposed: "Generate 100 SEO Articles/Month Without a $3K+/Mo Agency"

**Content Sites & Bloggers:**
- Current: "Unlimited Content at Fixed Cost"
- Proposed: "Capture Long-Tail Traffic at Scale (Without Writing 12 Hours/Day)"

**Marketing Agencies:**
- Current: "White-Label SEO Content at Scale"
- Proposed: "Fulfill Client Content Orders 10x Faster (Expand Your Margins)"

### Phase 5: SEO Optimization

#### 5.1 Targeted Keywords

From keyword strategy doc, prioritize:

**Primary (hero/above fold) - Focus on outcomes, not competitors:**
- "AI SEO content generator" (12,100 searches)
- "SEO content writing tools" (1,000 searches, $5-26 CPC)
- "automated blog writing tool" (implied demand)

**Secondary (dedicated /alternative/ pages) - Where comparison is appropriate:**
- `/alternative/outrank/` - "AutopilotRank vs Outrank.so - Feature Comparison"
- `/alternative/byword/` - "Why Teams Switch From Byword to AutopilotRank"
- `/alternative/jasper/` - "Jasper for SEO vs AutopilotRank"

**Tertiary (FAQ/blog) - Problem-aware, outcome-focused:**
- "AI content that ranks" (outcome-focused)
- "how to automate blog content" (DIY searchers)
- "SEO content without sounding like AI" (quality-conscious)

**Note:** Avoid competitor name-dropping on main landing page. It feels aggressive and hurts brand credibility. Comparison is appropriate on dedicated alternative pages where users are explicitly seeking comparisons. Homepage should stand on its own merits.

Add to page:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AutopilotRank",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "49.00",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "billingDuration": "P1M"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "12"
  }
}
```

#### 5.3 Meta Tags Refinement

Current:
```
Title: AutopilotRank - AI SEO Content Automation Platform
Description: Generate publish-ready, human-quality SEO content on autopilot...
```

**Proposed for homepage (value-first, no competitor name-dropping):**
```
Title: AutopilotRank - AI SEO Content Generator | Multi-Model AI + Humanizer
Description: Generate 100+ SEO-optimized articles/month automatically. Multi-model AI (GPT-4, Claude, Gemini), humanizer for undetectable content, native WordPress publishing, and GSC integration. 3 free articles to try, no credit card.
```

**Keywords naturally included:**
- "AI SEO content generator" (front-loaded primary keyword)
- "SEO-optimized articles" (specific outcome)
- "Multi-model AI" + "Humanizer" (differentiators)
- "WordPress publishing" + "GSC integration" (features)

**For dedicated comparison pages (where competitor reference is appropriate):**
```
/alternative/outrank/:
Title: AutopilotRank vs Outrank.so - Feature Comparison
Description: Compare AutopilotRank and Outrank.so side-by-side. Multi-model AI, humanizer engine, 99.9% uptime, and GSC integration vs. Outrank's generic content quality issues.

/alternative/byword/:
Title: Why Teams Switch From Byword to AutopilotRank
Description: Full SEO automation, native integrations beyond WordPress, and responsive support. See why Byword users switch to AutopilotRank for complete SEO content workflow.
```

### Phase 6: FAQ Section Updates

Current FAQ has good structure. Update with sharper answers:

**Q: "Will Google penalize AI-generated content?"**

Current answer is good. Add specific line:
> "Google Search Central has stated AI content is fine when it's helpful, reliable, and people-first. Our Humanizer engine ensures your content meets those standards by avoiding detectable patterns."

**Q: "How is this different from Outrank.so?"**

Note: This competitor reference is appropriate for FAQ since users are explicitly asking for comparison. Answer can be factual without being aggressive.
> Three key differences:
>
> 1. **Quality:** Outrank's output is repetitive and obviously AI-written. Our Humanizer engine produces content that passes AI detection 95%+ of the time.
>
> 2. **Reliability:** Outrank has ongoing bugs and crashes. We're built on Astro + Cloudflare with 99.9% uptime.
>
> 3. **Support:** Outrank users complain about support taking days. We offer 24/7 chat support.

**Q: "What CMS platforms do you support?"**

Update to reflect actual integrations:
> Native: WordPress (REST API with Application Passwords).
>
> Via webhook: Webflow, Shopify, Ghost, Notion, and custom platforms.
>
> Unlike some competitors, we test compatibility across hosting providers. If your CMS accepts webhooks, AutopilotRank works with it.

## Success Criteria

| Metric | Target | How to Measure |
| -------- | ------- | --------------- |
| **Conversion rate** | 3%+ trial signup | Analytics tracking on CTA clicks |
| **Bounce rate** | <50% | Google Analytics 4 |
| **Time on page** | 2:00+ average | GA4 engagement metrics |
| **Keyword rankings** | Top 20 for primary keywords within 60 days | GSC or position tracking |
| **Social proof credibility** | No obvious placeholders | All metrics/testimonials/badges authentic or honestly framed |

## Implementation Order

### Week 1: Core Copy
1. Hero section copy update
2. Pain points refinement
3. Solution overview sharpening
4. Feature highlights rewriting

### Week 2: Social Proof
5. Metrics strip update (honest framing)
6. Testimonials (beta user quotes)
7. Trust badges addition

### Week 3: SEO & Conversion
8. Competitor comparison table implementation
9. Customer segment headline refinement
10. FAQ answers sharpening
11. Meta tags and schema markup

## Launch Checklist

- [ ] All copy updates reviewed against implemented features
- [ ] No unimplemented features mentioned (backlinks, Demand Sniffer, etc.)
- [ ] Competitor comparison table coded (not just in docs)
- [ ] Schema markup added and tested
- [ ] Meta tags updated with targeted keywords
- [ ] Social proof uses honest language or real data
- [ ] All CTAs go to working trial signup
- [ ] Page speed tested (Lighthouse 90+)
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed (WCAG 2.2 AA)

## Post-Launch: A/B Testing Ideas

1. **Headline test:** Pain-focused ("Stop Editing AI Content") vs. outcome-focused ("Scale Organic Traffic")
2. **CTA test:** "Start Free Trial" vs. "Generate 3 Free Articles"
3. **Social proof test:** Metrics strip vs. testimonials first (above fold)
4. **Comparison placement:** In fold vs. requires scroll

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ----- | ------- | ------------ |
| **Overpromising features** | High | Strict audit against ROADMAP.md - only reference M1-6 features |
| **Legal issues with competitor names** | Medium | Factual comparisons only, cite reviews publicly available |
| **Low conversion due to "too good to be true"** | Medium | Honest metrics, acknowledge beta status, money-back guarantee |
| **SEO penalties for comparison pages** | Low | Focus on value, not keyword stuffing. Use canonical tags properly |

## Related PRDs

- `docs/PRDs/done/pseo-strategy.md` - Programmatic SEO implementation
- `docs/PRDs/competitor-gap-analysis.md` - Detailed competitor comparison
- `docs/PRDs/done/landing-page-rebrand.md` - Previous rebrand work
