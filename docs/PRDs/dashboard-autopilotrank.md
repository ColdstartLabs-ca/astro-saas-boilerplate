# PRD: AutopilotRank Dashboard Routes

**Status:** Stub PRD - Reference documentation for future implementation

---

## 1. Overview

This PRD documents the new dashboard views that need to be built for the AutopilotRank application. These views are based on the UI_TEMPLATE reference implementation and should be implemented in a separate PRD after the landing page is complete.

---

## 2. Dashboard Views

### 2.1 Overview (DashboardView)
**File Reference:** `UI_TEMPLATE/components/dashboard/OverviewView.tsx`

**Purpose:** Main dashboard showing campaign stats, recent articles, and credit usage.

**Components:**
- Campaign stats cards (active campaigns, articles published, credits remaining)
- Recent articles list with status indicators
- Credit usage chart
- Quick action buttons (New Campaign, Connect Website)

---

### 2.2 Campaigns (CampaignsView)
**File Reference:** `UI_TEMPLATE/components/dashboard/CampaignsView.tsx`

**Purpose:** Campaign CRUD, article queue, and status tracking.

**Components:**
- Campaign list with status (active, paused, completed)
- Article queue per campaign
- Create/Edit/Delete campaign actions
- Status indicators (generating, QA, published, failed)

---

### 2.3 Keywords (KeywordsView)
**File Reference:** `UI_TEMPLATE/components/dashboard/KeywordsView.tsx`

**Purpose:** Keyword research, volume/difficulty analysis, and opportunities.

**Components:**
- Keyword search and discovery
- Volume and difficulty metrics
- Opportunity scoring
- Add to campaign functionality
- GSC integration for keyword opportunities

---

### 2.4 Optimization (OptimizationView)
**File Reference:** `UI_TEMPLATE/components/dashboard/OptimizationView.tsx`

**Purpose:** SEO audit, content scoring, and humanizer status.

**Components:**
- Article quality audit interface
- SEO scoring (keywords, readability, links)
- Humanizer engine status
- Pre-publication QA checklist
- Approve/edit/reject actions

---

### 2.5 Calendar (CalendarView)
**File Reference:** `UI_TEMPLATE/components/dashboard/CalendarView.tsx`

**Purpose:** Editorial calendar and scheduled publications.

**Components:**
- Monthly calendar view
- Scheduled article indicators
- Drag-and-drop rescheduling
- Filter by status/campaign
- Bulk schedule actions

---

### 2.6 Backlinks (BacklinkExchangeView)
**File Reference:** `UI_TEMPLATE/components/dashboard/BacklinkExchangeView.tsx`

**Purpose:** Link exchange network (Post-MVP feature).

**Note:** This feature is marked as post-MVP and should be implemented separately after the core functionality is complete.

---

### 2.7 Settings (SettingsView)
**File Reference:** `UI_TEMPLATE/components/dashboard/SettingsView.tsx`

**Purpose:** WordPress connection, model preferences, and notification settings.

**Components:**
- Website connections (WordPress, Webflow, Shopify, Ghost)
- AI model selection and preferences
- Notification settings
- API key management
- Account/billing settings

---

### 2.8 Website Onboarding (WebsiteOnboarding)
**File Reference:** `UI_TEMPLATE/components/dashboard/WebsiteOnboarding.tsx`

**Purpose:** Connect first website flow for new users.

**Components:**
- Step-by-step onboarding wizard
- CMS selection
- API key entry
- Test connection
- First campaign creation prompt

---

### 2.9 New Campaign Modal (NewCampaignModal)
**File Reference:** `UI_TEMPLATE/components/dashboard/NewCampaignModal.tsx`

**Purpose:** Campaign creation wizard.

**Components:**
- Campaign name input
- Target website selection
- Keywords input (bulk add, GSC import)
- Article generation schedule
- Publishing mode (auto, review, draft)
- Model preferences

---

## 3. Navigation Structure

The dashboard sidebar should include the following navigation items:

1. **Dashboard** (OverviewView) - Default landing page
2. **Campaigns** (CampaignsView) - Manage campaigns
3. **Keywords** (KeywordsView) - Keyword research
4. **Optimization** (OptimizationView) - Content QA
5. **Calendar** (CalendarView) - Editorial calendar
6. **Analytics** (Placeholder) - Future implementation
7. **Backlinks** (BacklinkExchangeView) - Post-MVP feature
8. **Settings** (SettingsView) - Configuration

---

## 4. Implementation Notes

### Color Tokens
When implementing these views, replace all raw Tailwind colors from the UI_TEMPLATE with the project's theme tokens:

- `slate-950` → `bg-main`
- `slate-900` → `bg-elevated`
- `slate-800` → `bg-surface`
- `brand-500` → `accent`
- `slate-400` → `text-secondary`
- `slate-500` → `text-muted`

### Component Patterns
- Use existing UI components: `glass-card`, `gradient-cta`, `shine-effect`
- Follow the `FadeIn` pattern for section animations
- Use `getTranslations()` for all user-facing strings
- Maintain responsive design patterns (mobile-first)

### Data Fetching
- Use React Query for server state management
- Implement proper loading and error states
- Add optimistic updates for better UX

---

## 5. Out of Scope

This PRD is for reference only. Implementation requires:

1. Backend API endpoints for all dashboard data
2. Database schema for campaigns, articles, keywords
3. CMS integration logic (WordPress plugin, webhooks)
4. AI model integration (GPT-4, Claude, Gemini)
5. Humanizer engine implementation
6. GSC API integration

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-04 | Initial stub PRD created for dashboard routes reference |

---

XenonFlow Ticket: t-1770273123750-14edp11jg
Project: autopilotrank.com (p-1770273090951-89hy5c5o8)
Created: 2026-02-05
