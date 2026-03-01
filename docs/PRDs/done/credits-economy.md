# PRD: Credits Economy — Model-Aware Pricing

**Complexity: 4 → MEDIUM mode**
(Touches ~6 config files, external API integration research, business logic changes)

**Status:** Done
**Date:** 2026-02-10 (updated 2026-02-28 — ultra writer changed from Opus 4.6 to Sonnet 4.6)

---

## 1. Context

**Problem:** The current credit system charges a flat 1 credit per article regardless of which AI model the user selects. With the new model lineup (Gemini Flash Lite to Claude Opus 4.6 for writing, Flux Schnell to Flux 2 Max for images), the cost spread is **~37x for writers** and **~23x for images**. If a user on the cheapest plan exclusively uses "ultra" models, we hemorrhage money. We need per-model credit costs that guarantee profitability on every single generation, no matter what.

**Files Analyzed:**

- `shared/config/credits.config.ts` — flat credit costs
- `shared/config/ai-models.config.ts` — writer presets (budget/balanced/auto/ultra)
- `shared/config/image-models.config.ts` — image presets (budget/balanced/pro/ultra)
- `shared/config/subscription.config.ts` — plan pricing ($49/$99/$249)
- `server/services/article-generation.service.ts` — generation flow, token usage
- `server/services/campaign.service.ts` — credit deduction logic
- `docs/business/business-model-canvas/revenue-streams.md` — margin targets

**Current Behavior:**

- 1 credit = 1 article generation, regardless of writer model
- Image generation: 0 extra credits (budget/balanced), +1 credit (pro/ultra)
- Writer presets: budget=0, balanced=0, auto=0, ultra=+1
- All plans assume ~$0.15 avg cost per article for margin calculations
- No distinction between a $0.003 Gemini Flash Lite call and a $0.13 Claude Sonnet 4.6 call

---

## 2. Research: Actual Provider Costs

### 2.1 Writer Models (OpenRouter) — VERIFIED Feb 2026

An article generation involves **2 LLM calls**:

1. **Outline generation**: ~500 input tokens, ~2,000 output tokens (max_tokens: 2000)
2. **Article writing**: ~1,500 input tokens (system + outline + user), ~4,000 output tokens (max_tokens: 4000)

**Total per article: ~2,000 input tokens + ~6,000 output tokens**

Worst case (retries, quality gates): ~3,000 input + ~8,000 output tokens.

| Model                     | OpenRouter ID                   | Input $/1M          | Output $/1M          | Cost/Article (typical) | Cost/Article (worst) |
| ------------------------- | ------------------------------- | ------------------- | -------------------- | ---------------------- | -------------------- |
| **Gemini 2.5 Flash Lite** | `google/gemini-2.5-flash-lite`  | $0.10               | $0.40                | **$0.0026**            | **$0.0035**          |
| **Gemini 3 Flash**        | `google/gemini-3-flash-preview` | $0.50               | $3.00                | **$0.019**             | **$0.025**           |
| **Gemini 3 Pro**          | `google/gemini-3-pro-preview`   | $2.00 (starting at) | $12.00 (starting at) | **$0.076**             | **$0.10**            |
| **Claude Sonnet 4.6**     | `anthropic/claude-sonnet-4-6`   | $3.00               | $15.00               | **$0.096**             | **$0.129**           |

> **Calculation breakdown (each model, worst case = 3K in + 8K out):**
>
> - Flash Lite: 3K × $0.10/M + 8K × $0.40/M = $0.0003 + $0.0032 = $0.0035
> - Flash 3: 3K × $0.50/M + 8K × $3.00/M = $0.0015 + $0.024 = $0.0255
> - Pro 3: 3K × $2.00/M + 8K × $12.00/M = $0.006 + $0.096 = $0.102
> - Sonnet 4.6: 3K × $3.00/M + 8K × $15.00/M = $0.009 + $0.12 = $0.129

