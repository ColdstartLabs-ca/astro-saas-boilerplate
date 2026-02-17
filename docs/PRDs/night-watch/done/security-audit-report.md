# Security Audit Report - AutopilotRank

**Date:** 2026-02-14
**Auditor:** Claude Opus 4.6 (automated security review)
**Scope:** Full application codebase (Astro 5 + React 18 SaaS on Cloudflare Pages)
**Branch:** `night-watch/internal-blog-cms-v2`
**Severity Scale:** CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Executive Summary

This report covers a comprehensive security audit of the AutopilotRank SaaS application. The codebase demonstrates a **mature security posture** with evidence of prior security remediation work (migration `20260115000000_security_fixes.sql` addresses earlier findings). The application implements defense-in-depth across most areas: JWT-based authentication, RLS on all database tables, Zod input validation, CORS restrictions, rate limiting, encryption for stored credentials, and Stripe webhook signature verification.

However, several findings require attention, primarily around **secrets exposure in local configuration**, **unencrypted OAuth tokens stored in the database**, **CSP policy weaknesses**, and **potential IDOR vectors through blog admin endpoints that bypass middleware-level auth**. There are also patterns that, while safe today, carry risk if deployment configurations change.

**Summary by Severity:**

- CRITICAL: 1
- HIGH: 3
- MEDIUM: 6
- LOW: 4
- INFO: 4

---

## Findings

---

### SEC-01: Live API Keys and Secrets in `.env.api` (CRITICAL)

**Category:** Environment & Secrets
**Severity:** CRITICAL

**Description:**
The `.env.api` file contains **real, active API keys and secrets** for multiple services including Supabase service role key, Stripe secret key, OpenRouter API key, Replicate API key, OpenAI API key, and CMS encryption key. While this file is correctly listed in `.gitignore` and is NOT tracked by git, these are live production-grade credentials sitting on disk in plaintext.

**Impact:**
If the developer's machine is compromised, or if this file is accidentally shared, committed to a branch, or included in a backup, all integrated services would be exposed. The Supabase service role key bypasses all RLS policies. The Stripe secret key allows full payment manipulation. The OpenAI and OpenRouter keys allow unbounded API usage at the account holder's expense.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/.env.api`

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...[REDACTED]
STRIPE_SECRET_KEY=sk_test_51Sx...[REDACTED]
OPENROUTER_API_KEY=sk-or-v1-...[REDACTED]
REPLICATE_API_KEY=r8_...[REDACTED]
OPENAI_API_KEY=sk-proj-...[REDACTED]
CMS_ENCRYPTION_KEY=...[REDACTED]
```

**Recommendation:**

1. **Immediately rotate ALL exposed keys**, especially the Supabase service role key and Stripe secret key. Even though they are not committed to git, they have been read by automated tooling during this audit.
2. Consider using a secrets manager (e.g., 1Password CLI, `doppler`, or Cloudflare Workers Secrets) instead of plaintext `.env` files.
3. Add a pre-commit hook that scans for secret patterns (e.g., `detect-secrets`, `gitleaks`) to prevent accidental commits.
4. Ensure `.env.api` has restrictive file permissions (`chmod 600`).

---

### SEC-02: Google OAuth Tokens Stored Unencrypted in Database (HIGH)

**Category:** Supabase Security / Cryptographic Failures
**Severity:** HIGH

**Description:**
The `gsc_connections` table stores Google OAuth `access_token` and `refresh_token` as plaintext `TEXT` columns. While the CMS integration credentials are properly encrypted with AES-256-GCM (via `server/utils/encryption.ts`), the Google OAuth tokens receive no such protection.

