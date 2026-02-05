import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { verifyApiAuth } from '@lib/middleware/auth';

export interface IAdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  error?: Response;
}

/**
 * Middleware to verify the requesting user has admin role
 * @param req - Request object
 * @returns Admin check result with error response if not authorized
 *
 * SECURITY: Always verifies JWT token directly. Does NOT trust X-User-Id header
 * as it could be forged by attackers bypassing middleware.
 */
export async function requireAdmin(req: Request): Promise<IAdminCheckResult> {
  try {
    // SECURITY FIX: Always verify JWT token directly
    // Never trust X-User-Id header alone as it could be forged
    const authResult = await verifyApiAuth(req);
    if ('error' in authResult) {
      return {
        isAdmin: false,
        userId: null,
        error: authResult.error,
      };
    }
    const userId = authResult.user.id;

    if (!userId) {
      return {
        isAdmin: false,
        userId: null,
        error: new Response(
          JSON.stringify({ error: 'Unauthorized', code: 'NO_USER' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    let profile: { role: string } | null;
    let error: { message: string; code: string; details?: string; hints?: string; message2?: string } | null;
    try {
      const result = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      profile = result.data;
      error = result.error;
    } catch (dbError) {
      console.error('Database error in requireAdmin:', dbError);
      return {
        isAdmin: false,
        userId,
        error: new Response(
          JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    if (error || !profile) {
      return {
        isAdmin: false,
        userId,
        error: new Response(
          JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    if (profile.role !== 'admin') {
      return {
        isAdmin: false,
        userId,
        error: new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required', code: 'NOT_ADMIN' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    return { isAdmin: true, userId };
  } catch (unexpectedError) {
    // Catch-all for any unexpected errors
    console.error('Unexpected error in requireAdmin:', unexpectedError);
    return {
      isAdmin: false,
      userId: null,
      error: new Response(
        JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
}
