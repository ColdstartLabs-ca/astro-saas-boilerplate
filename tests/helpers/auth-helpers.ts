/**
 * Authentication helpers for E2E tests
 *
 * These functions help set up authenticated state in tests by injecting
 * user data directly into localStorage, which the userStore reads on initialization.
 */

export interface ITestUserData {
  id: string;
  email: string;
  name?: string;
  provider: string;
  role: 'user' | 'admin';
  profile: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    subscription_credits_balance: number;
    purchased_credits_balance: number;
  } | null;
  subscription: null;
}

/**
 * Generate the localStorage key for user cache
 * Matches the key used in client/store/userStore.ts
 */
function getUserCacheKey(): string {
  // Uses the same prefix as in the app's clientEnv.CACHE_USER_KEY_PREFIX
  // The app defaults to 'saas-boilerplate' if not set
  const prefix = process.env.NEXT_PUBLIC_CACHE_USER_KEY_PREFIX || 'saas-boilerplate';
  return `${prefix}_user_cache`;
}

/**
 * Create test user data with default values
 */
export function createTestUser(overrides?: Partial<ITestUserData>): ITestUserData {
  const defaultUser: ITestUserData = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'email',
    role: 'user',
    profile: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      subscription_credits_balance: 1000,
      purchased_credits_balance: 0,
    },
    subscription: null,
  };

  return { ...defaultUser, ...overrides };
}

/**
 * Generate the init script to inject authenticated user state into localStorage
 * This script runs before the page loads, ensuring the userStore finds cached user data
 */
export function getAuthInitScript(userData?: Partial<ITestUserData>): string {
  const user = createTestUser(userData);

  const cacheKey = getUserCacheKey();
  const cacheObject = {
    version: 1,
    timestamp: Date.now(),
    user: user,
  };
  // Serialize the cache object to a JSON string
  const cacheJson = JSON.stringify(cacheObject);

  // Escape special characters for embedding in script
  const escapedCacheJson = cacheJson
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');

  return `
    // Inject test environment markers
    window.__TEST_ENV__ = true;
    window.playwrightTest = true;

    // Inject authenticated user into localStorage
    // This will be picked up by userStore.initialize() via loadUserCache()
    try {
      localStorage.setItem('${cacheKey}', "${escapedCacheJson}");
    } catch(e) {
      console.error('Failed to set user cache:', e);
    }

    // Override Supabase auth session detection
    // The userStore checks for session existence, so we mock the session storage
    sessionStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: {
        access_token: 'fake-test-token',
        user: {
          id: '${user.id}',
          email: '${user.email}',
          aud: 'authenticated',
        }
      }
    }));

    // Store test marker for middleware to check
    localStorage.setItem('__test_mode__', 'true');
  `;
}

/**
 * Check if the current request is from a test
 * Can be used to add test-specific headers to requests
 */
export function getTestHeaders(): Record<string, string> {
  return {
    'x-test-env': 'true',
    'x-playwright-test': 'true',
  };
}

/**
 * Initialize authenticated state for a page
 * Call this before navigating to any protected route
 */
export async function setupAuthenticatedState(
  page: import('@playwright/test').Page,
  userData?: Partial<ITestUserData>
): Promise<void> {
  const testHeaders = getTestHeaders();

  // Add the init script to inject auth state before page loads
  await page.addInitScript(getAuthInitScript(userData));

  // Add test headers to all requests
  await page.route('**/*', async route => {
    const headers = { ...route.request().headers(), ...testHeaders };
    await route.continue({ headers });
  });

  // Also set up route handlers for any API calls that might be made
  await page.route('**/auth/v1/session', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          access_token: 'fake-test-token',
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
      }),
    });
  });

  await page.route('**/auth/v1/user**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
      }),
    });
  });
}

/**
 * Create a user with specific credit balance for testing
 */
export function createUserWithCredits(credits: number): Partial<ITestUserData> {
  return {
    profile: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      subscription_credits_balance: credits,
      purchased_credits_balance: 0,
    },
  };
}

/**
 * Create an admin user for testing
 */
export function createAdminUser(): Partial<ITestUserData> {
  return {
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    profile: {
      id: 'admin-user-id',
      email: 'admin@example.com',
      role: 'admin',
      subscription_credits_balance: 10000,
      purchased_credits_balance: 0,
    },
  };
}
