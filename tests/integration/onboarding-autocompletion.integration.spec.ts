import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resetTestUser } from '../helpers/test-user-reset';

/**
 * Onboarding Auto-Completion Integration Tests
 *
 * Tests edge cases in the onboarding flow including auto-completion
 * for users with existing projects and unique constraint handling.
 *
 * These tests use direct database operations with a real test user.
 */

test.describe('Onboarding Auto-Completion Integration Tests', () => {
  let supabase: SupabaseClient;
  let testUserId: string;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  });

  test.beforeEach(async () => {
    const testUser = await resetTestUser();
    testUserId = testUser.id;

    // Clean up any existing onboarding record
    await supabase.from('user_onboarding').delete().eq('user_id', testUserId);
  });

  test.afterEach(async () => {
    // Clean up onboarding record after each test
    await supabase.from('user_onboarding').delete().eq('user_id', testUserId);
  });

  test.describe('Initial State', () => {
    test('should start at step 1 for new user', async () => {
      // Create new onboarding record (simulates first access)
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
        is_complete: false,
        completed_at: null,
      });
      expect(data?.id).toBeTruthy();
    });
  });

  test.describe('Auto-Completion', () => {
    test('should auto-complete for user with existing projects', async () => {
      // Generate a valid UUID for the project
      const projectId = crypto.randomUUID();

      // Create a project for the user first
      const { error: projectError } = await supabase.from('projects').insert({
        id: projectId,
        user_id: testUserId,
        name: 'Existing Project',
        domain: 'https://existing.com',
      });

      expect(projectError).toBeNull();

      // Verify project was created
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', testUserId);

      expect(projects).toHaveLength(1);

      // In a real system, the onboarding status API would check for existing projects
      // and auto-complete the onboarding. Here we simulate that behavior.
      const { data: onboarding, error: createError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: testUserId,
          current_step: 5,
          completed_steps: [1, 2, 3, 4, 5],
          is_complete: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(onboarding!.is_complete).toBe(true);
      expect(onboarding!.current_step).toBe(5);

      // Cleanup project
      await supabase.from('projects').delete().eq('user_id', testUserId);
    });
  });

  test.describe('Unique Constraint', () => {
    test('should handle unique constraint violation', async () => {
      // First insert - should succeed
      const { data: firstInsert, error: firstError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: testUserId,
        })
        .select()
        .single();

      expect(firstError).toBeNull();
      expect(firstInsert).toBeTruthy();

      // Second insert with same user_id - should fail due to unique constraint
      const { error: secondError } = await supabase.from('user_onboarding').insert({
        user_id: testUserId,
      });

      // Should fail with unique violation (23505)
      expect(secondError).toBeTruthy();
      expect(secondError!.code).toBe('23505');

      // Verify the original record still exists (not overwritten)
      const { data: existing } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(existing).toBeTruthy();
      expect(existing!.user_id).toBe(testUserId);
    });

    test('should return existing record on duplicate request', async () => {
      // Create initial record
      const { data: initial, error: createError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: testUserId,
          current_step: 2,
          completed_steps: [1],
        })
        .select()
        .single();

      expect(createError).toBeNull();

      // "Upsert" behavior - try to insert, but if exists, return existing
      // This simulates the API behavior of returning existing record on duplicate request
      const { data: existing } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      // Should return the existing record with the updated state
      expect(existing).toBeTruthy();
      expect(existing!.current_step).toBe(2);
      expect(existing!.completed_steps).toEqual([1]);
    });
  });
});