**Impact:**
If the database is compromised (SQL injection, leaked service role key, Supabase admin breach), the attacker gains access to Google Search Console for all connected users. Refresh tokens are long-lived and grant persistent access. This is particularly concerning because these tokens provide access to a third-party service (Google), extending the blast radius beyond AutopilotRank itself.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/supabase/migrations/20260211000300_create_gsc_connections.sql`

```sql
access_token TEXT NOT NULL,
refresh_token TEXT NOT NULL,
```

File: `/home/joao/projects/autopilotrank.com/src/pages/api/gsc/callback.ts` (lines 78-92)

```typescript
const { error: insertError } = await supabaseAdmin.from('gsc_connections').upsert({
  ...
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token || '',
  ...
});
```

**Recommendation:**

1. Encrypt both `access_token` and `refresh_token` using the existing `encryptJSON`/`decryptJSON` utilities from `server/utils/encryption.ts` before storing, and decrypt on read.
2. Create a migration to encrypt existing plaintext tokens in place.
3. Consider storing tokens as a single encrypted blob (like the `integrations` table does with `encrypted_credentials`).

---

### SEC-03: CSP Policy Allows `unsafe-eval` and `unsafe-inline` (HIGH)

**Category:** Client-Side Security / Content Security Policy
**Severity:** HIGH

**Description:**
The Content Security Policy includes `'unsafe-inline'` and `'unsafe-eval'` in the `script-src` directive, and `'unsafe-inline'` in `style-src`. This significantly weakens XSS protection provided by CSP. An attacker who finds a DOM injection point can execute arbitrary inline scripts.

**Impact:**
CSP is effectively neutered as an XSS mitigation. While this may be necessary for some third-party scripts (Google Analytics, Stripe), it eliminates CSP's primary security benefit: preventing execution of injected inline scripts.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/shared/config/security.ts` (lines 14-19)

```typescript
'script-src': [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'wasm-unsafe-eval'",
  'blob:',
  ...
],
```

**Recommendation:**

1. Replace `'unsafe-inline'` with nonce-based CSP. Generate a random nonce per-request in middleware and pass it to script tags.
2. Replace `'unsafe-eval'` with `'wasm-unsafe-eval'` only (if WASM is needed). Many frameworks no longer require `unsafe-eval`.
3. Move third-party script hashes into the CSP or use `strict-dynamic` with nonces.
4. At minimum, add `'strict-dynamic'` alongside nonces to allow trusted script chains.

---

### SEC-04: Blog Admin API Routes Bypass Middleware Auth Layer (HIGH)

**Category:** API Security / Broken Access Control
**Severity:** HIGH

**Description:**
Blog admin API routes (`/api/admin/blog/*`) are NOT listed in `PUBLIC_API_ROUTES`, so they go through the middleware JWT verification. However, the `BlogController` does NOT use the `userId` from middleware `locals`. Instead, it performs its own independent admin verification via `requireAdmin(req)`. This means:

1. The middleware verifies a JWT and sets `userId` in locals.
2. The BlogController ignores the middleware-provided identity and re-verifies independently.
3. While this is functionally secure (double-checking), the controller's `requireAdmin` call re-parses the Authorization header independently.

More critically, the `BlogController.handle()` method is dispatched from `BaseController.execute()` which wraps it with `withErrorHandler`. The route handler passes `request` directly without forwarding `locals`. This means the blog controller operates entirely outside the middleware auth context.

