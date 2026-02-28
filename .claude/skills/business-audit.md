# Business Audit & Pivot Skill

Use when the user asks for a strategic review of their business docs, wants to audit the landing page for discrepancies, or needs to align positioning with what's actually built.

## What This Skill Does

A three-part framework:

1. **Business doc audit** — Read all BMC/strategy docs and identify gaps, wrong assumptions, contradictions
2. **Market reality check** — Research current competitive landscape, pricing compression, and market shifts
3. **Product-marketing gap audit** — Compare what the landing page promises vs what the codebase actually delivers

## When to Use

- Before launch to catch false claims or misaligned positioning
- When pivoting strategy (e.g., "lead with quality" → "own the full workflow")
- When product scope has drifted from marketing copy
- When competitor landscape shifts and positioning needs updating
- When user asks "am I missing something?" or "are we heading in the wrong direction?"

## Execution Steps

### Step 1: Read All Business Docs

Read all files in `docs/business/`:

- `business-model-canvas/README.md` — PMF summary, strategic decisions
- `business-model-canvas/value-proposition.md` — positioning, feature matrix
- `business-model-canvas/lean-product-playbook.md` — validation status
- `business-model-canvas/revenue-streams.md` — pricing, projections
- `business-model-canvas/customer-segments.md` — personas, prioritization
- `business-model-canvas/channels.md` — acquisition plan
- `business-model-canvas/cost-structure.md` — unit economics

For each: note **key assumptions**, **gaps**, **contradictions**.

### Step 2: Audit the Codebase vs. Marketing

Read and compare:

- `shared/config/subscription.config.ts` — source of truth for plans/pricing
- `shared/constants/credit-costs.constants.ts` — credit costs
- `client/config/dashboardRoutes.ts` — which features are `enabled: true/false`
- `client/components/landing/PricingPreviewSection.tsx` — pricing shown to users
- `client/components/landing/SolutionSection.tsx` — feature claims
- `client/components/landing/HeroSection.tsx` — headline/subheadline
- `client/components/pages/FeaturesPageClient.tsx` — feature descriptions
- `src/pages/index.astro` — meta description, JSON-LD schema
- `src/pages/pricing.astro` — pricing meta description

**Check for:**

- Article counts in marketing vs. config
- "Unlimited" claims vs. actual limits
- Features listed as available but `enabled: false` in dashboardRoutes
- Unsubstantiated hard metrics (X% pass rate, X stars, X reviews)
- Coming soon labels missing where features aren't built
- JSON-LD aggregateRating without real review data

### Step 3: Research Competitive Landscape

Search for:

- Current competitor pricing (Outrank, RankYak, Byword, Koala, Surfer, Frase, Jasper, SEO.ai)
- Market trends (Google AI Overviews impact, LLM cost compression, thin-wrapper death)
- New entrants in AI SEO content (2025-2026)
- What differentiators still matter in the current market

### Step 4: Identify Unknown Unknowns

Review all docs holistically and flag:

- **Missing validation**: Any assumption marked TBD or not yet tested with real users
- **Feature matrix inflation**: ✅ for things that aren't built
- **Contradictions**: Same metric stated differently in 2 docs
- **Narrative drift**: What the product IS vs. what the marketing SAYS it is
- **Market positioning risk**: Is the core differentiator still defensible?

### Step 5: Create PRD for Gaps

Use `/prd-creator` to create a PRD covering:

- All factual discrepancies (prices, article counts, feature availability)
- Positioning pivot if needed (e.g., "quality" → "full workflow")
- Business doc updates (feature matrix, value prop statement, strategic decisions)
- Landing page copy changes

## Common Findings Pattern

In AI SaaS tools, these issues recur:

| Issue                              | Where to Look                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| Article count mismatch             | `PricingPreviewSection.tsx` vs `subscription.config.ts`                              |
| "Unlimited" claims                 | Landing page vs actual plan limits in config                                         |
| Fake social proof                  | `index.astro` JSON-LD aggregateRating, hero stats                                    |
| Coming soon missing                | `PricingPreviewSection.tsx` features list vs `subscription.config.ts` features array |
| Unbuilt features shown as live     | `dashboardRoutes.ts` `enabled: false` vs feature matrix ✅                           |
| Webflow/integrations overstated    | Adapters may exist but be labelled "coming soon" in marketing                        |
| Meta description wrong price range | `pricing.astro` description vs actual tier prices                                    |

## PRD Structure for Cleanup

```markdown
## Phase 1: Fix Factual Discrepancies (P0)

- Pricing numbers
- Article counts
- Remove fake social proof
- Soften unverified percentage claims

## Phase 2: Update Business Docs (P1)

- Core value proposition statement
- Feature matrix (✅→🔜 for unbuilt)
- Competitive positioning (remove self-scoring 5/5 on everything)
- Strategic decisions updated to reflect pivot

## Phase 3: Update Marketing Copy (P1)

- Hero subheadline
- Solution section headline + feature cards
- Meta descriptions (homepage, pricing page)
```

## Key Principle

**Never claim a feature exists if `enabled: false` in `dashboardRoutes.ts`.**

The dashboard is the ground truth of what's shipped. Anything disabled there is 🔜, not ✅.
