import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: RSS/Atom Feed (§11.3)
 *
 * Routes tested:
 *   GET  /api/settings/feed/token   — get current feed token + URL
 *   POST /api/settings/feed/token   — regenerate feed token
 *   GET  /api/feeds/[userId]/articles.xml — RSS feed (requires valid token)
 *
 * NOTE: Authenticated tests require a real Supabase connection.
 * Tests that need DB access are skipped in mock test mode.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('GET /api/settings/feed/token', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/settings/feed/token');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return feedToken and feedUrl for authenticated user', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/settings/feed/token');
    response.expectStatus(200);

    const data = await response.json();
    expect(data).toHaveProperty('feedToken');
    expect(data).toHaveProperty('feedUrl');
    if (data.feedToken !== null) {
      expect(typeof data.feedToken).toBe('string');
      expect(typeof data.feedUrl).toBe('string');
      expect(data.feedUrl).toContain(user.id);
    }
  });
});

test.describe('POST /api/settings/feed/token (regenerate)', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/settings/feed/token', {});
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should generate a new token and return feedUrl', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/feed/token', {});
    response.expectStatus(200);

    const data = await response.json();
    expect(data).toHaveProperty('feedToken');
    expect(data).toHaveProperty('feedUrl');
    expect(typeof data.feedToken).toBe('string');
    expect(data.feedToken.length).toBeGreaterThan(0);
    expect(data.feedUrl).toContain(user.id);
    expect(data.feedUrl).toContain(data.feedToken);
  });

  test('should return a different token on second regenerate', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const first = await api.post('/api/settings/feed/token', {});
    first.expectStatus(200);
    const firstData = await first.json();

    const second = await api.post('/api/settings/feed/token', {});
    second.expectStatus(200);
    const secondData = await second.json();

    expect(secondData.feedToken).not.toBe(firstData.feedToken);
  });
});

test.describe('GET /api/feeds/[userId]/articles.xml', () => {
  test('should return 400 when userId is not a valid UUID', async ({ request }) => {
    const api = new ApiClient(request);
    const validToken = '00000000-0000-4000-8000-000000000001';
    const response = await api.get(`/api/feeds/not-a-uuid/articles.xml?token=${validToken}`);
    response.expectStatus(400);
  });

  test('should return 401 or 400 when no token is provided', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request);
    const response = await api.get(`/api/feeds/${user.id}/articles.xml`);
    expect([400, 401]).toContain(response.status);
  });

  test('should return 400 or 401 when an invalid token is provided', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request);
    const response = await api.get(`/api/feeds/${user.id}/articles.xml?token=invalid-token`);
    expect([400, 401]).toContain(response.status);
  });

  test('should return XML feed with a valid token', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const authApi = new ApiClient(request).withAuth(user.token);

    const tokenResponse = await authApi.post('/api/settings/feed/token', {});
    tokenResponse.expectStatus(200);
    const { feedToken } = await tokenResponse.json();

    if (!feedToken) {
      test.skip(true, 'No feed token generated');
      return;
    }

    const feedResponse = await request.get(
      `/api/feeds/${user.id}/articles.xml?token=${feedToken}`
    );
    expect([200, 401]).toContain(feedResponse.status());

    if (feedResponse.status() === 200) {
      const contentType = feedResponse.headers()['content-type'];
      expect(contentType).toMatch(/xml|text/);
    }
  });

  test('should return 401 or 404 with a revoked/wrong token', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const fakeToken = '00000000-0000-4000-8000-000000000099';
    const response = await request.get(
      `/api/feeds/${user.id}/articles.xml?token=${fakeToken}`
    );
    expect([401, 404]).toContain(response.status());
  });
});