**Impact:**
If the middleware auth verification and the controller's auth verification ever diverge (e.g., one is updated and the other is not), it could create an auth bypass. Additionally, the blog controller's error handler may expose internal error details (e.g., `err.message`) in 500 responses, which would not happen with the standard middleware error handling chain.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/src/pages/api/admin/blog/posts/index.ts`

```typescript
export const POST: APIRoute = async ({ request }) => {
  return controller.execute(request); // locals not forwarded
};
```

File: `/home/joao/projects/autopilotrank.com/server/controllers/BlogController.ts` (line 74)

```typescript
private async checkAdminAccess(req: Request): Promise<IAdminCheckResult> {
  return requireAdmin(req); // Independent auth check, ignores middleware context
}
```

**Recommendation:**

1. Forward `locals` from the Astro context to the controller: `controller.execute(request, { locals })`.
2. Use the `withAuth` wrapper pattern from `_utils.ts` for consistency with other API routes.
3. Remove internal error details from 500 error responses in the controller (lines 151-153, 187-189, etc. expose `err.message`).

---

### SEC-05: In-Memory Rate Limiting Ineffective on Cloudflare Edge (MEDIUM)

**Category:** Infrastructure / Rate Limiting
**Severity:** MEDIUM

**Description:**
The rate limiter uses in-memory `Map` storage with sliding window. Cloudflare Pages (Workers) run on distributed edge locations. Each edge location maintains its own memory space, meaning rate limits are NOT shared across locations. An attacker can bypass rate limits by distributing requests across multiple edge locations (which happens naturally via DNS routing).

**Impact:**
Rate limiting is effective only for single-origin attacks hitting the same edge location. An attacker distributing requests globally or using a VPN can effectively multiply their allowed request budget by the number of Cloudflare edge locations.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/server/rateLimit.ts` (lines 27-46)

```typescript
const rateLimitStore = new Map<string, IRateLimitEntry>();
// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => { ... }, 5 * 60 * 1000);
```

The code itself acknowledges this: _"Note: This works for single-instance deployments. For multi-instance deployments (e.g., Cloudflare with multiple edge locations), consider using Cloudflare KV or Durable Objects."_

**Recommendation:**

1. Use Cloudflare Rate Limiting rules (native WAF feature) for primary protection.
2. For application-level rate limiting, use Cloudflare KV or Durable Objects for shared state.
3. Keep the in-memory rate limiter as a secondary defense layer.

---

### SEC-06: HKDF Uses Empty Salt for CMS Encryption Key Derivation (MEDIUM)

**Category:** Cryptographic Failures
**Severity:** MEDIUM

**Description:**
The HKDF key derivation for CMS credential encryption uses an empty salt (`new Uint8Array()`). While HKDF is designed to work without a salt, using a salt provides additional defense-in-depth against certain attacks on the input keying material.

**Impact:**
Without a salt, all users of the same `CMS_ENCRYPTION_KEY` produce the same derived key. This is currently acceptable since there's a single instance, but it means the key derivation is fully deterministic and offers no protection against rainbow table attacks on the key material.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/server/utils/encryption.ts` (lines 72-79)

```typescript
const derivedKey = await crypto.subtle.deriveKey({
  name: 'HKDF',
  hash: 'SHA-256',
  salt: new Uint8Array(), // Empty salt for deterministic derivation
  info: new TextEncoder().encode('cms-encryption-key'),
}, ...);
```

**Recommendation:**

1. Use a random salt stored alongside the application configuration.
2. If deterministic derivation is required, use a fixed but non-empty salt value (e.g., derived from the application name or domain).

---

### SEC-07: Webhook Subscription Secrets Stored as Plaintext (MEDIUM)

**Category:** Supabase Security / Cryptographic Failures
**Severity:** MEDIUM

**Description:**
The `webhook_subscriptions` table stores webhook signing secrets as plaintext `TEXT` columns. These secrets are used for HMAC-SHA256 signature verification of outbound webhook payloads. Unlike the `integrations` table which properly encrypts credentials, webhook subscription secrets have no encryption.

**Impact:**
If the database is compromised, an attacker could read webhook secrets and forge webhook payloads to external services (Zapier, Make) on behalf of users.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/supabase/migrations/20260213100200_create_webhook_subscriptions.sql`

```sql
secret TEXT NOT NULL,
```

**Recommendation:**

1. Encrypt the `secret` column using the same encryption utilities used for `integrations.encrypted_credentials`.
2. Create a migration to encrypt existing plaintext secrets.

---

### SEC-08: `handleApiError` Exposes Internal Error Messages (MEDIUM)

**Category:** Information Disclosure
**Severity:** MEDIUM

**Description:**
The `handleApiError` function in `_utils.ts` forwards the raw `error.message` to the client for unrecognized errors (the catch-all case). Similarly, the `BlogController` includes `err.message` in error response details. Internal error messages can leak implementation details, library names, SQL query structures, or file paths.

**Impact:**
An attacker can trigger errors to enumerate the technology stack, discover SQL table names, or find vulnerable code paths. For example, a Supabase query error might reveal table structures or column names.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/src/pages/api/_utils.ts` (lines 278-280)

