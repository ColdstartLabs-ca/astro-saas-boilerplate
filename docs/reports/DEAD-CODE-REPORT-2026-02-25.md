# Dead Code Report — AutopilotRank

**Scanned:** 2026-02-25
**Project:** autopilotrank.com
**Files scanned:** 920
**Raw findings:** 557 — 41 CRITICAL, 482 HIGH, 34 MEDIUM
**After false-positive correction:** ~550 confirmed (7 Astro components flagged incorrectly by scanner)

---

## False Positives (Scanner Error — Do NOT Delete)

The scanner does not resolve Astro import syntax, so these 7 files are actually used:

| File                                             | Used In                    |
| ------------------------------------------------ | -------------------------- |
| `src/components/analytics/AhrefsAnalytics.astro` | `src/layouts/Layout.astro` |
| `src/components/analytics/GoogleAnalytics.astro` | `src/layouts/Layout.astro` |
| `src/components/pseo/Breadcrumbs.astro`          | pSEO slug pages            |
| `src/components/pseo/CTASection.astro`           | pSEO slug pages            |
| `src/components/pseo/ComparisonTable.astro`      | pSEO slug pages            |
| `src/components/pseo/CrossCategoryLinks.astro`   | pSEO slug pages            |
| `src/components/pseo/RelatedPages.astro`         | pSEO slug pages            |

---

## CRITICAL: Orphaned Files (34 confirmed)

### Group 1: Boilerplate Leftovers — Safe to Delete

These are from the original SaaS starter template and have no place in an AI SEO product:

| File                                            | Notes                                         |
| ----------------------------------------------- | --------------------------------------------- |
| `client/utils/image-compression.ts`             | Canvas API image resizing — not an image tool |
| `client/utils/image-preprocessing.ts`           | Image processing pipeline — not needed        |
| `client/utils/bulk-processing.ts`               | Bulk image batch processing                   |
| `client/utils/file-validation.ts`               | File upload validation                        |
| `client/utils/zip-download.ts`                  | ZIP download utility                          |
| `client/utils/download.ts`                      | Single/batch download helper                  |
| `client/utils/prompt-utils.ts`                  | Prompt utilities (no context)                 |
| `client/components/tools/registry.ts`           | Tool registry (no tools registered)           |
| `client/components/landing/HeroBeforeAfter.tsx` | Before/after slider hero component            |
| `client/hooks/useBatchQueue.ts`                 | Batch queue hook                              |

### Group 2: Dead UI Components — Review & Delete

Components that exist but are rendered nowhere:

| File                                                    | Notes                                         |
| ------------------------------------------------------- | --------------------------------------------- |
| `client/components/stripe/CreditHistory.tsx`            | Credit history UI — not rendered in dashboard |
| `client/components/stripe/ExpirationWarningBanner.tsx`  | Credit expiry banner — unused                 |
| `client/components/stripe/InsufficientCreditsModal.tsx` | Insufficient credits modal — unused           |
| `client/components/faq/FAQAccordion.tsx`                | FAQ components — not on any page              |
| `client/components/common/Card.tsx`                     | Generic card — superseded by `ui/` components |
| `client/components/ui/TabButton.tsx`                    | Tab button — duplicate of existing tab UI     |
| `client/components/ui/ToggleButtonGroup.tsx`            | Toggle group — unused                         |
| `client/components/errors/ErrorBoundary.tsx`            | Error boundary — never mounted                |
| `client/components/pages/CanceledPageClient.tsx`        | Stripe cancel page client — not wired         |
| `client/components/form/FacebookSignInButton.tsx`       | Facebook OAuth — not enabled                  |
| `client/components/Logout.tsx`                          | Standalone logout component — unused          |

### Group 3: Dead Stores & Hooks

| File                           | Notes                                           |
| ------------------------------ | ----------------------------------------------- |
| `client/store/authStore.ts`    | Replaced by Supabase client auth directly       |
| `client/store/profileStore.ts` | Replaced by `userStore.ts`                      |
| `client/hooks/useAdminBlog.ts` | Admin blog CRUD hooks — no admin blog UI exists |
| `client/hooks/useLogout.ts`    | Logout hook — not used anywhere                 |

### Group 4: Debug / Dev Scripts — Delete or Move to `scripts/`

