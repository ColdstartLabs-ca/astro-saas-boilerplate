# Cloudflare Workers Deployment Findings

**Date:** 2026-02-18
**Context:** AutopilotRank.com — Astro 5 SSR app deployed to Cloudflare Pages

---

## Summary

Three critical bugs prevented the app from starting on Cloudflare Workers. All have been fixed.
The site now returns HTTP 200. A secondary issue (Supabase admin key injection) is documented below.

---

## Bug 1: `node:fs` bundled into CF Workers build ✅ Fixed

### Root Cause

`server/supabase/supabaseAdmin.ts` had a **static top-level import** of `inMemorySupabaseAdmin`, which uses `node:fs` and `node:path` (Node.js-only APIs). Rollup/Vite bundled these into the CF Workers production build.

**Error:** `No such module "node:fs". imported from "chunks/supabaseAdmin_*.mjs"`

### Fix Applied

Converted `supabaseAdmin.ts` to a **lazy Proxy pattern** that never statically imports `inMemorySupabaseAdmin`:

```typescript
// supabaseAdmin.ts
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(clientEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-for-build', ...);
  }
  return _client;
}

export function _overrideSupabaseAdminForTests(client: SupabaseClient): void {
  _client = client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
```

And wired up the test override in `vitest.setup.tsx`:

```typescript
import { _overrideSupabaseAdminForTests } from '@server/supabase/supabaseAdmin';
import { inMemorySupabaseAdmin } from '@server/supabase/inMemorySupabaseAdmin';
_overrideSupabaseAdminForTests(inMemorySupabaseAdmin);
```

### Lesson

**Never statically import Node.js-only modules in code that gets bundled for CF Workers.** Use lazy imports or dynamic `import()` guarded by environment checks, or use the escape-hatch/override pattern for test-only code.

---

## Bug 2: `setInterval()` at module/global scope ✅ Fixed

### Root Cause

Two files called `setInterval()` at **module initialization scope** (outside any function/handler):

1. `server/rateLimit.ts` — cleanup timer for in-memory rate limit store
2. `server/middleware/apiKeyAuth.ts` — cleanup timer for API key rate limit store

**Error:** `Disallowed operation called within global scope. Asynchronous I/O (ex: fetch() or connect()), setting a timeout, and generating random values are not allowed within global scope. at _astro-internal_middleware.mjs:139:1`

**Cloudflare Workers restriction:** `setInterval()`, `setTimeout()`, `fetch()`, and `crypto.getRandomValues()` are forbidden in **global/module initialization scope**. They may only be called within a request handler.

### Fix Applied

Removed both `setInterval` calls and replaced with **inline cleanup** during normal rate limit operations:

```typescript
// server/rateLimit.ts
// In-memory storage — No setInterval (forbidden in CF Workers global scope)
const rateLimitStore = new Map<string, IRateLimitEntry>();

function createRateLimiter(limit: number, windowMs: number) {
  return async (identifier: string): Promise<IRateLimitResult> => {
    // ...filter old timestamps...

    // Inline cleanup when store grows large (replaces global setInterval)
    if (rateLimitStore.size > 10000) {
      for (const [key, e] of rateLimitStore.entries()) {
        if (e.timestamps.length === 0) rateLimitStore.delete(key);
      }
    }
    // ...
  };
}
```

### Lesson

**Audit all module-level code for CF Workers compatibility.** Any top-level statement that calls async APIs (`fetch`, `setTimeout`, `setInterval`, `crypto.*`) will crash the Worker before it handles a single request. Common offenders:

- Periodic cleanup timers
- Singleton services that initialize eagerly (fetch external config on load)
- Analytics clients that start background workers

**Pattern for cleanup in CF Workers:** Do it lazily inline (e.g., "if size > threshold, clean") or in the `ctx.waitUntil()` callback within a request handler.

---

## Bug 3: Server-side Secrets Not Available in CF Workers Runtime 🔄 In Progress

### Root Cause

The `shared/config/env.ts` module reads server-side secrets from `import.meta.env` / `process.env` inside a lazy-loaded `loadServerEnv()` function.

In Cloudflare Pages with the `@astrojs/cloudflare` adapter (v12):

- **PUBLIC\_\*** variables → embedded at **build time** in `__vite_import_meta_env__` ✅
- **Non-public secrets** → only available at **runtime** via:
  - `context.locals.runtime.env.KEY` (CF adapter provides this in Astro handlers)
  - `process.env.KEY` (may work via `nodejs_compat` flag)

The generated `env_*.mjs` chunk reads:

```javascript
SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY;
```

If `process.env` is empty at the time `loadServerEnv()` is first called, the service role key is empty and Supabase admin operations fail with "Invalid API key".

### Fix Attempted

Added CF runtime env injection at the start of `src/middleware.ts`:

```typescript
const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env;
if (runtimeEnv && typeof process !== 'undefined' && process.env) {
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (typeof value === 'string' && !key.startsWith('__')) {
      process.env[key] = value;
    }
  }
}
```

This injects all CF Pages secrets into `process.env` BEFORE any `serverEnv` property access, ensuring `loadServerEnv()` sees the correct values.

### Status

Deployed but health check still shows "Invalid API key". Under investigation.

### Investigation Notes

