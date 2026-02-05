import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { clientEnv } from '@shared/config/env';
import type { AstroCookies } from 'astro';

/**
 * Create a Supabase client for Astro API routes
 * This version works with Astro's cookies API
 */
export async function createClient(cookies: AstroCookies): Promise<SupabaseClient> {
  return createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        // Astro cookies don't have getAll() - return empty array
        // The cookies will be accessible through the request
        const cookieList: Array<{ name: string; value: string }> = [];
        return cookieList;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, options)
        );
      },
    },
  });
}

/**
 * Get the authenticated user from Supabase session
 * This is a convenience function for Astro layouts and pages
 */
export async function getUser(cookies: AstroCookies): Promise<User | null> {
  try {
    const supabase = await createClient(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

/**
 * Legacy Next.js createClient function - kept for compatibility
 * This will be removed once migration is complete
 * @deprecated Use the Astro version with cookies parameter instead
 */
export async function createClientLegacy(): Promise<SupabaseClient> {
  throw new Error('createClientLegacy is not supported in Astro. Use createClient(cookies) instead.');
}