| File                     | Notes                                                  |
| ------------------------ | ------------------------------------------------------ |
| `debug-hreflang.ts`      | Root-level debug script, should not be committed       |
| `test-metadata-check.ts` | Root-level test script, should not be committed        |
| `mdx-components.tsx`     | Next.js MDX convention file — this is an Astro project |

### Group 5: Dead Server Code — Review Before Deleting

| File                                          | Notes                                         |
| --------------------------------------------- | --------------------------------------------- |
| `server/services/failure-metrics.service.ts`  | Failure metrics — not imported anywhere       |
| `server/services/internal/prompt-builder.ts`  | Prompt builder — superseded by `prompts/` dir |
| `server/services/provider-manager.service.ts` | Provider manager — not wired up               |
| `server/supabase/supabaseUtils.ts`            | Legacy Supabase utilities — unused            |
| `server/utils/retry.ts`                       | Retry utility — not imported                  |

---

## HIGH: Unreachable API Endpoints (6)

These routes exist but have **zero client calls**. All are from the Outrank PRD and were created without wiring up the client side:

| Endpoint                                                 | File                                        | Status            |
| -------------------------------------------------------- | ------------------------------------------- | ----------------- |
| `GET/PUT/DELETE /api/projects/:id/audiences/:audienceId` | `...audiences/[audienceId].ts`              | PRD incomplete    |
| `GET/DELETE /api/projects/:id/competitors/:competitorId` | `...competitors/[competitorId].ts`          | PRD incomplete    |
| `GET /api/projects/:id/content-strategy`                 | `...content-strategy/index.ts`              | PRD incomplete    |
| `GET/POST /api/projects/:id/example-articles`            | `...example-articles/index.ts`              | PRD incomplete    |
| `GET/DELETE /api/projects/:id/example-articles/:id`      | `...example-articles/[exampleArticleId].ts` | PRD incomplete    |
| `POST /api/admin/cleanup-quick-generate-campaigns`       | `...cleanup-quick-generate-campaigns.ts`    | Admin-only, no UI |

**Also orphaned** — the corresponding services for these routes have no callers:

- `server/services/project-audience.service.ts`
- `server/services/project-competitor.service.ts`
- `server/services/project-example-article.service.ts`

---

## HIGH: Notable Dead Exports (Selected from 476)

The scanner found 476 dead exports total. Most are TypeScript interfaces exported but never imported — low noise risk. The significant **runtime dead exports** to act on:

| File                                                 | Dead Exports                                                                                                    | Action                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `client/config/dashboardRoutes.ts`                   | `DASHBOARD_ROUTES`, `RouteGuard`, `RouteGroup`, `getBreadcrumbLabelKey`                                         | Not consumed anywhere — wire to sidebar nav or remove |
| `client/store/userStore.ts`                          | `useProfile`                                                                                                    | Dead selector — remove                                |
| `client/utils/authRedirectManager.ts`                | `getOAuthRedirectUrl`                                                                                           | Unused — verify if needed                             |
| `server/services/delivery.service.ts`                | `DeliveryService`                                                                                               | Not imported by any route handler                     |
| `server/services/qa.service.ts`                      | `QAService`, `DEFAULT_QA_CONFIG`                                                                                | Not wired to any endpoint                             |
| `server/services/provider-credit-tracker.service.ts` | `ProviderCreditTracker`                                                                                         | Not used                                              |
| `server/services/sitemap-page.service.ts`            | `SitemapPageService`                                                                                            | Not wired                                             |
| `client/components/ui/MotionWrappers.tsx`            | `StaggerContainer`, `StaggerItem`, `ScaleOnHover`, `SlideIn`, `AnimatedCounter`, `FloatingElement`, `GlowPulse` | Most motion wrappers are never used                   |

---

## MEDIUM: Unused Environment Variables (34)

### True Orphans — Safe to Remove from `.env.client`

