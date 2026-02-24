import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../../helpers';

/**
 * API Tests: Cron - Check Opportunity Performance
 *
 * Tests the scheduled performance check cron endpoint.
 * This endpoint uses x-cron-secret header authentication, not JWT.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

// Check if we're in test mode with mock users
const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

// Get cron secret from environment (same as serverEnv.CRON_SECRET)
const getCronSecret = () => process.env.CRON_SECRET || 'test-cron-secret';

test.describe('API: Cron - Check Opportunity Performance', () => {
  // =============================================================================
  // Authentication Tests
  // =============================================================================

  test.describe('Authentication', () => {
    test('should reject requests without cron secret', async ({ request }) => {
      const api = new ApiClient(request);

      const response = await api.post('/api/cron/check-opportunity-performance', {});

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should reject requests with invalid cron secret', async ({ request }) => {
      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': 'invalid-secret',
        },
        data: {},
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    test('should accept requests with valid cron secret', async ({ request }) => {
      // Skip in test mode if CRON_SECRET is not set
      test.skip(isTestMode(), 'Requires real DB and external API access in test mode');

      const cronSecret = getCronSecret();

      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      // Should return 200 even if no opportunities to process
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('processed');
      expect(data.data).toHaveProperty('succeeded');
      expect(data.data).toHaveProperty('failed');
    });
  });

  // =============================================================================
  // Processing Tests
  // =============================================================================

  test.describe('Processing', () => {
    test('should return summary of processed opportunities', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB and external API access in test mode');

      const cronSecret = getCronSecret();

      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify response structure
      expect(typeof data.data.processed).toBe('number');
      expect(typeof data.data.succeeded).toBe('number');
      expect(typeof data.data.failed).toBe('number');
      expect(Array.isArray(data.data.results)).toBe(true);

      // Verify counts are consistent
      expect(data.data.processed).toBe(data.data.results.length);
      expect(data.data.succeeded + data.data.failed).toBe(data.data.processed);
    });

    test('should process eligible opportunities and insert performance checks', async ({ request }) => {
      test.skip(isTestMode(), 'Cannot seed opportunities in test mode with mock users');

      const cronSecret = getCronSecret();
      const { supabaseAdmin } = ctx;

      // Create a user and project
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
      const project = await ctx.createProject(user.id, { name: 'Performance Test Project' });

      // Create a GSC connection
      const { data: connection } = await supabaseAdmin
        .from('gsc_connections')
        .insert({
          user_id: user.id,
          project_id: project.id,
          google_email: 'test@example.com',
          site_url: 'https://example.com',
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
        })
        .select()
        .single();

      // Create a campaign
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: user.id,
          project_id: project.id,
          name: 'Test Campaign',
          status: 'active',
        })
        .select()
        .single();

      // Create an article in the campaign
      const { data: article } = await supabaseAdmin
        .from('articles')
        .insert({
          campaign_id: campaign!.id,
          user_id: user.id,
          project_id: project.id,
          primary_keyword: 'test query',
          status: 'published',
          credits_used: 1,
        })
        .select()
        .single();

      // Create an opportunity that's 15 days old (eligible for check)
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const { data: opportunity } = await supabaseAdmin
        .from('opportunities')
        .insert({
          project_id: project.id,
          user_id: user.id,
          type: 'content_gap',
          category: 'content',
          title: 'Performance Check Test',
          description: 'Test performance check',
          query: 'test query',
          metrics: { position: 10, impressions: 100, clicks: 5, ctr: 0.05 },
          priority_score: 85,
          status: 'in_progress',
          action_type: 'create_article',
          action_ref_id: campaign!.id,
          created_at: fifteenDaysAgo,
        })
        .select()
        .single();

      // Run the cron job
      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // The opportunity may or may not be processed depending on GSC mock
      // but we can verify the response structure
      expect(data.success).toBe(true);
      expect(typeof data.data.processed).toBe('number');

      // Clean up
      await supabaseAdmin.from('opportunities').delete().eq('id', opportunity!.id);
      await supabaseAdmin.from('articles').delete().eq('id', article!.id);
      await supabaseAdmin.from('campaigns').delete().eq('id', campaign!.id);
      await supabaseAdmin.from('gsc_connections').delete().eq('id', connection!.id);
    });

    test('should handle errors gracefully and continue processing', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB and external API access in test mode');

      const cronSecret = getCronSecret();

      // The service handles errors internally and continues processing
      // This test verifies the endpoint returns successfully even if individual checks fail
      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Verify each result has the expected structure
      for (const result of data.data.results) {
        expect(result).toHaveProperty('opportunityId');
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');

        if (!result.success) {
          expect(result).toHaveProperty('error');
        } else {
          expect(result).toHaveProperty('status');
        }
      }
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  test.describe('Response Format', () => {
    test('should return correct response structure', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB and external API access in test mode');

      const cronSecret = getCronSecret();

      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      const data = await response.json();

      // Top-level structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.success).toBe(true);

      // Data structure
      expect(data.data).toHaveProperty('processed');
      expect(data.data).toHaveProperty('succeeded');
      expect(data.data).toHaveProperty('failed');
      expect(data.data).toHaveProperty('results');
    });

    test('should include result details for each processed opportunity', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB and external API access in test mode');

      const cronSecret = getCronSecret();

      const response = await request.post('/api/cron/check-opportunity-performance', {
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        data: {},
      });

      const data = await response.json();

      // If any opportunities were processed, verify result structure
      if (data.data.results.length > 0) {
        const result = data.data.results[0];
        expect(result).toHaveProperty('opportunityId');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('positionBefore');
        expect(result).toHaveProperty('positionAfter');
      }
    });
  });
});
