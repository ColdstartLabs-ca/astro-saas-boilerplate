# PRD: Fix Credits Economy Messaging

**Complexity: 2 → LOW mode**
**Status:** Ready
**Date:** 2026-03-01

---

## 1. Context

**Problem:** User-facing copy says "30/100/500 articles per month" but articles cost 1–5 credits depending on AI model quality. This misleads users who pick premium models. Additionally, `content/comparisons-data.json` has completely stale pricing from a previous era ($9/mo starting price, 50/200/1000 articles) that is wrong across all 22 comparison pages.

**Files Analyzed:**
- `shared/config/subscription.config.ts` — plan feature strings
- `shared/config/credits.config.ts` — deprecated comments
- `client/components/landing/PricingPreviewSection.tsx` — hardcoded landing page features
- `locales/en/homepage.json` — EN pricing section (lines 171, 182, 192)
- `locales/pt-BR/homepage.json` — PT pricing section (lines 171, 182, 192)
- `locales/en/help.json` — EN FAQ answers (lines 54, 58)
- `locales/pt-BR/help.json` — PT FAQ answers (lines 54, 58)
- `content/comparisons-data.json` — 22 comparison pages, all with "$9/mo" + wrong article counts
- `docs/business/landing-page.md` — internal spec doc

**Current Behavior:**
- Feature lists advertise "30 articles/mo", "100 articles/mo", "500 articles/mo"
- These are actually **credits**, not articles — articles cost 1–5 credits
- Comparison pages show "$9/mo" starting price (actual: $49/mo)
- Comparison pages show Starter=50 articles, Growth=200, Pro=1000 (actual: Starter=30cr, Growth=100cr, Agency=500cr)
- Credit pack copy says "10 articles for $9.99" (accurate in pack size, but confusingly uses "articles")

**What is NOT broken:**
- UI credit cost badges (ModelSelect, CampaignSettingsModal, QuickGenerateModal) — all working correctly
- Server-side credit charge/refund logic — all fixed as of Feb 2026
- Credit cost constants and calculation helpers — correct

---

## 2. Solution

**Approach:**
- Replace "X articles/mo" with "X credits/mo" everywhere in user-facing copy
- Add clarifier "(1–5 credits per article)" where space permits (landing page feature list)
- Fix `comparisons-data.json`: correct starting price to $49/mo, fix plan names/prices/credit counts across all 22 entries
- Update credit pack copy from "10 articles" to "10 credits" (packs represent credits, not articles)

**Key Decisions:**
- Do NOT change `creditsPerCycle` values in subscription config (these are correct integers)
- Do NOT touch the `maxRollover` feature strings — they already say "credits" correctly
- In `comparisons-data.json`, only update the `"us"` pricing blocks and `"Starting Price"` feature row; leave competitor data untouched
- `docs/business/landing-page.md` is internal-only, update comments but lowest priority

---

## 3. Execution Phases

### Phase 1: Config & Component Copy — Landing page and subscription features updated

**Files (4):**
- `shared/config/subscription.config.ts` — update 3 feature strings
- `shared/config/credits.config.ts` — update 3 comments
- `client/components/landing/PricingPreviewSection.tsx` — update 3 hardcoded strings

**Implementation:**

`shared/config/subscription.config.ts`:
- Line 81: `'30 articles per month'` → `'30 credits/month (1–5 per article)'`
- Line 121: `'100 articles per month'` → `'100 credits/month (1–5 per article)'`
- Line 162: `'500 articles per month'` → `'500 credits/month (1–5 per article)'`

`shared/config/credits.config.ts` (comments only):
- Line 60: `// Starter plan: 30 articles/mo` → `// Starter plan: 30 credits/mo`
- Line 61: `// Growth plan: 100 articles/mo` → `// Growth plan: 100 credits/mo`
- Line 62: `// Agency plan: 500 articles/mo` → `// Agency plan: 500 credits/mo`

`client/components/landing/PricingPreviewSection.tsx`:
- Line 39: `'30 articles/mo'` → `'30 credits/mo'`
- Line 81: `'100 articles/mo'` → `'100 credits/mo'`
- Line 116: `'500 articles/mo'` → `'500 credits/mo'`

**Tests Required:**

| Test | Assertion |
|------|-----------|
| `yarn verify` | Passes with no type/lint errors |

