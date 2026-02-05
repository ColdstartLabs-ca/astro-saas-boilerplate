# Integration Testing Guide

## Overview

Integration tests verify that multiple components work together correctly. They sit between unit tests (single components) and E2E tests (full user journeys).

## Your Current Setup

- **Testing Stack**: Playwright for integration tests, Vitest for unit tests
- **Test Data**: TestDataManager helper for creating/managing test users
- **Database**: Real Supabase instance with service role access
- **Authentication**: JWT token handling for authenticated requests
- **Environment**: `.env.api` for test-specific configuration

## Writing Integration Tests

### 1. File Structure

```
tests/integration/
├── auth.integration.spec.ts     # Authentication flows
├── billing.integration.spec.ts  # Billing and payments
├── api.integration.spec.ts       # API endpoint integration
└── workflows.integration.spec.ts # Cross-system workflows
```

### 2. Test Patterns

#### API Integration Tests

Test complete API workflows with authentication and database interactions:

```typescript
import { test, expect } from '@playwright/test';
import { TestDataManager } from '../helpers/test-data-manager';

test.describe('API Integration Tests', () => {
  let dataManager: TestDataManager;
  let testUser: ITestUser;

  test.beforeAll(async () => {
    dataManager = new TestDataManager();
    testUser = await dataManager.createTestUser();
  });

  test.afterAll(async () => {
    await dataManager.cleanupUser(testUser.id);
  });

  test('should handle complete workflow', async ({ request }) => {
    // 1. Make authenticated request
    const response = await request.post('/api/endpoint', {
      headers: {
        Authorization: `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      data: { testData: 'value' },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // 2. Verify database state changed
    const profile = await dataManager.getUserProfile(testUser.id);
    expect(profile.updated_at).not.toBeNull();
  });
});
```

#### Database Integration Tests

Test database operations and constraints:

```typescript
test.describe('Database Integration Tests', () => {
  let dataManager: TestDataManager;
  let supabase: SupabaseClient;

  test.beforeAll(async () => {
    dataManager = new TestDataManager();
    supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('should enforce credit constraints across operations', async () => {
    const user = await dataManager.createTestUser();

    // Test concurrent operations
    const operations = Array(5)
      .fill(null)
      .map((_, i) =>
        supabase.rpc('decrement_credits', {
          target_user_id: user.id,
          amount: 5,
          transaction_type: 'usage',
          ref_id: `job_${i}`,
        })
      );

    const results = await Promise.allSettled(operations);

    // Only first 2 operations should succeed (10 credits available)
    const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error);
    expect(successful).toHaveLength(2);
  });
});
```

### 3. Test Data Management

#### Use TestDataManager for User Management

```typescript
const dataManager = new TestDataManager();

// Create users with specific states
const freeUser = await dataManager.createTestUserWithSubscription('free');
const proUser = await dataManager.createTestUserWithSubscription('active', 'pro', 50);

// Clean up automatically
test.afterAll(async () => {
  await dataManager.cleanupAllUsers();
});
```

### 4. Running Integration Tests

```bash
# Run all integration tests
yarn test:integration

# Run specific integration test file
yarn playwright test tests/integration/auth.integration.spec.ts

# Run with UI for debugging
yarn test:integration:ui
```

### 5. Best Practices

#### Test Organization

- Use descriptive test names that explain the behavior
- Group related tests in `describe` blocks
- Use `beforeAll`/`afterAll` for expensive setup
- Use `beforeEach`/`afterEach` for test isolation

#### Test Data

- Use consistent test data across tests
- Clean up test data after each test
- Use realistic data that matches production

#### Assertions

- Test both positive and negative scenarios
- Verify database state changes
- Check side effects (logs, analytics, etc.)

## Running the Tests

```bash
# Run all integration tests
yarn test:integration

# Run with coverage
yarn test:integration --coverage
```

This guide provides a comprehensive foundation for writing robust integration tests that verify your application's components work together correctly.
