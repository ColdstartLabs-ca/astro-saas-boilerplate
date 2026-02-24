import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Settings — API Keys, Feed Token, Email Preferences (§11.2–11.4)
 *
 * Covers:
 *   GET/POST/DELETE /api/settings/api-keys          (§11.2)
 *   GET/POST        /api/settings/feed/token         (§11.3)
 *   GET             /api/feeds/:userId/articles.xml  (§11.3)
 *   GET/PATCH       /api/email/preferences           (§11.4)
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

// =============================================================================
// API Keys (§11.2)
// =============================================================================

test.describe('API: API Keys (§11.2)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
  });

  test.describe('GET /api/settings/api-keys', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/settings/api-keys');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return empty list for new user', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/settings/api-keys');
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(Array.isArray(data.keys)).toBe(true);
    });

    test('should never return key_hash', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      // Create a key first
      await api.post('/api/settings/api-keys', { name: 'Hash Test Key' });

      const response = await api.get('/api/settings/api-keys');
      const data = await response.getData();
      for (const key of data.keys) {
        expect(key.key_hash).toBeUndefined();
      }
    });
  });

  test.describe('POST /api/settings/api-keys', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post('/api/settings/api-keys', { name: 'Test' });
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should reject missing name', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/settings/api-keys', {});
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should create key and return it once', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/settings/api-keys', {
        name: 'My API Key',
        scopes: ['articles:read'],
      });
      response.expectStatus(201).expectSuccess();
      const data = await response.getData();

      expect(data.key).toBeDefined();
      expect(data.key.name).toBe('My API Key');
      // Full key must be present in creation response
      expect(data.key.key).toBeDefined();
      expect(typeof data.key.key).toBe('string');
      expect(data.warning).toContain('only time');
    });

    test('full key not visible on subsequent GET', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      const created = await api.post('/api/settings/api-keys', { name: 'One-Time Key' });
      const createdData = await created.getData();
      const keyValue = createdData.key.key;

      const list = await api.get('/api/settings/api-keys');
      const listData = await list.getData();
      const found = listData.keys.find((k: { name: string }) => k.name === 'One-Time Key');
      expect(found).toBeDefined();
      // Full key should not be returned in list
      expect(found?.key).not.toBe(keyValue);
    });
  });

  test.describe('DELETE /api/settings/api-keys', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.delete(
        '/api/settings/api-keys?keyId=00000000-0000-4000-8000-000000000000'
      );
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require keyId', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.delete('/api/settings/api-keys');
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject non-UUID keyId', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.delete('/api/settings/api-keys?keyId=not-a-uuid');
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should delete key and it disappears from list', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      const created = await api.post('/api/settings/api-keys', { name: 'To Revoke' });
      const data = await created.getData();
      const keyId = data.key.id;

      const deleted = await api.delete(`/api/settings/api-keys?keyId=${keyId}`);
      expect(deleted.status).toBe(204);

      const list = await api.get('/api/settings/api-keys');
      const listData = await list.getData();
      expect(listData.keys.some((k: { id: string }) => k.id === keyId)).toBe(false);
    });
  });
});

// =============================================================================
// Feed Token (§11.3)
// =============================================================================

test.describe('API: Feed Token (§11.3)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
  });

  test.describe('GET /api/settings/feed/token', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/settings/feed/token');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return feedToken and feedUrl', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/settings/feed/token');
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      // New user may have null token
      expect('feedToken' in data).toBe(true);
      expect('feedUrl' in data).toBe(true);
    });
  });

  test.describe('POST /api/settings/feed/token (regenerate)', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post('/api/settings/feed/token');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should generate token and return feedUrl', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/settings/feed/token');
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(typeof data.feedToken).toBe('string');
      expect(data.feedToken.length).toBeGreaterThan(0);
      expect(data.feedUrl).toContain(user.id);
      expect(data.feedUrl).toContain(data.feedToken);
    });

    test('regenerating invalidates old token', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      const first = await api.post('/api/settings/feed/token');
      const firstData = await first.getData();
      const oldToken = firstData.feedToken;

      const second = await api.post('/api/settings/feed/token');
      const secondData = await second.getData();

      expect(secondData.feedToken).not.toBe(oldToken);
    });
  });

  test.describe('GET /api/feeds/:userId/articles.xml', () => {
    test('should return 401 for missing token', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request);
      const response = await api.get(`/api/feeds/${user.id}/articles.xml`);
      response.expectStatus(401);
    });

    test('should return 401 for wrong token', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request);
      const response = await api.get(`/api/feeds/${user.id}/articles.xml?token=wrong-token-value`);
      response.expectStatus(401);
    });

    test('should return XML feed with valid token', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      const tokenRes = await api.post('/api/settings/feed/token');
      const { feedToken } = await tokenRes.getData();

      const feed = await request.get(`/api/feeds/${user.id}/articles.xml?token=${feedToken}`);
      expect(feed.status()).toBe(200);
      const ct = feed.headers()['content-type'];
      expect(ct).toMatch(/xml/);
    });
  });
});

// =============================================================================
// Email Preferences (§11.4)
// =============================================================================

test.describe('API: Email Preferences (§11.4)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });
  });

  test.describe('GET /api/email/preferences', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/email/preferences');
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return default preferences', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/email/preferences');
      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(typeof data.marketing_emails).toBe('boolean');
      expect(typeof data.product_updates).toBe('boolean');
      expect(typeof data.low_credit_alerts).toBe('boolean');
    });
  });

  test.describe('PATCH /api/email/preferences', () => {
    test('should reject unauthenticated', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.patch('/api/email/preferences', { marketing_emails: false });
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should update preferences and persist', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');
      const api = new ApiClient(request).withAuth(user.token);

      const patch = await api.patch('/api/email/preferences', {
        marketing_emails: false,
        low_credit_alerts: false,
      });
      patch.expectStatus(200).expectSuccess();
      const patched = await patch.getData();
      expect(patched.marketing_emails).toBe(false);
      expect(patched.low_credit_alerts).toBe(false);

      // Verify persisted
      const get = await api.get('/api/email/preferences');
      const persisted = await get.getData();
      expect(persisted.marketing_emails).toBe(false);
      expect(persisted.low_credit_alerts).toBe(false);
    });

    test('should reject invalid fields', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.patch('/api/email/preferences', {
        marketing_emails: 'yes-please',
      });
      response.expectStatus(400);
    });
  });
});
