# Dashboard Core Flow UX Report

Date: 2026-02-10

## Scope

Focused on the dashboard core user flow:

1. Enter dashboard
2. Select or create project
3. Create campaign
4. Generate/review articles

Primary files reviewed:

- `client/components/dashboard/DashboardLayout.tsx`
- `client/components/dashboard/DashboardRouter.tsx`
- `client/components/dashboard/views/OverviewView.tsx`
- `client/components/projects/ProjectSelector.tsx`
- `client/components/projects/ProjectOnboarding.tsx`
- `client/components/pages/CampaignsPageClient.tsx`
- `client/components/dashboard/views/CampaignsView.tsx`
- `client/components/dashboard/views/CampaignDetailView.tsx`
- `client/components/pages/ArticlesPageClient.tsx`
- `client/components/articles/QuickGenerateModal.tsx`
- `client/components/articles/ArticleList.tsx`
- `client/config/dashboardRoutes.ts`
- `client/components/common/Toast.tsx`

Guideline baseline used: latest Vercel Web Interface Guidelines (`web-interface-guidelines/main/command.md`).

## Executive Summary

The dashboard has a strong structure, but there are a few high-friction points that make the experience less straightforward than it should be:

- Some core CTAs lead to dead ends or don’t do what they say.
- First-time flow has a modal behavior that can trap users.
- Some destructive actions are immediate without confirmation.
- Several key interactions are mouse-only or weakly accessible.

If you fix the top 5 items below first, the flow will feel significantly clearer and safer.

## Findings (Prioritized)

### P0 - High Impact, High Confidence

1. Dead-end quick actions from Overview.

- Evidence:
  - `client/components/dashboard/views/OverviewView.tsx:349` (Research Keywords)
  - `client/components/dashboard/views/OverviewView.tsx:364` (View Analytics)
  - `client/config/dashboardRoutes.ts:133` (`/dashboard/keywords` disabled)
  - `client/config/dashboardRoutes.ts:165` (`/dashboard/analytics` disabled)
  - `client/components/dashboard/DashboardRouter.tsx:79` (disabled route -> NotFound)
- UX impact: users click prominent actions and land on a non-productive state.
- Fix: either enable these pages or replace CTA targets with available flows; otherwise hide them.

2. “Go to Campaigns” CTA does not navigate.

- Evidence:
  - `client/components/articles/QuickGenerateModal.tsx:259` label says “Go to Campaigns” but handler only calls `onClose()`.
- UX impact: broken expectation at a key conversion step.
- Fix: route to `/dashboard/campaigns` before closing.

3. First-time no-project flow can force the onboarding modal to reopen repeatedly.

- Evidence:
  - `client/components/dashboard/views/OverviewView.tsx:60`
  - `client/components/dashboard/views/OverviewView.tsx:61`
  - `client/components/dashboard/views/OverviewView.tsx:62`
- UX impact: users may feel trapped if they dismiss onboarding and want to explore first.
- Fix: auto-open once per session/user intent (for example with `hasAutoOpenedOnboarding` state).

4. Campaign deletion is immediate (no confirm/undo).

- Evidence:
  - `client/components/dashboard/views/CampaignsView.tsx:187`
  - `client/components/dashboard/views/CampaignsView.tsx:193`
- UX impact: high-risk accidental data loss.
- Fix: add confirm modal with campaign name or provide undo toast.

5. Campaign creation path does not guard against “no active project”.

- Evidence:
  - `client/components/pages/CampaignsPageClient.tsx:83` passes empty `projectId` when no active project
  - `client/components/dashboard/views/CampaignsView.tsx:37` ignores incoming `projectId`
- UX impact: users can start campaign setup in invalid context and fail later.
- Fix: block campaign creation until a project is selected; show a clear empty state CTA to create/select a project.

### P1 - Medium Impact

6. Core interactions rely on non-semantic click targets (weak keyboard accessibility).

- Evidence:
  - `client/components/dashboard/views/CampaignsView.tsx:152` clickable card `<div>`
  - `client/components/articles/ArticleList.tsx:646` clickable row `<div>`
  - `client/components/dashboard/views/CampaignDetailView.tsx:614` clickable table row `<tr>`
