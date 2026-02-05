# Astro Migration Regression Report (Re-Review)

Date: February 5, 2026

## Scope

Compared `refactor/astro-migration` against `main` and the requirements in `docs/PRDs/nextjs-to-astro-migration.md`.

Diff basis: `git diff main...HEAD` (working tree has local modifications that are not included).

Tests were not run. Findings are from code inspection only.

## High Severity Regressions

1. Landing page is now client-only, removing SSR HTML and likely hurting SEO/perf. Evidence: `src/pages/index.astro:31` vs `app/[locale]/page.tsx:1-51`.
2. Admin dashboard pages no longer render the main dashboard shell (sidebar/header/credits). `AdminDashboardLayout.astro` replaces the dashboard layout instead of nesting it. Evidence: `src/layouts/AdminDashboardLayout.astro:1-27`, `src/pages/dashboard/admin/index.astro:1-8` vs `app/[locale]/dashboard/layout.tsx:15-75` and `app/[locale]/dashboard/admin/layout.tsx:1-19`.

## Medium Severity Regressions

1. Global nav/footer are client-only; marketing pages ship without these elements in SSR HTML. Evidence: `src/layouts/Layout.astro:41-49` vs `client/components/layout/Layout.tsx:29-35`.
2. Dashboard layout logic removed: no auth grace period, no `useLowCreditWarning`, and no refresh of user data on dashboard entry. Evidence: `src/layouts/DashboardLayout.astro:1-27` vs `app/[locale]/dashboard/layout.tsx:10-74`.
3. Loading backdrop is no longer rendered globally (store-driven loading UI). Evidence: `client/components/layout/Layout.tsx:3-35` vs `src/layouts/Layout.astro:41-49` and `src/layouts/DashboardLayout.astro:22-27`.
4. Navigation parity gaps: `/features` link removed and user dropdown missing Help and View Plans. Evidence: `client/components/navigation/NavBar.tsx:70-213` vs `client/components/navigation/NavBarAstro.tsx:69-205`.
5. Footer parity gaps: bottom links + locale switcher removed and translations are hardcoded instead of i18n. Evidence: `client/components/layout/Footer.tsx:9-119` vs `client/components/layout/FooterAstro.tsx:1-111`.
6. Robots/sitemap outputs differ: robots now points to `sitemap-static.xml` and `sitemap-blog.xml` instead of `/sitemap.xml`, and static sitemap drops `/features` and `/how-it-works` (and the second `/` entry). Evidence: `app/robots.ts:11-42` vs `src/pages/robots.txt.ts:9-43`; `app/sitemap-static.xml/route.ts:11-21` vs `src/pages/sitemap-static.xml.ts:11-18`.

## Low Severity / Parity Gaps

1. Locale switcher aria-label uses a fully-qualified key with a namespace-scoped translator, so it returns the raw key instead of the localized string. Evidence: `client/components/i18n/LocaleSwitcher.tsx:27-73` with `locales/en/i18n.json` (`switcher.ariaLabel`).
2. Layout no longer injects JSON-LD structured data or preload hero images, and Next font classes are not applied. Evidence: `app/[locale]/layout.tsx:98-151` vs `src/layouts/Layout.astro:19-49`.
3. `HomePageClient` no longer declares `'use client'`, which will break the remaining Next.js `app/[locale]/page.tsx` if it is still used before cleanup. Evidence: `client/components/pages/HomePageClient.tsx:1-40` vs `app/[locale]/page.tsx:1-51`.
