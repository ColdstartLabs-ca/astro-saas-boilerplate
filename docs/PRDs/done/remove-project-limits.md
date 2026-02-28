# PRD: Remove Project Limits — Unlimited Projects for All Tiers

**Complexity: 3 → LOW mode** (config changes + test updates + docs, no new systems)

## 1. Context

**Problem:** Project limits (Free/Starter=1, Growth=3) are an artificial restriction that contradicts our credit-based pricing differentiator. Competitors gate on content volume, not project count. Removing limits strengthens the backlink exchange network (more domains = better niche matching) and aligns with our "pay for content, not for counting" value proposition.

**Files Analyzed:**

- `shared/config/subscription.config.ts` — single source of truth for `maxProjects` per tier
- `shared/config/subscription.types.ts` — `IPlanConfig.maxProjects` type definition
- `server/services/project.service.ts` — `getMaxProjectsForTier()` + enforcement in `create()`
- `shared/types/project.types.ts` — `ProjectLimitError` class + `IProjectLimits` interface
- `src/pages/api/_utils.ts` — error handler mapping for `ProjectLimitError`
- `locales/en/homepage.json` + `locales/pt-BR/homepage.json` — pricing "sites" display
- `locales/en/dashboard.json` + `locales/pt-BR/dashboard.json` — `limitExceeded` error message
- `tests/api/projects-campaigns.api.spec.ts` — API tests for project limits by tier
- `server/services/__tests__/project.service.test.ts` — unit test for ProjectLimitError
- `docs/` — 7+ docs referencing project limits

**Current Behavior:**

- Free/Starter users limited to 1 project, Growth to 3, Agency unlimited
- `ProjectService.create()` throws `ProjectLimitError` (403 FORBIDDEN) when limit exceeded
- Homepage pricing shows "1 site" / "3 sites" / "Unlimited sites" per tier
- Feature lists in config include "1 WordPress site" / "3 CMS sites" / "Unlimited CMS sites"

## 2. Solution

**Approach:**

- Set `maxProjects: null` (unlimited) for ALL tiers in `subscription.config.ts`
- Remove the limit enforcement logic from `ProjectService.create()`
- Remove `ProjectLimitError` class, `IProjectLimits` interface, and error handler mapping
- Remove `getMaxProjectsForTier()` helper function
- Update feature lists: replace "X CMS sites" with "Unlimited projects" across all tiers
- Update locale files to remove site count from pricing display
- Update tests to verify unlimited projects for all tiers
- Update all documentation referencing project limits

**Key Decisions:**

- **Keep `maxProjects` field** in `IPlanConfig` type (set all to `null`) — avoids breaking the type system, allows re-enabling limits in the future if needed
- **Remove enforcement code** entirely from `ProjectService` — dead code is worse than no code
- **Remove `ProjectLimitError`** and error handler — no longer needed
- **Keep `limitExceeded` locale key** but update message — defensive, in case any UI references it
- **Update feature lists** to emphasize credits/batch limits instead of site counts

**Integration Points:**

```
How will this feature be reached?
- [x] Entry point: POST /api/projects (already exists)
- [x] Caller: ProjectService.create() (removing limit check)
- [x] No new wiring needed — this is a removal, not addition

Is this user-facing?
- [x] YES — users will no longer see project limit errors
- [x] Pricing page "sites" text changes
- [x] Feature lists in config change

Full user flow:
1. User creates a project via dashboard → POST /api/projects
2. ProjectService.create() no longer checks limits → always proceeds
3. Project created successfully regardless of tier
4. Pricing page shows "Unlimited projects" for all tiers
```

## 3. Execution Phases

### Phase 1: Config + Backend — Remove project limits

**Files:**

- `shared/config/subscription.config.ts` — set all `maxProjects` to `null`, update feature lists
- `server/services/project.service.ts` — remove `getMaxProjectsForTier()` and limit check in `create()`
- `shared/types/project.types.ts` — remove `ProjectLimitError` class and `IProjectLimits` interface
- `src/pages/api/_utils.ts` — remove `ProjectLimitError` case from error handler

**Implementation:**

