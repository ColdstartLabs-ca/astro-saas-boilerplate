# PRD: Value Prop Pivot & Landing/Product Gap Cleanup

**Complexity: 5 → MEDIUM mode**

| Score | Reason                                               |
| ----- | ---------------------------------------------------- |
| +3    | Touches 10+ files                                    |
| +2    | Coordinated changes across marketing, docs, and code |

**Status:** Draft
**Priority:** P0 — Must complete before launch
**Author:** Claude
**Date:** 2026-02-27

---

## 1. Context

**Problem:** The landing page, features page, and business docs contain factual discrepancies with the actual product config (wrong article counts, fake social proof, unbuilt features presented as live). The core value proposition is positioned around "quality automation" (Humanizer as moat) — a thin differentiator in 2026's commoditized market. We need to pivot positioning to **"full workflow ownership"** (research → generate → optimize → publish → track → iterate) and fix all marketing/product gaps before launch.

**Files Analyzed:**

- `client/components/landing/PricingPreviewSection.tsx`
- `client/components/landing/SolutionSection.tsx`
- `client/components/landing/HeroSection.tsx`
- `client/components/pages/FeaturesPageClient.tsx`
- `src/pages/index.astro`
- `src/pages/pricing.astro`
- `shared/config/subscription.config.ts` (source of truth)
- `shared/config/credits.config.ts`
- `docs/business/business-model-canvas/value-proposition.md`
- `docs/business/business-model-canvas/README.md`

**Current Behavior:**

- Growth plan shows "150 articles/mo" on landing page; config says 100
- Agency plan shows "Unlimited articles" on landing page; config says 500
- Pricing page meta says "paid plans from $9 to $149"; actual is $49 to $249
- Schema.org JSON-LD claims 4.8 stars / 12 reviews — unsubstantiated
- SolutionSection claims "95%+ pass rate on AI detection tools" — unverified hard metric
- White-label reports listed without "(coming soon)" qualifier on landing page
- Webflow marked "coming soon" on features page but adapter is fully built
- Hero dashboard mock shows Keywords, Quality Audit, Calendar, Analytics as clickable tabs — all disabled in real product
- Value proposition docs position Humanizer as primary moat; feature matrix claims checkmarks for unbuilt features (Fact-Checking, Brand Voice, AI Visibility Tracking, Rank Tracking, Traffic Analytics, etc.)

---

## 2. Solution

**Approach:**

1. **Pivot core positioning** from "quality automation via Humanizer" to **"the only platform that owns the full content lifecycle"** — research → generate → optimize → publish. This is what's actually built and defensible.
2. **Fix all factual discrepancies** between landing page / features page and the subscription config source of truth.
3. **Remove or soften unsubstantiated claims** (fake social proof, unverified percentages).
4. **Honestly label unbuilt features** in business docs (feature matrix).
5. **Unlock Webflow** — it's built, stop saying "coming soon".

**Key Decisions:**

