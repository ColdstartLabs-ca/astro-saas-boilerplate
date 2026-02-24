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

function getClient(): SupabaseClient {
  // Read the current key — after middleware injects CF runtime env into process.env
  // and resets serverEnv cache, this reflects the real runtime secret.
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  // Recreate client if the key has become available (was empty/placeholder before).
  if (_client && serviceRoleKey && serviceRoleKey !== _cachedServiceRoleKey) {
    _client = null;
  }

  if (!_client) {
    // Use in-memory Supabase for Playwright tests (no real DB connection)
    if (isTestRuntime()) {
      // Dynamic import to avoid bundling node:fs in production
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inMemorySupabaseAdmin } = require('./inMemorySupabaseAdmin');
      _client = inMemorySupabaseAdmin as SupabaseClient;
      _cachedServiceRoleKey = 'in-memory-test-mode';
      return _client;
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
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
