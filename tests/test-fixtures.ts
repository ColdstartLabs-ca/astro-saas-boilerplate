import { test as base } from '@playwright/test';

/**
 * Create a fake JWT that Supabase GoTrueClient can parse.
 * It doesn't verify signatures, just parses the payload to check expiry.
 */
function createFakeJWT(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'test-user-id',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      exp: 9999999999,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64url');
  const sig = Buffer.from('fake-signature').toString('base64url');
  return `${header}.${payload}.${sig}`;
}

/**
 * Build the Supabase session object for cookie injection.
 */
function buildFakeSession(): object {
  return {
    access_token: createFakeJWT(),
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: 'fake-refresh-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { name: 'Test User' },
      created_at: '2024-01-01T00:00:00Z',
    },
  };
}

/**
 * Build the init script that injects auth state into the browser.
 *
 * Sets the Supabase session cookie via document.cookie (NOT addCookies)
 * so that the cookie is available to the client-side Supabase client
 * but is NOT sent with the initial server request (which would cause
 * the server-side middleware to try validating the fake JWT).
 */
function getSupabaseSessionScript(): string {
  const session = buildFakeSession();
  const sessionStr = JSON.stringify(session);

  // @supabase/ssr stores sessions with base64url encoding prefixed by "base64-"
  // We replicate the encoding used by the storage layer in createBrowserClient
  return `
    (function() {
      // base64url encode the session
      var sessionStr = ${JSON.stringify(sessionStr)};
      var encoded = btoa(sessionStr).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
      var cookieValue = 'base64-' + encoded;

      // Set the Supabase auth cookie
      // Key format: sb-{project_ref}-auth-token.{chunk_index}
      document.cookie = 'sb-xuuwrabuavfplyyolngf-auth-token.0=' + cookieValue + '; path=/; max-age=86400; SameSite=Lax';
    })();
  `;
}

/**
 * Extended Playwright test with global fixtures
 *
 * This adds the test environment marker, test headers, Supabase auth session,
 * and API mocks to prevent unwanted redirects and onboarding dialogs during E2E tests.
 *
 * Auth flow:
 * 1. Server-side: middleware bypasses auth check due to x-test-env/x-playwright-test headers
 * 2. Client-side: addInitScript injects Supabase session cookie via document.cookie
 *    (set AFTER server response, BEFORE client JS executes)
 * 3. Supabase GoTrueClient finds the session cookie → fires onAuthStateChange with session
 * 4. userStore stays authenticated → useOnboardingStatus query runs
 * 5. Route mock returns isComplete: true → no onboarding redirect
 *
 * Note: Playwright route handlers use LIFO order (last registered = first checked).
 * Specific mocks must be registered AFTER the catch-all header route.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Import auth helpers
    const { getAuthInitScript, getTestHeaders } = await import('./helpers/auth-helpers');

    // Inject test environment markers, user cache, AND Supabase session cookie
    // before the page's JS executes. The Supabase cookie is set via document.cookie
    // (not addCookies) so it's NOT sent with the initial server request.
    await page.addInitScript(getAuthInitScript());
    await page.addInitScript(getSupabaseSessionScript());

    // Register catch-all header route FIRST (will be checked LAST due to LIFO)
    await page.route('**/*', async route => {
      const testHeaders = getTestHeaders();
      const headers = { ...route.request().headers(), ...testHeaders };
      await route.continue({ headers });
    });

    // Register specific API mocks AFTER catch-all (will be checked FIRST due to LIFO)

    // Mock Supabase auth token endpoint to handle any refresh attempts
    await page.route('**/auth/v1/token**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildFakeSession()),
      });
    });

    // Mock Supabase auth user endpoint
    await page.route('**/auth/v1/user**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: { provider: 'email' },
          user_metadata: { name: 'Test User' },
        }),
      });
    });

    // Mock onboarding status API to return complete (bypasses onboarding wizard)
    // Note: apiFetch returns raw response.json(), and fetchOnboardingStatus does data.onboarding,
    // so we return { onboarding: {...} } without the { success, data } wrapper.
    await page.route('**/api/onboarding/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          onboarding: {
            isComplete: true,
            currentStep: 5,
            completedSteps: [1, 2, 3, 4, 5],
            skippedSteps: [],
          },
        }),
      });
    });

    // Mock integrations list API to return empty array by default.
    // Individual tests can override this with page.route() after goto().
    // useIntegrations hook: apiFetch returns raw JSON, then does data.data.integrations
    await page.route('**/api/integrations', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { integrations: [] },
          }),
        });
      } else {
        // For POST/PUT/DELETE, continue to server or return mock success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              integration: { id: 'mock-id', name: 'Mock', type: 'wordpress', status: 'active' },
            },
          }),
        });
      }
    });

    // Mock projects API to return a test project by default
    await page.route('**/api/projects', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              projects: [
                {
                  id: 'mock-project-1',
                  name: 'Test Project',
                  url: 'https://test.com',
                  user_id: 'test-user-id',
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
              ],
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    // Mock GSC connections API to return empty by default (no GSC connection)
    await page.route('**/api/gsc/connections**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { connections: [] },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    // Mock opportunities API to return empty by default
    await page.route('**/api/opportunities**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { opportunities: [], total: 0 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    // Mock campaigns API to return a test campaign by default.
    // Individual tests can override this with page.route() after goto().
    // Note: Articles page requires at least one campaign to show the article list.
    // Note: API responses are wrapped in { success: true, data: {...} } by jsonResponse()
    await page.route('**/api/campaigns**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              campaigns: [
                {
                  id: 'mock-campaign-1',
                  project_id: 'mock-project-1',
                  name: 'Test Campaign',
                  status: 'active',
                  ai_model: 'gpt-4o-mini',
                  image_preset: 'none',
                  keyword_count: 0,
                  completed_count: 0,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
              ],
            },
          }),
        });
      } else {
        // For POST/PUT/DELETE, return mock success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              campaign: { id: 'mock-campaign-id', name: 'Mock Campaign', status: 'active' },
            },
          }),
        });
      }
    });

    // Mock articles API to return empty array by default.
    // Individual tests can override this with page.route() after goto().
    // Note: API responses are wrapped in { success: true, data: {...} } by jsonResponse()
    await page.route('**/api/articles**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              articles: [],
              total: 0,
            },
          }),
        });
      } else {
        // For POST/PUT/DELETE, return mock success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              article: { id: 'mock-article-id', title: 'Mock Article', status: 'draft' },
            },
          }),
        });
      }
    });

    // Mock user data endpoints (profiles and subscriptions tables)
    // This provides a default mock for tests that don't override it.
    // Tests can override this by registering their own routes in beforeEach.
    // Note: Must be registered LAST so test-specific routes take precedence (LIFO).
    await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/profiles.*/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'user',
            subscription_credits_balance: 1000,
            purchased_credits_balance: 0,
          },
        ]),
      });
    });

    await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\/subscriptions.*/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
