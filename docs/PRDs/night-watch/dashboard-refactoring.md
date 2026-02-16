# PRD: Dashboard Code Refactoring

**Complexity: 8 → HIGH mode** (touches 15+ files, multi-package, complex state logic)

---

## 1. Context

**Problem:** Dashboard codebase has accumulated significant tech debt — god components (912 lines), duplicated auth logic across 6 hooks, inline modals, nested ternaries, and SRP violations throughout.

**Files Analyzed:**

- `client/components/dashboard/views/CampaignDetailView.tsx` (912 lines)
- `client/components/dashboard/views/NewCampaignModal.tsx` (463 lines)
- `client/components/dashboard/views/OverviewView.tsx` (433 lines)
- `client/components/dashboard/views/CampaignsView.tsx` (266 lines)
- `client/components/dashboard/DashboardLayout.tsx` (259 lines)
- `client/components/dashboard/DashboardSidebar.tsx` (221 lines)
- `client/components/dashboard/DashboardRouter.tsx` (138 lines)
- `client/store/userStore.ts` (433 lines)
- `client/hooks/useProjects.ts` (323 lines)
- `client/hooks/useCampaigns.ts` (213 lines)
- `client/hooks/useCampaignDetail.ts` (389 lines)
- `client/hooks/useArticles.ts` (126 lines)
- `client/utils/api-client.ts` (292 lines)
- `client/components/ui/ConfirmDialog.tsx` (231 lines — already extracted)

**Current Behavior:**

- `getAccessToken()` + `getAuthHeaders()` duplicated identically in 6 hooks (~300 wasted lines)
- `CampaignDetailView` is a 912-line god component with 10+ responsibilities, 3 inline modals, 7 `useState` calls
- Campaign/article status badge styling duplicated across 4 files as nested ternaries
- `OverviewView` has an inline delete modal despite `ConfirmDialog` already existing
- Mutation error handling pattern (try/catch + toast + log + throw) repeated 10+ times across hooks
- `DashboardHeader` defined inline inside `DashboardLayout` with manual outside-click detection
- `api-client.ts` already has `getAccessToken()` but hooks don't use it

**What Already Exists (Reuse These):**

- `client/utils/api-client.ts` — already has `getAccessToken()`, needs `getAuthHeaders()` + `apiFetch()` utility
- `client/components/ui/ConfirmDialog.tsx` — fully featured, supports type-to-confirm
- `client/components/modal/Modal.tsx` — base modal component
- `client/utils/cn.ts` — class name utility

---

## 2. Solution

**Approach:**

- Extract a centralized `apiFetch()` utility and eliminate all duplicated auth functions from hooks
- Break `CampaignDetailView` (912 lines) into 7 focused sub-components + a custom hook
- Extract status badge styling into reusable utility functions
- Replace inline modals in `OverviewView` with `ConfirmDialog`
- Create a `useMutationWithToast()` wrapper to eliminate repeated error handling
- Extract `DashboardHeader` to its own file and use proper `useClickOutside` hook
- Remove/quarantine 4 disabled view components (~687 lines of dead code)

**Key Decisions:**

- [x] Reuse existing `api-client.ts` for centralized auth — extend rather than replace
- [x] Reuse existing `ConfirmDialog` for all confirmations
- [x] Reuse existing `Modal` component for all new modals
- [x] Extract status styles to `client/utils/statusStyles.ts` (utility function, not a component)
- [x] Keep hooks in `client/hooks/` directory, sub-components alongside their parent

**Data Changes:** None

---

## 3. Integration Points

**How will this feature be reached?**

- [x] Entry point: All existing dashboard routes remain identical
- [x] This is a pure refactoring — no new routes, no new features, no behavior changes
- [x] All existing imports will be updated to point to new file locations

**Is this user-facing?**

- [x] NO → Internal refactoring only. Zero visual/behavioral changes.

**Full user flow:**

1. User navigates to dashboard → Same UI, same behavior
2. All components render identically
3. All API calls work identically

---

## 4. Execution Phases

### Phase 1: Centralize API Auth Utilities

