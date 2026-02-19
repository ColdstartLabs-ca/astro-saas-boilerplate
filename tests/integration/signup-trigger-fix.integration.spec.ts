/**
 * Integration test for email/password signup trigger fix
 *
 * Tests that the handle_new_user() trigger correctly creates:
 * 1. User profile with correct credit columns (subscription_credits_balance, purchased_credits_balance)
 * 2. Credit transaction for welcome bonus
 * 3. Email preferences
 *
 * Related migration: 20260120_fix_signup_trigger.sql
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@shared/utils/supabase/server';

describe('Signup Trigger Fix', () => {
  const supabase = createClient();

  // Use a deterministic test email
  const testEmail = `test-signup-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let testUserId: string | null = null;

  beforeAll(async () => {
    // Cleanup any existing test user
    const { data: existingUsers } = await supabase
      .rpc('admin_delete_user', { user_email: testEmail })
      .catch(() => ({ data: null }));
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      // Use admin API to delete the user
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should create user profile with correct credit columns on signup', async () => {
    // Attempt to sign up a new user
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    // Store user ID for cleanup
    testUserId = data.user?.id || null;

    // Signup should succeed without database errors
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    expect(data.user?.email).toBe(testEmail);

    if (!testUserId) {
      throw new Error('User ID is null');
    }

    // Check that profile was created with correct columns
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, subscription_credits_balance, purchased_credits_balance')
      .eq('id', testUserId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile?.subscription_credits_balance).toBe(10);
    expect(profile?.purchased_credits_balance).toBe(0);
  });

  it('should create welcome bonus credit transaction', async () => {
    if (!testUserId) {
      throw new Error('User ID is null');
    }

    // Check for welcome bonus transaction
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'bonus')
      .eq('amount', 10);

    expect(transactionError).toBeNull();
    expect(transactions).not.toBeNull();
    expect(transactions?.length).toBeGreaterThan(0);
    expect(transactions?.[0].description).toBe('Welcome bonus credits');
  });

  it('should create email preferences', async () => {
    if (!testUserId) {
      throw new Error('User ID is null');
    }

    // Check for email preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(prefsError).toBeNull();
    expect(prefs).not.toBeNull();
    expect(prefs?.marketing_emails).toBe(true);
    expect(prefs?.product_updates).toBe(true);
    expect(prefs?.low_credit_alerts).toBe(true);
  });

  it('should handle signup without throwing database errors', async () => {
    // This test verifies the fix for the "Database error saving new user" issue
    const uniqueEmail = `test-signup-no-error-${Date.now()}@example.com`;

    const { data, error } = await supabase.auth.signUp({
      email: uniqueEmail,
      password: testPassword,
    });

    // Should not get "unexpected_failure: Database error saving new user"
    expect(error?.message).not.toContain('Database error saving new user');
    expect(error?.message).not.toContain('unexpected_failure');

    // Cleanup
    if (data.user?.id) {
      await supabase.auth.admin.deleteUser(data.user.id);
    }
  });
});