```typescript
const message = error instanceof Error ? error.message : 'Internal server error';
console.error(`[API] ${context ?? 'unknown'}:`, error);
return errorResponse('INTERNAL_ERROR', message, 500);
```

File: `/home/joao/projects/autopilotrank.com/server/controllers/BlogController.ts` (multiple locations)

```typescript
return this.error('FETCH_ERROR', 'Failed to fetch posts', 500, {
  details: err instanceof Error ? err.message : 'Unknown error',
});
```

**Recommendation:**

1. Never forward raw `error.message` to clients in production. Use a generic message like "An unexpected error occurred."
2. Log the detailed error server-side for debugging.
3. Create an error sanitization function that strips sensitive details before responding.

---

### SEC-09: `_utils.ts` Contains Redundant Auth Implementation (MEDIUM)

**Category:** Security Architecture
**Severity:** MEDIUM

**Description:**
The file `src/pages/api/_utils.ts` contains a second, independent authentication implementation (`authenticateUserFromHeader`) in addition to the primary auth in `lib/middleware/auth.ts`. This function authenticates using `supabaseAdmin.auth.getUser(token)` which uses the service role key, while the middleware uses the anon key. The `_utils.ts` version also lacks some of the security hardening present in the middleware version (e.g., JWT format validation, multi-layer test environment detection).

**Impact:**
Dual auth implementations increase the risk of inconsistencies. If one path is patched for a vulnerability and the other is not, it creates an exploitable gap. Currently, `authenticateUserFromHeader` does not appear to be used in production routes (routes use `withAuth` which reads from middleware `locals`), but its existence is a maintenance hazard.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/src/pages/api/_utils.ts` (lines 15-89)

```typescript
export async function authenticateUserFromHeader(request: Request) {
  // This is a separate auth implementation from lib/middleware/auth.ts
  // Uses supabaseAdmin.auth.getUser(token) instead of createServerClient
}
```

**Recommendation:**

1. Remove or deprecate `authenticateUserFromHeader` since routes use `withAuth`/`withAuthAndBody` which rely on middleware-set `locals`.
2. If the function is needed for edge cases, refactor to delegate to the canonical auth implementation.

---

### SEC-10: CORS `ALLOWED_ORIGIN` Defaults to Wildcard (MEDIUM)

**Category:** CORS Configuration
**Severity:** MEDIUM

**Description:**
The `ALLOWED_ORIGIN` environment variable defaults to `'*'` (wildcard) in the server env schema, and the `.env.api` file for development also sets `ALLOWED_ORIGIN=*`. While the runtime CORS implementation (`applyCorsHeaders`) correctly uses a whitelist of specific origins and does NOT fall back to wildcard for missing origins (this was previously fixed), the configured `ALLOWED_ORIGIN` env var is unused in the actual CORS logic. This creates confusion about what the actual CORS behavior is.

**Impact:**
If a developer relies on the `ALLOWED_ORIGIN` env var assuming it controls CORS, they might misconfigure it. The actual CORS origins are hardcoded in `securityHeaders.ts`.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/shared/config/env.ts` (line 186)

```typescript
ALLOWED_ORIGIN: z.string().default('*'),
```

File: `/home/joao/projects/autopilotrank.com/lib/middleware/securityHeaders.ts` (lines 9-18)

```typescript
function getAllowedOrigins(): string[] {
  const origins = ['http://localhost:4321', 'https://localhost:4321', clientEnv.BASE_URL];
  // Note: serverEnv.ALLOWED_ORIGIN is NOT used here
  return origins.filter(Boolean) as string[];
}
```

**Recommendation:**