- [ ] `subscription.config.ts`: Change lines 54, 94, 135 from `maxProjects: 1` / `maxProjects: 3` to `maxProjects: null`
- [ ] `subscription.config.ts`: Update comments on those lines to "All tiers: unlimited projects"
- [ ] `subscription.config.ts`: Update feature arrays:
  - Free features: no change needed (doesn't mention projects)
  - Starter features (line 85): `'1 WordPress site'` → `'Unlimited projects'`
  - Growth features (line 125): `'3 CMS sites'` → `'Unlimited projects'`
  - Agency features (line 164): `'Unlimited CMS sites'` → `'Unlimited projects'` (consistent wording)
- [ ] `project.service.ts`: Remove `getMaxProjectsForTier()` function (lines 114-127)
- [ ] `project.service.ts`: Remove limit check block from `create()` (lines 181-196: count check, profile fetch, maxProjects check, throw). Keep the `// Validate input` and `// Create project` sections.
- [ ] `project.types.ts`: Remove `IProjectLimits` interface (lines 142-147)
- [ ] `project.types.ts`: Remove `ProjectLimitError` class (lines 152-171)
- [ ] `_utils.ts`: Remove `case 'ProjectLimitError':` and its `return errorResponse(...)` line (lines 257-258)

**Tests Required:**

| Test File                                           | Test Name                                                    | Assertion             |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------- |
| `server/services/__tests__/project.service.test.ts` | Remove `should throw ProjectLimitError` test (lines 170-199) | Test no longer needed |

**Verification:**

- `yarn test` passes (unit tests)
- `yarn verify` passes

---

### Phase 2: Locales — Update pricing and error messages

**Files:**

- `locales/en/homepage.json` — update "sites" values
- `locales/pt-BR/homepage.json` — update "sites" values
- `locales/en/dashboard.json` — update `limitExceeded` message
- `locales/pt-BR/dashboard.json` — update `limitExceeded` message

**Implementation:**

- [ ] `locales/en/homepage.json`:
  - Line 172 (starter): `"sites": "1 site"` → `"sites": "Unlimited projects"`
  - Line 183 (growth): `"sites": "3 sites"` → `"sites": "Unlimited projects"`
  - Line 193 (agency): `"sites": "Unlimited sites"` → `"sites": "Unlimited projects"` (consistent)
- [ ] `locales/pt-BR/homepage.json`:
  - Line 172 (starter): `"sites": "1 site"` → `"sites": "Projetos ilimitados"`
  - Line 183 (growth): `"sites": "3 sites"` → `"sites": "Projetos ilimitados"`
  - Line 193 (agency): `"sites": "Sites ilimitados"` → `"sites": "Projetos ilimitados"` (consistent)
- [ ] `locales/en/dashboard.json` line 310: Update `limitExceeded` to a generic fallback message (defensive): `"limitExceeded": "Unable to create project. Please try again or contact support."`
- [ ] `locales/pt-BR/dashboard.json` line 309: Update to `"limitExceeded": "Não foi possível criar o projeto. Tente novamente ou entre em contato com o suporte."`

**Tests Required:**

| Test File | Test Name                       | Assertion           |
| --------- | ------------------------------- | ------------------- |
| N/A       | Locale changes are display-only | Visual verification |

**Verification:**

- `yarn verify` passes (no broken imports/types)

---

### Phase 3: API Tests — Update project limit tests to verify unlimited

**Files:**

- `tests/api/projects-campaigns.api.spec.ts` — rewrite "Project Limits by Subscription Tier" test suite

**Implementation:**

- [ ] Replace the entire `API: Project Limits by Subscription Tier (§3.1)` test.describe block (lines 167-338) with a simplified test suite:
  - Test: "should allow free tier to create multiple projects" — create 3 projects, verify all succeed
  - Test: "should allow starter tier to create multiple projects" — create 3 projects, verify all succeed
  - Test: "should allow growth tier to create multiple projects" — create 5 projects, verify all succeed
  - Test: "should allow agency tier to create many projects" — create 10 projects (keep existing test)
- [ ] Update the test.describe title/comments to reflect "All tiers: unlimited projects"

**Tests Required:**

| Test File                                  | Test Name                                               | Assertion                    |
| ------------------------------------------ | ------------------------------------------------------- | ---------------------------- |
| `tests/api/projects-campaigns.api.spec.ts` | `should allow free tier to create multiple projects`    | 3 projects created, all 201  |
| `tests/api/projects-campaigns.api.spec.ts` | `should allow starter tier to create multiple projects` | 3 projects created, all 201  |
| `tests/api/projects-campaigns.api.spec.ts` | `should allow growth tier to create multiple projects`  | 5 projects created, all 201  |
| `tests/api/projects-campaigns.api.spec.ts` | `should allow agency tier to create many projects`      | 10 projects created, all 201 |

**Verification:**

- `yarn test:api` passes (API tests)
- `yarn verify` passes

---

### Phase 4: Documentation — Update all references

**Files (docs only, no code):**

- `docs/management/ROADMAP.md` — update pricing table
- `docs/management/CORE-APP-FLOW-VALIDATION-CHECKLIST.md` — update project limit checklist items
- `docs/business/business-model-canvas/revenue-streams.md` — update pricing tables + tier descriptions
- `docs/business/landing-page.md` — update pricing cards
- `docs/business/business-model-canvas/value-proposition.md` — update upgrade path descriptions
- `docs/business/business-model-canvas/customer-relationships.md` — update upgrade triggers

**Implementation:**

- [ ] `ROADMAP.md`: Update pricing table — replace "1 WordPress site" / "3 CMS sites" / "unlimited sites" with "Unlimited projects" across all tiers. Update line 110 to remove "(Starter=1, Growth=3, Agency=unlimited)"
- [ ] `CORE-APP-FLOW-VALIDATION-CHECKLIST.md`: Update lines 75-77 — change to reflect unlimited projects for all tiers
- [ ] `revenue-streams.md`: Update pricing tables (lines 36-39), tier explanations (lines 87-90) — replace site limits with "Unlimited projects". Update "From Starter to Growth" upgrade messaging to focus on credits/features instead of site count.
- [ ] `landing-page.md`: Update pricing cards (lines 271-275) — replace "1 site" / "3 sites" / "Unlimited sites" with "Unlimited projects"
- [ ] `value-proposition.md`: If any upgrade path text references "3 CMS sites" as a Growth differentiator, update to focus on credits/features instead
- [ ] `customer-relationships.md`: Update upgrade triggers — remove "project limit hit" as expansion trigger, replace with credits/features

**Verification:**

- Review docs for consistency — no remaining "1 project" / "3 projects" / "1 site" / "3 sites" references in tier descriptions

## 4. Acceptance Criteria

- [ ] All tiers have `maxProjects: null` in subscription config
- [ ] `ProjectService.create()` no longer checks project limits
- [ ] `ProjectLimitError` class removed
- [ ] API tests verify unlimited projects for all tiers
- [ ] Unit tests updated (removed ProjectLimitError test)
- [ ] Locale files updated (en + pt-BR)
- [ ] All documentation updated consistently
- [ ] `yarn verify` passes
- [ ] No remaining references to project limit enforcement in code
