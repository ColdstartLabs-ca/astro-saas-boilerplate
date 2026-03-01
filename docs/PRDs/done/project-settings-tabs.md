# PRD: Project Settings with Tab Layout

**Complexity: 3 → LOW mode**

---

## 1. Context

**Problem:** After onboarding, users cannot edit their article generation preferences (article style, internal links, brand color, image style, global instructions). The only way to change these is to create a new project.

**Files Analyzed:**

- `client/components/pages/SettingsPageClient.tsx` — current Settings page (no tabs, account-only)
- `client/components/dashboard/views/SettingsView.tsx` — unused mockup with InternalTabs
- `client/components/onboarding/steps/ContentPreferencesSection.tsx` — reusable form for content preferences
- `client/components/dashboard/ui/InternalTabs.tsx` — existing tab component
- `client/hooks/useProjects.ts` — active project + `updateProject()` mutation
- `client/store/projectStore.ts` — active project ID store
- `shared/types/project.types.ts` — `IContentPreferences`, `IProject`, `IUpdateProjectInput`
- `shared/validation/onboarding.schema.ts` — language/country options
- `src/pages/api/projects/[projectId]/index.ts` — PUT/PATCH already supports `content_preferences`
- `client/config/dashboardRoutes.ts` — Settings route already registered at `/dashboard/settings`

**Current Behavior:**

- Settings page (`SettingsPageClient.tsx`) shows: Profile (read-only), Security (password change), Notifications (email toggles)
- No tabs — flat card layout
- Content preferences are set during onboarding Step 4 (`ContentPreferencesSection`) and stored in `projects.content_preferences` JSONB
- Project-level fields (language, country, sitemap_url, blog_url) set during onboarding Step 1 are also not editable
- The `PATCH /api/projects/:projectId` endpoint already accepts all these fields

---

## 2. Solution

**Approach:**

- Restructure `SettingsPageClient.tsx` to use `InternalTabs` with two tabs: **"Articles"** (first/default) and **"Account"** (existing content)
- The "Articles" tab is **project-scoped** — it shows/edits the active project's content preferences using the existing `ContentPreferencesSection` component
- Also include project-level fields that affect article generation: **language** and **country** (from Step 1)
- Save via `useProjects().updateProject()` which calls `PUT /api/projects/:projectId`
- The "Account" tab preserves the current Profile, Security, and Notifications sections
- Show a "no project selected" empty state if no active project exists

**Key Decisions:**

- [x] Reuse `ContentPreferencesSection` — already has all fields, validation, and form logic
- [x] Reuse `InternalTabs` — already used in `SettingsView.tsx` mockup
- [x] Reuse `useProjects()` hook — provides `activeProject`, `updateProject()`
- [x] No new API endpoints needed — `PUT /api/projects/:projectId` already handles `content_preferences`
- [x] No database changes needed — all fields already exist
- [x] Language/country fields use `LANGUAGE_OPTIONS` and `COUNTRY_OPTIONS` from `shared/validation/onboarding.schema.ts`

**Integration Points Checklist:**

- [x] Entry point: `/dashboard/settings` route (already registered in `dashboardRoutes.ts`)
- [x] Caller: `DashboardRouter` renders `SettingsPageClient` (unchanged)
- [x] No new wiring needed — modifying the existing component in-place
- [x] User-facing: YES — `SettingsPageClient.tsx` gets tab layout
- [x] Full user flow:
  1. User clicks "Settings" in sidebar
  2. Settings page loads with "Articles" tab active by default
  3. Form shows active project's content preferences + language/country
  4. User edits fields → clicks "Save Changes" → `PUT /api/projects/:projectId`
  5. Toast confirms success, React Query cache invalidated

---

## 3. Execution Phases

### Phase 1: Add Tab Layout + Articles Tab to Settings Page