**Sources:** [OpenRouter Gemini 2.5 Flash Lite](https://openrouter.ai/google/gemini-2.5-flash-lite), [OpenRouter Gemini 3 Flash](https://openrouter.ai/google/gemini-3-flash-preview), [OpenRouter Gemini 3 Pro](https://openrouter.ai/google/gemini-3-pro-preview), [OpenRouter Claude Sonnet 4.6](https://openrouter.ai/anthropic/claude-sonnet-4-6)

### 2.2 Image Models (Replicate) — VERIFIED Feb 2026

Each article generates **2-3 images** (based on word count: <800w=0, <=1200w=2, >1200w=3).

Replicate pricing has **two components** for newer models:

- **Per-run fee** (fixed cost per prediction)
- **Per-megapixel fee** (scales with output resolution)

Our images are 16:9 aspect ratio at ~1MP (e.g., 1333×750). Both fees apply additively.

| Model            | Replicate ID                     | Per-Run     | Per-Output-MP | **Cost/Image (1MP)** | **Cost/3 Images** |
| ---------------- | -------------------------------- | ----------- | ------------- | -------------------- | ----------------- |
| **Flux Schnell** | `black-forest-labs/flux-schnell` | $0.003 flat | —             | **$0.003**           | **$0.009**        |
| **Flux 2 Dev**   | `black-forest-labs/flux-2-dev`   | —           | $0.012-0.014  | **$0.025\***         | **$0.075**        |
| **Flux 2 Pro**   | `black-forest-labs/flux-2-pro`   | $0.015      | $0.015/MP     | **$0.055\***         | **$0.165**        |
| **Flux 2 Max**   | `black-forest-labs/flux-2-max`   | $0.04       | $0.03/MP      | **$0.07**            | **$0.21**         |

> \* Conservative estimates using [PricePerToken](https://pricepertoken.com/image) real-world tracking (higher than theoretical minimums from Replicate pages). For Flux 2 Dev, theoretical is $0.012-0.016 but real-world p50 is ~$0.025. For Flux 2 Pro, theoretical is $0.03 but real-world is ~$0.055. We use the higher number in every case.

> **Flux 2 Max breakdown:** $0.04 (run fee) + $0.03 × 1MP (output) = **$0.07/image**. This is the most expensive image model — 23x the cost of Flux Schnell.

**Sources:** [Replicate Flux Schnell](https://replicate.com/black-forest-labs/flux-schnell), [Replicate Flux 2 Dev](https://replicate.com/black-forest-labs/flux-2-dev), [Replicate Flux 2 Pro](https://replicate.com/black-forest-labs/flux-2-pro), [Replicate Flux 2 Max](https://replicate.com/black-forest-labs/flux-2-max), [PricePerToken Comparison](https://pricepertoken.com/image)

### 2.3 Total Cost Per Article (Writer + 3 Images, ALL worst case)

| Combo                            | Writer Cost | Image Cost (×3) | **Total Cost** |
| -------------------------------- | ----------- | --------------- | -------------- |
| Budget writer + Budget image     | $0.0035     | $0.009          | **$0.013**     |
| Budget writer + Balanced image   | $0.0035     | $0.075          | **$0.079**     |
| Balanced writer + Balanced image | $0.025      | $0.075          | **$0.10**      |
| Pro writer + Pro image           | $0.10       | $0.165          | **$0.265**     |
| Pro writer + Ultra image         | $0.10       | $0.21           | **$0.31**      |
| Ultra writer + Pro image         | $0.129      | $0.165          | **$0.294**     |
| **Ultra writer + Ultra image**   | **$0.129**  | **$0.21**       | **$0.339**     |

---

## 3. Solution: Credit Cost Matrix

### 3.1 Design Principles

1. **Never lose money on any single generation** — even worst-case
2. **Minimum 3x margin** on every model combination at the cheapest plan
3. **Budget tier stays at 1 credit** — this is the baseline, cheapest option
4. **Simple integer credits** — users understand whole numbers
5. **Credit value anchored to plans** — at Growth ($99/100 credits), 1 credit = $0.99 revenue
6. **Price ladder must make sense** — each tier step up costs more credits than the one below

### 3.2 Revenue Per Credit by Plan

| Plan        | Price  | Credits | Revenue/Credit |
| ----------- | ------ | ------- | -------------- |
| Starter     | $49    | 30      | **$1.63**      |
| Growth      | $99    | 100     | **$0.99**      |
| Agency      | $249   | 500     | **$0.498**     |
| Small Pack  | $9.99  | 10      | **$1.00**      |
| Medium Pack | $19.99 | 25      | **$0.80**      |
| Large Pack  | $34.99 | 50      | **$0.70**      |

**Worst case for margin calculation: Agency plan at $0.498/credit.**

### 3.3 Proposed Credit Costs

#### Writer Credits (base cost per article — replaces flat "1 credit" system)

| Preset       | Model                 | Cost/Article (worst) | Credits | Rev @ Agency | **Margin @ Agency** | **Multiplier** |
| ------------ | --------------------- | -------------------- | ------- | ------------ | ------------------- | -------------- |
| **Budget**   | Gemini 2.5 Flash Lite | $0.0035              | **1**   | $0.498       | 99.3%               | 142x           |
| **Balanced** | Gemini 3 Flash        | $0.025               | **1**   | $0.498       | 95.0%               | 20x            |
| **Pro**      | Gemini 3 Pro          | $0.10                | **2**   | $0.996       | 90.0%               | 10x            |
| **Ultra**    | Claude Sonnet 4.6     | $0.129               | **3**   | $1.494       | 91.4%               | 11.6x          |

#### Image Credits (additive, on top of writer credits)

| Preset       | Model        | Cost/3 Images (worst) | Credits | Rev @ Agency | **Margin @ Agency** | **Multiplier** |
| ------------ | ------------ | --------------------- | ------- | ------------ | ------------------- | -------------- |
| **Budget**   | Flux Schnell | $0.009                | **0**   | —            | absorbed            | —              |
| **Balanced** | Flux 2 Dev   | $0.075                | **1**   | $0.498       | 84.9%               | 6.6x           |
| **Pro**      | Flux 2 Pro   | $0.165                | **1**   | $0.498       | 66.9%               | 3.0x           |
| **Ultra**    | Flux 2 Max   | $0.21                 | **2**   | $0.996       | 78.9%               | 4.7x           |

> **Why Budget images = 0 credits:** Flux Schnell costs $0.009 for 3 images — literally less than 2 cents. This is absorbed into the writer credit margin. Even at Agency pricing, a "Budget writer + Budget image" article costs $0.013 total against $0.498 revenue — 97.4% margin. Charging extra for $0.009 of cost would feel punitive.

> **Why Balanced images = 1 credit (changed from 0):** Flux 2 Dev costs $0.075 for 3 images. At $0 addon, a "Budget writer + Balanced image" article would cost $0.079 for 1 credit ($0.498) — only 6.3x margin. That's OK but tight. More importantly, having both budget AND balanced images at 0 credits gives no pricing signal that balanced images are meaningfully more expensive (8x the cost). 1 credit addon keeps margins healthy and differentiates the tiers.

> **Why Ultra images = 2 credits (changed from 1):** Flux 2 Max costs $0.07/image = $0.21 for 3 images. At only 1 credit ($0.498), the margin is only 57.8% and the multiplier is 2.4x — BELOW our 3x minimum. 2 credits ($0.996) gives 78.9% margin and a 4.7x multiplier. Safe.

> **Pro images stay at 1 credit:** Flux 2 Pro at $0.165 for 3 images against 1 credit ($0.498) = 3.0x multiplier. Exactly at our minimum threshold. This is the tightest margin in the system but still profitable.

#### Total Credit Cost Per Article

| Writer \ Image   | No Image | Budget (+0) | Balanced (+1) | Pro (+1) | Ultra (+2) |
| ---------------- | -------- | ----------- | ------------- | -------- | ---------- |
| **Budget (1)**   | 1        | 1           | 2             | 2        | 3          |
| **Balanced (1)** | 1        | 1           | 2             | 2        | 3          |
| **Pro (2)**      | 2        | 2           | 3             | 3        | 4          |
| **Ultra (3)**    | 3        | 3           | 4             | 4        | 5          |

### 3.4 Worst-Case Scenario Analysis

**Scenario 1: Agency ($249/mo, 500 credits) — ALL Ultra writer + Ultra images**

- Credits per article: 3 (writer) + 2 (image) = **5 credits**
- Max articles: 500 / 5 = **100 articles**
- Cost per article: $0.129 + $0.21 = **$0.339**
- Total cost: 100 × $0.339 = **$33.90**
- Revenue: **$249**
- **Margin: 86.4%** ✅
- Multiplier: 7.3x ✅

**Scenario 2: Agency — ALL Ultra writer + Pro images (highest per-article cost)**

- Credits per article: 3 + 1 = **4 credits**
- Max articles: 500 / 4 = **125 articles**
- Cost per article: $0.129 + $0.165 = **$0.294**
- Total cost: 125 × $0.294 = **$36.75**
- Revenue: **$249**
- **Margin: 85.2%** ✅
- Multiplier: 6.8x ✅

**Scenario 3: Agency — ALL Budget writer + Budget images (max volume)**

- Credits per article: 1 + 0 = **1 credit**
- Max articles: **500 articles**
- Cost per article: **$0.013**
- Total cost: 500 × $0.013 = **$6.50**
- Revenue: **$249**
- **Margin: 97.4%** ✅

**Scenario 4: Large Pack ($34.99, 50 credits) — ALL Ultra + Ultra**

- Credits per article: **5**
- Max articles: 50 / 5 = **10 articles**
- Cost: 10 × $0.339 = **$3.39**
- Revenue: **$34.99**
- **Margin: 90.3%** ✅

**Scenario 5: Large Pack — ALL Ultra writer + Pro images**

- Credits per article: **4**
- Max articles: 50 / 4 = **12 articles**
- Cost: 12 × $0.294 = **$3.53**
- Revenue: **$34.99**
- **Margin: 89.9%** ✅

**Scenario 6: Starter ($49, 30 credits) — ALL Ultra + Ultra**

- Credits per article: **5**
- Max articles: 30 / 5 = **6 articles**
- Cost: 6 × $0.339 = **$2.03**
- Revenue: **$49**
- **Margin: 95.9%** ✅

| Scenario                   | Plan                    | Models | Articles | Our Cost | Revenue   | Margin    |
| -------------------------- | ----------------------- | ------ | -------- | -------- | --------- | --------- |
| Worst total spend          | Agency, Ultra+Ultra     | 100    | $33.90   | $249     | **86.4%** |
| Worst per-article          | Agency, Ultra+Pro       | 125    | $36.75   | $249     | **85.2%** |
| Max volume                 | Agency, Budget+Budget   | 500    | $6.50    | $249     | **97.4%** |
| Cheapest plan, worst model | Starter, Ultra+Ultra    | 6      | $2.03    | $49      | **95.9%** |
| Cheapest pack, worst model | Large Pack, Ultra+Ultra | 10     | $3.39    | $34.99   | **90.3%** |

**Verdict: Profitable in EVERY scenario. Minimum margin is ~85% (Agency + Ultra writer + Pro images). We never go broke.**

### 3.5 Comparison: Current vs Proposed

| Combo                           | Current Credits | Proposed Credits | Change |
| ------------------------------- | --------------- | ---------------- | ------ |
| Budget writer, no image         | 1               | 1                | Same   |
| Budget writer, budget image     | 1               | 1                | Same   |
| Budget writer, balanced image   | 1               | 2                | **+1** |
| Balanced writer, balanced image | 1               | 2                | **+1** |
| Pro writer, pro image           | 2               | 3                | **+1** |
| Ultra writer, no image          | 1               | 3                | **+2** |
| Ultra writer, pro image         | 2               | 4                | **+2** |
| Ultra writer, ultra image       | 2               | 5                | **+3** |

### 3.6 Per-Component Margin Analysis (tightest margins)

The tightest margin in the system is **Pro images (Flux 2 Pro) at 1 credit addon**:

- Cost: $0.165 / Revenue: $0.498 = **3.02x multiplier** (Agency)
- This is AT our 3x minimum. If Flux 2 Pro prices increase >65%, we'd need to bump to 2 credits.

**Monitoring trigger:** If Replicate raises Flux 2 Pro above $0.08/image ($0.24/3 images), bump pro images to 2 credits.

---

## 4. Implementation Changes

### Config Changes Required

**`shared/config/ai-models.config.ts`:**

- Rename preset: `auto` → `pro` (new key, new model)
- Update `WriterPresetKey`: `'budget' | 'balanced' | 'pro' | 'ultra'`
- Update credit costs: budget=0, balanced=0, **pro=1** (new), **ultra=2** (was 1)
- Update ultra env override: `anthropic/claude-sonnet-4-5` → `anthropic/claude-sonnet-4-6`
- Update default models to match new env

**`shared/config/image-models.config.ts`:**

- Update default models to Flux 2 lineup
- Update credit costs: budget=0, **balanced=1** (was 0), pro=1, **ultra=2** (was 1)

**`shared/config/credits.config.ts`:**

- Add `WRITER_CREDIT_COSTS` breakdown per preset
- Update `IMAGE_GENERATION_PREMIUM` to differentiate pro (1) vs ultra (2)

**Credit formula:** `total = writerCreditCost + imageCreditCost`

Where writerCreditCost is the BASE (minimum 1), not an addon:

| Component             | Budget | Balanced | Pro   | Ultra |
| --------------------- | ------ | -------- | ----- | ----- |
| Writer cost           | 1      | 1        | 2     | 3     |
| Image addon           | +0     | +1       | +1    | +2    |
| **Total (same tier)** | **1**  | **2**    | **3** | **5** |

### Integration Points

- `server/services/article-generation.service.ts:82` — currently `1 + imageCreditCost`, change to `writerCreditCost + imageCreditCost`
- `server/services/campaign.service.ts:625-626` — same pattern, needs writer cost
- `getWriterPresetCreditCost()` — already exists, needs updated values (returns 1/1/2/3 instead of 0/0/0/1)
- `getImagePresetCreditCost()` — already exists, needs updated values (returns 0/1/1/2 instead of 0/0/1/1)

### UI: Credit Cost Indicators

Credit costs MUST be visible wherever users select AI models. Users need to understand the cost before committing.

**`client/components/ui/ModelSelect.tsx`:**
The component already receives `creditCost` per option (via `IModelSelectOption.creditCost`) but the credit badge was previously removed (line 45 comment). **Re-add credit badges** showing the cost for each option:

- Show a pill/badge next to each option: e.g., `1 credit`, `2 credits`, `3 credits`
- Budget options at 0 addon should show `Included` or no badge
- The currently selected option's credit cost should be visible on the trigger button too
- Use a coin/credit icon for visual clarity

**Affected components that use ModelSelect:**

- `client/components/dashboard/views/NewCampaignModal.tsx` — writer + image preset selection
- `client/components/dashboard/views/campaign-detail/CampaignSettingsModal.tsx` — preset editing
- `client/components/articles/QuickGenerateModal.tsx` — quick article generation

**Total cost summary:**
Wherever both writer and image presets are selected together (NewCampaignModal, CampaignSettingsModal), show a **total credits per article** summary:

- e.g., "Cost: 3 credits/article (2 writer + 1 image)"
- Update dynamically as user changes either dropdown
- Highlight in warning color if total > 3 credits (so users are aware of premium cost)

### No migration needed

- Credit costs are code-level config, not DB schema
- Existing user balances are unaffected
- Changes take effect on next generation

---

## 5. Summary

| Metric                                      | Value                     |
| ------------------------------------------- | ------------------------- |
| Min margin (worst combo, worst plan)        | **~85%**                  |
| Max cost per article (Ultra + Ultra images) | **$0.339**                |
| Max cost per article (Ultra + Pro images)   | **$0.294**                |
| Ultra writer (Sonnet 4.6) cost alone        | **$0.129**                |
| Ultra images (Flux 2 Max ×3) cost alone     | **$0.21**                 |
| Min revenue per credit (Agency)             | **$0.498**                |
| Budget articles per Agency plan             | **500**                   |
| Ultra+Ultra articles per Agency plan        | **100**                   |
| Credit range per article                    | **1-5 credits**           |
| Tightest single-component margin            | Pro images: 3.0x (Agency) |

The credit economy ensures profitability regardless of model choice, plan tier, or usage pattern. Budget users get maximum volume (500 articles/Agency), premium users get premium quality at a fair credit cost (100 articles/Agency at Ultra+Ultra), and we never go broke.