- Single source of truth: `subscription.config.ts` — all UI must derive from or match it
- No fake social proof. Remove schema.org aggregateRating until real reviews exist.
- Soften "95%+" to qualitative language until we have test data
- Feature matrix in value-proposition.md: mark unbuilt features with 🔜 instead of ✅
- Hero dashboard mock: keep it aspirational (it's a demo), but ensure the SolutionSection and feature claims only promise what's live

**What stays the same:**

- The Hero dashboard mock (Pipeline, Keywords, Audit, Calendar views) — this is a product demo/vision, acceptable as aspirational UI
- Pricing structure ($49/$99/$249) — correct everywhere except the discrepancies
- Core features that ARE built: multi-model AI, humanizer, CMS integrations, GSC, campaigns, scheduling, credit system

---

## 3. Execution Phases

### Phase 1: Fix Pricing & Social Proof Discrepancies — "Pricing page shows correct numbers"

**Files (5):**

- `client/components/landing/PricingPreviewSection.tsx` — fix article counts, add coming soon label
- `src/pages/pricing.astro` — fix meta description
- `src/pages/index.astro` — remove fake aggregateRating from JSON-LD
- `client/components/pages/FeaturesPageClient.tsx` — remove Webflow "coming soon", fix hardcoded pricing string
- `client/components/landing/SolutionSection.tsx` — soften 95% claim

**Implementation:**

- [ ] `PricingPreviewSection.tsx` line 77: Change `"150 articles/mo"` → `"100 articles/mo"`
- [ ] `PricingPreviewSection.tsx` line 112: Change `"Unlimited articles"` → `"500 articles/mo"`
- [ ] `PricingPreviewSection.tsx` line 114: Change `"White-label reports"` → `"White-label reports (coming soon)"`
- [ ] `pricing.astro` line 8: Change meta description from `"paid plans from $9 to $149 per month"` → `"paid plans from $49 to $249 per month"`
- [ ] `index.astro` lines 47-51: Remove the entire `aggregateRating` block from JSON-LD (no real reviews yet)
- [ ] `FeaturesPageClient.tsx` line 67: Remove "Webflow integration is coming soon" clause — rewrite to include Webflow as supported
- [ ] `FeaturesPageClient.tsx` line 73: Remove "Webflow support coming soon" from bullets — replace with "Webflow integration via webhook adapter"
- [ ] `FeaturesPageClient.tsx` line 381: Change hardcoded pricing string to match config prices (already correct but fragile — keep as-is for now, just verify)
- [ ] `SolutionSection.tsx` line 86: Change `"95%+ pass rate on AI detection tools"` → `"High pass rates on major AI detection tools"` (remove hard percentage until verified)

**Tests Required:**

| Test File                            | Test Name                                   | Assertion                               |
| ------------------------------------ | ------------------------------------------- | --------------------------------------- |
| `tests/e2e/public-pages.e2e.spec.ts` | `pricing page has correct meta description` | meta description contains "$49 to $249" |

**User Verification:**

- Action: Visit landing page `/` and `/pricing`
- Expected: Growth shows "100 articles/mo", Agency shows "500 articles/mo", no fake rating in page source, pricing meta is correct

---

### Phase 2: Pivot Value Proposition in Business Docs — "Docs reflect full-workflow positioning"

**Files (2):**

- `docs/business/business-model-canvas/README.md` — update strategic decisions & PMF summary
- `docs/business/business-model-canvas/value-proposition.md` — update core positioning, fix feature matrix

**Implementation:**

- [ ] `README.md` — Update PMF Summary box:
  - Change `VALUE PROP: Quality automation (vs generic AI)` → `VALUE PROP: Full workflow ownership (research → generate → optimize → publish)`
  - Change `DIFFERENTIATOR: Humanizer + Reliability + Support` → `DIFFERENTIATOR: End-to-end pipeline + GSC integration + Multi-model AI`
- [ ] `README.md` — Update "Key Strategic Decisions" section:
  - Decision #1: Change from "Lead with Quality, Not Just Automation" to **"Own the Full Content Lifecycle"** — "We differentiate by owning every step from keyword input to published article. Competitors either generate but don't publish (Jasper, Frase), or automate but produce garbage (Outrank). We do both."
  - Keep #2 (Target SMBs First), #3 (WordPress-First), #4 (GSC Integration as Moat)
- [ ] `value-proposition.md` — Update Value Proposition Statement (lines 15-22):
  - Change the `Unlike` line to: `Unlike Outrank.so (buggy, generic, no workflow control) and fragmented toolchains (Surfer + Jasper + manual publishing), we own the full pipeline: keyword in → published article out.`
- [ ] `value-proposition.md` — Update Core Promise (line 9):
  - Change to: `"The only AI SEO platform that owns the full content lifecycle — from keyword discovery to published article. One platform replaces your entire content toolchain."`
- [ ] `value-proposition.md` — Fix feature matrix (lines 310-380): Replace ✅ with 🔜 for unbuilt features:
  - `Keyword Research` → 🔜 (dashboard disabled, only CSV upload + GSC opportunities exist)
  - `SERP Analysis` → 🔜
  - `Content Optimization` → 🔜 (dashboard disabled)
  - `On-Page SEO Scoring` → keep ✅ (exists in article generation)
  - `Rank Tracking` → 🔜 (lines 345)
  - `Traffic Analytics` → 🔜 (line 346)
  - `AI Visibility Tracking` → 🔜 (line 347)
  - `Content Performance` → 🔜 (line 348)
  - `Automated Refresh Recs` → 🔜 (line 349)
  - `Plagiarism Check` → 🔜 (line 355)
  - `Brand Voice Customization` → 🔜 (line 358)
  - `Fact-Checking` → 🔜 (line 359)
  - `Demand Sniffer (GSC)` → keep ✅ (this IS the Opportunities feature)
  - `Directory Submission Tool` → 🔜 (lines 379)
  - `Citation Tracking` → 🔜 (line 380)
- [ ] `value-proposition.md` — Update the Competitive Positioning Matrix (lines 610-631): Remove the self-scoring of 5/5 on all dimensions. Replace with honest assessment (e.g., Automation: 4.5, Quality: 4, Reliability: 4, Features: 3.5, Support: 3, Value: 4.5)
- [ ] `value-proposition.md` — Update Unique Competitive Advantages section (lines 501-543): Reframe from "6 advantages" to lead with "Full Lifecycle Ownership" as advantage #1, move "True Autonomy" to #2

**Tests Required:**

| Test File | Test Name     | Assertion                                                  |
| --------- | ------------- | ---------------------------------------------------------- |
| N/A       | Manual review | Docs are internally consistent, no ✅ for unbuilt features |

**User Verification:**

- Action: Read updated README.md and value-proposition.md
- Expected: Core positioning is "full workflow / full lifecycle", feature matrix honestly reflects build status

---

### Phase 3: Update Landing Page Messaging — "Landing page reflects full-workflow positioning"

**Files (2):**

- `client/components/landing/SolutionSection.tsx` — update headline and feature cards to emphasize full workflow
- `client/components/landing/HeroSection.tsx` — update subheadline

**Implementation:**

- [ ] `SolutionSection.tsx` lines 26-32: Update headline:
  - Current: `"Set It Up Once. Get Quality SEO Content Forever. No Manual Work."`
  - New: `"One Platform. Full Pipeline. Zero Manual Work."`
  - Subtitle current: `"Stop stitching together 5 different tools. We handle the entire lifecycle."`
  - Subtitle new: `"From keyword to published article — research, generate, optimize, and publish in one automated pipeline."`
- [ ] `SolutionSection.tsx` lines 79-96: Update feature cards:
  - Card 1 ("Set It & Forget It"): Keep as-is (good)
  - Card 2 ("Publish-Ready Quality"): Update desc to `"Our Humanizer engine makes AI content sound natural. High pass rates on major AI detection tools. Minimal editing required."` (already done in Phase 1 for the 95% part, now update surrounding copy)
  - Card 3 ("All-In-One"): Update title to `"Full Pipeline, One Platform"`, update desc to `"Keyword research → AI writing → SEO optimization → CMS publishing. One subscription replaces 4 separate tools."` (remove specific feature claims for unbuilt items like "Keyword research" standalone tool — reframe as the pipeline)
  - Card 4 ("Works With Your Stack"): Keep as-is (accurate)
- [ ] `HeroSection.tsx` line 507: Update subheadline:
  - Current: `"AI content that ranks and reads human. Set it, forget it, watch traffic grow."`
  - New: `"From keyword to published article — one automated pipeline. Set it, forget it, watch traffic grow."`
- [ ] `index.astro` line 8: Update meta description to match new positioning:
  - Current: `"Automated SEO platform that generates human-quality content and publishes to your CMS on autopilot. Multi-model AI, built-in humanizer, from $49/mo. Start free trial."`
  - New: `"The SEO content platform that owns the full pipeline — keyword research, AI writing, optimization, and CMS publishing on autopilot. Multi-model AI, from $49/mo. Start free."`

**Tests Required:**

| Test File                            | Test Name                               | Assertion                                 |
| ------------------------------------ | --------------------------------------- | ----------------------------------------- |
| `tests/e2e/public-pages.e2e.spec.ts` | `homepage has correct meta description` | meta description contains "full pipeline" |

**User Verification:**

- Action: Visit landing page `/`
- Expected: Headline emphasizes "pipeline" / "full workflow" rather than just "quality AI content". Solution section clearly communicates the research→generate→optimize→publish flow.

---

## 4. Summary of All Changes

### Code Changes

| File                                                      | Change                                                      | Priority |
| --------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| `client/components/landing/PricingPreviewSection.tsx:77`  | "150 articles/mo" → "100 articles/mo"                       | P0       |
| `client/components/landing/PricingPreviewSection.tsx:112` | "Unlimited articles" → "500 articles/mo"                    | P0       |
| `client/components/landing/PricingPreviewSection.tsx:114` | "White-label reports" → "White-label reports (coming soon)" | P0       |
| `src/pages/pricing.astro:8`                               | Meta: "$9 to $149" → "$49 to $249"                          | P0       |
| `src/pages/index.astro:47-51`                             | Remove aggregateRating from JSON-LD                         | P0       |
| `src/pages/index.astro:8`                                 | Update meta description to full-pipeline positioning        | P1       |
| `client/components/landing/SolutionSection.tsx:86`        | "95%+ pass rate" → "High pass rates"                        | P0       |
| `client/components/landing/SolutionSection.tsx:26-32`     | Update headline to full-workflow messaging                  | P1       |
| `client/components/landing/SolutionSection.tsx:79-96`     | Update feature card copy                                    | P1       |
| `client/components/landing/HeroSection.tsx:507`           | Update subheadline to pipeline messaging                    | P1       |
| `client/components/pages/FeaturesPageClient.tsx:67`       | Remove Webflow "coming soon" (it's built)                   | P0       |
| `client/components/pages/FeaturesPageClient.tsx:73`       | Update Webflow bullet to "via webhook adapter"              | P0       |

### Doc Changes

| File                                                       | Change                                                                                                            | Priority |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `docs/business/business-model-canvas/README.md`            | Pivot PMF summary & strategic decisions to full-workflow                                                          | P1       |
| `docs/business/business-model-canvas/value-proposition.md` | Update core promise, VP statement, fix feature matrix (✅→🔜 for unbuilt), fix competitive positioning self-score | P1       |

---

## 5. Out of Scope

- Enabling disabled dashboard features (Keywords, Optimization, Calendar, Backlinks, Analytics) — separate PRDs
- Building GEO/AEO capabilities — future initiative
- Backlink exchange feature — roadmap months 13-24
- Changing actual pricing or subscription tiers
- Refactoring hardcoded prices to use config imports (nice-to-have, not blocking launch)

---

## 6. Acceptance Criteria

- [ ] All phases complete
- [ ] `yarn verify` passes
- [ ] No landing page claims "150 articles" or "Unlimited articles" for Growth/Agency
- [ ] No unsubstantiated percentage claims (95%+) on any public page
- [ ] No fake aggregateRating in JSON-LD
- [ ] Pricing meta description matches actual pricing ($49-$249)
- [ ] Webflow no longer marked "coming soon"
- [ ] Value proposition docs lead with "full workflow/pipeline" positioning
- [ ] Feature matrix in value-proposition.md uses 🔜 for all unbuilt features
- [ ] Core messaging across hero, solution section, and meta tags consistently communicates the full-pipeline value prop
