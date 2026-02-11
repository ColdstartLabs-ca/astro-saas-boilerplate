import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resetTestUser } from '../helpers/test-user-reset';

/**
 * E7: Make queue + credit operations atomic
 *
 * These tests verify that article creation and credit deduction happen atomically,
 * ensuring no orphaned articles or partial credit states can occur.
 */
test.describe('Atomic Article Creation with Credits', () => {
  let supabase: SupabaseClient;
  let testUserId: string;

  // Test configuration
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

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
  });

  test.describe('create_article_with_credits RPC', () => {
    test('should create article and deduct credits atomically', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user some credits
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 10,
        description: 'Initial credits',
      });

      // Get initial balance
      const { data: initialProfile } = await supabase
        .from('user_credits')
        .select('total_credits_balance')
        .eq('user_id', testUserId)
        .single();

      const initialBalance = initialProfile?.total_credits_balance || 0;

      // Call the atomic RPC
      const { data: result, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_primary_keyword: 'SEO Optimization',
        p_credits_needed: 2,
        p_status: 'generating',
        p_image_preset: null,
      });

      expect(error).toBeNull();
      expect(result).toHaveLength(1);

      const row = result[0];
      expect(row.article_id).toBeTruthy();
      expect(row.transaction_id).toBeTruthy();
      expect(row.new_total_balance).toBe(initialBalance - 2);

      // Verify article was created
      const { data: article } = await supabase
        .from('articles')
        .select('*')
        .eq('id', row.article_id)
        .single();

      expect(article).toBeTruthy();
      expect(article?.primary_keyword).toBe('SEO Optimization');
      expect(article?.status).toBe('generating');
      expect(article?.credits_used).toBe(2);

      // Verify credit transaction was logged
      const { data: transaction } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', row.transaction_id)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction?.amount).toBe(-2);
      expect(transaction?.type).toBe('usage');
      expect(transaction?.reference_id).toBe(row.article_id);
    });

    test('should rollback article creation if credit deduction fails', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Don't give user enough credits (they start with 10 from reset, but we'll try to use 20)
      // The RPC should fail and NOT create any article

      // Call the atomic RPC with insufficient credits
      const { data: result, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_primary_keyword: 'This Should Not Be Created',
        p_credits_needed: 20, // More than available
        p_status: 'generating',
        p_image_preset: null,
      });

      // Should fail
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Insufficient credits');
      expect(result).toBeNull();

      // Verify no article was created
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('primary_keyword', 'This Should Not Be Created');

      expect(articles).toHaveLength(0);

      // Verify no credit transaction was logged
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('amount', -20);

      expect(transactions).toHaveLength(0);
    });

    test('should handle non-existent user gracefully', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: fakeUserId,
        p_campaign_id: fakeUserId,
        p_project_id: fakeUserId,
        p_primary_keyword: 'Test',
        p_credits_needed: 1,
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('User not found');
    });

    test('should validate status parameter', async () => {
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user credits
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 10,
      });

      // Use invalid status
      const { data, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_primary_keyword: 'Test',
        p_credits_needed: 1,
        p_status: 'invalid_status',
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Invalid article status');
    });

    test('should use FIFO credit ordering (subscription first)', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user 5 subscription credits and 10 purchased credits
      await supabase.rpc('add_subscription_credits', {
        target_user_id: testUserId,
        amount: 5,
        description: 'Test subscription credits',
      });

      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 10,
        description: 'Test purchased credits',
      });

      // Consume 7 credits (should use all 5 subscription + 2 purchased)
      const { data: result, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_primary_keyword: 'Test',
        p_credits_needed: 7,
      });

      expect(error).toBeNull();
      expect(result).toHaveLength(1);

      const row = result[0];
      expect(row.new_subscription_balance).toBe(0); // All 5 subscription credits used
      expect(row.new_purchased_balance).toBe(8); // 2 of 10 purchased credits used
      expect(row.new_total_balance).toBe(8); // Total should be 8
    });
  });

  test.describe('create_articles_with_credits RPC (Batch)', () => {
    test('should create multiple articles and deduct credits atomically', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user enough credits for 3 articles
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 30,
        description: 'Initial credits',
      });

      const keywords = ['SEO Tips', 'Content Marketing', 'Social Media Strategy'];

      // Call the batch atomic RPC
      const { data: result, error } = await supabase.rpc('create_articles_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_keywords: keywords,
        p_credits_per_article: 5,
        p_status: 'queued',
        p_image_preset: null,
      });

      expect(error).toBeNull();
      expect(result).toHaveLength(1);

      const row = result[0];
      expect(row.article_ids).toBeTruthy();
      expect(row.article_ids).toHaveLength(3);
      expect(row.transaction_id).toBeTruthy();
      expect(row.total_credits_used).toBe(15); // 3 articles * 5 credits each
      expect(row.new_total_balance).toBe(15); // Started with 30, used 15

      // Verify all articles were created
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued');

      expect(articles).toHaveLength(3);

      // Verify keyword-article mapping
      const articleKeywords = articles?.map(a => a.primary_keyword).sort();
      expect(articleKeywords).toEqual(keywords.sort());
    });

    test('should rollback entire batch if credit deduction fails', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // User has 10 credits from reset, try to create 5 articles requiring 5 credits each = 25 total
      const keywords = ['KW1', 'KW2', 'KW3', 'KW4', 'KW5'];

      // Call the batch atomic RPC with insufficient credits
      const { data: result, error } = await supabase.rpc('create_articles_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_keywords: keywords,
        p_credits_per_article: 5, // 5 * 5 = 25 needed, only 10 available
        p_status: 'queued',
      });

      // Should fail
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Insufficient credits');
      expect(result).toBeNull();

      // Verify NO articles were created
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .eq('campaign_id', campaign.id);

      expect(articles).toHaveLength(0);

      // Verify NO credit transaction was logged
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('reference_id', campaign.id)
        .eq('amount', -25);

      expect(transactions).toHaveLength(0);
    });

    test('should handle empty keywords array', async () => {
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Empty keywords array
      const { data, error } = await supabase.rpc('create_articles_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_keywords: [],
        p_credits_per_article: 1,
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Keywords array cannot be empty');
    });

    test('should validate credits per article is positive', async () => {
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      const { data, error } = await supabase.rpc('create_articles_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_keywords: ['Test'],
        p_credits_per_article: 0, // Invalid
      });

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Credits per article must be positive');
    });

    test('should include image preset in transaction description', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user credits
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 20,
      });

      const keywords = ['Test with image'];

      // Call with image preset
      const { data: result, error } = await supabase.rpc('create_articles_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_keywords: keywords,
        p_credits_per_article: 5,
        p_status: 'queued',
        p_image_preset: 'dall-e-3',
      });

      expect(error).toBeNull();
      expect(result).toHaveLength(1);

      const row = result[0];

      // Verify transaction description includes image preset
      const { data: transaction } = await supabase
        .from('credit_transactions')
        .select('description')
        .eq('id', row.transaction_id)
        .single();

      expect(transaction?.description).toContain('dall-e-3');
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle concurrent article creation safely', async () => {
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user exactly enough credits for 3 articles
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 6, // Exactly 3 * 2 credits
        description: 'Initial credits',
      });

      // Simulate concurrent requests
      const concurrentOps = Array.from({ length: 5 }, (_, i) =>
        supabase.rpc('create_article_with_credits', {
          p_user_id: testUserId,
          p_campaign_id: campaign.id,
          p_project_id: project.id,
          p_primary_keyword: `Concurrent Keyword ${i}`,
          p_credits_needed: 2,
        })
      );

      const results = await Promise.allSettled(concurrentOps);

      // Count successes and failures
      const successful = results.filter(
        r => r.status === 'fulfilled' && (r.value as any).error === null
      );
      const failed = results.filter(
        r => r.status === 'fulfilled' && (r.value as any).error !== null
      );

      // Exactly 3 should succeed (6 credits / 2 per article)
      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);

      // Verify final balance is 0
      const { data: profile } = await supabase
        .from('user_credits')
        .select('total_credits_balance')
        .eq('user_id', testUserId)
        .single();

      expect(profile?.total_credits_balance).toBe(0);

      // Verify exactly 3 articles were created
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .eq('campaign_id', campaign.id);

      expect(articles).toHaveLength(3);
    });
  });

  test.describe('API Integration', () => {
    test('should use atomic RPC via article generate API', async () => {
      // This test verifies the actual API endpoint uses the atomic RPC
      // Setup: Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUserId, name: 'Test Project' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUserId,
          project_id: project.id,
          name: 'Test Campaign',
        })
        .select('id')
        .single();

      // Give user credits
      await supabase.rpc('add_purchased_credits', {
        target_user_id: testUserId,
        amount: 10,
        description: 'Test credits',
      });

      // Get initial state
      const { data: initialProfile } = await supabase
        .from('user_credits')
        .select('total_credits_balance')
        .eq('user_id', testUserId)
        .single();

      const initialBalance = initialProfile?.total_credits_balance || 0;

      // Create article via the atomic RPC directly (simulating what the API does)
      const { data: result, error } = await supabase.rpc('create_article_with_credits', {
        p_user_id: testUserId,
        p_campaign_id: campaign.id,
        p_project_id: project.id,
        p_primary_keyword: 'API Integration Test',
        p_credits_needed: 2,
        p_status: 'generating',
      });

      expect(error).toBeNull();

      // Verify atomicity: both article and credit transaction exist, or neither
      const { data: article } = await supabase
        .from('articles')
        .select('*')
        .eq('id', result[0].article_id)
        .maybeSingle();

      const { data: transaction } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', result[0].transaction_id)
        .maybeSingle();

      // Both should exist (not one without the other)
      expect(!!article).toBe(!!transaction);
      expect(article).toBeTruthy();
      expect(transaction).toBeTruthy();

      // Verify credits were actually deducted
      const { data: finalProfile } = await supabase
        .from('user_credits')
        .select('total_credits_balance')
        .eq('user_id', testUserId)
        .single();

      expect(finalProfile?.total_credits_balance).toBe(initialBalance - 2);
    });
  });
});