**Verification Plan:**
1. `yarn verify` — passes
2. Grep for `articles per month` or `articles/mo` in these files — returns 0 matches

---

### Phase 2: Locales — EN + PT copy updated

**Files (4):**
- `locales/en/homepage.json`
- `locales/pt-BR/homepage.json`
- `locales/en/help.json`
- `locales/pt-BR/help.json`

**Implementation:**

`locales/en/homepage.json`:
```json
// Line 171
"articles": "30 credits/mo"
// Line 182
"articles": "100 credits/mo"
// Line 192
"articles": "500 credits/mo"
```

`locales/pt-BR/homepage.json`:
```json
// Line 171
"articles": "30 créditos/mês"
// Line 182
"articles": "100 créditos/mês"
// Line 192
"articles": "500 créditos/mês"
```

`locales/en/help.json` (line 54, subscriptionPlans answer):
- `"Starter ($49/mo, 30 articles)"` → `"Starter ($49/mo, 30 credits)"`
- `"Growth ($99/mo, 100 articles)"` → `"Growth ($99/mo, 100 credits)"`
- `"Agency ($249/mo, 500 articles)"` → `"Agency ($249/mo, 500 credits)"`

`locales/en/help.json` (line 58, creditPacks answer):
- `"10 articles for $9.99"` → `"10 credits for $9.99"`
- `"25 articles for $19.99 (best value)"` → `"25 credits for $19.99 (best value)"`
- `"50 articles for $34.99"` → `"50 credits for $34.99"`

`locales/pt-BR/help.json` (line 54, subscriptionPlans answer):
- `"30 artigos"` → `"30 créditos"`
- `"100 artigos"` → `"100 créditos"`
- `"500 artigos"` → `"500 créditos"`

`locales/pt-BR/help.json` (line 58, creditPacks answer):
- `"10 artigos por US$9,99"` → `"10 créditos por US$9,99"`
- `"25 artigos por US$19,99 (melhor valor)"` → `"25 créditos por US$19,99 (melhor valor)"`
- `"50 artigos por US$34,99"` → `"50 créditos por US$34,99"`

**Verification Plan:**
1. `yarn verify` — must include `i18n:icu` validation, must pass
2. Grep `artigos/mês\|articles/mo` across locales — 0 matches

---

### Phase 3: comparisons-data.json — All 22 comparison pages have correct pricing

**Files (1):**
- `content/comparisons-data.json`

**Problem:** Every one of the 22 pages has:
```json
{ "feature": "Starting Price", "us": "$9/mo", "them": "..." }

"pricingComparison": {
  "us": [
    { "plan": "Starter", "price": "$9/mo", "credits": "50 articles" },
    { "plan": "Growth",  "price": "$29/mo", "credits": "200 articles" },
    { "plan": "Pro",     "price": "$79/mo", "credits": "1000 articles" }
  ],
  ...
}
```

**Implementation:** Replace all `"us"` pricing blocks (22 occurrences) with correct current pricing:
```json
{ "feature": "Starting Price", "us": "$49/mo", "them": "..." }

"pricingComparison": {
  "us": [
    { "plan": "Starter", "price": "$49/mo", "credits": "30 credits" },
    { "plan": "Growth",  "price": "$99/mo", "credits": "100 credits" },
    { "plan": "Agency",  "price": "$249/mo", "credits": "500 credits" }
  ],
  ...
}
```

> Note: The `"credits"` field label in this JSON is a legacy field name; we keep the key name but update the value to reflect credits (not articles).

**Approach:** Use `sed` / programmatic replacement — the pattern is identical across all 22 entries, making a global find-replace safe.

**Verification Plan:**
1. `grep -c '"price": "\$9/mo"' content/comparisons-data.json` → 0
2. `grep -c '"price": "\$49/mo"' content/comparisons-data.json` → 22 (one per page in "us" block)
3. `yarn verify` passes

---

## 4. Acceptance Criteria

- [ ] No `articles per month` / `articles/mo` / `artigos/mês` in pricing feature copy
- [ ] `content/comparisons-data.json`: all 22 `"us"` pricing blocks show $49/$99/$249 with 30/100/500 credits
- [ ] `content/comparisons-data.json`: all 22 `"Starting Price"` "us" values = "$49/mo"
- [ ] `yarn verify` passes (tsc + eslint + i18n:icu + seo:validate)
- [ ] Grep for `"\$9/mo"` in us pricing blocks returns 0
