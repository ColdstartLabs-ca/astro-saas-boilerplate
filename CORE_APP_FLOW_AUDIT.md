# Core App Flow Audit: Integration Delivery Glue

**Date:** February 17, 2026  
**Scope:** onboarding -> campaign assignment -> article generation -> auto-delivery -> integration adapters -> delivery tracking APIs

## Executive Summary

This audit found and fixed multiple production-impacting glue issues that could prevent articles from reaching connected integrations or cause inconsistent delivery state.

Current status after remediation: **production-ready with low residual risk**.

## Critical Findings Fixed

1. **Onboarding integration was not attached to the onboarding campaign**
- Impact: users could connect an integration but still not auto-publish generated articles.
- Fix: onboarding now persists `campaignId` at keyword step and auto-assigns the new integration to that campaign with `autoPublish: true`.
- Evidence: `client/components/onboarding/steps/OnboardingStepKeywords.tsx:59`, `client/components/onboarding/steps/OnboardingStepKeywords.tsx:91`, `client/store/onboardingStore.ts:31`, `client/components/onboarding/steps/OnboardingStepIntegrations.tsx:359`.

2. **Integration create/update APIs were incomplete for declared integration types**
- Impact: non-WordPress/webhook integrations could fail validation or be impossible to update credentials.
- Fix: added full create schemas and credential update fields for all supported types.
- Evidence: `src/pages/api/integrations/index.ts:112`, `src/pages/api/integrations/[integrationId]/index.ts:22`.

3. **Integration service had partial type support and wrong adapter selection in connection tests**
- Impact: incorrect adapter behavior and broken connection tests for non-WordPress integrations.
- Fix: generalized create payload building, credential merge logic, and adapter selection by `integration.type`.
- Evidence: `server/services/integration.service.ts:131`, `server/services/integration.service.ts:229`, `server/services/integration.service.ts:475`.

4. **Delivery retry attempt count logic could be wrong**
- Impact: retry telemetry/backoff state could drift, making failure handling unreliable.
- Fix: deterministic retry increment using latest failed delivery record.
- Evidence: `server/services/delivery.service.ts:170`, `server/services/delivery.service.ts:184`, `server/services/delivery.service.ts:216`.

5. **Delivery records could get stuck in `delivering` on thrown exceptions**
- Impact: operational confusion, bad retry UX, incorrect status dashboards.
- Fix: catch path now marks delivery as `failed` with explicit error and appends failed record.
- Evidence: `server/services/delivery.service.ts:297`, `server/services/delivery.service.ts:305`.

6. **`article.published` webhook event fired once per successful integration**
- Impact: duplicate downstream automations (Zapier/Make/webhooks) for a single article publish operation.
- Fix: event now fires once per delivery operation when at least one integration succeeds.
- Evidence: `server/services/delivery.service.ts:329`.

7. **Delivery status API had ownership-check ordering and relation alias mismatch issues**
- Impact: possible access-control ambiguity and inconsistent response shape.
- Fix: ownership validated before delivery query; relation aliased consistently as `integration`.
- Evidence: `server/services/delivery.service.ts:357`, `server/services/delivery.service.ts:384`, `src/pages/api/campaigns/[campaignId]/integrations.ts:93`, `src/pages/api/campaigns/[campaignId]/integrations.ts:119`.

## Additional Correctness Improvements

1. **Article payload now includes `project_id` for webhook event data consistency**
- Evidence: `server/services/delivery.service.ts:71`, `server/services/delivery.service.ts:445`.

2. **Integration ID deduplication before delivery fan-out**
- Evidence: `server/services/delivery.service.ts:126`.

3. **Type contract updated for Wix credential updates**
- Evidence: `shared/types/integration.types.ts:355`.

## Residual Risk Mitigations Completed

1. **Active-only delivery gating implemented**
- Fix: delivery now fetches only `integrations.status = 'active'`, preventing publish attempts to disabled/error integrations.
- Evidence: `server/services/delivery.service.ts:139`.
- Regression coverage: `server/services/__tests__/delivery.service.test.ts:265`.

2. **Onboarding create+assign is now server-side and compensating**
- Fix: `POST /api/integrations` accepts optional `campaignId`/`autoPublish` metadata, performs assignment server-side, and rolls back integration creation if assignment fails.
- Evidence: `src/pages/api/integrations/index.ts:129`, `server/services/integration.service.ts:696`.
- Frontend glue now calls this single path during onboarding: `client/components/onboarding/steps/OnboardingStepIntegrations.tsx:357`.
- Regression coverage: `tests/unit/api/integrations.unit.spec.ts:240`, `tests/unit/components/onboarding/OnboardingStepIntegrations.unit.spec.tsx:290`.

3. **Cross-boundary auto-publish flow regression test added**
- Fix: added a full service-level flow test covering `generate -> shouldAutoDeliver -> deliverArticle -> integration_deliveries`.
- Evidence: `tests/unit/integrations/auto-publish-flow.unit.spec.ts:1`.

## Verification Performed

1. `yarn tsc` passed.
2. `yarn test:unit` passed.
3. Final suite result: **133 test files passed, 1 skipped; 2673 tests passed, 14 skipped**.
4. Added regression coverage for onboarding campaign assignment glue:
- `tests/unit/components/onboarding/OnboardingStepIntegrations.unit.spec.tsx:290`.
5. Added cross-boundary auto-publish flow coverage:
- `tests/unit/integrations/auto-publish-flow.unit.spec.ts:1`.

## Files Changed During Remediation

1. `client/components/onboarding/steps/OnboardingStepIntegrations.tsx`
2. `client/components/onboarding/steps/OnboardingStepKeywords.tsx`
3. `client/store/onboardingStore.ts`
4. `server/services/delivery.service.ts`
5. `server/services/integration.service.ts`
6. `shared/types/integration.types.ts`
7. `src/pages/api/campaigns/[campaignId]/integrations.ts`
8. `src/pages/api/integrations/[integrationId]/index.ts`
9. `src/pages/api/integrations/index.ts`
10. `tests/unit/components/onboarding/OnboardingStepIntegrations.unit.spec.tsx`
11. `tests/unit/components/onboarding/OnboardingStepKeywords.unit.spec.tsx`
12. `tests/unit/integrations/delivery.service.unit.spec.ts`
13. `tests/unit/api/integrations.unit.spec.ts`
14. `server/services/__tests__/delivery.service.test.ts`
15. `tests/unit/integrations/auto-publish-flow.unit.spec.ts`
