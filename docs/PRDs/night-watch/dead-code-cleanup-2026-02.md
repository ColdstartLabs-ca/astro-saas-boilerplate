# PRD: Dead Code Cleanup — February 2026

**Complexity: 2 → LOW mode**
**Status:** Ready
**Author:** Claude
**Date:** 2026-02-28
**Primary Goal:** Reduce bundle noise, eliminate confusion from empty/orphaned files
**Source:** `docs/reports/CODE-QUALITY-REPORT-2026-02-28.md` — Part 3

---

## 1. Context

**Problem:** 5 confirmed-dead files accumulate confusion and bundle noise. All are zero-risk deletes — no production callers, no test coverage dependent on them, no functional behaviour removed.

**Files Analyzed:**
- `server/supabase/supabaseUtils.ts` — generic CRUD helpers, no importers
- `server/services/failure-metrics.service.ts` — 429-line orphaned service, no API endpoint or component wires it
- `client/hooks/useLogout.ts` — empty file (0 bytes)
- `src/pages/api/protected/example/index.ts` — boilerplate route with TODO comments, never reached
- `src/pages/api/admin/cleanup-quick-generate-campaigns.ts` — one-time cleanup utility, never called

**Current Behavior:**
- `server/services/failure-metrics.service.ts` is 429 lines of dead service code. `AdminController` has a `/failure-metrics` route but it calls `adminStatsService.getFailureMetrics()`, NOT this service.
- `server/supabase/supabaseUtils.ts` exports `getItems`, `addItem`, `updateItem`, `deleteItem` — all superseded by direct Supabase client calls throughout the app.
- `client/hooks/useLogout.ts` is literally empty.
- The `example` route ships TODO comments to production.
- The cleanup route is a one-time migration utility that is complete.

**Integration Points Checklist:**
- Entry point: none (these are dead leaves, not entry points)
- Caller files: none (confirmed via grep)
- Registration/wiring: none needed — deletion only

---

## 2. Solution

**Approach:**
- Delete all 5 files
- Verify no remaining imports with `grep` after each deletion
- Run `yarn verify` to confirm TypeScript still passes
- No new code, no logic changes

**Architecture Diagram:** N/A — deletion only

**Key Decisions:**
- Do NOT delete `server/services/failure-metrics.service.ts` if a grep reveals any import added after this PRD was written — double-check first
- Do NOT touch `authStore.ts` or `profileStore.ts` — those are intentional backward-compat wrappers (not in scope)
- `server/utils/retry.ts` is NOT dead — it is used by `image-generation.service.ts` and `replicate.service.ts`

**Data Changes:** None

---

## 3. Execution Phases

### Phase 1: Delete Files + Verify

**Files (5 deletions):**
- `server/supabase/supabaseUtils.ts` — DELETE
- `server/services/failure-metrics.service.ts` — DELETE
- `client/hooks/useLogout.ts` — DELETE
- `src/pages/api/protected/example/index.ts` — DELETE
- `src/pages/api/admin/cleanup-quick-generate-campaigns.ts` — DELETE

**Implementation:**
- [ ] Before each deletion, `grep -rn "filename" --include="*.ts" --include="*.tsx"` to confirm zero callers (excluding the file itself and test files)
- [ ] Delete the file
- [ ] After all deletions, run `yarn verify`

**Tests Required:**

| Test File | Test Name | Assertion |
|-----------|-----------|-----------|
| Run `yarn verify` | TypeScript + ESLint | No errors after deletion |

**User Verification:**
- Action: Run `yarn verify`
- Expected: Passes with no new errors

---

## 4. Acceptance Criteria

- [ ] All 5 files deleted
- [ ] `grep -rn "supabaseUtils\|failure-metrics.service\|useLogout\|protected/example\|cleanup-quick-generate"` returns no production-code hits
- [ ] `yarn verify` passes
