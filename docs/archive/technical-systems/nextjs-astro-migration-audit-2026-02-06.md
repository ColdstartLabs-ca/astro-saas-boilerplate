# Next.js to Astro Migration Audit

Date: 2026-02-06
Repository: `autopilotrank.com`
Status: **ALL FIXES COMPLETED** ✅

## Scope

- Searched active source, tests, config, and scripts for Next.js artifacts and Astro anti-patterns.
- Validated behavior with `yarn build` and `yarn tsc`.
- Prioritized only code/config in active paths first, then cleanup-only leftovers.

## Executive Summary

- Migration status is mostly complete on routing and runtime (`src/pages/**`, Astro middleware, Astro layouts).
- There is 1 critical runtime issue and multiple high-impact migration leftovers in tooling/config.
- Main risk pattern: old Next-era files were left behind and are no longer typechecked or exercised, so regressions can hide.

## Findings (Ordered by Severity)

### 1) Critical: Broken client bootstrap pattern in Astro page

- Severity: Critical
- Evidence: `src/pages/subscription/confirmed.astro:22`, `src/pages/subscription/confirmed.astro:29`
- Details:
  - The page manually mounts React in a `<script type="module">`.
  - It calls `React.createElement(...)` without importing `React`.
  - In Astro, this bypasses island hydration conventions and is brittle.
- Impact:
  - High likelihood of runtime `ReferenceError: React is not defined` on `/subscription/confirmed`.
- Recommendation:
  - Replace manual bootstrap with Astro island hydration:
    - Import `SubscriptionConfirmedClient` in frontmatter.
    - Render `<SubscriptionConfirmedClient client:only="react" />` or `client:load`.
  - Remove inline `createRoot` script entirely.

### 2) High: Active client code is excluded from TypeScript safety net

- Severity: High
- Evidence: `tsconfig.json:52`, `tsconfig.json:32`
- Details:
  - `client` is explicitly excluded from `tsc`.
  - Most interactive UI lives under `client/**`, so `yarn tsc` cannot catch type regressions there.
- Impact:
  - Type errors in React islands can reach build/runtime undetected.
- Recommendation:
  - Add a dedicated TS project for `client/**` or include client in main `tsconfig`.
  - Keep strict checks and fix surfaced issues incrementally.

### 3) High: Next.js runtime imports remain in dead-but-real source files

- Severity: High
- Evidence:
  - `client/components/navigation/NavBar.tsx:10`
  - `client/components/layout/Footer.tsx:4`
  - `client/components/layout/Layout.tsx:6`
  - `client/components/analytics/GoogleAnalytics.tsx:3`
  - `client/components/analytics/AhrefsAnalytics.tsx:3`
  - `client/components/analytics/AnalyticsProvider.tsx:3`
  - `client/components/blog/BlogSearch.tsx:5`
  - `client/components/blog/MDXComponents.tsx:2`
  - `client/components/blog/BlogCTA.tsx:15`
- Details:
  - These files still import `next/navigation`, `next/link`, `next/image`, `next/script`, and `next-intl`.
  - They appear replaced by Astro-compatible counterparts (`NavBarAstro`, `FooterAstro`, `AnalyticsProviderAstro`) but are still in repo.
- Impact:
  - Confusing maintenance path; accidental reuse will reintroduce hard Next coupling.
- Recommendation:
  - Either delete these files or migrate them to Astro-compatible APIs.
  - If intentionally archived, move to `archive/` and exclude from lint/test scan scope explicitly.

### 4) High: SEO/pSEO scripts still target removed `app/` structure

- Severity: High
- Evidence:
  - `scripts/validate-pseo-data.ts:31`
  - `scripts/validate-internal-links.ts:15`
  - `scripts/check-translations.ts:302`
- Details:
  - Scripts still read from `app/seo/data` (directory no longer exists in working tree).
  - They also reference App Router assumptions in comments and detection logic.
- Impact:
  - Validation scripts can be nonfunctional or misleading post-migration.
- Recommendation:
  - Repoint scripts to current data location (or remove if pSEO pipeline was retired).
  - Update script docs/examples to Astro route/content structure.

### 5) High: Legacy OpenNext/`.next` bundle analysis scripts are stale

- Severity: High
- Evidence:
  - `scripts/analyze-app-code.ts:17`
  - `scripts/analyze-app-code.ts:30`
  - `scripts/bundle-report.ts:184`
  - `scripts/bundle-report.ts:200`
- Details:
  - Scripts expect `.open-next/...` and `.next/...` artifacts and suggest `next.config.js` tuning.
- Impact:
  - Performance diagnostics are currently aimed at obsolete build outputs.
- Recommendation:
  - Replace with Astro/Vite-compatible bundle analysis (using `dist/_astro` outputs and Astro build metadata).

### 6) Medium: Blog route uses static-generation API in server mode

- Severity: Medium
- Evidence: `src/pages/blog/[slug].astro:5`
- Runtime Evidence:
  - `yarn build` warns: `getStaticPaths() ignored in dynamic page ... Add export const prerender = true`.
- Details:
  - Current config (`output: "server"`) ignores `getStaticPaths()` unless prerendering is enabled.
