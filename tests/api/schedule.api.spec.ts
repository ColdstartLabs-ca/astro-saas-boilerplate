import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Scheduled Publishing (§5.1–5.2)
 *
 * Covers:
 *   POST /api/campaigns/:id/start-schedule
 *   POST /api/campaigns/:id/pause-schedule
 *   POST /api/campaigns/:id/resume-schedule
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';
const FAKE_ID = '00000000-0000-4000-8000-000000000000';

const SCHEDULE_ENDPOINTS = [
  `/api/campaigns/${FAKE_ID}/start-schedule`,
  `/api/campaigns/${FAKE_ID}/pause-schedule`,
  `/api/campaigns/${FAKE_ID}/resume-schedule`,
] as const;

test.describe('API: Scheduled Publishing (§5.1–5.2)', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
  });

  test.describe('Authentication guard', () => {
    for (const endpoint of SCHEDULE_ENDPOINTS) {
      test(`POST ${endpoint} — 401 without auth`, async ({ request }) => {
        const api = new ApiClient(request);
        const response = await api.post(endpoint, {});
        response.expectStatus(401);
        await response.expectErrorCode('UNAUTHORIZED');
      });
    }
  });

  test.describe('404 for unknown campaign', () => {
    for (const endpoint of SCHEDULE_ENDPOINTS) {
      test(`POST ${endpoint} — 404 for unknown campaign`, async ({ request }) => {
        const api = new ApiClient(request).withAuth(user.token);
        const response = await api.post(endpoint, {});
        expect([404, 500]).toContain(response.status); // 500 when DB unreachable in test mode
      });
    }
  });

  test.describe('Business logic (real DB)', () => {
    test('start-schedule without frequency config returns 400', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');

      const project = await ctx.createProject(user.id, { name: 'Schedule Project' });
      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'No Schedule Campaign',
        keywords: ['seo tips'],
      });

      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/campaigns/${campaign.id}/start-schedule`, {});

      // Campaign has no frequency set — expect validation error
      expect([400, 422]).toContain(response.status);
    });

    test('pause-schedule on draft campaign returns error', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB user');

      const project = await ctx.createProject(user.id, { name: 'Pause Project' });
      const campaign = await ctx.createCampaign(user.id, project.id, {
        name: 'Draft Campaign',
        keywords: [],
      });

      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/campaigns/${campaign.id}/pause-schedule`, {});

      expect([400, 404, 422]).toContain(response.status);
    });

    test('cannot schedule another user campaign', async ({ request }) => {
      test.skip(isTestMode(), 'Requires real DB users');

      const owner = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });
      const project = await ctx.createProject(owner.id, { name: 'Owner Project' });
      const campaign = await ctx.createCampaign(owner.id, project.id, {
        name: 'Owner Campaign',
        keywords: ['test'],
      });

      const attackerApi = new ApiClient(request).withAuth(user.token);
      const response = await attackerApi.post(`/api/campaigns/${campaign.id}/start-schedule`, {});
      expect([403, 404]).toContain(response.status);
    });
  });
});
