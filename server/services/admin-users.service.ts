/**
 * Admin Users Service
 *
 * Handles admin user management operations.
 * Extracted from AdminController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// =============================================================================
// Types
// =============================================================================

export interface IListUsersParams {
  page: number;
  limit: number;
  search?: string;
}

export interface IListUsersResult {
  users: Array<Record<string, unknown> & { email: string }>;
  total: number;
  page: number;
  limit: number;
  maxLimit: number;
}

export interface IUpdateProfileRequest {
  role?: 'user' | 'admin';
  subscription_tier?: 'starter' | 'growth' | 'agency';
  subscription_status?: 'active' | 'canceled' | 'trialing' | 'past_due' | 'incomplete';
}

export interface IAdjustCreditsParams {
  userId: string;
  newBalance: number;
  adminId: string;
}

export interface IUserDetailResult {
  profile: Record<string, unknown> & { email: string };
  subscription: Record<string, unknown> | null;
  recentTransactions: Array<Record<string, unknown>>;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Admin Users Service Class
// =============================================================================

export class AdminUsersService {
  /**
   * List users with pagination and optional search
   *
   * Search-first then paginate strategy:
   * 1. Fetch all profiles and auth users
   * 2. Apply search filter to combined data
   * 3. Calculate accurate post-filter total
   * 4. Paginate the filtered results
   */
  async listUsers(params: IListUsersParams): Promise<IListUsersResult> {
    const { page = 1, limit = DEFAULT_LIMIT, search = '' } = params;
    const sanitizedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const offset = (page - 1) * sanitizedLimit;

    // Fetch all profiles (no pagination yet - we need to filter first)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Fetch all auth users to get emails (paginate through if needed)
    const emailMap = await this.fetchAllUserEmails();

    // Combine profile data with emails
    const usersWithEmails = (profiles || []).map(profile => ({
      ...profile,
      email: emailMap.get(profile.id) || 'unknown@example.com',
    }));

    // Apply search filter if provided (search-first)
    let filteredUsers = usersWithEmails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersWithEmails.filter(
        u =>
          u.email.toLowerCase().includes(searchLower) ||
          (u.full_name?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Calculate accurate post-filter total BEFORE pagination
    const total = filteredUsers.length;

    // Paginate the filtered results
    const paginatedUsers = filteredUsers.slice(offset, offset + sanitizedLimit);

    return {
      users: paginatedUsers,
      total,
      page,
      limit: sanitizedLimit,
      maxLimit: MAX_LIMIT,
    };
  }

  /**
   * Get detailed user information including subscription and recent transactions
   */
  async getUserById(userId: string): Promise<IUserDetailResult> {
    this.validateUserId(userId);

    const [profileResult, subscriptionResult, transactionsResult, authUser] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
      supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).single(),
      supabaseAdmin
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    if (profileResult.error) {
      throw new Error('User not found');
    }

    const profileWithEmail = {
      ...profileResult.data,
      email: authUser.data.user?.email || 'unknown@example.com',
    };

    return {
      profile: profileWithEmail,
      subscription: subscriptionResult.data,
      recentTransactions: transactionsResult.data || [],
    };
  }

  /**
   * Update user profile (role, subscription_tier, subscription_status)
   */
  async updateUser(
    userId: string,
    updates: IUpdateProfileRequest
  ): Promise<Record<string, unknown>> {
    this.validateUserId(userId);

    // Validate role
    if (updates.role !== undefined && !['user', 'admin'].includes(updates.role)) {
      throw new Error('Invalid role value');
    }

    // Validate subscription_tier
    if (
      updates.subscription_tier !== undefined &&
      !['starter', 'growth', 'agency'].includes(updates.subscription_tier)
    ) {
      throw new Error('Invalid subscription_tier value');
    }

    // Validate subscription_status
    if (
      updates.subscription_status !== undefined &&
      !['active', 'canceled', 'trialing', 'past_due', 'incomplete'].includes(
        updates.subscription_status
      )
    ) {
      throw new Error('Invalid subscription_status value');
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to update user: ${dbError.message}`);
    }

    return data;
  }

  /**
   * Delete a user and all their data
   */
  async deleteUser(userId: string): Promise<void> {
    this.validateUserId(userId);

    // Delete in order: credit_transactions, subscriptions, profiles, then auth user
    const [transactionsResult, subscriptionsResult] = await Promise.allSettled([
      supabaseAdmin.from('credit_transactions').delete().eq('user_id', userId),
      supabaseAdmin.from('subscriptions').delete().eq('user_id', userId),
    ]);

    // Log any errors but continue
    if (transactionsResult.status === 'rejected') {
      console.warn('Error deleting transactions:', transactionsResult.reason);
    }
    if (subscriptionsResult.status === 'rejected') {
      console.warn('Error deleting subscriptions:', subscriptionsResult.reason);
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

    if (profileError) {
      throw new Error(`Failed to delete user profile: ${profileError.message}`);
    }

    // Finally delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }
  }

  /**
   * Adjust user credits to a new balance
   */
  async adjustCredits(params: IAdjustCreditsParams): Promise<number> {
    const { userId, newBalance, adminId } = params;

    // Get current balance to calculate adjustment
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_credits_balance, purchased_credits_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    const currentTotal =
      (profile.subscription_credits_balance ?? 0) + (profile.purchased_credits_balance ?? 0);
    const adjustmentAmount = newBalance - currentTotal;

    // Use RPC function for atomic operation with logging
    const { data, error: rpcError } = await supabaseAdmin.rpc('admin_adjust_credits', {
      target_user_id: userId,
      adjustment_amount: adjustmentAmount,
      adjustment_reason: `[Admin: ${adminId}] Set balance to ${newBalance}`,
    });

    if (rpcError) {
      throw new Error(`Failed to set credits: ${rpcError.message}`);
    }

    return data;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private validateUserId(userId: string): void {
    if (!UUID_REGEX.test(userId)) {
      throw new Error('Invalid user ID format');
    }
  }

  private async fetchAllUserEmails(): Promise<Map<string, string>> {
    const emailMap = new Map<string, string>();
    let authPage = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        perPage,
        page: authPage,
      });

      if (authError) {
        console.error('Error fetching auth users:', authError);
        break;
      }

      if (authUsers?.users) {
        for (const user of authUsers.users) {
          emailMap.set(user.id, user.email || 'unknown@example.com');
        }
        hasMore = authUsers.users.length === perPage;
        authPage++;
      } else {
        hasMore = false;
      }
    }

    return emailMap;
  }
}

// Export singleton instance
export const adminUsersService = new AdminUsersService();
