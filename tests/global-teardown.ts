/**
 * Global teardown for Playwright tests
 * Runs after all tests complete to clean up orphaned test users
 */
import { cleanupOldTestUsers } from './helpers/test-user-reset';

async function globalTeardown() {
  console.log('\n🧹 Running global teardown - cleaning up test users...');

  // Playwright test runs use mock users and in-memory test data.
  // Skip Supabase cleanup to avoid any real external DB access.
  if (
    process.env.ENV === 'test' ||
    process.env.PLAYWRIGHT_TEST === '1' ||
    process.env.PLAYWRIGHT_TEST === 'true'
  ) {
    console.log('ℹ️ Skipping Supabase cleanup in test mode');
    return;
  }

  try {
    const deletedCount = await cleanupOldTestUsers();
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} test users`);
    }
  } catch (error) {
    // Don't fail the test run if cleanup fails
    console.warn('⚠️ Failed to cleanup test users:', error);
  }
}

export default globalTeardown;