- `CF_PAGES_URL` is a BUILD-TIME variable (not a runtime binding), so `region: "Local"` in health check is EXPECTED
- `SUPABASE_SERVICE_ROLE_KEY` IS in the CF Pages secrets list (`wrangler pages secret list` confirmed)
- The GCloud secret has the correct key (validated locally against Supabase → HTTP 200)
- The `@astrojs/cloudflare` adapter's `handle()` function puts ALL CF env bindings in `locals.runtime.env`
- With `nodejs_compat` flag, `process.env` may also be populated from CF env bindings natively

### Possible Root Causes Still to Investigate

1. `context.locals.runtime.env` might not contain text-binding secrets (only KV/D1 bindings)
2. `nodejs_compat` may not populate `process.env` from CF Pages secrets (only from wrangler.toml `[vars]`)
3. `_serverEnv` cache might be populated before the middleware injection (from another code path)
4. The secret value in CF Pages might have a trailing newline or formatting issue

### Better Long-Term Fix

Use **Astro's built-in env schema** (`astro.config.mjs`) for server-side secrets. The CF adapter uses this to properly inject runtime vars into `process.env`:

```javascript
// astro.config.mjs
export default defineConfig({
  env: {
    schema: {
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      // ...
    },
  },
});
```

OR read from `context.locals.runtime.env` directly in API routes instead of `serverEnv`.

---

## Bug 4: GCloud `--skip-secrets` Regex Broken ✅ Fixed

### Root Cause

The regex for reading existing secret names from `wrangler pages secret list` output was wrong:

- **Expected format:** `  - KEY_NAME: Value Encrypted`
- **Broken regex:** `grep -oP '"name":\s*"\K[^"]+'` (JSON format, not the actual output)
- **Fixed regex:** `grep -oP '^\s+-\s+\K[^:]+'`

---

## CF Workers Best Practices Learned

### 1. Never use `setInterval`/`setTimeout` at module level

```typescript
// ❌ BAD — will crash Worker on cold start
setInterval(
  () => {
    cleanup();
  },
  5 * 60 * 1000
);

// ✅ GOOD — do it lazily inside a request handler
function checkRateLimit(id: string) {
  if (store.size > 10000) {
    cleanup();
  } // inline, on demand
}
```

### 2. Never statically import Node.js-only code

```typescript
// ❌ BAD — bundles node:fs into CF Workers build
import { inMemoryDb } from './inMemoryDb'; // uses node:fs

// ✅ GOOD — lazy proxy with test override
export const db = new Proxy({} as Db, {
  get(_t, prop) { return getProductionClient()[prop]; }
});
export function _overrideForTests(client: Db): void { ... }
```

### 3. Server-side secrets in CF Pages

- `PUBLIC_*` vars: embedded at build time → available everywhere via `import.meta.env`
- Secret text bindings: only available at runtime in `context.locals.runtime.env`
- With `nodejs_compat`: may also be in `process.env` during request handling
- **Avoid reading secrets at module initialization level** (before any request arrives)

### 4. Check the CF Workers `wrangler.toml`

```toml
compatibility_flags = ["nodejs_compat"]  # Required for process, Buffer, etc.
```

### 5. Debug with `wrangler tail`

```bash
npx wrangler pages deployment tail --project-name autopilotrank
```

---

## Custom Domain: `autopilotrank.com` → 522 Error ❌ Pending

The site works at `autopilotrank.pages.dev` (HTTP 200) but `autopilotrank.com` returns 522 (connection timed out). This means the custom domain isn't connected to the Cloudflare Pages project yet.

**Fix needed:** In the Cloudflare Dashboard → Pages → autopilotrank → Custom Domains → Add `autopilotrank.com`. Cloudflare will handle the DNS automatically since the domain's nameservers are already at Cloudflare.

---

## Key Files Modified

| File                                         | Change                                                          |
| -------------------------------------------- | --------------------------------------------------------------- |
| `server/supabase/supabaseAdmin.ts`           | Lazy proxy pattern, removed static inMemorySupabaseAdmin import |
| `vitest.setup.tsx`                           | Added `_overrideSupabaseAdminForTests()` wiring                 |
| `server/rateLimit.ts`                        | Removed global `setInterval`, added inline cleanup              |
| `server/middleware/apiKeyAuth.ts`            | Removed global `setInterval`, added inline cleanup              |
| `src/middleware.ts`                          | Added CF runtime env injection into `process.env`               |
| `scripts/deploy/steps/00-fetch-secrets.sh`   | Service account auth, hardcoded `autopilotrank` project         |
| `scripts/deploy/steps/05-secrets.sh`         | Added missing secrets to upload list, fixed skip-secrets regex  |
| `.env.client`                                | Updated `PUBLIC_GOOGLE_CLIENT_ID` to real value                 |
| `.env.api`                                   | Added `GOOGLE_OAUTH_CLIENT_SECRET`, `OAUTH_STATE_SECRET`        |
| `.claude/skills/gcloud-secrets/SKILL.md`     | Rewritten for autopilotrank                                     |
| `.claude/skills/blog-writing/SKILL.md`       | Updated for autopilotrank                                       |
| `.claude/skills/env-management/SKILL.md`     | Updated for Astro/autopilotrank                                 |
| `.claude/skills/stripe-integration/SKILL.md` | Updated for Astro/autopilotrank                                 |
