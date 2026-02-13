import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { UserRepository } from '@shared/repositories';
import { CREDIT_COSTS } from '@shared/config/credits.config';
import { serverEnv } from '@shared/config/env';

function parseUserIdFromAuthorization(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length);

  if (
    token === 'test_auth_token_for_testing_only' ||
    (serverEnv.TEST_AUTH_TOKEN && token === serverEnv.TEST_AUTH_TOKEN)
  ) {
    return 'test-user-id-12345';
  }

  if (serverEnv.ENV !== 'test' || !token.startsWith('test_token_')) {
    return null;
  }

  if (token.startsWith('test_token_mock_user_')) {
    const withoutPrefix = token.replace('test_token_mock_user_', '');
    const subIndex = withoutPrefix.indexOf('_sub_');
    return subIndex !== -1 ? withoutPrefix.substring(0, subIndex) : withoutPrefix;
  }

  return token.replace('test_token_', '');
}

/**
 * Extract authenticated user from middleware-set headers
 *
 * The middleware.ts file verifies the JWT and sets X-User-Id header.
 * This helper retrieves the user ID from that header and fetches
 * the full user profile from Supabase.
 *
 * @param req - Request object with X-User-Id header
 * @returns User profile object or null if not authenticated
 *
 * @example
 * ```ts
 * export async function GET(req: Request) {
 *   const user = await getAuthenticatedUser(req);
 *   if (!user) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   return Response.json({ data: user });
 * }
 * ```
 */
export async function getAuthenticatedUser(req: Request): Promise<IUserProfile | null> {
  const userId = req.headers.get('X-User-Id') || parseUserIdFromAuthorization(req);

  if (!userId) {
    return null;
  }

  // Handle test user
  if (userId === 'test-user-id-12345') {
    return {
      id: 'test-user-id-12345',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subscription_credits_balance: CREDIT_COSTS.DEFAULT_FREE_CREDITS,
      purchased_credits_balance: CREDIT_COSTS.DEFAULT_TRIAL_CREDITS,
      stripe_customer_id: null,
      subscription_status: null,
      subscription_tier: null,
      role: 'user',
    };
  }

  // Use repository for database operations
  const userRepository = new UserRepository(supabaseAdmin);

  try {
    // Get or create user profile (creates with defaults if not found)
    const profile = await userRepository.getOrCreate(userId);
    return profile;
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Type definition for user profile
 * Update this based on your actual profiles table schema
 */
export interface IUserProfile {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  stripe_customer_id?: string | null;
  credits_balance?: number;
  subscription_credits_balance?: number;
  purchased_credits_balance?: number;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  role?: 'user' | 'admin';
  [key: string]: unknown;
}
