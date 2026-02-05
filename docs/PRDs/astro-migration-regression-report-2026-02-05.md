# Astro Migration Regression Report

Date: February 5, 2026

## Scope

Compared `refactor/astro-migration` against `main` and the requirements in `docs/PRDs/nextjs-to-astro-migration.md`.

Note: No `master` branch exists in this repo. Only `main` and `refactor/astro-migration` were available.

Tests were not run. Findings are from code inspection only.

## High Severity Regressions

1. Supabase SSR auth is broken because the cookie adapter returns an empty list. This prevents session reads and makes `getUser`/`updateSession` return `null`, which breaks authenticated routing (dashboard/admin). Evidence: `shared/utils/supabase/server.ts:14-19`, `shared/utils/supabase/middleware.ts:23-31`, `shared/utils/supabase/middleware.ts:61-63`.
2. `/pricing` fails to parse because the frontmatter closing `---` is on the same line as a statement. Evidence: `src/pages/pricing.astro:8`.

## Medium Severity Regressions

1. SEO meta tags are rendered inside `<body>` for most Astro pages because they are not slotted into the head. Evidence: `src/layouts/Layout.astro:18-23`, `src/pages/help.astro:13-20`, `src/pages/blog/index.astro:16-23`.
2. Analytics and monitoring providers are missing on Astro pages. `GoogleAnalytics`, `AhrefsAnalytics`, `AnalyticsProvider`, and `BaselimeProvider` are not wired anywhere in the Astro layout. Evidence: `src/layouts/Layout.astro` vs `app/[locale]/layout.tsx` on `main`.
3. Nav auth state is stubbed so the navbar always renders logged out and `signOut` is a no-op. Evidence: `client/components/navigation/NavBarAstro.tsx:13-17`.
4. Client translations are incomplete for many namespaces because `@src/i18n/utils` only loads a subset of JSON files. Components using `getTranslations` for `stripe`, `auth`, and `dashboard` will return keys. Evidence: `src/i18n/utils.ts:21-30`, `client/components/stripe/PlanChangeModal.tsx:63`, `client/components/pages/AuthConfirmClient.tsx:11`, `client/components/dashboard/DashboardSidebar.tsx:24`.
5. Locale switcher uses `getTranslations()` with no namespace, so its aria label likely renders as a raw key. Evidence: `client/components/i18n/LocaleSwitcher.tsx:27`.
6. Dashboard behavior regression: the Next.js dashboard layout handled auth grace period, user refresh, and `useLowCreditWarning`. The Astro dashboard layout does not implement this logic. Evidence: `app/[locale]/dashboard/layout.tsx` on `main` vs `src/layouts/DashboardLayout.astro`.
7. PRD mismatch: dashboard/admin pages use `client:load` instead of `client:only="react"`, increasing hydration mismatch risk. Evidence: `src/pages/dashboard/index.astro:7` (and other dashboard pages).

## PRD Gaps / Parity Missing

1. SEO endpoints are not implemented: no `src/pages/robots.txt.ts`, `src/pages/sitemap-*.xml.ts`, or `src/pages/manifest.json.ts`.
2. Error pages are not implemented: no `src/pages/404.astro` or `src/pages/500.astro`. `src/pages/blog/[slug].astro` redirects to `/404`, but that route does not exist.

## Suggested Fix Order

1. Fix Supabase cookie adapters to read actual cookies.
2. Fix `/pricing` frontmatter parse error.
3. Restore `head` slot usage and global analytics/providers in `src/layouts/Layout.astro`.
4. Expand i18n utilities or switch to `useTranslations` for client components.
5. Restore dashboard auth/refresh behavior and align hydration strategy.
6. Implement SEO endpoints and error pages.