1. Either use `ALLOWED_ORIGIN` in the `getAllowedOrigins()` function, or remove it from the env config to avoid confusion.
2. For production, ensure the allowed origins list includes only the production domain.

---

### SEC-11: Articles Table Missing DELETE RLS Policy for Users (LOW)

**Category:** Supabase Security / Access Control
**Severity:** LOW

**Description:**
The `articles` table has RLS policies for SELECT, INSERT, and UPDATE for authenticated users, but NO DELETE policy for users. Only the service role can delete articles. This may be intentional (to prevent accidental data loss), but if users should be able to delete their own articles via the client, this is a missing policy.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/supabase/migrations/20260205100200_create_articles_table.sql`

```sql
-- Has: SELECT, INSERT, UPDATE for auth.uid() = user_id
-- Missing: DELETE for auth.uid() = user_id
-- Has: Service role ALL
```

**Recommendation:**

1. If users should be able to delete articles: add a DELETE policy with `USING (auth.uid() = user_id)`.
2. If deletion is intentionally service-role-only: document this design decision.

---

### SEC-12: Test Auth Hardcoded Token in Production Code (LOW)

**Category:** Auth & Session Security
**Severity:** LOW

**Description:**
The string `'test_auth_token_for_testing_only'` is hardcoded in the auth middleware. While it is properly gated behind `isTestEnvironment` checks (which verify `ENV === 'test'` AND `NODE_ENV !== 'production'`), the presence of hardcoded test credentials in production code is a smell. If the environment detection logic is ever weakened, this becomes exploitable.

**Impact:**
Currently mitigated by multi-layer environment checks. The risk is latent - it becomes exploitable only if the test environment detection is modified or if `ENV=test` is accidentally set in production.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/lib/middleware/auth.ts` (line 121)

```typescript
if (token === 'test_auth_token_for_testing_only') {
  return { user: { id: 'test-user-id-12345', email: 'test@example.com' } };
}
```

**Recommendation:**

1. Move the hardcoded test token to an environment variable (`TEST_AUTH_TOKEN` already exists for this purpose).
2. Remove the hardcoded fallback so only `serverEnv.TEST_AUTH_TOKEN` is accepted.

---

### SEC-13: Blog Media Upload Lacks Filename Sanitization (LOW)

**Category:** Input Validation / File Upload Security
**Severity:** LOW

**Description:**
The blog media upload endpoint stores the original `file.name` from the upload without sanitization. While the storage path is generated server-side (safe), the original `filename` stored in the database could contain path traversal characters or special characters if reflected in HTML without proper escaping.

**Impact:**
The filename is stored in the database and could be displayed to admin users. If not properly HTML-escaped in the frontend, it could be a vector for stored XSS against admin users.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/server/controllers/BlogController.ts` (lines 416-423)

```typescript
const metadata: IBlogMediaCreate = {
  filename: file.name, // Unsanitized user-provided filename
  ...
};
```

**Recommendation:**

1. Sanitize the filename by stripping path separators, null bytes, and HTML special characters.
2. Consider generating a safe filename server-side and storing the original name separately (if needed for display).

---

### SEC-14: `formData.get('tags')` Parsed with `JSON.parse` Without Validation (LOW)

**Category:** Input Validation
**Severity:** LOW

**Description:**
In the blog media upload handler, the `tags` field from `formData` is parsed with `JSON.parse` without Zod validation. A malformed or malicious JSON payload could cause unexpected behavior.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/server/controllers/BlogController.ts` (line 421)

```typescript
tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
```

**Recommendation:**

1. Wrap `JSON.parse` in a try-catch and validate the result is an array of strings.
2. Use a Zod schema: `z.array(z.string()).safeParse(JSON.parse(...))`.

---

### SEC-15: `setInterval` for Rate Limit Cleanup in Cloudflare Workers (INFO)

**Category:** Infrastructure
**Severity:** INFO

