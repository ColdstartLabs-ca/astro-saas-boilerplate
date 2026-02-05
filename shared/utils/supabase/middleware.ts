import { createServerClient } from '@supabase/ssr';
import { clientEnv } from '@shared/config/env';
import type { User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { Request as AstroRequest } from 'astro';

interface IUpdateSessionResult {
  user: User | null;
}

interface IAdminCheckResult {
  isAdmin: boolean;
  error?: Response;
}

/**
 * Parse cookies from the Cookie header into the format expected by Supabase SSR
 */
function parseCookies(cookieHeader: string | null): Array<{ name: string; value: string }> {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(';').map(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    const value = valueParts.join('='); // Handle values that contain '='
    return { name, value: decodeURIComponent(value) };
  });
}

/**
 * Update Supabase session for Astro middleware
 * Works with Astro's cookies API which implements the same interface as @supabase/ssr expects
 */
export async function updateSession(cookies: AstroCookies, request?: AstroRequest): Promise<IUpdateSessionResult> {
  try {
    const supabase = createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          // Try to get cookies from the request header if available
          if (request) {
            const cookieHeader = request.headers.get('cookie');
            return parseCookies(cookieHeader);
          }

          // Fallback: extract cookies we know about by name
          // This is less ideal but works for common Supabase cookies
          const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-*'];
          const cookieList: Array<{ name: string; value: string }> = [];

          for (const name of cookieNames) {
            const cookie = cookies.get(name);
            if (cookie) {
              cookieList.push({ name, value: cookie.value });
            }
          }

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
export async function requireAdmin(cookies: AstroCookies, request?: AstroRequest): Promise<IAdminCheckResult> {
  try {
    const supabase = createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          // Try to get cookies from the request header if available
          if (request) {
            const cookieHeader = request.headers.get('cookie');
            return parseCookies(cookieHeader);
          }

          // Fallback: extract cookies we know about by name
          const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-*'];
          const cookieList: Array<{ name: string; value: string }> = [];

          for (const name of cookieNames) {
            const cookie = cookies.get(name);
            if (cookie) {
              cookieList.push({ name, value: cookie.value });
            }
          }

          return cookieList;
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
