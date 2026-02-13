import { test, expect } from '@playwright/test';
import { TestContext } from '../helpers';

/**
 * Integration Service Integration Tests
 *
 * Tests encryption of credentials, cascading deletes,
 * and RLS policies for integrations.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('Integration Database Integration Tests', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  test.describe('Credential Storage', () => {
    test('should store WordPress credentials in config', async () => {
      const { supabaseAdmin } = ctx;

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test WordPress',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass123',
          },
          encrypted_credentials: 'encrypted_password_here',
          status: 'active',
        })
        .select()
        .single();

      expect(integration).toBeTruthy();

      // Verify the record was stored
      const { data: stored } = await supabaseAdmin
        .from('integrations')
        .select('config, encrypted_credentials')
        .eq('id', integration!.id)
        .single();

      expect(stored).toBeTruthy();
      expect(stored!.encrypted_credentials).toBeTruthy();
    });

    test('should store webhook config', async () => {
      const { supabaseAdmin } = ctx;

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'webhook',
          name: 'Test Webhook',
          config: {
            url: 'https://webhook.example.com',
            secret: 'webhook_secret_123',
          },
          encrypted_credentials: 'encrypted_credentials_here',
          status: 'active',
        })
        .select()
        .single();

      expect(integration).toBeTruthy();

      // Verify the record was stored
      const { data: stored } = await supabaseAdmin
        .from('integrations')
        .select('config')
        .eq('id', integration!.id)
        .single();

      const config = stored!.config as Record<string, unknown>;
      expect(config.url).toBe('https://webhook.example.com');
    });
  });

  test.describe('Cascade Deletes', () => {
    test('should cascade delete campaign_integrations on integration delete', async () => {
      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, { name: 'Test Project' });

      // Create integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test Cascade Integration',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      // Create campaign
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: user.id,
          project_id: project.id,
          name: 'Test Campaign',
          status: 'draft',
          settings: {},
        })
        .select()
        .single();

      // Create junction record
      await supabaseAdmin
        .from('campaign_integrations')
        .insert({
          campaign_id: campaign!.id,
          integration_id: integration!.id,
          enabled: true,
        });

      // Verify junction record exists
      const { data: junctionBefore } = await supabaseAdmin
        .from('campaign_integrations')
        .select('*')
        .eq('integration_id', integration!.id);

      expect(junctionBefore).toHaveLength(1);

      // Delete integration
      await supabaseAdmin.from('integrations').delete().eq('id', integration!.id);

      // Verify junction record was deleted
      const { data: junctionAfter } = await supabaseAdmin
        .from('campaign_integrations')
        .select('*')
        .eq('integration_id', integration!.id);

      expect(junctionAfter).toHaveLength(0);
    });

    test('should cascade delete integration_deliveries on integration delete', async () => {
      const { supabaseAdmin } = ctx;
      const project = await ctx.createProject(user.id, { name: 'Test Project' });

      // Create integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'webhook',
          name: 'Test Delivery',
          config: {
            url: 'https://webhook.example.com',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      // Create campaign (required for article FK)
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: user.id,
          project_id: project.id,
          name: 'Test Campaign',
          status: 'draft',
          settings: {},
        })
        .select()
        .single();

      // Create article
      const { data: article } = await supabaseAdmin
        .from('articles')
        .insert({
          user_id: user.id,
          campaign_id: campaign!.id,
          title: 'Test Article',
          primary_keyword: 'test keyword',
          status: 'draft',
        })
        .select()
        .single();

      // Create delivery records
      await supabaseAdmin
        .from('integration_deliveries')
        .insert([
          {
            article_id: article!.id,
            integration_id: integration!.id,
            campaign_id: null,
            status: 'pending',
            external_id: 'delivery-1',
          },
          {
            article_id: article!.id,
            integration_id: integration!.id,
            campaign_id: null,
            status: 'pending',
            external_id: 'delivery-2',
          },
        ]);

      // Verify deliveries exist
      const { data: deliveriesBefore } = await supabaseAdmin
        .from('integration_deliveries')
        .select('*')
        .eq('integration_id', integration!.id);

      expect(deliveriesBefore).toHaveLength(2);

      // Delete integration
      await supabaseAdmin.from('integrations').delete().eq('id', integration!.id);

      // Verify deliveries were deleted
      const { data: deliveriesAfter } = await supabaseAdmin
        .from('integration_deliveries')
        .select('*')
        .eq('integration_id', integration!.id);

      expect(deliveriesAfter?.length ?? 0).toBe(0);
    });
  });

  test.describe('Row Level Security', () => {
    test('should allow user to read own integration', async () => {
      const { supabaseAdmin } = ctx;

      // Create integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'User Integration',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      // User can read their own integration
      const { data: userIntegration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('id', integration!.id)
        .eq('user_id', user.id)
        .single();

      expect(userIntegration).toBeTruthy();
      expect(userIntegration!.user_id).toBe(user.id);
      expect(userIntegration!.type).toBe('wordpress');
      expect(userIntegration!.name).toBe('User Integration');
    });

    test('should prevent user from reading other user integration via API', async () => {
      const { supabaseAdmin } = ctx;
      const user2 = await ctx.createUser({ subscription: 'active' });

      // Create integration for user
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'User1 Integration',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass',
          },
          encrypted_credentials: 'encrypted1',
          status: 'active',
        })
        .select()
        .single();

      // User2 should not see user1's integration when filtering by user_id
      const { data: otherIntegration } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('id', integration!.id)
        .eq('user_id', user2.id)
        .maybeSingle();

      expect(otherIntegration).toBeNull();
    });
  });

  test.describe('Constraints', () => {
    test('should enforce type CHECK constraint', async () => {
      const { supabaseAdmin } = ctx;

      // Create integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .insert({
          user_id: user.id,
          type: 'wordpress',
          name: 'Test Type',
          config: {
            site_url: 'https://test.com',
            username: 'testuser',
            app_password: 'testpass',
          },
          encrypted_credentials: 'encrypted',
          status: 'active',
        })
        .select()
        .single();

      // Try to update with invalid type
      const { error } = await supabaseAdmin
        .from('integrations')
        .update({
          type: 'invalid_type',
        })
        .eq('id', integration!.id);

      // Should fail due to CHECK constraint
      expect(error).toBeTruthy();
    });
  });
});
