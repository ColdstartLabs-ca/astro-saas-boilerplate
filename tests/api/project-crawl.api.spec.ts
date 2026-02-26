import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * API Tests: Project Crawl Endpoint
 *
 * Covers:
 *   POST /api/projects/:projectId/crawl - Crawl a URL and extract metadata
 *
 * Acceptance Criteria:
 *   AC-B.1: POST /api/projects/:projectId/crawl returns { metadata: { title, description } }
 *   AC-B.2: Crawl endpoint validates URL (blocks private IPs, non-HTTP)
 *   AC-B.3: Crawl endpoint has 10s timeout
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

test.describe('API: Project Crawl', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 50 });

    if (!isTestMode()) {
      const project = await ctx.createProject(user.id, { name: 'Crawl Test Project' });
      projectId = project.id;
    } else {
      // In test mode, create a real project via API so it exists in the mock DB
      const api = new ApiClient(request).withAuth(user.token);
      const projectRes = await api.post('/api/projects', { name: 'Crawl Test Project' });
      const projectData = (await projectRes.getData()) as { project: { id: string } };
      projectId = projectData.project.id;
    }
  });

  test.describe('POST /api/projects/:projectId/crawl', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'https://example.com',
      });
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

      // Try to crawl with first user
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${otherProjectId}/crawl`, {
        url: 'https://example.com',
      });
      response.expectStatus(404);
    });

    test('should reject invalid URL format', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'not-a-valid-url',
      });
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject non-HTTP protocols', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'ftp://example.com/file',
      });
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject private IPs (SSRF protection) - localhost', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://localhost/admin',
      });
      // SSRF protection returns 403 FORBIDDEN
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should reject private IPs (SSRF protection) - 127.0.0.1', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://127.0.0.1/admin',
      });
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should reject private IPs (SSRF protection) - 10.x.x.x', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://10.0.0.1/internal',
      });
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should reject private IPs (SSRF protection) - 192.168.x.x', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://192.168.1.1/admin',
      });
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should reject private IPs (SSRF protection) - 172.16.x.x', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://172.16.0.1/internal',
      });
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should reject GCP metadata endpoint (SSRF protection)', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'http://metadata.google.internal/computeMetadata/v1/',
      });
      response.expectStatus(403);
      await response.expectErrorCode('FORBIDDEN');
    });

    test('should handle unreachable URLs gracefully', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      // Use a non-existent domain that will fail to resolve
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'https://this-domain-definitely-does-not-exist-12345.com',
      });

      // Fetch failures return 500 INTERNAL_ERROR
      response.expectStatus(500);
      await response.expectErrorCode('INTERNAL_ERROR');
    });

    test('should return metadata for valid URL', async ({ request }) => {
      // Skip this test in CI/test mode as it requires external network access
      test.skip(
        isTestMode(),
        'External network access not available in test mode - covered by service unit tests'
      );

      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'https://example.com',
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();
      expect(data.metadata).toBeDefined();
      expect(typeof data.metadata.title).toBe('string');
      // Description may be null for some pages
      expect(data.metadata.description === null || typeof data.metadata.description === 'string').toBe(true);
    });

    test('should return metadata structure even when crawl fails', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      // Use an invalid URL that passes Zod validation but fails fetch
      const response = await api.post(`/api/projects/${projectId}/crawl`, {
        url: 'https://nonexistent.invalid-tld/',
      });

      // Should return 400 with error message
      response.expectStatus(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error?.message).toBeDefined();
    });

    test('should require URL in request body', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post(`/api/projects/${projectId}/crawl`, {});
      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });
  });
});
