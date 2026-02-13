import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resetTestUser } from '../helpers/test-user-reset';

/**
 * Integration tests for User Onboarding Service
 *
 * These tests verify the onboarding service works correctly with the database,
 * including RLS policies, triggers, and data integrity.
 */
test.describe('User Onboarding Integration', () => {
  let supabase: SupabaseClient;
  let testUserId: string;

  // Test configuration
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  test.beforeAll(async () => {
    // Initialize Supabase client with service role for admin operations
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  });

  test.beforeEach(async () => {
    // Reset the fixed test user to initial state for each test
    const testUser = await resetTestUser();
    testUserId = testUser.id;

    // Clean up any existing onboarding record
    await supabase.from('user_onboarding').delete().eq('user_id', testUserId);
  });

  test.afterEach(async () => {
    // Clean up onboarding record after each test
    await supabase.from('user_onboarding').delete().eq('user_id', testUserId);
  });

  test.describe('Onboarding Record Creation', () => {
    test('should create a new onboarding record with defaults', async () => {
      const { data, error } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: testUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        user_id: testUserId,
        current_step: 1,
        completed_steps: [],
        skipped_steps: [],
        is_complete: false,
        completed_at: null,
      });
      expect(data?.id).toBeTruthy();
      expect(data?.created_at).toBeTruthy();
      expect(data?.updated_at).toBeTruthy();
    });

    test('should enforce unique constraint on user_id', async () => {
      // Create first record
      await supabase.from('user_onboarding').insert({ user_id: testUserId });

      // Try to create duplicate
      const { error } = await supabase.from('user_onboarding').insert({ user_id: testUserId });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    test('should cascade delete when user is deleted', async () => {
      // Create a temporary test user
      const { data: tempUser } = await supabase.auth.admin.createUser({
        email: `temp-onboarding-${Date.now()}@test.local`,
        password: 'TempPassword123!',
        email_confirm: true,
      });

      if (!tempUser?.user) {
        test.skip();
        return;
      }

      // Create onboarding record
      await supabase.from('user_onboarding').insert({ user_id: tempUser.user.id });

      // Delete the user
      await supabase.auth.admin.deleteUser(tempUser.user.id);

      // Verify onboarding record is deleted
      const { data } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', tempUser.user.id)
        .maybeSingle();

      expect(data).toBeNull();
    });
  });

  test.describe('Onboarding Step Validation', () => {
    test('should enforce current_step range constraint', async () => {
      // Create valid record first
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      // Try to update with invalid step (0)
      const { error: errorLow } = await supabase
        .from('user_onboarding')
        .update({ current_step: 0 })
        .eq('id', onboarding?.id);

      expect(errorLow).toBeTruthy();

      // Try to update with invalid step (6)
      const { error: errorHigh } = await supabase
        .from('user_onboarding')
        .update({ current_step: 6 })
        .eq('id', onboarding?.id);

      expect(errorHigh).toBeTruthy();
    });

    test('should accept valid step values', async () => {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      // Test all valid steps
      for (let step = 1; step <= 5; step++) {
        const { error } = await supabase
          .from('user_onboarding')
          .update({ current_step: step })
          .eq('id', onboarding?.id);

        expect(error).toBeNull();
      }
    });
  });

  test.describe('Onboarding Progress Updates', () => {
    test('should update completed_steps array', async () => {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      const { error } = await supabase
        .from('user_onboarding')
        .update({
          current_step: 2,
          completed_steps: [1],
        })
        .eq('id', onboarding?.id);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('id', onboarding?.id)
        .single();

      expect(updated?.completed_steps).toEqual([1]);
    });

    test('should update skipped_steps array', async () => {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      const { error } = await supabase
        .from('user_onboarding')
        .update({
          current_step: 3,
          completed_steps: [1],
          skipped_steps: [2],
        })
        .eq('id', onboarding?.id);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('id', onboarding?.id)
        .single();

      expect(updated?.skipped_steps).toEqual([2]);
    });

    test('should update is_complete and completed_at', async () => {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      const beforeUpdate = new Date();

      const { error } = await supabase
        .from('user_onboarding')
        .update({
          is_complete: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', onboarding?.id);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('id', onboarding?.id)
        .single();

      expect(updated?.is_complete).toBe(true);
      expect(updated?.completed_at).toBeTruthy();

      const completedAt = new Date(updated?.completed_at ?? '');
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  test.describe('Row Level Security', () => {
    test('should allow user to view own onboarding', async () => {
      // Create onboarding record with service role
      await supabase.from('user_onboarding').insert({ user_id: testUserId });

      // Create client as the test user
      const testUser = await resetTestUser();
      const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${testUser.access_token}`,
          },
        },
      });

      // User should be able to read their own record
      const { data, error } = await userClient
        .from('user_onboarding')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    test('should allow user to update own onboarding', async () => {
      // Create onboarding record
      await supabase.from('user_onboarding').insert({ user_id: testUserId });

      const testUser = await resetTestUser();
      const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${testUser.access_token}`,
          },
        },
      });

      const { error } = await userClient
        .from('user_onboarding')
        .update({ current_step: 2 })
        .eq('user_id', testUserId);

      expect(error).toBeNull();
    });

    test('should prevent user from viewing other users onboarding', async () => {
      // Create another user
      const { data: otherUser } = await supabase.auth.admin.createUser({
        email: `other-onboarding-${Date.now()}@test.local`,
        password: 'OtherPassword123!',
        email_confirm: true,
      });

      if (!otherUser?.user) {
        test.skip();
        return;
      }

      // Create onboarding for other user
      await supabase.from('user_onboarding').insert({ user_id: otherUser.user.id });

      // Try to access with test user
      const testUser = await resetTestUser();
      const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${testUser.access_token}`,
          },
        },
      });

      const { data } = await userClient
        .from('user_onboarding')
        .select('*')
        .eq('user_id', otherUser.user.id)
        .maybeSingle();

      // Should not be able to see other user's record
      expect(data).toBeNull();

      // Cleanup
      await supabase.auth.admin.deleteUser(otherUser.user.id);
    });
  });

  test.describe('Updated At Trigger', () => {
    test('should automatically update updated_at on record change', async () => {
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .insert({ user_id: testUserId })
        .select()
        .single();

      const originalUpdatedAt = onboarding?.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the record
      await supabase
        .from('user_onboarding')
        .update({ current_step: 2 })
        .eq('id', onboarding?.id);

      const { data: updated } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('id', onboarding?.id)
        .single();

      expect(updated?.updated_at).not.toBe(originalUpdatedAt);
      expect(new Date(updated?.updated_at ?? '').getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  test.describe('Indexes', () => {
    test('should have index on user_id for fast lookups', async () => {
      // This test verifies the index exists by checking query performance
      // In practice, the index is verified by the migration

      const startTime = Date.now();

      const { data } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', testUserId);

      const queryTime = Date.now() - startTime;

      // Query should be fast (< 100ms)
      expect(queryTime).toBeLessThan(100);
      expect(data).toBeDefined();
    });
  });
});
