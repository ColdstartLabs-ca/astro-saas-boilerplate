# E2E Suite Prune Candidates

## Why prune?
- The core E2E fixtures (`tests/test-fixtures.ts`) already mock the application, so many Playwright cases are reduced to copy/meta detection or always-passing assertions.
- Removing low-value tests keeps `playwright test` focused on genuinely behavioral flows, improves reliability, and shortens CI time while existing unit/integration tests cover the same logic.

## Tests safe to remove
1. `tests/e2e/billing-flow.e2e.spec.ts` → unconditional assertions (`|| true`) and body-content checks give no actionable coverage.
2. `tests/e2e/mobile-responsive.e2e.spec.ts` → layout checks that only verify `faqCount >= 0` and other tautologies.
3. `tests/e2e/admin.e2e.spec.ts` → table/list visibility tests boil down to `>= 0` counts or repeated navigation/wait timeouts with no state verification.
4. `tests/e2e/campaigns.e2e.spec.ts` → schedule actions and keyword modifications lack success assertions beyond “button exists” or `wait(1000)`; mocks already exercise these via API/unit coverage.
5. `tests/e2e/integrations.e2e.spec.ts` → delete/action flows finish without verifying outcome and include skipped tests; navigation-only assertions add little value.
6. `tests/e2e/checkout-lifecycle.e2e.spec.ts` → admits real behavior cannot be reached and relies on optional visibility checks for success/cancel states.
7. `tests/e2e/critical-path.e2e.spec.ts` → no specific assertions on campaign/article lifecycle steps; mostly checks that the mocked UI renders without errors.
8. `tests/e2e/landing.e2e.spec.ts`, `tests/e2e/features.e2e.spec.ts`, `tests/e2e/blog.e2e.spec.ts`, `tests/e2e/auth/localized.spec.ts`, and `tests/e2e/dashboard/localized.spec.ts` → all validate static copy/meta/heading presence and are better maintained via unit/component tests or manual review.
9. Select onboarding specs (`tests/e2e/onboarding.e2e.spec.ts` lines ~318–815) → the same validations are already covered by the onboarding component/unit tests; the Playwright tests only reassert DOM visibility without hitting real APIs.

## Suggested next steps
1. Remove/disable the flagged tests from the Playwright suite and rely on fast component/unit coverage for copy/validator logic.
2. After pruning, re-run `yarn test:e2e` to confirm the suite still exercises the remaining critical flows.
