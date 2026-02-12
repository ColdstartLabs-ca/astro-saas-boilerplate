# PR Review Report

Date: 2026-02-12
Branch: `feature/integrations`
Scope reviewed: `integrations`, `scheduling`, `opportunities` (plus related GSC OAuth and cron paths)

## Production Readiness

**Decision: NO-GO (not ready for prod yet).**

## Findings (ordered by severity)

### 1) High - OAuth `state` is not cryptographically protected
- `server/services/gsc.service.ts:85` builds `state` as plain `"${userId}:${projectId}"`.
- `src/pages/api/gsc/callback.ts:31` trusts this plain value after string split.
- Risk: callback trust is based on predictable IDs, not a signed nonce/session-bound token. This weakens OAuth CSRF protection.

### 2) High - Scheduled pause can be overridden by in-flight batch completion
- `server/services/campaign.service.ts:1023` allows pausing while campaign is `active`.
- `server/services/campaign.service.ts:1323` always sets campaign back to `scheduled` at end of `processScheduledBatch`.
- Risk: if user pauses during an active batch, final write can overwrite pause and re-enable schedule.

### 3) High - Non-scheduled pause/resume path is broken in UI contract
- `client/components/dashboard/views/CampaignDetailView.tsx:121` still calls `updateCampaign({ status: ... })`.
- `shared/validation/campaign.schema.ts:67` no longer includes `status` in update schema.
- Risk: pause/resume for non-scheduled campaigns can silently no-op or fail; legacy pause flow is no longer aligned with API.

### 4) Medium - Schedule cannot be newly enabled from campaign settings modal
- `client/components/dashboard/views/campaign-detail/CampaignSettingsModal.tsx:341` renders schedule controls only when `settings.scheduleFrequency` is already set.
- For campaigns with no existing schedule, toggling "Enable Schedule" does not expose frequency controls.
- Risk: users cannot configure scheduling post-creation via settings UI.

### 5) Medium - Timezone input accepts arbitrary strings and can crash schedule calculations
- `shared/validation/campaign.schema.ts:60` / `shared/validation/campaign.schema.ts:81` accept any string for timezone.
- `shared/config/scheduling.config.ts:137` uses `Intl.DateTimeFormat(... { timeZone })`, which throws on invalid IANA timezone.
- Confirmed with runtime check: invalid timezone throws `RangeError`.
- Risk: malformed API input yields 500 instead of validation error.

### 6) Medium - Cron worker manual trigger is unauthenticated
- `workers/cron/index.ts:118` exposes `POST /trigger?pattern=...` with no auth gate.
- Risk: if worker endpoint is publicly reachable, third parties can trigger internal cron jobs/costly operations.

## Test evidence

Targeted run executed:
- `yarn vitest run tests/unit/api/integrations.unit.spec.ts tests/unit/hooks/useIntegrations.unit.spec.ts tests/unit/client/hooks/useOpportunities.unit.spec.ts tests/unit/server/services/opportunity-analysis.service.unit.spec.ts tests/unit/shared/config/scheduling.config.unit.spec.ts server/services/__tests__/campaign-schedule.service.test.ts server/services/__tests__/gsc.service.test.ts tests/unit/components/CampaignDetailView.unit.spec.tsx`

Result:
- 7 failing tests across 2 files
- Failing files:
  - `server/services/__tests__/gsc.service.test.ts` (OAuth state expectation mismatch)
  - `tests/unit/components/CampaignDetailView.unit.spec.tsx` (start-generation flow assertions)

## What is good

- Ownership checks for project/integration link operations are in place.
- GSC sites endpoint now exists and enforces ownership.
- Scheduling core config/timezone math tests mostly pass.
- Integration credential redaction is improved for webhook config responses.

## Must-fix before prod

1. Implement signed/stateful OAuth `state` verification (nonce + signature/session binding).
2. Make pause idempotent against in-flight scheduled batches (do not force back to `scheduled` after user pause).
3. Reconcile non-scheduled pause/resume UX/API flow (use dedicated endpoints or restore supported status transition path).
4. Fix schedule-enable modal logic for campaigns without existing schedule.
5. Validate timezone against IANA list (or safe parser) and return 400 on invalid timezone.
6. Protect or disable worker `/trigger` in production.
7. Get targeted tests green for changed behavior.
