import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { clientEnv, serverEnv } from '@shared/config/env';

// Lazy singleton — avoids bundling node:fs (inMemorySupabaseAdmin) into the production
// Cloudflare Workers bundle. Tests override this via _overrideSupabaseAdminForTests().
// NOTE: Do NOT access serverEnv at module level — CF Workers evaluates modules before
// any request runs, so secrets aren't available yet. Access inside getClient() instead.
let _client: SupabaseClient | null = null;
let _cachedServiceRoleKey = '';
let _isTestRuntime: boolean | null = null;

function isTestRuntime(): boolean {
  if (_isTestRuntime !== null) return _isTestRuntime;
  _isTestRuntime =
    serverEnv.ENV === 'test' ||
    serverEnv.PLAYWRIGHT_TEST === '1' ||
    serverEnv.PLAYWRIGHT_TEST === 'true';
  return _isTestRuntime;
}

// In test mode, load the in-memory client synchronously at module load time
// using top-level await. This ensures the client is ready before any requests
// come in. Top-level await is supported in Node.js ESM.
if (isTestRuntime() && !_client) {
  // Dynamic import with top-level await to load synchronously
  // This will block module evaluation until the import completes
  // We use dynamic import to avoid bundling node:fs in production (Cloudflare Workers)
  // eslint-disable-next-line no-restricted-syntax
  const mod = await import('./inMemorySupabaseAdmin.js');
  _client = mod.inMemorySupabaseAdmin as SupabaseClient;
  _cachedServiceRoleKey = 'in-memory-test-mode';
}

function getClient(): SupabaseClient {
  // Read the current key — after middleware injects CF runtime env into process.env
  // and resets serverEnv cache, this reflects the real runtime secret.
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  // Recreate client if the key has become available (was empty/placeholder before).
  if (
    _client &&
    serviceRoleKey &&
    serviceRoleKey !== _cachedServiceRoleKey &&
    _cachedServiceRoleKey !== 'in-memory-test-mode'
  ) {
    _client = null;
  }

  if (!_client) {
    // Use in-memory Supabase for Playwright tests (no real DB connection)
    if (isTestRuntime()) {
      // This should not happen since we load synchronously at module level
      throw new Error(
        'In-memory Supabase client not loaded. This indicates a problem with test initialization.'
      );
    }

    if (!clientEnv.SUPABASE_URL) {
      console.warn('Warning: SUPABASE_URL is not set.');
    }
    if (!serviceRoleKey) {
      console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.');
    }

    _cachedServiceRoleKey = serviceRoleKey;
    _client = createClient(clientEnv.SUPABASE_URL, serviceRoleKey || 'placeholder-key-for-build', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _client;
}

/** Call this in test setup BEFORE using supabaseAdmin, passing inMemorySupabaseAdmin. */
export function _overrideSupabaseAdminForTests(client: SupabaseClient): void {
  _client = client;
  _cachedServiceRoleKey = 'in-memory-test-mode';
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
