# PRD: pSEO Scale & GEO Content Expansion

**Complexity: 9 → HIGH mode** (+3 touches 10+ files, +2 new system/module from scratch [GEO cluster], +2 multi-package changes, +2 new interactive components)

**Date:** 2026-02-17
**Status:** Planning
**Priority:** P0 — Primary organic traffic acquisition channel

---

## Pre-Planning: What's Already Built

The first pSEO PRD (`docs/PRDs/done/pseo-strategy.md`) was fully implemented. The following infrastructure **already exists** and should NOT be rebuilt:

| Already Done   | Details                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| Page templates | `/compare/[slug]`, `/alternative/[slug]`, `/tools/[slug]`, `/use-cases/[slug]` |
| Data loaders   | `server/pseo/{comparisons,alternatives,tools,use-cases}.ts`                    |
| Content files  | `content/{comparisons,alternatives,tools,use-cases}-data.json`                 |
| Sitemaps       | `sitemap-{comparisons,alternatives,tools,use-cases}.xml.ts`                    |
| Schema markup  | FAQPage, SoftwareApplication, BreadcrumbList, WebApplication on all pages      |
| Types          | `shared/types/pseo.types.ts` (all interfaces defined)                          |
| Components     | `ComparisonTable`, `FAQ`, `CTASection`, `Breadcrumbs`, `RelatedPages`          |
| robots.txt     | All 6 sitemaps referenced                                                      |
| Seed data      | 7 comparisons, 7 alternatives, 3 tools, 8 use-cases                            |
| Resource page  | `/resources/best-ai-seo-tools-2026`                                            |

**What's missing (this PRD):**