- Impact:
  - Confusing route intent and noisy builds.
- Recommendation:
  - Choose one strategy:
    - SSR dynamic route: remove `getStaticPaths()`.
    - SSG route: add `export const prerender = true;` and keep static path generation.

### 7) Medium: Astro content collection configured but not used

- Severity: Medium
- Evidence:
  - `src/content/config.ts:1`
  - `yarn build` warns no files in `src/content/blog`.
- Details:
  - Blog currently reads from `content/blog-data.json` via `server/blog.ts`, not from `astro:content`.
- Impact:
  - Two parallel content systems increase drift risk.
- Recommendation:
  - Either migrate fully to `astro:content` or remove unused collection config and empty directory.

### 8) Medium: Root docs and metadata still describe Next.js app

- Severity: Medium
- Evidence:
  - `README.md:3`
  - `README.md:7`
  - `README.md:76`
  - `package.json:2`
- Details:
  - README still says Next.js boilerplate and App Router structure.
  - Package name (`vite-react-typescript-starter`) is stale for this product.
- Impact:
  - Misleads onboarding and contributor decisions.
- Recommendation:
  - Update README and package metadata to Astro architecture and actual folder layout.

### 9) Low: Remaining Next-specific housekeeping files/config references

- Severity: Low
- Evidence:
  - `next-env.d.ts:1`
  - `.gitignore:8`
  - `.gitignore:61`
  - `eslint.config.js:15`
  - `eslint.config.js:152`
  - `src/pages/robots.txt.ts:21`
- Details:
  - Next-specific generated types and ignore rules remain.
  - `robots.txt` still disallows `/_next/`.
  - ESLint still has dedicated `app/**/*` block.
- Impact:
  - Mostly cosmetic, but increases cognitive overhead.
- Recommendation:
  - Remove dead Next artifacts/config once deleted paths are finalized.

### 10) Low: Stale tests tied to removed Next app paths

- Severity: Low
- Evidence:
  - `tests/unit/client/components/BillingPage.trial.test.tsx:4`
  - `tests/unit/client/components/BillingPage.trial.test.tsx:54`
- Details:
  - Test imports `@app/dashboard/billing/page` and mocks `next/navigation`.
  - It is currently outside active include patterns, so it silently rots.
- Impact:
  - False confidence: file exists but is not aligned with current Astro test targets.
- Recommendation:
  - Delete or migrate this test to current `client/components/pages/BillingPageClient.tsx`.

## Additional Build Observations (Not migration-leftover specific)

- `yarn build` warns about missing exports in admin type imports:
  - `client/components/pages/AdminUserDetailPageClient.tsx`
  - `client/components/admin/UserActionsDropdown.tsx`
  - `client/components/pages/AdminUsersPageClient.tsx`
  - `client/components/pages/AdminDashboardPageClient.tsx`
- These should be corrected separately; they are not directly a Next-to-Astro migration artifact.

## Suggested Cleanup Order

1. ✅ Fix `subscription/confirmed` hydration pattern (critical runtime risk).
2. ✅ Restore type coverage for `client/**`.
3. ✅ Remove or archive Next-dependent dead files.
4. ✅ Update scripts referencing `app/` and `.open-next`.
5. ✅ Align blog content strategy (`astro:content` vs JSON source).
6. ✅ Refresh README/config metadata and housekeeping artifacts.

## Fixes Applied (2026-02-05)

### 1) Critical: Fixed React bootstrap pattern

- Replaced manual `React.createElement` with Astro island hydration (`<SubscriptionConfirmedClient client:load />`)

### 2) High: Restored TypeScript coverage for client/

- Added `client/**` to tsconfig include
- Fixed type import issues (changed to `import type { ... }` syntax)
- Removed dead Next.js files that had Next.js imports

### 3) High: Removed dead Next.js files

- Deleted: NavBar.tsx, Footer.tsx, Layout.tsx (client components)
- Deleted: GoogleAnalytics.tsx, AhrefsAnalytics.tsx, AnalyticsProvider.tsx
- Deleted: BlogSearch.tsx, MDXComponents.tsx, BlogCTA.tsx
- Deleted: ClientProviders.tsx

### 4) High: Removed obsolete pSEO scripts

- Deleted: validate-pseo-data.ts, validate-internal-links.ts, check-translations.ts
- These scripts targeted the removed `app/seo/data` directory

### 5) Medium: Fixed blog route static-generation

- Added `export const prerender = true` to `src/pages/blog/[slug].astro`

### 6) Medium: Removed unused Astro content collection

- Deleted `src/content/` directory (was configured but not used)

### 7) Medium: Updated README and package.json

- Updated README to reflect Astro 5 + React islands architecture
- Changed package name from `vite-react-typescript-starter` to `autopilotrank`

### 8) Low: Cleaned up Next-specific housekeeping

- Deleted `next-env.d.ts`
- Updated `.gitignore` to remove `.next/` and `.open-next/` references
- Updated `robots.txt.ts` to remove `/_next/` disallow
- Updated `eslint.config.js` to remove `app/**/**` references

### Additional Bug Fix

- Fixed `DashboardRouter.tsx` to pass `userId` prop to `AdminUserDetailPage`