| Variable                             | Notes                                  |
| ------------------------------------ | -------------------------------------- |
| `PUBLIC_SUPPORT_EMAIL`               | Not referenced in any template or code |
| `PUBLIC_PRIVACY_EMAIL`               | Not referenced                         |
| `PUBLIC_LEGAL_EMAIL`                 | Not referenced                         |
| `PUBLIC_SALES_EMAIL`                 | Not referenced                         |
| `PUBLIC_TWITTER_HANDLE`              | Not referenced                         |
| `PUBLIC_APP_SLUG`                    | Not referenced                         |
| `PUBLIC_DOWNLOAD_PREFIX`             | Boilerplate remnant                    |
| `PUBLIC_BATCH_FOLDER_NAME`           | Boilerplate remnant                    |
| `PUBLIC_CACHE_USER_KEY_PREFIX`       | Boilerplate remnant                    |
| `PUBLIC_WEB_SERVICE_NAME`            | Boilerplate remnant                    |
| `PUBLIC_CRON_SERVICE_NAME`           | Boilerplate remnant                    |
| `PUBLIC_GITHUB_USER`                 | Not referenced                         |
| `PUBLIC_GITHUB_REPO`                 | Not referenced                         |
| `PUBLIC_LAST_UPDATED_DATE`           | Not referenced                         |
| `PUBLIC_PRIMARY_DOMAIN`              | Not referenced                         |
| `PUBLIC_APP_DOMAIN`                  | Not referenced                         |
| `PUBLIC_STRIPE_PRICE_CREDITS_SMALL`  | Not referenced                         |
| `PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM` | Not referenced                         |
| `PUBLIC_STRIPE_PRICE_CREDITS_LARGE`  | Not referenced                         |

### Infrastructure Vars — Keep (Used in CI/CD or Deployment)

| Variable                | Source     | Notes                                 |
| ----------------------- | ---------- | ------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | `.env.api` | Used by Cloudflare deployment scripts |
| `CLOUDFLARE_ACCOUNT_ID` | `.env.api` | Same                                  |
| `CLOUDFLARE_ZONE_ID`    | `.env.api` | Same                                  |
| `WORKER_NAME`           | `.env.api` | Same                                  |

### `.env.test` Only — Ignore

`PUBLIC_GOOGLE_CLIENT_ID`, `PUBLIC_FACEBOOK_CLIENT_ID`, `PUBLIC_AZURE_CLIENT_ID`, `PUBLIC_ENABLE_GOOGLE_OAUTH`, `PUBLIC_ENABLE_AZURE_OAUTH`, `PUBLIC_ADMIN_EMAIL`, `PUBLIC_BASELIME_KEY`, `PUBLIC_AMPLITUDE_API_KEY`, `PUBLIC_GA_MEASUREMENT_ID`, `GEMINI_API_KEY` — test-only overrides, not a concern.

---

## Recommended Actions

### Immediate (Safe to do now)

- [ ] Delete root-level debug scripts: `debug-hreflang.ts`, `test-metadata-check.ts`, `mdx-components.tsx`
- [ ] Delete Group 1 boilerplate utils (10 files) — zero functional risk
- [ ] Clean `.env.client` — remove the 19 truly unused `PUBLIC_*` vars listed above

### Short-Term (Review first)

- [ ] Delete dead UI components (Group 2, 11 files) — verify none are planned in roadmap
- [ ] Delete dead stores & hooks (Group 3, 4 files) — confirm state managed elsewhere
- [ ] Remove dead server utils (Group 5, 5 files) — check git blame for context

### PRD-Tracked (Do not delete — wire up or schedule)

- [ ] **Audiences / Competitors / Example Articles** API routes + services — from Outrank PRD; either wire to onboarding wizard or schedule in roadmap
- [ ] `DeliveryService`, `QAService`, `SitemapPageService`, `ProviderCreditTracker` — partially built features, track completion

### Low Priority

- [ ] Strip unused exports from `client/components/ui/MotionWrappers.tsx`
- [ ] Wire or remove `DASHBOARD_ROUTES` in `client/config/dashboardRoutes.ts`
- [ ] Remove dead `useProfile` selector from `client/store/userStore.ts`

---

## Estimated Impact

| Action                                            | Files Removed              | Risk                 |
| ------------------------------------------------- | -------------------------- | -------------------- |
| Delete Groups 1–4 (boilerplate + dead UI + debug) | ~25 files                  | None                 |
| Remove dead server utils (Group 5)                | 5 files                    | Low — verify imports |
| Clean `.env.client`                               | 19 variables               | None                 |
| **Total**                                         | **~30 files, 19 env vars** | **Minimal**          |