1. 2 tool components show "Tool coming soon..." (`MetaDescriptionTool`, `TitleTagTool`)
2. Only 7 comparisons and 7 alternatives — needs 20+ to generate meaningful traffic
3. No GEO (Generative Engine Optimization) content cluster — fastest-growing 2026 keyword category
4. No integration-specific landing pages (Shopify, WordPress, Webflow, Framer)
5. `/tools/[slug].astro` has a hardcoded `if componentName === 'KeywordDensityTool'` — doesn't scale to new tools
6. Blog: only 3 posts — needs content for every keyword cluster
7. No localized content for India/Brazil (Outrank's #2 and #4 markets)

---

## 1. Context

**Problem:** The pSEO foundation is built but under-populated. Outrank.so gets 7.2K monthly organic visitors from informational content; we have the infrastructure but lack content volume. Additionally, "GEO" (get mentioned in ChatGPT/Gemini/Perplexity) is the fastest-growing anxiety in the SEO market in 2026 — a category Outrank claims but doesn't own. We can dominate it.

**Files Analyzed:**

- `src/pages/tools/[slug].astro` — tool rendering (hardcoded component switch)
- `client/components/tools/KeywordDensityTool.tsx` — component pattern to follow
- `content/tools-data.json` — has 2 tools with no working component
- `content/comparisons-data.json` — only 7 entries, needs 20+
- `content/alternatives-data.json` — only 7 entries, needs 20+
- `content/use-cases-data.json` — 8 entries, needs integration-specific pages
- `shared/types/pseo.types.ts` — all types ready, no changes needed
- `server/pseo/tools.ts` — loader ready, no changes needed
- `src/pages/sitemap-tools.xml.ts` — sitemap ready, auto-updates from data
- `src/pages/robots.txt.ts` — already references all sitemaps
- `shared/utils/seo.ts` — has `calculateKeywordDensity`, needs meta/title utils
- `docs/PRDs/done/pseo-strategy.md` — previous PRD for reference

**Current Behavior:**

- 3 free tools exist but 2 show "Tool coming soon..." fallback — broken user experience
- Tool page `[slug].astro` has a hardcoded `if/else` for component rendering — adding new tools requires editing the page template
- 7 comparisons and 7 alternatives generate low search coverage
- Zero GEO-specific content — missing the fastest-growing keyword cluster in 2026
- No integration landing pages — missing high-intent, low-competition long-tail traffic

---

## 2. Integration Points

```markdown
**How will this feature be reached?**

- [x] Entry points: Organic search → prerendered static pages
- [x] Caller: Google/Bing → pSEO pages → CTA → /pricing
- [x] Registration: New data entries auto-flow into existing sitemap routes

**Is this user-facing?**

- [x] YES — Public marketing pages, no auth required

**Full user flow:**

1. User searches "outrank alternative" / "ai seo for shopify" / "how to get mentioned in chatgpt"
2. Google serves our prerendered page (fast, SSR, schema-complete)
3. User reads comparison / tool / strategy guide
4. CTA drives to /pricing for free trial signup
5. Internal cross-links drive additional page views and reduce bounce
```

---

## 3. Solution

### Approach

1. **Fix tool rendering first** — replace the hardcoded if/else with a dynamic component registry (one change in `[slug].astro` unlocks all future tools without template edits)
2. **Implement 2 missing tool components** — `MetaDescriptionTool` and `TitleTagTool` get real interactive React components
3. **Add 3 new free tools** — SEO ROI Calculator, Reading Level Checker, Content Length Analyzer (with components)
4. **Scale comparison + alternative content** — add 15 more comparisons and 13 more alternatives via data entries (no code changes, just JSON)
5. **Build GEO content cluster** — new `/geo/[slug]` page template targeting "how to get mentioned in ChatGPT" keywords
6. **Add integration-specific use-case pages** — expand use-cases-data.json with Shopify, WordPress, Webflow, Framer pages
7. **Add 5 targeted blog posts** — cover each major keyword cluster with editorial content that cross-links to pSEO pages

### Architecture Diagram

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Tool Infrastructure Fix"]
        TR[Tool Component Registry\nclient/components/tools/registry.ts]
        KD[KeywordDensityTool ✅]
        MD[MetaDescriptionTool ❌→✅]
        TT[TitleTagTool ❌→✅]
        TR --> KD & MD & TT
    end

    subgraph Phase2["Phase 2: New Tools"]
        RC[SEO ROI Calculator]
        RL[Reading Level Checker]
        CL[Content Length Analyzer]
        TR --> RC & RL & CL
    end

    subgraph Phase3["Phase 3: Content Scale"]
        CD[comparisons-data.json\n7→22 entries]
        AD[alternatives-data.json\n7→20 entries]
        UD[use-cases-data.json\n8→14 entries]
    end

    subgraph Phase4["Phase 4: GEO Cluster"]
        GT[/geo/slug/ page template]
        GD[content/geo-data.json]
        GS[sitemap-geo.xml.ts]
        GL[server/pseo/geo.ts]
        GT --> GD
        GD --> GL
        GL --> GS
    end

    subgraph Phase5["Phase 5: Blog Content"]
        B1[GEO guide blog post]
        B2[Shopify SEO guide]
        B3[AI content vs human content]
        B4[Outrank review post]
        B5[Backlink building guide]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4 --> Phase5
```

### Key Decisions

- **Component registry pattern** — `client/components/tools/registry.ts` maps `componentName` strings to React components. The `[slug].astro` template does a single registry lookup instead of an ever-growing if/else chain.
- **JSON-only for content scale** — Comparisons and alternatives are pure data additions. Zero template code changes needed.
- **GEO as a new pSEO category** — follows the exact same pattern as `/alternative/[slug]`: JSON data file → server loader → Astro dynamic route with prerender. New sitemap file added and referenced in robots.txt.
- **No hreflang in Phase 1** — Localization deferred to a separate PRD. Focus on English dominance first.
- **Blog via MDX** — Follows existing `content/blog/` pattern + `content/blog-data.json` entries.

### Data Models

**New GEO page type (new additions to `shared/types/pseo.types.ts`):**

```typescript
/** GEO (Generative Engine Optimization) page data */
export interface IGeoPage extends IPseoBase {
  topic: string; // e.g. "ChatGPT mentions"
  problemStatement: string; // Why AI citations matter
  howAiCites: {
    // How AI engines choose what to cite (factual)
    step: number;
    title: string;
    description: string;
  }[];
  tacticsWithExamples: {
    tactic: string;
    example: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  /**
   * CONTENT INTEGRITY: Must describe AutopilotRank's REAL capabilities.
   * AutopilotRank has NO dedicated GEO feature. Valid angle only:
   * "AI cites authoritative, consistent content → AutopilotRank helps you produce it."
   */
  autopilotRankAngle: string;
  faqs: IFaqItem[];
  relatedGeoPages: string[]; // slugs
  relatedBlogPosts: string[]; // slugs for cross-linking
}

/** GEO page metadata */
export interface IGeoPageMeta {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  topic: string;
  lastUpdated: string;
}
```

---

## 4. Execution Phases

---

### Phase 1: Tool Component Registry + Missing Tools — "All 3 free tools actually work"

**Files (5):**

- `client/components/tools/registry.ts` — NEW: component name → React component map
- `client/components/tools/MetaDescriptionTool.tsx` — NEW: real interactive tool
- `client/components/tools/TitleTagTool.tsx` — NEW: real interactive tool
- `src/pages/tools/[slug].astro` — UPDATE: replace hardcoded if/else with registry lookup
- `shared/utils/seo.ts` — UPDATE: add `validateMetaDescription()` and `validateTitleTag()` helpers

**Implementation:**

- [ ] **`shared/utils/seo.ts`** — Add two new pure functions:

  ```typescript
  // Returns { isValid, charCount, issues: string[] }
  export function validateMetaDescription(text: string): IMetaValidation;
  // Returns { isValid, charCount, pixelEstimate, issues: string[] }
  export function validateTitleTag(title: string): ITitleValidation;
  ```

  Meta description: valid range 120-160 chars. Title: valid range 50-60 chars, pixel width ~580px (estimate: charCount \* 9.5).

- [ ] **`client/components/tools/MetaDescriptionTool.tsx`** — Interactive React island:
  - Textarea input for meta description text
  - Live character counter with color feedback (red <120, green 120-160, red >160)
  - Issues list from `validateMetaDescription()`
  - Preview showing how it appears in a Google SERP snippet mockup
  - CTA link to `/pricing`

- [ ] **`client/components/tools/TitleTagTool.tsx`** — Interactive React island:
  - Textarea input for title tag text
  - Live character counter + pixel width estimate
  - Color feedback (red <50, green 50-60, red >60)
  - SERP preview mockup (blue link text, same style as Google results)
  - Issues list

- [ ] **`client/components/tools/registry.ts`** — Component registry:

  ```typescript
  import { KeywordDensityTool } from './KeywordDensityTool';
  import { MetaDescriptionTool } from './MetaDescriptionTool';
  import { TitleTagTool } from './TitleTagTool';

  export const toolRegistry: Record<string, React.ComponentType> = {
    KeywordDensityTool,
    MetaDescriptionTool,
    TitleTagTool,
  };
  ```

- [ ] **`src/pages/tools/[slug].astro`** — Replace hardcoded section:
  - Import `toolRegistry` from `@client/components/tools/registry`
  - Lookup: `const ToolComponent = toolRegistry[page.componentName]`
  - Render: `<ToolComponent client:visible />` if found, else "coming soon" fallback
  - Remove the hardcoded `if/else` block

**Tests Required:**

| Test File                            | Test Name                                              | Assertion                             |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------- |
| `shared/utils/__tests__/seo.test.ts` | `validateMetaDescription: returns valid for 130 chars` | `result.isValid === true`             |
| `shared/utils/__tests__/seo.test.ts` | `validateMetaDescription: flags too short (<120)`      | `result.issues.includes('Too short')` |
| `shared/utils/__tests__/seo.test.ts` | `validateMetaDescription: flags too long (>160)`       | `result.issues.includes('Too long')`  |
| `shared/utils/__tests__/seo.test.ts` | `validateTitleTag: returns valid for 55 chars`         | `result.isValid === true`             |
| `shared/utils/__tests__/seo.test.ts` | `validateTitleTag: flags too short (<50)`              | `result.issues.includes('Too short')` |

**Verification Plan:**

1. **Unit tests:** `yarn test shared/utils/__tests__/seo.test.ts`
2. **Visual:** Navigate to `/tools/meta-description-validator` and `/tools/title-tag-optimizer` — tool should render (not "coming soon")
3. **Functional:** Type in textarea → live counter updates, SERP preview shows
4. **yarn verify** passes

**User Verification:**

- Action: Visit `/tools/meta-description-validator`, type a short text
- Expected: Character count shown, red warning if <120 chars, SERP preview renders

---

### Phase 2: 3 New Free Tools — "5 working free tools with dedicated SEO landing pages"

**Files (5):**

- `client/components/tools/SeoRoiCalculator.tsx` — NEW
- `client/components/tools/ReadingLevelChecker.tsx` — NEW
- `client/components/tools/ContentLengthAnalyzer.tsx` — NEW
- `client/components/tools/registry.ts` — UPDATE: add 3 new entries
- `content/tools-data.json` — UPDATE: add 3 new tool data entries

**Implementation:**

- [ ] **`SeoRoiCalculator.tsx`** — Input: monthly organic visitors, avg CPC, conversion rate, avg sale value. Output: estimated monthly SEO value, annual ROI. Simple math, no API calls.

- [ ] **`ReadingLevelChecker.tsx`** — Input: paste text. Output: Flesch-Kincaid grade level, reading ease score, avg sentence length, avg syllables per word. All computed client-side.
  - FK Grade Level formula: `0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59`
  - Syllable counting: vowel-group heuristic (good enough for UI purposes)

- [ ] **`ContentLengthAnalyzer.tsx`** — Input: paste text or URL (URL just shows a note to paste). Output: word count, character count, estimated read time (200 wpm), recommended length for the keyword type (blog: 1500-2500, pillar: 3000+, product page: 300-500).

- [ ] **`content/tools-data.json`** — Add 3 new entries following exact existing schema:

  ```json
  {
    "slug": "seo-roi-calculator",
    "componentName": "SeoRoiCalculator",
    ...
  },
  {
    "slug": "reading-level-checker",
    "componentName": "ReadingLevelChecker",
    ...
  },
  {
    "slug": "content-length-analyzer",
    "componentName": "ContentLengthAnalyzer",
    ...
  }
  ```

  Each entry includes: `primaryKeyword`, `secondaryKeywords`, `howToUse[]`, `whyUseIt[]`, `faqs[]`, `relatedTools[]`

- [ ] **`client/components/tools/registry.ts`** — Add 3 new entries

**Tests Required:**

| Test File                                                          | Test Name                                | Assertion                               |
| ------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------- |
| `client/components/tools/__tests__/SeoRoiCalculator.test.tsx`      | `calculates monthly SEO value correctly` | `1000 visitors * $2 CPC * 2% CVR = $40` |
| `client/components/tools/__tests__/ReadingLevelChecker.test.tsx`   | `returns grade 8 for typical blog text`  | `gradeLevel between 7-9`                |
| `client/components/tools/__tests__/ContentLengthAnalyzer.test.tsx` | `counts 500 words correctly`             | `wordCount === 500`                     |

**Verification Plan:**

1. Unit tests for calculation logic
2. Navigate to `/tools/seo-roi-calculator` — tool renders, inputs work, output appears
3. `sitemap-tools.xml` includes new slugs (auto-generated from data)
4. `yarn verify` passes

**User Verification:**

- Action: Visit `/tools/seo-roi-calculator`, enter values (1000 visitors, $3 CPC, 2%, $100 order)
- Expected: Shows "Estimated monthly SEO value: $6,000" style output

---

### Phase 3: Content Scale — "20+ comparisons and 20 alternatives indexed and discoverable"

**Files (3):**

- `content/comparisons-data.json` — ADD 15 new comparison entries (7 → 22 total)
- `content/alternatives-data.json` — ADD 13 new alternative entries (7 → 20 total)
- `content/use-cases-data.json` — ADD 6 integration-specific entries (8 → 14 total)

> No code changes needed. All templates, loaders, and sitemaps auto-scale from JSON data.

**New comparison pages to add (15):**
| Slug | CompetitorB | Target Keyword |
|---|---|---|
| `autopilotrank-vs-seo-ai` | SEO.AI | "seo.ai vs autopilotrank" |
| `autopilotrank-vs-writesonic` | Writesonic | "writesonic for seo" |
| `autopilotrank-vs-koala` | Koala | "koala seo writer" |
| `autopilotrank-vs-autoblogging-ai` | Autoblogging.ai | "autoblogging ai review" |
| `autopilotrank-vs-bramework` | Bramework | "bramework alternative" |
| `autopilotrank-vs-rytr` | Rytr | "rytr seo content" |
| `autopilotrank-vs-copy-ai` | Copy.ai | "copy.ai for blog posts" |
| `autopilotrank-vs-wordlift` | WordLift | "wordlift seo tool" |
| `autopilotrank-vs-ink` | INK | "ink seo writer" |
| `autopilotrank-vs-neuronwriter` | NeuronWriter | "neuronwriter alternative" |
| `autopilotrank-vs-growthbar` | GrowthBar | "growthbar seo ai" |
| `autopilotrank-vs-aiseo` | AISEO | "aiseo alternative" |
| `autopilotrank-vs-seowind` | SEOwind | "seowind review" |
| `autopilotrank-vs-scalenut` | Scalenut | "scalenut seo content" |
| `autopilotrank-vs-contentbot` | ContentBot | "contentbot review" |

**New alternative pages to add (13):**
| Slug | Competitor |
|---|---|
| `seo-ai` | SEO.AI |
| `writesonic` | Writesonic |
| `koala` | Koala |
| `autoblogging-ai` | Autoblogging.ai |
| `bramework` | Bramework |
| `rytr` | Rytr |
| `copy-ai` | Copy.ai |
| `wordlift` | WordLift |
| `ink` | INK |
| `neuronwriter` | NeuronWriter |
| `growthbar` | GrowthBar |
| `scalenut` | Scalenut |
| `contentbot` | ContentBot |

**New use-case integration pages to add (6):**
| Slug | Industry | Primary Keyword |
|---|---|---|
| `shopify-blog-automation` | Shopify | "shopify seo blog automation" |
| `wordpress-auto-publish` | WordPress | "auto publish wordpress seo" |
| `webflow-seo-content` | Webflow | "webflow seo blog content" |
| `framer-seo-blog` | Framer | "framer seo content" |
| `ghost-blog-seo` | Ghost | "ghost blog seo automation" |
| `notion-seo-content` | Notion | "notion seo content" |

**Data quality requirements per entry:**
Each new comparison/alternative entry must include:

- Accurate competitor pricing (verify from public pricing pages)
- 8-12 feature comparison rows (`featureComparison[]`)
- 4-6 FAQs with answers >100 chars each
- Pros/cons (3+ each side for comparisons)
- `relatedComparisons` / `relatedAlternatives` cross-linking to 2-3 related pages (slug references)
- `lastUpdated`: `"2026-02-17"`

**Verification Plan:**

1. Build succeeds — `yarn build` with no TypeScript errors
2. `sitemap-comparisons.xml` returns 22 URLs, `sitemap-alternatives.xml` returns 20 URLs
3. All new pages render at their URLs (spot-check 3 comparison pages and 3 alternative pages)
4. `yarn verify` passes

```bash
# Verify sitemap counts
curl https://localhost:4321/sitemap-comparisons.xml | grep -c '<loc>'
# Expected: 23 (22 + index page)
curl https://localhost:4321/sitemap-alternatives.xml | grep -c '<loc>'
# Expected: 21 (20 + index page)
```

---

### Phase 4: GEO Content Cluster — "Own the 'get mentioned in ChatGPT' keyword category"

> **Content integrity rule:** AutopilotRank does NOT have a dedicated GEO feature yet. GEO pages must be pure educational guides. The honest product connection is: _AI citation engines cite authoritative, well-structured content — which is exactly what AutopilotRank helps you produce at scale._ CTAs frame it that way. No false claims about dashboards, citation tracking, or GEO tooling.

**Files (7 — split into 4a + 4b for review):**

- `shared/types/pseo.types.ts` — ADD `IGeoPage` + `IGeoPageMeta` interfaces
- `content/geo-data.json` — NEW: 8 GEO page entries
- `server/pseo/geo.ts` — NEW: data loader (follows `alternatives.ts` pattern exactly)
- `src/pages/sitemap-geo.xml.ts` — NEW: sitemap route
- `src/pages/geo/[slug].astro` — NEW: dynamic route with prerender
- `src/pages/geo/index.astro` — NEW: GEO hub listing page
- `src/pages/robots.txt.ts` — ADD `sitemap-geo.xml` reference

**Phase 4a (infrastructure + data):**

- `shared/types/pseo.types.ts` — Add `IGeoPage`, `IGeoPageMeta`
- `content/geo-data.json` — Seed with 8 entries
- `server/pseo/geo.ts` — Loader (copy `alternatives.ts`, update types/import)
- `src/pages/sitemap-geo.xml.ts` — Sitemap (copy `sitemap-alternatives.xml.ts`, update import)

**Phase 4b (pages + robots):**

- `src/pages/geo/[slug].astro` — Dynamic page template
- `src/pages/geo/index.astro` — Hub page
- `src/pages/robots.txt.ts` — Add sitemap reference

**GEO page data entries (8 initial pages):**
| Slug | Topic | Primary Keyword |
|---|---|---|
| `how-to-get-mentioned-in-chatgpt` | ChatGPT mentions | "get mentioned in chatgpt" |
| `optimize-for-ai-overviews` | Google AI Overviews | "optimize for ai overview" |
| `generative-engine-optimization` | GEO fundamentals | "generative engine optimization" |
| `get-cited-by-perplexity` | Perplexity citations | "get cited by perplexity ai" |
| `ai-answer-engine-optimization` | AEO strategy | "answer engine optimization" |
| `appear-in-google-ai-overview` | SGE/AI overview | "appear in google ai overview seo" |
| `llm-seo-strategy-2026` | LLM SEO | "llm seo strategy 2026" |
| `ai-citation-optimization-guide` | AI citations comprehensive | "ai citation optimization" |

**GEO page template sections:**

```
1. Hero: H1 + one-sentence problem statement + primary CTA
2. "Why AI Citations Matter" — stats + trend data (no product claims)
3. "How AI Engines Choose What to Cite" — factual explanation of how ChatGPT/Perplexity/Google AI select sources
4. "Tactics to Get Cited" — structured list: tactic, real-world example, difficulty badge (easy/medium/hard)
   Examples of honest tactics:
   - Publish comprehensive, factual content (easy)
   - Get cited on authoritative domains (hard)
   - Use structured data / schema markup (medium)
   - Write in clear, quotable sentences (easy)
   - Produce consistent content at scale (medium) ← honest AutopilotRank hook
5. "The Content Foundation" — editorial section explaining that AI cites authoritative, consistent, well-structured content. Consistency requires volume. Volume requires automation. [Honest CTA here]
6. FAQ (schema.org/FAQPage)
7. Related GEO pages (internal linking)
8. Bottom CTA
```

**Honest CTA copy (for the `autopilotRankAngle` field in data):**

> "Getting mentioned by AI starts with content that earns authority — comprehensive, well-structured, and published consistently. AutopilotRank automates the consistency part: generate and publish SEO-optimized content every week without a writing team."

This is verifiably true. The product does not need a GEO feature for this to be accurate.

**`server/pseo/geo.ts` structure:**

```typescript
import geoDataRaw from '@/content/geo-data.json';
import type { IGeoPage, IGeoPageMeta } from '@shared/types/pseo.types';

const geoData = geoDataRaw as { pages: IGeoPage[] };

export function getAllGeoPages(): IGeoPageMeta[] { ... }
export function getGeoPageBySlug(slug: string): IGeoPage | null { ... }
export function getAllGeoSlugs(): string[] { ... }
export function getGeoPagesBySlugs(slugs: string[]): IGeoPageMeta[] { ... }
```

**`src/pages/geo/[slug].astro` JSON-LD:**

- `FAQPage` schema (same as other templates)
- `Article` schema (HowTo format — appropriate for guide content)
- `BreadcrumbList` schema

**Tests Required:**

| Test File                           | Test Name                                        | Assertion                                         |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `server/pseo/__tests__/geo.test.ts` | `getGeoPageBySlug returns page for valid slug`   | `page.slug === 'how-to-get-mentioned-in-chatgpt'` |
| `server/pseo/__tests__/geo.test.ts` | `getGeoPageBySlug returns null for invalid slug` | `result === null`                                 |
| `server/pseo/__tests__/geo.test.ts` | `getAllGeoSlugs returns all 8 slugs`             | `slugs.length === 8`                              |

**Verification Plan:**

1. Unit tests for `server/pseo/geo.ts`
2. Build succeeds — all 8 GEO pages prerender at `/geo/[slug]`
3. `sitemap-geo.xml` renders with 9 URLs (8 pages + index)
4. `robots.txt` includes `sitemap-geo.xml`
5. Schema markup is valid — test with Google's Rich Results Test
6. `yarn verify` passes

**User Verification:**

- Action: Visit `/geo/how-to-get-mentioned-in-chatgpt`
- Expected: Full page renders with tactics, FAQ section, CTA

---

### Phase 5: Blog Content for Keyword Clusters — "5 indexed blog posts targeting high-CPC clusters"

**Files (10 — 5 MDX posts + 5 blog-data.json entries):**

- `content/blog/geo-chatgpt-citations-guide.mdx` — NEW
- `content/blog/shopify-seo-content-automation.mdx` — NEW
- `content/blog/ai-content-vs-human-content-seo.mdx` — NEW
- `content/blog/outrank-review-2026.mdx` — NEW
- `content/blog/automated-backlink-building-guide.mdx` — NEW
- `content/blog-data.json` — ADD 5 entries

**Blog post targets:**

| File                                | Primary Keyword                       | Volume  | CPC   | Target Cluster |
| ----------------------------------- | ------------------------------------- | ------- | ----- | -------------- |
| `geo-chatgpt-citations-guide`       | "how to get mentioned in chatgpt seo" | Growing | High  | GEO cluster    |
| `shopify-seo-content-automation`    | "shopify blog seo automation"         | ~500/mo | $4-8  | Integration    |
| `ai-content-vs-human-content-seo`   | "ai content vs human content seo"     | ~800/mo | $5-12 | AI SEO         |
| `outrank-review-2026`               | "outrank.so review"                   | ~200/mo | $8-15 | Comparison     |
| `automated-backlink-building-guide` | "automated backlink building"         | ~300/mo | $6-10 | Backlink       |

**Internal linking requirements (CRITICAL — this is what makes pSEO compound):**

- `geo-chatgpt-citations-guide` → links to `/geo/how-to-get-mentioned-in-chatgpt`, `/geo/generative-engine-optimization`
- `shopify-seo-content-automation` → links to `/use-cases/shopify-seo`, `/use-cases/shopify-blog-automation`
- `ai-content-vs-human-content-seo` → links to `/compare/autopilotrank-vs-outrank`, `/compare/autopilotrank-vs-jasper`
- `outrank-review-2026` → links to `/alternative/outrank`, `/compare/autopilotrank-vs-outrank`
- `automated-backlink-building-guide` → links to `/alternative/outrank`, `/features`

**Blog post format (existing MDX front matter pattern):**

```mdx
---
title: 'How to Get Your Content Mentioned in ChatGPT in 2026'
description: '...'
publishedAt: '2026-02-17'
author: 'AutopilotRank Team'
tags: ['GEO', 'AI SEO', 'ChatGPT']
featured: false
image: '/blog/images/geo-chatgpt-guide.jpg'
---
```

**Verification Plan:**

1. `content/blog-data.json` has 8 entries total (3 existing + 5 new)
2. All 5 blog posts render at `/blog/[slug]`
3. `sitemap-blog.xml` includes all 8 slugs
4. Internal links in each post resolve (no 404s)
5. `yarn verify` passes

---

## 5. Checkpoint Protocol

After each phase, spawn the `prd-work-reviewer` agent:

```
Task({
  subagent_type: 'prd-work-reviewer',
  prompt: 'Review checkpoint for phase [N] of PRD at docs/PRDs/pseo-scale-geo-expansion.md',
  description: 'Review phase [N] checkpoint',
})
```

**Phase 1 + 2** (tool components): Automated + Manual (visual UI check in browser)
**Phase 3** (JSON data): Automated only (build + sitemap count curl commands)
**Phase 4** (GEO cluster): Automated + Manual (page renders, schema markup valid)
**Phase 5** (blog posts): Automated only (build + URL spot-check)

---

## 6. Acceptance Criteria

- [ ] Phase 1: `/tools/meta-description-validator` and `/tools/title-tag-optimizer` render working interactive tools (not "coming soon")
- [ ] Phase 1: `[slug].astro` uses component registry — no hardcoded if/else
- [ ] Phase 2: 5 total free tools live and working
- [ ] Phase 2: `sitemap-tools.xml` contains 6 URLs (5 tools + index)
- [ ] Phase 3: `sitemap-comparisons.xml` contains 23 URLs (22 comparisons + index)
- [ ] Phase 3: `sitemap-alternatives.xml` contains 21 URLs (20 alternatives + index)
- [ ] Phase 3: All new use-case integration pages render at `/use-cases/[slug]`
- [ ] Phase 4: `/geo/[slug]` routes exist and render for all 8 GEO pages
- [ ] Phase 4: `sitemap-geo.xml` is live and referenced in `robots.txt`
- [ ] Phase 4: GEO pages have valid FAQPage + Article JSON-LD schema
- [ ] Phase 5: 5 new blog posts indexed in sitemap with internal links to pSEO pages
- [ ] All phases: `yarn verify` passes
- [ ] All phases: `yarn test` passes
- [ ] All phases: `yarn build` completes without TypeScript errors

---

## 7. Prioritization & Quick Wins

Execute phases in this order for maximum early impact:

**Week 1:** Phase 1 (fix broken tools — immediate trust/UX fix) + Phase 4 infrastructure (GEO is the 2026 gold rush)
**Week 2:** Phase 3 (content scale — pure JSON, high ROI per hour) + Phase 4 pages
**Week 3:** Phase 2 (new tools) + Phase 5 (blog posts)

**Estimated organic traffic unlock:**

- Phase 3 alone: +15 comparisons + +13 alternatives = 28 new indexed pages targeting mid-funnel keywords at $4-15 CPC
- Phase 4: 8 GEO pages targeting an emerging category with nearly zero competition
- Phase 5: 5 blog posts for top-of-funnel + internal link equity to pSEO pages

---

## 8. Risks & Mitigations

| Risk                                                     | Likelihood | Mitigation                                                                                        |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| Content quality too thin (auto-generated)                | Medium     | Each JSON entry requires 4+ FAQs, 8+ features — enforce minimum via TypeScript `z.array().min(4)` |
| Duplicate content within comparisons                     | Low        | Each entry has unique `verdict`, `pros/cons`, competitor context                                  |
| GEO category dries up / becomes mainstream               | Low        | Early mover advantage; content ages well as reference guides                                      |
| Build time increases with 50+ new static pages           | Low        | Astro SSG with prerender is fast — 100 pages adds <30s to build                                   |
| Missing tool components break the "coming soon" fallback | Zero       | Registry pattern still shows fallback if component not registered                                 |

---

## 9. Future Phases (Not In Scope)

- **Localization:** Portuguese (Brazil) and Hindi (India) versions of top 5 comparison pages — separate PRD
- **Interactive competitor database:** Supabase-backed tool data instead of JSON, admin UI to add entries — requires full database migration
- **GEO product feature:** Once actually built (citation tracking dashboard, optimization recommendations), update the GEO content pages to reflect real capabilities. Phase 4 content is intentionally honest/educational and requires no update until then.
- **Backlink exchange page:** Dedicated `/backlinks` landing page with partner network dashboard — separate PRD
- **Agency white-label tour page:** `/agency` landing with white-label demo — separate PRD
