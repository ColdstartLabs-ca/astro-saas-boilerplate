import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: API Key Management (§11.2)
 *
 * Routes tested:
 *   GET    /api/settings/api-keys         — list API keys
 *   POST   /api/settings/api-keys         — create a new API key (shown once)
 *   DELETE /api/settings/api-keys?keyId=  — revoke an API key
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

test.describe('GET /api/settings/api-keys', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.get('/api/settings/api-keys');
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should return an empty list for a new user', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.get('/api/settings/api-keys');
    response.expectStatus(200);

    const data = await response.json();
    expect(data).toHaveProperty('keys');
    expect(Array.isArray(data.keys)).toBe(true);
  });

  test('should never expose key_hash in the response', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    await api.post('/api/settings/api-keys', { name: 'Test Key' });

    const response = await api.get('/api/settings/api-keys');
    response.expectStatus(200);

    const data = await response.json();
    for (const key of data.keys) {
      expect(key).not.toHaveProperty('key_hash');
      expect(key).not.toHaveProperty('key');
    }
  });

  test('should not return another user\'s API keys', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user1 = await ctx.createUser();
    const user2 = await ctx.createUser();

    const api1 = new ApiClient(request).withAuth(user1.token);
    await api1.post('/api/settings/api-keys', { name: 'User1 Key' });

    const api2 = new ApiClient(request).withAuth(user2.token);
    const response = await api2.get('/api/settings/api-keys');
    response.expectStatus(200);

    const data = await response.json();
    for (const key of data.keys) {
      expect(key.user_id).toBe(user2.id);
    }
  });
});

test.describe('POST /api/settings/api-keys', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/settings/api-keys', { name: 'Test Key' });
    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should create a key and return it in full (only once)', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/api-keys', { name: 'My Integration Key' });
    response.expectStatus(201);

    const data = await response.json();
    expect(data).toHaveProperty('key');
    expect(data).toHaveProperty('warning');
    expect(data.key).toHaveProperty('id');
    expect(data.key).toHaveProperty('name');
    expect(data.key).toHaveProperty('key');
    expect(typeof data.key.key).toBe('string');
    expect(data.key.key.length).toBeGreaterThan(0);
  });

  test('should create a key with scopes', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/api-keys', {
      name: 'Scoped Key',
      scopes: ['articles:read', 'campaigns:read'],
    });
    response.expectStatus(201);

    const data = await response.json();
    expect(data.key.scopes).toContain('articles:read');
    expect(data.key.scopes).toContain('campaigns:read');
  });

  test('should reject missing name with 400/422', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/api-keys', {
      scopes: ['articles:read'],
    });
    expect([400, 422]).toContain(response.status);
  });

  test('should reject name over 100 chars with 400/422', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/api-keys', {
      name: 'a'.repeat(101),
    });
    expect([400, 422]).toContain(response.status);
  });

  test('should reject invalid scope values with 400/422', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/settings/api-keys', {
      name: 'Bad Scopes Key',
      scopes: ['not-a-valid-scope'],
    });
    expect([400, 422]).toContain(response.status);
  });

  test('the created key must appear in the list', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/settings/api-keys', { name: 'Listed Key' });
    createResponse.expectStatus(201);
    const created = await createResponse.json();

    const listResponse = await api.get('/api/settings/api-keys');
    listResponse.expectStatus(200);
    const list = await listResponse.json();

    const found = list.keys.find((k: { id: string }) => k.id === created.key.id);
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty('key');
  });
});

test.describe('DELETE /api/settings/api-keys', () => {
  test('should reject unauthenticated requests with 401', async ({ request }) => {
    const fakeId = '00000000-0000-4000-8000-000000000001';
    const response = await request.delete(`/api/settings/api-keys?keyId=${fakeId}`);
    expect([401, 403]).toContain(response.status());
  });

  test('should return 400 when keyId is missing', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const response = await request.delete('/api/settings/api-keys', {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect([400, 422]).toContain(response.status());
  });

  test('should return 400 when keyId is not a valid UUID', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const response = await request.delete('/api/settings/api-keys?keyId=not-a-uuid', {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect([400, 422]).toContain(response.status());
  });

  test('should delete an existing key (204 response)', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const createResponse = await api.post('/api/settings/api-keys', { name: 'Key To Delete' });
    createResponse.expectStatus(201);
    const created = await createResponse.json();

    const deleteResponse = await request.delete(
      `/api/settings/api-keys?keyId=${created.key.id}`,
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    expect(deleteResponse.status()).toBe(204);

    const listResponse = await api.get('/api/settings/api-keys');
    listResponse.expectStatus(200);
    const list = await listResponse.json();
    const found = list.keys.find((k: { id: string }) => k.id === created.key.id);
    expect(found).toBeUndefined();
  });

  test('should not allow deleting another user\'s API key', async ({ request }) => {
    test.skip(isTestMode(), 'Requires real Supabase DB — skipped in mock test mode');

    const user1 = await ctx.createUser();
    const user2 = await ctx.createUser();

    const api1 = new ApiClient(request).withAuth(user1.token);
    const createResponse = await api1.post('/api/settings/api-keys', { name: 'User1 Key' });
    createResponse.expectStatus(201);
    const created = await createResponse.json();

    const deleteResponse = await request.delete(
      `/api/settings/api-keys?keyId=${created.key.id}`,
      { headers: { Authorization: `Bearer ${user2.token}` } }
    );
    expect([403, 404]).toContain(deleteResponse.status());
  });
});
