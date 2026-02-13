import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { clientEnv, serverEnv } from '@shared/config/env';
import { inMemorySupabaseAdmin } from './inMemorySupabaseAdmin';

const isTestRuntime =
  serverEnv.ENV === 'test' ||
  process.env.ENV === 'test' ||
  process.env.PLAYWRIGHT_TEST === '1' ||
  process.env.PLAYWRIGHT_TEST === 'true';

if (!isTestRuntime && !clientEnv.SUPABASE_URL) {
  console.warn('Warning: SUPABASE_URL is not set.');
}

if (!isTestRuntime && !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.');
}

export const supabaseAdmin: SupabaseClient = isTestRuntime
  ? inMemorySupabaseAdmin
  : createClient(
      clientEnv.SUPABASE_URL,
      // Service role key for admin operations (bypasses RLS).
      serverEnv.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-for-build',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
