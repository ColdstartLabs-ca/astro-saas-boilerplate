import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { clientEnv, serverEnv } from '@shared/config/env';

// Lazy singleton — avoids bundling node:fs (inMemorySupabaseAdmin) into the production
// Cloudflare Workers bundle. Tests override this via _overrideSupabaseAdminForTests().
// NOTE: Do NOT access serverEnv at module level — CF Workers evaluates modules before
// any request runs, so secrets aren't available yet. Access inside getClient() instead.
let _client: SupabaseClient | null = null;
let _cachedServiceRoleKey = '';
let _isTestRuntime: boolean | null = null;
let _inMemoryClientPromise: Promise<SupabaseClient> | null = null;
let _inMemoryClientError: Error | null = null;

function isTestRuntime(): boolean {
  if (_isTestRuntime !== null) return _isTestRuntime;
  _isTestRuntime =
    serverEnv.ENV === 'test' ||
    serverEnv.PLAYWRIGHT_TEST === '1' ||
    serverEnv.PLAYWRIGHT_TEST === 'true';
  return _isTestRuntime;
}

// Start loading the in-memory client asynchronously
// Returns the promise so callers can await if needed
function startLoadingInMemoryClient(): void {
  if (_inMemoryClientPromise) return; // Already loading or loaded

  // Dynamic import is required here to avoid bundling node:fs in production
  // eslint-disable-next-line no-restricted-syntax
  _inMemoryClientPromise = import('./inMemorySupabaseAdmin')
    .then(mod => {
      const client = mod.inMemorySupabaseAdmin as SupabaseClient;
      _client = client;
      _cachedServiceRoleKey = 'in-memory-test-mode';
      return client;
    })
    .catch(err => {
      console.error('[supabaseAdmin] Failed to load in-memory client:', err);
      _inMemoryClientError = err;
      _inMemoryClientPromise = null; // Allow retry
      throw err;
    });
}

// Trigger loading at module level in test mode
if (isTestRuntime()) {
  startLoadingInMemoryClient();
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
      // If we have a client, return it
      if (_client) {
        return _client;
      }

      // If there was an error, throw it
      if (_inMemoryClientError) {
        throw new Error(
          `In-memory Supabase client failed to load: ${_inMemoryClientError.message}`
        );
      }

      // Start loading if not already
      if (!_inMemoryClientPromise) {
        startLoadingInMemoryClient();
      }

      // The client is still loading asynchronously
      // In the test environment with warmup requests, subsequent requests should find it ready
      throw new Error(
        'In-memory Supabase client is loading. The warmup request should complete shortly.'
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
  _inMemoryClientPromise = Promise.resolve(client);
  _cachedServiceRoleKey = 'in-memory-test-mode';
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
