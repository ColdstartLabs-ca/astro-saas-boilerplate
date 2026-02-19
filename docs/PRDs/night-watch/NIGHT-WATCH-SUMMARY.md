# Night Watch Summary

## E2E Articles Skip-On-Onboarding Pattern

- **PRD**: e2e-articles-skip-onboarding.md
- **Branch**: night-watch/e2e-articles-skip-onboarding
- **PR**: https://github.com/ColdstartLabs-ca/autopilotrank.com/pull/17
- **Date**: 2026-02-19
- **Status**: PR Opened

### What was done

- Added `waitForPageReady()` helper function to detect onboarding redirect
- Applied skip-on-onboarding pattern to all 35 tests in `articles.e2e.spec.ts`
- Tests now gracefully skip when auth mock doesn't work with `@supabase/ssr` 0.7.0
- Pattern matches reference implementation in `campaigns.e2e.spec.ts`

### Files changed

- `tests/e2e/articles.e2e.spec.ts`

---
