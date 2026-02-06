# Dashboard UI Architecture Audit

Date: 2026-02-06

## Scope

Reviewed dashboard and related Astro/React UI architecture with focus on:

- DRY, KISS, SRP
- hook-based behavior encapsulation
- Zustand and dependency usage (React Query, i18n, modal/store patterns)

Primary files reviewed:

- `src/pages/dashboard/[...slug].astro`
- `src/layouts/DashboardLayout.astro`
- `client/components/dashboard/*`
- `client/components/pages/*` (dashboard/admin pages)
- `client/hooks/*` (dashboard-relevant hooks)
- `client/store/*` (dashboard-relevant stores)
- `src/layouts/Layout.astro` and representative Astro pages

## Explicitly Excluded (Placeholders)

Per request, placeholder/demo modules were not treated as actionable findings:

- `client/components/dashboard/views/CampaignsView.tsx`
- `client/components/dashboard/views/KeywordsView.tsx`
- `client/components/dashboard/views/OptimizationView.tsx`
- `client/components/dashboard/views/CalendarView.tsx`
- `client/components/dashboard/views/BacklinkExchangeView.tsx`
- `client/components/dashboard/views/SettingsView.tsx`
- `client/components/dashboard/views/NewCampaignModal.tsx`
- `client/components/dashboard/views/WebsiteOnboarding.tsx`

## Executive Assessment

- DRY: **Partially respected**
- KISS: **Partially respected**
- SRP: **Mixed, several violations in core modules**
- Hook encapsulation: **Mixed**
- Zustand/dependency usage: **Mixed; some strong patterns, some structural issues**

## Findings (Ordered by Severity)

### High

1. Active project state is local to each `useProjects()` call, causing cross-component desynchronization.

- Evidence:
  - Local state per hook instance: `client/hooks/useProjects.ts:195`
  - Setter only updates current hook instance + localStorage: `client/hooks/useProjects.ts:265`
  - Multiple concurrent consumers in the same dashboard tree:
    - `client/components/projects/ProjectSelector.tsx:29`
    - `client/components/projects/ProjectList.tsx:44`
    - `client/components/dashboard/views/OverviewView.tsx:19`
- Impact:
  - One component can switch project while others keep stale `activeProjectId` until remount.
  - Inconsistent UI state and risk of actions being executed in the wrong visual context.
- Principle impact: SRP, DRY, correctness.
- Recommendation:
  - Move `activeProjectId` to a shared store (Zustand slice) or React Query state keyed by user.
  - Keep `useProjects` as data access + mutations only.

2. Projects query cache is not user-scoped.

- Evidence:
  - Static key: `client/hooks/useProjects.ts:30`
  - Query uses same key for all users: `client/hooks/useProjects.ts:205`
  - Global dashboard `QueryClient` singleton: `client/components/dashboard/DashboardLayout.tsx:17`
- Impact:
  - Potential stale/cross-account project list reuse during auth transitions in same browser session.
- Principle impact: correctness, dependency usage.
- Recommendation:
  - Include user id in query key (for example `['projects', user?.id]`).
  - On auth user change/sign-out, clear or invalidate user-scoped queries.

### Medium

3. Toast dismiss action is broken by ID mismatch and unstable list keys.

- Evidence:
  - Toasts are created with random `id`: `client/store/toastStore.ts:19`
  - Removal API expects `id`: `client/store/toastStore.ts:32`
  - UI removes by `toast.message` and uses `index` as key: `client/components/common/Toast.tsx:43` and `client/components/common/Toast.tsx:44`
- Impact:
  - Clicking a toast may fail to remove it; duplicate messages can behave unpredictably.
- Principle impact: KISS, correctness.
- Recommendation:
  - Use `toast.id` both for React key and `removeToast` argument.

4. i18n architecture is duplicated and partially inconsistent.

- Evidence:
  - Full translation registry + resolver in `src/i18n/utils.ts:34`
  - Parallel full translation registry + flatten logic in `client/hooks/useTranslations.ts:31`
  - Admin users page bypasses shared i18n with inline map: `client/components/pages/AdminUsersPageClient.tsx:20`
