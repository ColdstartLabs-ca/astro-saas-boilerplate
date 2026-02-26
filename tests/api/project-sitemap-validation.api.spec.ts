import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Project Sitemap Validation Endpoint
 *
 * Covers:
 *   GET /api/projects/:projectId/validate-sitemap - Validate a sitemap URL
 *
 * Acceptance Criteria:
 *   AC-B.4: GET /api/projects/:projectId/validate-sitemap?url=X returns { valid, reason? }
 *   AC-B.5: Sitemap validation uses HEAD request (not GET)
 *   AC-B.6: Both endpoints verify project ownership
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

const isTestMode = () => process.env.ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

test.describe('API: Project Sitemap Validation', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });

    if (!isTestMode()) {
      const project = await ctx.createProject(user.id, { name: 'Sitemap Test Project' });
      projectId = project.id;
    } else {
      // In test mode, create a real project via API so it exists in the mock DB
      const api = new ApiClient(request).withAuth(user.token);
      const projectRes = await api.post('/api/projects', { name: 'Sitemap Test Project' });
      const projectData = (await projectRes.getData()) as { project: { id: string } };
      projectId = projectData.project.id;
    }
  });

  test.describe('GET /api/projects/:projectId/validate-sitemap', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://example.com/sitemap.xml`
      );
      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return 404 for non-owned project', async ({ request }) => {
      // Create another user's project
      const otherUser = await ctx.createUser({ subscription: 'active' });
      const otherApi = new ApiClient(request).withAuth(otherUser.token);
      const projectRes = await otherApi.post('/api/projects', { name: 'Other Project' });
      const projectData = (await projectRes.getData()) as { project: { id: string } };
      const otherProjectId = projectData.project.id;

      // Try to validate sitemap with first user
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get(
        `/api/projects/${otherProjectId}/validate-sitemap?url=https://example.com/sitemap.xml`
      );
      response.expectStatus(404);
    });

    test('should require URL parameter', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get(`/api/projects/${projectId}/validate-sitemap`);
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject invalid URL format', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=not-a-valid-url`
      );
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should return valid for accessible sitemap URL', async ({ request }) => {
      // Skip this test in CI/test mode as it requires external network access
      test.skip(
        isTestMode(),
        'External network access not available in test mode - covered by service unit tests'
      );

      const api = new ApiClient(request).withAuth(user.token);
      // Use a well-known sitemap that should exist
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://example.com/sitemap.xml`
      );

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(data.valid).toBe(true);
    });

    test('should return invalid for 404 URL', async ({ request }) => {
      // Skip this test in CI/test mode as it requires external network access
      test.skip(
        isTestMode(),
        'External network access not available in test mode - covered by service unit tests'
      );

      const api = new ApiClient(request).withAuth(user.token);
      // Use a URL that will return 404
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://example.com/nonexistent-sitemap-12345.xml`
      );

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('not_found');
    });

    test('should return invalid for timeout', async ({ request }) => {
      // Skip this test in CI/test mode as it requires external network access
      test.skip(
        isTestMode(),
        'External network access not available in test mode - covered by service unit tests'
      );

      const api = new ApiClient(request).withAuth(user.token);
      // Use a URL that will timeout (a non-routable IP that drops packets)
      // Note: This test may be flaky depending on network conditions
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://10.255.255.1/sitemap.xml`,
        { timeout: 15000 } // Give extra time for the 5s validation timeout
      );

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(data.valid).toBe(false);
      // Could be timeout or error depending on network
      expect(['timeout', 'error']).toContain(data.reason);
    });

    test('should return error for unreachable domain', async ({ request }) => {
      // Skip this test in CI/test mode as it requires external network access
      test.skip(
        isTestMode(),
        'External network access not available in test mode - covered by service unit tests'
      );

      const api = new ApiClient(request).withAuth(user.token);
      // Use a non-existent domain
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://this-domain-definitely-does-not-exist-12345.com/sitemap.xml`
      );

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(data.valid).toBe(false);
      expect(['error', 'timeout']).toContain(data.reason);
    });

    test('should return response with correct structure', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      // Use a valid URL - even if it fails to connect, we can verify the response structure
      const response = await api.get(
        `/api/projects/${projectId}/validate-sitemap?url=https://example.com/sitemap.xml`
      );

      response.expectStatus(200);
      const body = await response.json();

      // Response should have success wrapper
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(typeof body.data.valid).toBe('boolean');

      // If not valid, reason should be present
      if (!body.data.valid) {
        expect(['not_found', 'timeout', 'error']).toContain(body.data.reason);
        expect(typeof body.data.details).toBe('string');
      }
    });

    test('should handle missing project ID', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/projects//validate-sitemap?url=https://example.com/sitemap.xml');
      // Should return 404 or 400 depending on routing
      expect([400, 404, 405]).toContain(response.status);
    });
  });
});
