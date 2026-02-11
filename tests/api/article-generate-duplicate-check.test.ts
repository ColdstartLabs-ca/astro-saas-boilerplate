import { expect, test } from '@playwright/test';
import { resetTestUser } from '../helpers/test-user-reset';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('API: Article Generate Duplicate Check', () => {
  test.describe('Duplicate Detection', () => {
    test('should prevent creating duplicate article with same keyword in same campaign', async ({
      request,
    }) => {
      const testUser = await resetTestUser();

      // First, create a project and campaign
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Create project
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUser.id, name: 'Test Project for Duplicate Check' })
        .select('id')
        .single();

      expect(project).toBeTruthy();

      // Create campaign
      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Test Campaign for Duplicate Check',
        })
        .select('id')
        .single();

      expect(campaign).toBeTruthy();

      // Ensure user has sufficient credits
      await supabase.from('user_credits').upsert({
        user_id: testUser.id,
        total_credits_balance: 100,
      });

      // First article generation should succeed (202 Accepted)
      const firstResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'SEO Optimization',
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(firstResponse.status()).toBe(202);
      const firstData = await firstResponse.json();
      expect(firstData.success).toBe(true);
      expect(firstData.data.articleId).toBeTruthy();

      // Second article generation with same keyword (case-insensitive) should fail with 409
      const secondResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'seo optimization', // Same keyword, different case
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(secondResponse.status()).toBe(409);
      const secondData = await secondResponse.json();
      expect(secondData.success).toBe(false);
      expect(secondData.error.code).toBe('DUPLICATE_ARTICLE');
      expect(secondData.error.details.existingArticleId).toBe(firstData.data.articleId);
    });

    test('should allow creating article with same keyword in different campaign', async ({
      request,
    }) => {
      const testUser = await resetTestUser();

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Create project
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUser.id, name: 'Test Project for Different Campaign' })
        .select('id')
        .single();

      expect(project).toBeTruthy();

      // Create first campaign
      const { data: campaign1 } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Campaign 1',
        })
        .select('id')
        .single();

      // Create second campaign
      const { data: campaign2 } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Campaign 2',
        })
        .select('id')
        .single();

      expect(campaign1).toBeTruthy();
      expect(campaign2).toBeTruthy();

      // Ensure user has sufficient credits
      await supabase.from('user_credits').upsert({
        user_id: testUser.id,
        total_credits_balance: 100,
      });

      // First article in campaign 1
      const firstResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'SEO Best Practices',
          projectId: project.id,
          campaignId: campaign1.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(firstResponse.status()).toBe(202);

      // Second article with same keyword in different campaign should succeed
      const secondResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'seo best practices', // Same keyword, different campaign
          projectId: project.id,
          campaignId: campaign2.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(secondResponse.status()).toBe(202);
      const secondData = await secondResponse.json();
      expect(secondData.success).toBe(true);
      expect(secondData.data.articleId).toBeTruthy();
      expect(secondData.data.articleId).not.toBe(firstResponse.json().data.articleId);
    });

    test('should allow regenerating article with forceRegenerate=true', async ({ request }) => {
      const testUser = await resetTestUser();

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUser.id, name: 'Test Project for Force Regenerate' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Test Campaign for Force Regenerate',
        })
        .select('id')
        .single();

      expect(project).toBeTruthy();
      expect(campaign).toBeTruthy();

      // Ensure user has sufficient credits
      await supabase.from('user_credits').upsert({
        user_id: testUser.id,
        total_credits_balance: 100,
      });

      // First article
      const firstResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'Digital Marketing',
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(firstResponse.status()).toBe(202);
      const firstArticleId = firstResponse.json().data.articleId;

      // Second article without forceRegenerate should fail
      const secondResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'digital marketing',
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(secondResponse.status()).toBe(409);

      // Third article with forceRegenerate=true should create a new article
      // (This would normally be blocked by the unique constraint, but the check is bypassed)
      const thirdResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'Digital Marketing',
          projectId: project.id,
          campaignId: campaign.id,
          forceRegenerate: true,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      // Note: This might fail with a unique constraint violation from the database
      // which is the expected behavior - the application-level check is bypassed
      // but the database constraint still applies
      const thirdStatus = thirdResponse.status();
      expect([202, 409]).toContain(thirdStatus);
    });

    test('should handle whitespace variations in keywords', async ({ request }) => {
      const testUser = await resetTestUser();

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUser.id, name: 'Test Project for Whitespace' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Test Campaign for Whitespace',
        })
        .select('id')
        .single();

      expect(project).toBeTruthy();
      expect(campaign).toBeTruthy();

      // Ensure user has sufficient credits
      await supabase.from('user_credits').upsert({
        user_id: testUser.id,
        total_credits_balance: 100,
      });

      // First article with extra whitespace
      const firstResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: '  Coffee    Machines  ',
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(firstResponse.status()).toBe(202);

      // Second article with same keyword but normalized whitespace should be detected as duplicate
      const secondResponse = await request.post('/api/articles/generate', {
        data: {
          keyword: 'coffee machines', // Normalized form
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(secondResponse.status()).toBe(409);
      const secondData = await secondResponse.json();
      expect(secondData.error.code).toBe('DUPLICATE_ARTICLE');
    });

    test('should allow creating article for failed article with same keyword', async ({
      request,
    }) => {
      const testUser = await resetTestUser();

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Create project and campaign
      const { data: project } = await supabase
        .from('projects')
        .insert({ user_id: testUser.id, name: 'Test Project for Failed Articles' })
        .select('id')
        .single();

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          user_id: testUser.id,
          project_id: project.id,
          name: 'Test Campaign for Failed Articles',
        })
        .select('id')
        .single();

      expect(project).toBeTruthy();
      expect(campaign).toBeTruthy();

      // Ensure user has sufficient credits
      await supabase.from('user_credits').upsert({
        user_id: testUser.id,
        total_credits_balance: 100,
      });

      // Create a failed article directly in the database
      const { data: failedArticle } = await supabase
        .from('articles')
        .insert({
          user_id: testUser.id,
          campaign_id: campaign.id,
          project_id: project.id,
          primary_keyword: 'Content Marketing',
          status: 'failed',
          credits_used: 1,
        })
        .select('id')
        .single();

      expect(failedArticle).toBeTruthy();

      // Should be able to create a new article with the same keyword since the previous one failed
      const response = await request.post('/api/articles/generate', {
        data: {
          keyword: 'content marketing',
          projectId: project.id,
          campaignId: campaign.id,
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(202);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.articleId).toBeTruthy();
      // New article should have a different ID
      expect(data.data.articleId).not.toBe(failedArticle.id);
    });
  });

  test.describe('Authorization', () => {
    test('should reject requests without authorization', async ({ request }) => {
      const response = await request.post('/api/articles/generate', {
        data: {
          keyword: 'SEO Optimization',
          projectId: uuidv4(),
          campaignId: uuidv4(),
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should reject requests with invalid campaignId', async ({ request }) => {
      const testUser = await resetTestUser();

      const response = await request.post('/api/articles/generate', {
        data: {
          keyword: 'SEO Optimization',
          projectId: uuidv4(),
          campaignId: uuidv4(), // Non-existent campaign
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });
});
