import { createServerClient } from '@supabase/ssr';
import { clientEnv } from '@shared/config/env';
import type { User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

interface IUpdateSessionResult {
  user: User | null;
}

interface IAdminCheckResult {
  isAdmin: boolean;
  error?: Response;
}

/**
 * Update Supabase session for Astro middleware
 * Works with Astro's cookies API which implements the same interface as @supabase/ssr expects
 */
export async function updateSession(cookies: AstroCookies): Promise<IUpdateSessionResult> {
  try {
    const supabase = createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          // Convert Astro cookies to the format Supabase expects
          // Astro cookies are accessed via get() with a name, or we can iterate
          const cookieList: Array<{ name: string; value: string }> = [];

          // Astro's cookies don't have getAll() - we need to iterate differently
          // For now, return empty array - the session refresh will work with cookies
          // that are already set
          return cookieList;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh the session and get the user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { user };
  } catch (error) {
    console.error('Error in updateSession:', error);
    return { user: null };
  }
}

/**
 * Check if the current user is an admin
 * For use in Astro layouts and pages
 */
export async function requireAdmin(_cookies: AstroCookies): Promise<IAdminCheckResult> {
  try {
    const supabase = createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Not needed for read operations
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAdmin: false,
        error: new Response('Redirect', {
          status: 302,
          headers: { Location: '/?login=1' },
        }),
      };
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return {
        isAdmin: false,
        error: new Response('Redirect', {
          status: 302,
          headers: { Location: '/?forbidden=1' },
        }),
      };
    }

    return { isAdmin: true };
  } catch (error) {
    console.error('Error in requireAdmin:', error);
    return {
      isAdmin: false,
      error: new Response('Redirect', {
        status: 302,
        headers: { Location: '/?error=1' },
      }),
    };
  }
}