**Description:**
The rate limiter uses `setInterval` for cleanup, which is not guaranteed to work in Cloudflare Workers. Workers have a limited execution model where the global scope may or may not persist between requests. While this won't cause security issues (rate limit entries will just accumulate in memory), it could lead to memory pressure.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/server/rateLimit.ts` (lines 30-46)

```typescript
setInterval(() => { ... }, 5 * 60 * 1000);
```

**Recommendation:**
This is a known limitation acknowledged in the code comments. Consider using Cloudflare KV for rate limit state (see SEC-05).

---

### SEC-16: OAuth State Falls Back to `CRON_SECRET` (INFO)

**Category:** Auth & Session Security
**Severity:** INFO

**Description:**
The GSC OAuth callback falls back to `CRON_SECRET` if `OAUTH_STATE_SECRET` is not set. While the code correctly separates these concerns with a dedicated `OAUTH_STATE_SECRET`, the fallback reduces security isolation.

**Evidence:**
File: `/home/joao/projects/autopilotrank.com/src/pages/api/gsc/callback.ts` (line 35)

```typescript
const stateSecret = serverEnv.OAUTH_STATE_SECRET || serverEnv.CRON_SECRET;
```

**Recommendation:**

1. Make `OAUTH_STATE_SECRET` required (throw an error if not set) rather than falling back to `CRON_SECRET`.
2. This prevents secret reuse across different security domains.

---

### SEC-17: Comprehensive RLS Coverage Verified (INFO - POSITIVE)

**Category:** Supabase Security
**Severity:** INFO (Positive Finding)

**Description:**
All tables in the database have RLS enabled with appropriate policies. The previously-reported missing RLS on `dispute_events` and `provider_usage` has been fixed in migration `20260205000000_enable_missing_rls.sql`. Every table follows the pattern of user-scoped policies with service role full access.

Tables verified with RLS enabled:

- `profiles`, `subscriptions`, `products`, `prices`
- `credit_transactions`, `credit_expiration_events`
- `processing_jobs`, `webhook_events`, `sync_runs`
- `projects`, `campaigns`, `articles`, `keywords`, `article_images`
- `integrations`, `campaign_integrations`, `integration_deliveries`
- `gsc_connections`, `gsc_snapshots`, `opportunities`
- `api_keys`, `webhook_subscriptions`
- `email_preferences`, `email_logs`, `email_provider_usage`
- `batch_usage`, `campaign_generation_runs`
- `blog_categories`, `blog_media`, `blog_posts`, `blog_post_tags`
- `user_onboarding`, `opportunity_performance_checks`
- `dispute_events`, `provider_usage`

---

### SEC-18: Stripe Webhook Signature Verification Properly Implemented (INFO - POSITIVE)

**Category:** Payment Security
**Severity:** INFO (Positive Finding)

**Description:**
The Stripe webhook handler properly verifies webhook signatures using `stripe.webhooks.constructEventAsync()` with the `STRIPE_WEBHOOK_SECRET`. The code also includes:

- Production safety check for misconfigured test webhook secrets.
- Idempotency service to prevent duplicate event processing.
- Proper error classification (client errors return 400, server errors return 500 for Stripe retry).
- Test mode signature bypass is properly gated behind `ENV === 'test'`.

---

## Summary Table