**User-visible outcome:** All hooks use a single `apiFetch()` instead of duplicated auth functions.

**Files (5):**

- `client/utils/api-client.ts` — Add `getAuthHeaders()` + typed `apiFetch()` utility
- `client/hooks/useProjects.ts` — Remove duplicated auth functions, use `apiFetch()`
- `client/hooks/useCampaigns.ts` — Remove duplicated auth functions, use `apiFetch()`
- `client/hooks/useCampaignDetail.ts` — Remove duplicated auth functions, use `apiFetch()`
- `client/hooks/useArticles.ts` — Remove duplicated auth functions, use `apiFetch()`

**Implementation:**

- [ ] Add `getAuthHeaders()` and `apiFetch<T>(url, options)` to `api-client.ts`
- [ ] `apiFetch` should: get auth headers, make fetch, parse JSON, throw on error
- [ ] Replace all per-hook `getAccessToken` + `getAuthHeaders` + manual fetch with `apiFetch()`
- [ ] Remove ~200 lines of duplicated code across 4 hooks

**Tests Required:**

| Test File                                   | Test Name                                     | Assertion                     |
| ------------------------------------------- | --------------------------------------------- | ----------------------------- |
| `client/utils/__tests__/api-client.test.ts` | `should add auth headers when session exists` | Headers include Authorization |
| `client/utils/__tests__/api-client.test.ts` | `should throw on non-ok response`             | Error thrown with message     |
| `client/utils/__tests__/api-client.test.ts` | `should parse JSON response`                  | Returns parsed data           |

**User Verification:**

- Action: Navigate dashboard, create/delete projects and campaigns
- Expected: All CRUD operations work identically as before

---

### Phase 2: Extract Status Styling Utilities

**User-visible outcome:** Campaign/article status badges render identically but styles come from one source.

**Files (4):**

- `client/utils/statusStyles.ts` — NEW: status-to-className mapping functions
- `client/components/dashboard/views/CampaignDetailView.tsx` — Use `getCampaignStatusStyles()` and `getArticleStatusStyles()`
- `client/components/dashboard/views/CampaignsView.tsx` — Use `getCampaignStatusStyles()`
- `client/components/dashboard/views/OverviewView.tsx` — Use `getCampaignStatusStyles()` (for project status)

**Implementation:**

- [ ] Create `getCampaignStatusStyles(status)` returning className string
- [ ] Create `getArticleStatusStyles(status)` returning className string
- [ ] Replace all 4 nested ternary blocks with utility function calls
- [ ] Use existing `cn()` utility for merging classes

**Tests Required:**

| Test File                                     | Test Name                                        | Assertion                 |
| --------------------------------------------- | ------------------------------------------------ | ------------------------- |
| `client/utils/__tests__/statusStyles.test.ts` | `should return green styles for active campaign` | Contains `text-green-400` |
| `client/utils/__tests__/statusStyles.test.ts` | `should return fallback for unknown status`      | Returns default classes   |

**User Verification:**

- Action: View campaigns list and campaign detail
- Expected: All status badges look identical to before

---

### Phase 3: Create `useMutationWithToast` Wrapper

**User-visible outcome:** Mutation error handling is consistent and centralized.

**Files (4):**

- `client/hooks/useMutationWithToast.ts` — NEW: wrapper hook
- `client/hooks/useProjects.ts` — Refactor mutations to use wrapper
- `client/hooks/useCampaigns.ts` — Refactor mutations to use wrapper
- `client/hooks/useCampaignDetail.ts` — Refactor mutations to use wrapper

**Implementation:**

- [ ] Create `useMutationWithToast<TData, TVariables>()` that wraps `useMutation` with:
  - Automatic success toast
  - Automatic error toast + logger.error
  - Returns `mutateAsync` wrapped in try/catch
- [ ] Refactor `useProjects` (3 mutations → 3 `useMutationWithToast` calls)
- [ ] Refactor `useCampaigns` (2 mutations → 2 calls)
- [ ] Refactor `useCampaignDetail` (4 mutations → 4 calls)
- [ ] Eliminate ~9 identical `handleXxx` wrapper functions

