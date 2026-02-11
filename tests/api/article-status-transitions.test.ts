/**
 * API: Article Status Transition Tests
 *
 * Tests for the article status transition state machine enforcement via the PATCH endpoint.
 * Covers all valid and invalid transitions as per the state machine.
 */

import { expect, test } from '@playwright/test';
import { resetTestUser } from '../helpers/test-user-reset';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('API: Article Status Transition Rules', () => {
  let testUser: { id: string; email: string; access_token: string };
  let testArticleId: string;
  let testCampaignId: string;
  let testProjectId: string;

  test.beforeAll(async () => {
    testUser = await resetTestUser();

    // Create test project, campaign, and article
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Create project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        user_id: testUser.id,
        name: 'Test Project for Status Transitions',
        target_audience: 'General',
        tone: 'professional',
      })
      .select('id')
      .single();

    testProjectId = project!.id;

    // Create campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        user_id: testUser.id,
        project_id: testProjectId,
        name: 'Test Campaign for Status Transitions',
      })
      .select('id')
      .single();

    testCampaignId = campaign!.id;

    // Create article in queued status
    const { data: article } = await supabase
      .from('articles')
      .insert({
        user_id: testUser.id,
        campaign_id: testCampaignId,
        primary_keyword: 'status transition test',
        status: 'queued',
        credits_used: 1,
      })
      .select('id')
      .single();

    testArticleId = article!.id;
  });

  test.afterAll(async () => {
    // Cleanup test data
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    await supabase.from('articles').delete().eq('id', testArticleId);
    await supabase.from('campaigns').delete().eq('id', testCampaignId);
    await supabase.from('projects').delete().eq('id', testProjectId);
  });

  // ===========================================================================
  // Valid Transitions
  // ===========================================================================

  test.describe('Valid Transitions', () => {
    test('queued -> generating: valid transition', async ({ request }) => {
      // Reset article to queued
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'queued' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'generating' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('generating');
    });

    test('generating -> draft: valid transition (success)', async ({ request }) => {
      // Set article to generating
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'generating' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('draft');
    });

    test('generating -> failed: valid transition (error)', async ({ request }) => {
      // Set article to generating
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'generating' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'failed',
          generation_error: 'Test generation error',
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('failed');
    });

    test('draft -> approved: valid transition', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'approved' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('approved');
    });

    test('draft -> rejected: valid transition', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'rejected',
          rejection_reason: 'Test rejection reason',
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('rejected');
    });

    test('approved -> reviewed: valid transition', async ({ request }) => {
      // Set article to approved
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'approved' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'reviewed' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('reviewed');
    });

    test('reviewed -> approved: valid transition (send back)', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'approved' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('approved');
    });

    test('reviewed -> published: valid transition with URL and timestamp', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const publishedUrl = 'https://example.com/test-article';
      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'published',
          published_url: publishedUrl,
          published_at: new Date().toISOString(),
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('published');
      expect(data.data.article.published_url).toBe(publishedUrl);
      expect(data.data.article.published_at).toBeTruthy();
    });

    test('rejected -> queued: valid transition (retry)', async ({ request }) => {
      // Set article to rejected
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'rejected' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'queued' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('queued');
    });

    test('failed -> queued: valid transition (retry)', async ({ request }) => {
      // Set article to failed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'failed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'queued' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('queued');
    });
  });

  // ===========================================================================
  // Invalid Transitions
  // ===========================================================================

  test.describe('Invalid Transitions', () => {
    test('queued -> draft: invalid transition (skip generating)', async ({ request }) => {
      // Set article to queued
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'queued' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('queued');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual(['generating']);
    });

    test('generating -> approved: invalid transition (skip draft)', async ({ request }) => {
      // Set article to generating
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'generating' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'approved' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('generating');
      expect(data.error.details.to).toBe('approved');
      expect(data.error.details.validTransitions).toEqual(['draft', 'failed']);
    });

    test('draft -> reviewed: invalid transition (skip approved)', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'reviewed' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('draft');
      expect(data.error.details.to).toBe('reviewed');
      expect(data.error.details.validTransitions).toEqual(['approved', 'rejected']);
    });

    test('draft -> published: invalid transition (skip approval flow)', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'published',
          published_url: 'https://example.com/test',
          published_at: new Date().toISOString(),
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('draft');
      expect(data.error.details.to).toBe('published');
      expect(data.error.details.validTransitions).toEqual(['approved', 'rejected']);
    });

    test('approved -> draft: invalid transition (backwards)', async ({ request }) => {
      // Set article to approved
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'approved' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('approved');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual(['reviewed']);
    });

    test('approved -> published: invalid transition (skip reviewed)', async ({ request }) => {
      // Set article to approved
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'approved' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'published',
          published_url: 'https://example.com/test',
          published_at: new Date().toISOString(),
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('approved');
      expect(data.error.details.to).toBe('published');
      expect(data.error.details.validTransitions).toEqual(['reviewed']);
    });

    test('reviewed -> draft: invalid transition (too far back)', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('reviewed');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual(['approved', 'published']);
    });

    test('reviewed -> rejected: invalid transition', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'rejected' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    test('rejected -> draft: invalid transition (skip retry)', async ({ request }) => {
      // Set article to rejected
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'rejected' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('rejected');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual(['queued']);
    });

    test('failed -> draft: invalid transition (skip retry)', async ({ request }) => {
      // Set article to failed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'failed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('failed');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual(['queued']);
    });

    test('published -> draft: invalid transition (terminal state)', async ({ request }) => {
      // Set article to published
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase
        .from('articles')
        .update({
          status: 'published',
          published_url: 'https://example.com/test',
          published_at: new Date().toISOString(),
        })
        .eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('published');
      expect(data.error.details.to).toBe('draft');
      expect(data.error.details.validTransitions).toEqual([]);
    });

    test('published -> reviewed: invalid transition (terminal state)', async ({ request }) => {
      // Set article to published
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase
        .from('articles')
        .update({
          status: 'published',
          published_url: 'https://example.com/test',
          published_at: new Date().toISOString(),
        })
        .eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'reviewed' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(data.error.details.from).toBe('published');
      expect(data.error.details.to).toBe('reviewed');
      expect(data.error.details.validTransitions).toEqual([]);
    });
  });

  // ===========================================================================
  // Required Fields Validation
  // ===========================================================================

  test.describe('Required Fields for Transitions', () => {
    test('published without published_url: should fail', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'published',
          published_at: new Date().toISOString(),
          // missing published_url
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('published_url');
    });

    test('published without published_at: should auto-set timestamp', async ({ request }) => {
      // Set article to reviewed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'reviewed' }).eq('id', testArticleId);

      const beforeUpdate = new Date();

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'published',
          published_url: 'https://example.com/test-article',
          // published_at will be auto-set
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('published');
      expect(data.data.article.published_at).toBeTruthy();

      // Verify the timestamp was set after we made the request
      const publishedAt = new Date(data.data.article.published_at);
      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    test('rejected without rejection_reason: should succeed with warning', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: {
          status: 'rejected',
          // no rejection_reason
        },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      // Should succeed - rejection_reason is optional
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('rejected');
    });
  });

  // ===========================================================================
  // Same Status Transition (No-op)
  // ===========================================================================

  test.describe('Same Status (No-op)', () => {
    test('setting same status should be valid (no-op)', async ({ request }) => {
      // Set article to draft
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
      await supabase.from('articles').update({ status: 'draft' }).eq('id', testArticleId);

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'draft' },
        headers: {
          authorization: `Bearer ${testUser.access_token}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.article.status).toBe('draft');
    });
  });

  // ===========================================================================
  // Authorization
  // ===========================================================================

  test.describe('Authorization', () => {
    test('unauthenticated request should fail', async ({ request }) => {
      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'approved' },
      });

      expect(response.status()).toBe(401);
    });

    test('user cannot update another users article', async ({ request }) => {
      // Create another user
      const otherUser = await resetTestUser();
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      // Ensure we have a different user
      if (otherUser.id === testUser.id) {
        // Create another user directly
        const { data: newUser } = await supabase.auth.admin.createUser({
          email: `other-test-user-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          email_confirm: true,
        });

        if (newUser.user) {
          otherUser.id = newUser.user.id;
          otherUser.access_token = `test_token_${newUser.user.id}`;
        }
      }

      const response = await request.patch(`/api/articles/${testArticleId}`, {
        data: { status: 'approved' },
        headers: {
          authorization: `Bearer ${otherUser.access_token}`,
        },
      });

      expect(response.status()).toBe(404);
    });
  });
});
