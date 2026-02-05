import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { clientEnv } from '@shared/config/env';
import type { AstroCookies } from 'astro';

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
 * Get request from cookies for parsing
 * AstroCookies constructor stores the request internally
 * @deprecated Not used - kept for reference
 */

function _getRequestFromCookies(_cookies: AstroCookies): Request | null {
  // AstroCookies stores the request, but it's private
  // We need to access cookies through the request headers
  // This is a workaround - in practice, pass the request directly
  return null;
}

/**
 * Create a Supabase client for Astro API routes
 * This version works with Astro's cookies API
 */
export async function createClient(
  cookies: AstroCookies,
  request?: Request
): Promise<SupabaseClient> {
  return createServerClient(clientEnv.SUPABASE_URL, clientEnv.SUPABASE_ANON_KEY, {
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
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
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
  throw new Error(
    'createClientLegacy is not supported in Astro. Use createClient(cookies) instead.'
  );
}