**Tests Required:**

| Test File                                             | Test Name                                       | Assertion                      |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `client/hooks/__tests__/useMutationWithToast.test.ts` | `should show success toast on mutation success` | Toast called with success type |
| `client/hooks/__tests__/useMutationWithToast.test.ts` | `should show error toast and log on failure`    | Toast + logger called          |
| `client/hooks/__tests__/useMutationWithToast.test.ts` | `should rethrow error after handling`           | Error propagated               |

**User Verification:**

- Action: Create a campaign, add keywords, delete a project
- Expected: Success/error toasts appear exactly as before

---

### Phase 4: Break Up CampaignDetailView — Extract Modals

**User-visible outcome:** Campaign detail page renders identically, modals work the same.

**Files (5):**

- `client/components/dashboard/views/campaign-detail/AddKeywordsModal.tsx` — NEW: extracted modal
- `client/components/dashboard/views/campaign-detail/StartGenerationModal.tsx` — NEW: extracted modal using ConfirmDialog
- `client/components/dashboard/views/campaign-detail/CampaignSettingsModal.tsx` — NEW: extracted modal
- `client/components/dashboard/views/CampaignDetailView.tsx` — Remove inline modals, import extracted ones
- `client/hooks/useCampaignSettingsForm.ts` — NEW: extract settings form state from component

**Implementation:**

- [ ] Extract Add Keywords Modal (lines 691-721) → `AddKeywordsModal.tsx`
- [ ] Replace Start Generation Modal (lines 724-768) with `ConfirmDialog` component
- [ ] Extract Settings Modal (lines 771-895) → `CampaignSettingsModal.tsx`
- [ ] Extract settings form state logic to `useCampaignSettingsForm` hook
- [ ] CampaignDetailView should import and render the 3 modal components
- [ ] Reduce CampaignDetailView by ~200 lines

**Tests Required:**

| Test File               | Test Name                     | Assertion     |
| ----------------------- | ----------------------------- | ------------- |
| Existing campaign tests | All existing tests still pass | No regression |

**User Verification:**

- Action: Open campaign detail → open each modal (Add Keywords, Start Generation, Settings)
- Expected: All 3 modals open, function, and close identically

---

### Phase 5: Break Up CampaignDetailView — Extract Sections

**User-visible outcome:** Campaign detail page renders identically, code is organized.

**Files (5):**

- `client/components/dashboard/views/campaign-detail/CampaignDetailHeader.tsx` — NEW: header + status + actions
- `client/components/dashboard/views/campaign-detail/CampaignStatsGrid.tsx` — NEW: 4 stat cards
- `client/components/dashboard/views/campaign-detail/CampaignCreditUsage.tsx` — NEW: credit breakdown section
- `client/components/dashboard/views/campaign-detail/ArticleQueueTable.tsx` — NEW: table with search/filter
- `client/components/dashboard/views/CampaignDetailView.tsx` — Orchestrator only (~100 lines)

**Implementation:**

- [ ] Extract header section (lines 264-329) → `CampaignDetailHeader`
- [ ] Extract stats grid (lines 357-378) → `CampaignStatsGrid`
- [ ] Extract credit usage section (lines 454-579) → `CampaignCreditUsage`
- [ ] Extract article queue table (lines 581-688) → `ArticleQueueTable`
- [ ] Extract filter logic (`filteredArticles`, `sortedArticles`, `cycleStatusFilter`) into `ArticleQueueTable`
- [ ] CampaignDetailView becomes a ~100-line orchestrator that composes sub-components

**Tests Required:**

| Test File               | Test Name                     | Assertion     |
| ----------------------- | ----------------------------- | ------------- |
| Existing campaign tests | All existing tests still pass | No regression |

**User Verification:**

- Action: Open campaign detail, use search/filter, check all sections render
- Expected: Visually identical to before

---

### Phase 6: Refactor OverviewView + Extract DashboardHeader

**User-visible outcome:** Overview page and header work identically, code is cleaner.