- UX impact: keyboard users and assistive tech users get inconsistent behavior.
- Fix: convert to semantic buttons/links or add full keyboard handlers + roles.

7. Modal accessibility pattern is incomplete across core flow.

- Evidence:
  - `client/components/projects/ProjectOnboarding.tsx:89`
  - `client/components/dashboard/views/NewCampaignModal.tsx:158`
  - `client/components/articles/QuickGenerateModal.tsx:268`
  - `client/components/dashboard/views/CampaignDetailView.tsx:679`
- UX impact: focus can escape modal; screen reader context is unclear.
- Fix: standard modal primitive with `role="dialog"`, `aria-modal="true"`, focus trap, escape-to-close, initial focus.

8. Icon-only controls missing clear labels in core header/actions.

- Evidence:
  - `client/components/dashboard/DashboardLayout.tsx:72` (notifications bell)
  - `client/components/dashboard/DashboardLayout.tsx:79` (user menu trigger)
  - `client/components/dashboard/views/CampaignsView.tsx:176` (more actions)
  - `client/components/articles/QuickGenerateModal.tsx:278` (close)
- UX impact: poor screen-reader clarity and lower confidence in control purpose.
- Fix: add `aria-label` consistently.

9. Campaign detail status filtering is hidden behind a cycling button.

- Evidence:
  - `client/components/dashboard/views/CampaignDetailView.tsx:233`
  - `client/components/dashboard/views/CampaignDetailView.tsx:587`
- UX impact: low discoverability; users can miss available statuses.
- Fix: replace with explicit select/dropdown of statuses.

10. Settings modal save CTA label is misleading.

- Evidence:
  - `client/components/dashboard/views/CampaignDetailView.tsx:869` uses onboarding "Next Step" copy.
- UX impact: action meaning is unclear at final commit step.
- Fix: use explicit copy like “Save Changes”.

11. Success state in quick generate auto-closes quickly.

- Evidence:
  - `client/components/articles/QuickGenerateModal.tsx:124`
- UX impact: users may lose context before confirming generated output.
- Fix: keep modal open until user closes, or use longer delay + "View Article" CTA.

12. Async feedback channel is not announced to assistive tech.

- Evidence:
  - `client/components/common/Toast.tsx:38`
- UX impact: toast confirmations/errors can be missed by screen-reader users.
- Fix: add `aria-live="polite"` and better semantic dismiss controls.

### P2 - Low Impact / Polish

13. Date formatting is not locale-aware in key list rows.

- Evidence:
  - `client/components/articles/ArticleList.tsx:761` hardcoded `en-US`
- UX impact: inconsistent localization for non-US users.
- Fix: use runtime locale via `Intl.DateTimeFormat`.

14. NotFound dashboard state gives no recovery path.

- Evidence:
  - `client/components/dashboard/DashboardRouter.tsx:16`
- UX impact: users hit a dead-end with no next step.
- Fix: add CTA back to Overview and context text.

## What Is Already Working Well

- Flow gating is explicit in articles page (`no project` and `no campaigns` states):
  - `client/components/pages/ArticlesPageClient.tsx:35`
  - `client/components/pages/ArticlesPageClient.tsx:57`
- Filters persist in URL for article lists (good for shareability/back-forward):
  - `client/components/articles/ArticleList.tsx:114`
  - `client/components/articles/ArticleList.tsx:126`
- Centralized route config exists and is a good base for consistency:
  - `client/config/dashboardRoutes.ts:92`

## Recommended Implementation Order

1. Fix broken/incorrect CTAs and route dead ends (Findings 1, 2).
2. Add project-context guard for campaign creation (Finding 5).
3. Add campaign delete confirmation/undo (Finding 4).
4. Stop forced reopening of onboarding modal (Finding 3).
5. Unify modal accessibility and icon labeling in core flow (Findings 7, 8).
6. Improve clarity polish (Findings 9, 10, 11, 14).

## Fast Success Metrics

Track before/after for 2 weeks:

- Overview CTA click-through to productive destinations (%).
- Campaign creation success rate from first attempt (%).
- Campaign delete reversal/support incidents (#).
- Time from first dashboard visit to first campaign created.
- Article generation completion rate from modal opens (%).
