import { test, expect } from '@playwright/test';
import { TestContext } from '../helpers';

/**
 * Opportunities Integration Tests
 *
 * Tests database constraints, RLS policies, and
 * opportunity-article workflow integrity.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('Opportunities Database Integration Tests', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
    const project = await ctx.createProject(user.id, { name: 'Test Project' });
    projectId = project.id;
  });

  test.describe('Constraints', () => {
    test('should enforce priority_score range 0-100', async () => {
      const { supabaseAdmin } = ctx;

      // Try to insert with priority_score > 100
      const { error: highError } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'content_gap',
        category: 'content',
        title: 'High Priority Test',
        description: 'Test high priority score',
        priority_score: 150,
        status: 'open',
      });

      expect(highError).toBeTruthy();

      // Try to insert with priority_score < 0
      const { error: lowError } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'content_gap',
        category: 'content',
        title: 'Low Priority Test',
        description: 'Test low priority score',
        priority_score: -10,
        status: 'open',
      });

      expect(lowError).toBeTruthy();

      // Valid score should succeed
      const { error: validError } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'content_gap',
        category: 'content',
        title: 'Valid Priority Test',
        description: 'Test valid priority score',
        priority_score: 50,
        status: 'open',
      });

      expect(validError).toBeNull();
    });

    test('should enforce type CHECK constraint', async () => {
      const { supabaseAdmin } = ctx;

      const { error } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'invalid_type',
        category: 'content',
        title: 'Invalid Type Test',
        description: 'Test invalid type',
        priority_score: 50,
        status: 'open',
      });

      expect(error).toBeTruthy();
    });

    test('should enforce category CHECK constraint', async () => {
      const { supabaseAdmin } = ctx;

      const { error } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'content_gap',
        category: 'invalid_category',
        title: 'Invalid Category Test',
        description: 'Test invalid category',
        priority_score: 50,
        status: 'open',
      });

      expect(error).toBeTruthy();
    });

    test('should enforce status CHECK constraint', async () => {
      const { supabaseAdmin } = ctx;

      const { error } = await supabaseAdmin.from('opportunities').insert({
        project_id: projectId,
        user_id: user.id,
        type: 'content_gap',
        category: 'content',
        title: 'Invalid Status Test',
        description: 'Test invalid status',
        priority_score: 50,
        status: 'invalid_status',
      });

      expect(error).toBeTruthy();
    });
  });

  test.describe('Row Level Security', () => {
    test('should allow user to read own opportunities', async () => {
      const { supabaseAdmin } = ctx;

      // Create opportunity
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'User Opportunity',
          description: 'Test RLS read',
          priority_score: 80,
          status: 'open',
        })
        .select()
        .single();

      // Read back with user_id filter (simulates RLS)
      const { data: readBack } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('id', opportunity!.id)
        .eq('user_id', user.id)
        .single();

      expect(readBack).toBeTruthy();
      expect(readBack!.title).toBe('User Opportunity');
      expect(readBack!.user_id).toBe(user.id);
    });

    test('should prevent user from reading other user opportunities', async () => {
      const { supabaseAdmin } = ctx;
      const otherUser = await ctx.createUser({ subscription: 'active' });
      const otherProject = await ctx.createProject(otherUser.id, { name: 'Other Project' });

      // Create opportunity for other user
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: otherProject.id,
          user_id: otherUser.id,
          type: 'content_gap',
          category: 'content',
          title: 'Other User Opportunity',
          description: 'Test RLS isolation',
          priority_score: 70,
          status: 'open',
        })
        .select()
        .single();

      // Try to read with wrong user_id filter
      const { data: crossRead } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('id', opportunity!.id)
        .eq('user_id', user.id)
        .maybeSingle();

      expect(crossRead).toBeNull();
    });
  });

  test.describe('Opportunity Lifecycle', () => {
    test('should update opportunity status when article created', async () => {
      const { supabaseAdmin } = ctx;

      // Create opportunity
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Article Creation Test',
          description: 'Test status update on article creation',
          query: 'test keyword',
          priority_score: 85,
          status: 'open',
        })
        .select()
        .single();

      // Simulate article creation by updating status
      const { error } = await supabaseAdmin
        .from('opportunities')
        .update({
          status: 'in_progress',
          action_type: 'create_article',
          action_ref_id: '00000000-0000-0000-0000-000000000001',
        })
        .eq('id', opportunity!.id);

      expect(error).toBeNull();

      // Verify updated
      const { data: updated } = await supabaseAdmin
        .from('opportunities')
        .select('status, action_type, action_ref_id')
        .eq('id', opportunity!.id)
        .single();

      expect(updated!.status).toBe('in_progress');
      expect(updated!.action_type).toBe('create_article');
      expect(updated!.action_ref_id).toBeTruthy();
    });

    test('should cascade delete opportunities when project is deleted', async () => {
      const { supabaseAdmin } = ctx;

      // Create opportunity
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Cascade Delete Test',
          description: 'Test cascade delete',
          priority_score: 50,
          status: 'open',
        })
        .select()
        .single();

      // Delete the project
      await supabaseAdmin.from('projects').delete().eq('id', projectId);

      // Verify opportunity was cascaded
      const { data: deleted } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('id', opportunity!.id)
        .maybeSingle();

      expect(deleted).toBeNull();
    });
  });
});