**Files (4):**

- `client/components/dashboard/views/OverviewView.tsx` — Replace inline delete modal with `ConfirmDialog`, extract greeting to util
- `client/components/dashboard/DashboardHeader.tsx` — NEW: extracted from `DashboardLayout.tsx`
- `client/components/dashboard/DashboardLayout.tsx` — Import `DashboardHeader`, remove inline component
- `client/utils/timeUtils.ts` — NEW: `getGreeting()` utility

**Implementation:**

- [ ] Replace inline delete modal (lines 394-419) with `ConfirmDialog` component
- [ ] Extract time-based greeting to `getGreeting()` in `client/utils/timeUtils.ts`
- [ ] Move `DashboardHeader` function (lines 35-145) to its own file
- [ ] Create or reuse `useClickOutside` hook instead of manual implementation in header
- [ ] DashboardLayout imports `DashboardHeader` instead of defining it inline

**Tests Required:**

| Test File                                  | Test Name                                | Assertion                |
| ------------------------------------------ | ---------------------------------------- | ------------------------ |
| `client/utils/__tests__/timeUtils.test.ts` | `should return Good morning before noon` | Returns correct greeting |
| `client/utils/__tests__/timeUtils.test.ts` | `should return Good evening after 6pm`   | Returns correct greeting |

**User Verification:**

- Action: Open dashboard overview, delete a project, check header dropdown
- Expected: All interactions work identically

---

### Phase 7: Clean Up Dead Code + Unused Props

**User-visible outcome:** Reduced bundle size, cleaner codebase.

**Files (5):**

- `client/components/dashboard/views/CampaignsView.tsx` — Remove unused props (`_projectId`, `_onDeleteCampaign`)
- `client/components/dashboard/views/KeywordsView.tsx` — Move to `disabled/` or delete
- `client/components/dashboard/views/OptimizationView.tsx` — Move to `disabled/` or delete
- `client/components/dashboard/views/CalendarView.tsx` — Move to `disabled/` or delete
- `client/components/dashboard/views/BacklinkExchangeView.tsx` — Move to `disabled/` or delete

**Implementation:**

- [ ] Remove `_projectId` and `_onDeleteCampaign` from CampaignsView props interface
- [ ] Update callers of CampaignsView to stop passing removed props
- [ ] Delete 4 disabled view components (or move to `views/_disabled/` if we want to keep them)
- [ ] Verify no imports reference deleted files

**Tests Required:**

| Test File   | Test Name            | Assertion                         |
| ----------- | -------------------- | --------------------------------- |
| Build check | `yarn verify` passes | No broken imports, no type errors |

**User Verification:**

- Action: Navigate to all dashboard pages
- Expected: Everything works. Disabled routes still show "not found" as before.

---

## 5. Acceptance Criteria

- [ ] All phases complete
- [ ] All specified tests pass
- [ ] `yarn verify` passes
- [ ] All automated checkpoint reviews passed
- [ ] Zero visual/behavioral changes — pure refactoring
- [ ] `CampaignDetailView` reduced from 912 lines to ~100 lines (orchestrator)
- [ ] Zero duplicated `getAccessToken`/`getAuthHeaders` in hooks
- [ ] Zero inline modal implementations in view components
- [ ] Zero duplicated status styling ternaries

---

## 6. Metrics

| Metric                       | Before                                         | After (Target)           |
| ---------------------------- | ---------------------------------------------- | ------------------------ |
| `CampaignDetailView` lines   | 912                                            | ~100 (orchestrator)      |
| Duplicated auth functions    | 6 hooks × 2 functions                          | 0 (centralized)          |
| Inline modal implementations | 5 (3 in detail, 1 in overview, 1 in campaigns) | 0                        |
| Status ternary duplications  | 4 files                                        | 0 (utility function)     |
| Mutation error wrappers      | 9 identical patterns                           | 0 (useMutationWithToast) |
| Dead code (disabled views)   | ~687 lines                                     | 0                        |
| Total estimated lines saved  | ~800+                                          | —                        |