- Impact:
  - Higher maintenance cost and divergence risk across page/component translation behavior.
- Principle impact: DRY.
- Recommendation:
  - Consolidate to one i18n runtime path for React clients and one thin server adapter.
  - Replace inline translation maps with the shared i18n hook.

5. Routing/navigation source-of-truth is split across multiple files.

- Evidence:
  - Dashboard route switch: `client/components/dashboard/DashboardRouter.tsx:105`
  - Sidebar route/menu config: `client/components/dashboard/DashboardSidebar.tsx:58`
  - Header breadcrumb path parsing: `client/components/dashboard/DashboardLayout.tsx:32`
- Impact:
  - High drift risk when adding/renaming routes.
- Principle impact: DRY, KISS.
- Recommendation:
  - Centralize route metadata (path, label key, icon, guard, enabled flag) and consume it in router/sidebar/breadcrumb.

6. Existing hook abstraction (`useClickOutside`) is bypassed in dashboard components.

- Evidence:
  - Reusable hook exists: `client/hooks/useClickOutside.ts:7`
  - Duplicate local outside-click logic in:
    - `client/components/dashboard/DashboardLayout.tsx:60`
    - `client/components/projects/ProjectSelector.tsx:35`
- Impact:
  - Repeated event wiring patterns and inconsistent behavior risk.
- Principle impact: DRY, hook encapsulation.
- Recommendation:
  - Standardize outside-click behavior through `useClickOutside` (or replace all with one improved variant).

7. `useUserStore` carries too many responsibilities.

- Evidence:
  - 430+ line store combines auth lifecycle, data fetch, cache persistence, credit arithmetic, password flows, and redirects: `client/store/userStore.ts:31` and `client/store/userStore.ts:332`
- Impact:
  - Harder testing, higher regression risk, lower change velocity.
- Principle impact: SRP.
- Recommendation:
  - Split into slices/services (for example auth session, profile/subscription data, credit operations, password operations).

### Low

8. Deprecated/legacy state modules remain in-tree and increase cognitive load.

- Evidence:
  - Legacy auth store with eager side effects: `client/store/auth/authStore.ts:67`
  - Checkout store appears only as a fallback path: `client/store/checkoutStore.ts:18`, `client/utils/authRedirectManager.ts:125`
- Impact:
  - Confusing source-of-truth for new contributors; dead paths can rot silently.
- Principle impact: KISS.
- Recommendation:
  - Remove or quarantine legacy stores behind explicit migration notes.

9. Duplicate modal implementations with overlapping purpose.

- Evidence:
  - `client/components/modal/Modal.tsx:21`
  - `client/components/ui/Modal.tsx:16`
- Impact:
  - Inconsistent UX/behavior and higher maintenance for modal fixes.
- Principle impact: DRY.
- Recommendation:
  - Keep one modal primitive and migrate callers.

10. Astro SEO metadata is largely hand-written per page.

- Evidence:
  - `src/pages/index.astro:13`
  - `src/pages/pricing.astro:12`
- Impact:
  - Repetition and possible inconsistency in meta coverage.
- Principle impact: DRY.
- Recommendation:
  - Add an SEO helper component/function to standardize metadata injection.

## What Is Working Well

- Clean dashboard shell boundary via Astro catch-all route and client router:
  - `src/pages/dashboard/[...slug].astro:1`
  - `src/layouts/DashboardLayout.astro:29`
- Good server-side route protection in middleware:
  - `src/middleware.ts:423`
  - `src/middleware.ts:497`
- React Query is already adopted in projects domain and can be expanded.
- Zustand selectors are used in some places (`useCredits`, `useUserData`) to reduce render churn:
  - `client/store/userStore.ts:393`
  - `client/store/userStore.ts:417`

## Prioritized Refactor Plan (Placeholder-Safe)

1. Fix correctness first: shared active project state + user-scoped project query keys.
2. Fix toast removal/key bug.
3. Centralize dashboard route metadata and reuse in router/sidebar/breadcrumb.
4. Unify i18n path and remove inline translation maps.
5. Extract `useUserStore` slices incrementally.
6. Remove/retire legacy stores and duplicate modal primitive.
