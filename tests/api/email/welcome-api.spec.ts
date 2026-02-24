import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '@/tests/helpers';

/**
 * Integration tests for POST /api/auth/welcome
 *
 * The welcome email endpoint is idempotent: it only sends once per user.
 * In test mode, the email service logs to email_logs with status='sent'
 * instead of actually sending, so idempotency is still enforced.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('POST /api/auth/welcome', () => {
  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await api.post('/api/auth/welcome', {});

    response.expectStatus(401);
    await response.expectErrorCode('UNAUTHORIZED');
  });

  test('should send welcome email on first call and return sent:true', async ({ request }) => {
    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    const response = await api.post('/api/auth/welcome', {});

    response.expectStatus(200);
    const data = await response.json();
    expect(data.sent).toBe(true);
  });

  test('should return sent:false with reason already_sent on duplicate call', async ({
    request,
  }) => {
    const user = await ctx.createUser();
    const api = new ApiClient(request).withAuth(user.token);

    // First call — records the log
    const first = await api.post('/api/auth/welcome', {});
    first.expectStatus(200);
    const firstData = await first.json();
    expect(firstData.sent).toBe(true);

    // Second call — idempotency check kicks in
    const second = await api.post('/api/auth/welcome', {});
    second.expectStatus(200);
    const secondData = await second.json();
    expect(secondData.sent).toBe(false);
    expect(secondData.reason).toBe('already_sent');
  });

  test('should be isolated per user (different users can each receive welcome email)', async ({
    request,
  }) => {
    const user1 = await ctx.createUser();
    const user2 = await ctx.createUser();

    const api1 = new ApiClient(request).withAuth(user1.token);
    const api2 = new ApiClient(request).withAuth(user2.token);

    // User1 gets welcome email
    const r1 = await api1.post('/api/auth/welcome', {});
    r1.expectStatus(200);
    expect((await r1.json()).sent).toBe(true);

    // User2 should also get welcome email independently
    const r2 = await api2.post('/api/auth/welcome', {});
    r2.expectStatus(200);
    expect((await r2.json()).sent).toBe(true);

    // User1 second call is still idempotent
    const r1Again = await api1.post('/api/auth/welcome', {});
    r1Again.expectStatus(200);
    expect((await r1Again.json()).sent).toBe(false);
    expect((await r1Again.json()).reason).toBe('already_sent');
  });
});