| ID     | Severity | Category         | Finding                                           |
| ------ | -------- | ---------------- | ------------------------------------------------- |
| SEC-01 | CRITICAL | Secrets          | Live API keys in `.env.api` on disk               |
| SEC-02 | HIGH     | Crypto           | Google OAuth tokens stored unencrypted            |
| SEC-03 | HIGH     | CSP              | `unsafe-eval` and `unsafe-inline` in CSP          |
| SEC-04 | HIGH     | Access Control   | Blog admin routes bypass middleware auth context  |
| SEC-05 | MEDIUM   | Rate Limiting    | In-memory rate limits per-edge, not global        |
| SEC-06 | MEDIUM   | Crypto           | Empty HKDF salt in encryption                     |
| SEC-07 | MEDIUM   | Crypto           | Webhook subscription secrets unencrypted          |
| SEC-08 | MEDIUM   | Info Disclosure  | Raw error messages forwarded to clients           |
| SEC-09 | MEDIUM   | Architecture     | Redundant auth implementation in `_utils.ts`      |
| SEC-10 | MEDIUM   | CORS             | Unused `ALLOWED_ORIGIN` env var creates confusion |
| SEC-11 | LOW      | Access Control   | Articles table missing user DELETE RLS policy     |
| SEC-12 | LOW      | Auth             | Hardcoded test auth token in production code      |
| SEC-13 | LOW      | Input Validation | Blog media filename not sanitized                 |
| SEC-14 | LOW      | Input Validation | `JSON.parse` on tags without Zod validation       |
| SEC-15 | INFO     | Infrastructure   | `setInterval` unreliable in Workers               |
| SEC-16 | INFO     | Auth             | OAuth state falls back to cron secret             |
| SEC-17 | INFO     | RLS              | All tables have RLS enabled (positive)            |
| SEC-18 | INFO     | Payments         | Stripe webhook verification correct (positive)    |

---

## Prioritized Action Plan

### Immediate (This Week)

1. **SEC-01**: Rotate all API keys and secrets exposed in `.env.api`. Set up `detect-secrets` pre-commit hook.
2. **SEC-02**: Encrypt GSC OAuth tokens using existing AES-256-GCM encryption utilities before database storage.
3. **SEC-08**: Sanitize error messages in the catch-all error handler to never forward raw `error.message` to clients.

### Short-Term (Next 2 Weeks)

4. **SEC-03**: Implement nonce-based CSP to eliminate `unsafe-inline` and `unsafe-eval`. Start with `script-src` directive.
5. **SEC-04**: Refactor `BlogController` to receive `locals` from Astro context and use the middleware-provided user identity.
6. **SEC-07**: Encrypt webhook subscription secrets using existing encryption utilities.
7. **SEC-09**: Deprecate/remove `authenticateUserFromHeader` from `_utils.ts`.

### Medium-Term (Next Month)

8. **SEC-05**: Evaluate Cloudflare Rate Limiting rules or KV-backed rate limiting for global enforcement.
9. **SEC-06**: Add a non-empty salt to the HKDF key derivation.
10. **SEC-10**: Clean up `ALLOWED_ORIGIN` env var to either use it or remove it.
11. **SEC-12**: Remove hardcoded test token; rely solely on `TEST_AUTH_TOKEN` env var.
12. **SEC-13** / **SEC-14**: Add filename sanitization and Zod validation for blog media uploads.

### Ongoing

13. **SEC-16**: Make `OAUTH_STATE_SECRET` required instead of falling back to `CRON_SECRET`.
14. Run `yarn audit` regularly and set up automated dependency vulnerability scanning in CI/CD.
15. Consider adding automated security testing (SAST) to the CI pipeline.

---

## Positive Security Observations

The following security practices are well-implemented and should be maintained:

1. **Zod validation on all API inputs** -- every route that accepts user input validates with a Zod schema.
2. **SECURITY DEFINER with search_path = public** on all database functions -- prevents search_path injection.
3. **Service role key never exposed to client** -- properly separated server/client env configuration.
4. **Admin role verification via JWT re-verification** -- `requireAdmin` does not trust `X-User-Id` header alone.
5. **Atomic credit operations via database RPC** -- prevents TOCTOU race conditions on credit manipulation.
6. **Webhook idempotency** -- prevents duplicate processing of Stripe events.
7. **CORS whitelist without wildcard fallback** -- previously fixed to not return `*` for missing Origin.
8. **Encrypted CMS credentials** -- AES-256-GCM encryption for WordPress/webhook integration credentials.
9. **API key hashing** -- API keys stored as SHA-256 hashes, never in plaintext.
10. **Comprehensive RLS** -- every table has Row Level Security enabled with proper policies.