**User-visible outcome:** Settings page has two tabs — "Articles" (default, showing active project's content preferences) and "Account" (existing content).

**Files (4):**

- `client/components/pages/SettingsPageClient.tsx` — restructure with InternalTabs, extract existing content into Account tab, add Articles tab
- `client/components/settings/ArticleSettingsTab.tsx` — **NEW** — Articles tab content: wraps `ContentPreferencesSection` with project language/country selectors and a Save button
- `shared/validation/project-settings.schema.ts` — **NEW** — Zod schema for article settings form (content preferences + language + country)
- `src/i18n/en/dashboard.json` — add i18n keys for tab labels and settings copy (if needed, check existing keys first)

**Implementation:**

- [ ] Create `ArticleSettingsTab` component:
  - Accepts no props — internally uses `useProjects()` to get `activeProject` and `updateProject`
  - Shows empty state with `FolderPlus` icon if no active project
  - Renders a form with:
    - **Project context header**: shows active project name + domain (read-only, for clarity)
    - **Language** dropdown (reuse `LANGUAGE_OPTIONS` from `onboarding.schema.ts`)
    - **Country** dropdown (reuse `COUNTRY_OPTIONS` from `onboarding.schema.ts`)
    - **Content Preferences**: embed `ContentPreferencesSection` component with `value={activeProject.content_preferences}` and `onChange` handler
  - "Save Changes" button calls `updateProject(activeProject.id, { language, country, content_preferences })`
  - Uses `react-hook-form` + zod for the language/country fields (ContentPreferencesSection has its own internal form)
  - Shows loading state while saving, success toast on save

- [ ] Restructure `SettingsPageClient.tsx`:
  - Add `InternalTabs` with two tabs:
    - `{ id: 'articles', label: 'Articles', icon: <FileText /> }`
    - `{ id: 'account', label: 'Account', icon: <UserCircle /> }`
  - Default active tab: `'articles'`
  - Conditionally render `<ArticleSettingsTab />` or existing account content based on active tab
  - Move existing Profile/Security/Notifications cards into a `<div>` rendered when `activeTab === 'account'`

- [ ] Create `project-settings.schema.ts`:
  - Zod schema for language (enum from `LANGUAGES`) and country (enum from `COUNTRIES`)
  - Used by `ArticleSettingsTab` for the language/country form fields

**Tests Required:**

| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| `tests/e2e/settings.e2e.spec.ts` | `should show Articles tab by default` | Tab "Articles" is visible and active |
| `tests/e2e/settings.e2e.spec.ts` | `should switch between Articles and Account tabs` | Clicking "Account" shows profile/notifications |
| `tests/e2e/settings.e2e.spec.ts` | `should show empty state when no project selected` | Empty state message visible |
| `tests/e2e/settings.e2e.spec.ts` | `should display current project content preferences` | Form fields populated with project data |

**Verification Plan:**

1. **Unit Tests:**
   - File: `tests/e2e/settings.e2e.spec.ts`
   - Tests: tab switching, empty state, form population

2. **Manual Verification:**
   - Navigate to `/dashboard/settings`
   - Verify "Articles" tab is active by default
   - Verify form shows active project's content preferences
   - Switch to "Account" tab — verify Profile, Security, Notifications still work
   - Edit article style → click Save → refresh → verify change persisted

3. **Evidence Required:**
   - [ ] All tests pass (`yarn test`)
   - [ ] `yarn verify` passes
   - [ ] Settings page renders with tabs
   - [ ] Content preferences save and persist

---

## 4. Acceptance Criteria

- [ ] Settings page has "Articles" and "Account" tabs using `InternalTabs`
- [ ] "Articles" tab is the default/first tab
- [ ] "Articles" tab shows active project's content preferences (article style, internal links, brand color, image style, global instructions)
- [ ] "Articles" tab also shows language and country dropdowns
- [ ] Changes save via `PUT /api/projects/:projectId` with success feedback
- [ ] "Account" tab preserves all existing functionality (Profile, Security, Notifications)
- [ ] Empty state shown when no project is active
- [ ] `yarn verify` passes
- [ ] No new API endpoints or database migrations needed

---

## 5. Out of Scope

- Editing project name, domain, industry, description (future "General" tab)
- Editing sitemap_url, blog_url (future "SEO" or "Crawling" tab)
- CMS/integration settings (already has dedicated Integrations page)
- The aspirational `SettingsView.tsx` mockup (5-tab version) — that's a future evolution
- API keys and RSS feed settings — can be added as future tabs
