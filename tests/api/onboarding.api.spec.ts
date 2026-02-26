import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * Integration Tests for Onboarding API Routes
 *
 * Tests the three onboarding endpoints:
 * - GET /api/onboarding/status - Get onboarding status
 * - PUT /api/onboarding/progress - Update onboarding progress
 * - POST /api/onboarding/complete - Mark onboarding as complete
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('API: Onboarding', () => {
  let user: Awaited<ReturnType<typeof ctx.createUser>>;

  test.beforeEach(async () => {
    user = await ctx.createUser({ subscription: 'active', tier: 'pro', credits: 100 });
  });

  // =============================================================================
  // GET /api/onboarding/status
  // =============================================================================

  test.describe('GET /api/onboarding/status', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.get('/api/onboarding/status');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return initial onboarding status for new user', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/onboarding/status');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.onboarding).toBeDefined();
      expect(data.onboarding.isComplete).toBe(false);
      expect(data.onboarding.currentStep).toBe(1);
      expect(data.onboarding.completedSteps).toEqual([]);
      expect(data.onboarding.skippedSteps).toEqual([]);
    });

    test('should return existing onboarding status', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // First, update the progress
      await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      // Then get the status
      const response = await api.get('/api/onboarding/status');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.onboarding.currentStep).toBe(2);
      expect(data.onboarding.completedSteps).toEqual([1]);
    });
  });

  // =============================================================================
  // PUT /api/onboarding/progress
  // =============================================================================

  test.describe('PUT /api/onboarding/progress', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should update onboarding progress', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.onboarding.currentStep).toBe(2);
      expect(data.onboarding.completedSteps).toEqual([1]);
      expect(data.onboarding.skippedSteps).toEqual([]);
    });

    test('should allow skipping steps', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 3,
        completedSteps: [1],
        skippedSteps: [2],
      });

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.onboarding.currentStep).toBe(3);
      expect(data.onboarding.completedSteps).toEqual([1]);
      expect(data.onboarding.skippedSteps).toEqual([2]);
    });

    test('should reject skipping required steps', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [],
        skippedSteps: [1],
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject invalid step numbers', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 6, // Invalid: max is 5
        completedSteps: [],
        skippedSteps: [],
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject step numbers below minimum', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 0, // Invalid: min is 1
        completedSteps: [],
        skippedSteps: [],
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject duplicate steps in completedSteps', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1, 1], // Duplicate
        skippedSteps: [],
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject steps that are both completed and skipped', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [1], // Same step in both arrays
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should reject skipping to step without completing previous steps', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 3, // Skip from 1 to 3 without completing/skipping step 2
        completedSteps: [1],
        skippedSteps: [],
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });

    test('should allow setting isComplete flag', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // First, progress through all steps
      await api.put('/api/onboarding/progress', {
        currentStep: 5,
        completedSteps: [1, 2, 3, 4],
        skippedSteps: [],
        isComplete: true,
      });

      const response = await api.get('/api/onboarding/status');
      const data = await response.getData();

      expect(data.onboarding.isComplete).toBe(true);
    });

    test('should require all required fields', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.put('/api/onboarding/progress', {
        currentStep: 1,
        // Missing completedSteps and skippedSteps
      });

      response.expectStatus(400);
      await response.expectErrorCode('VALIDATION_ERROR');
    });
  });

  // =============================================================================
  // POST /api/onboarding/complete
  // =============================================================================

  test.describe('POST /api/onboarding/complete', () => {
    test('should reject unauthenticated requests', async ({ request }) => {
      const api = new ApiClient(request);
      const response = await api.post('/api/onboarding/complete');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should mark onboarding as complete', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.post('/api/onboarding/complete');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.success).toBe(true);
      expect(data.completedAt).toBeDefined();
      expect(data.onboarding).toBeDefined();
      expect(data.onboarding.isComplete).toBe(true);
      expect(data.onboarding.currentStep).toBe(5);

      // Verify ISO date format
      const completedAtDate = new Date(data.completedAt);
      expect(completedAtDate.getTime()).not.toBeNaN();
    });

    test('should reflect complete status after marking complete', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // Mark as complete
      await api.post('/api/onboarding/complete');

      // Check status
      const response = await api.get('/api/onboarding/status');
      const data = await response.getData();

      expect(data.onboarding.isComplete).toBe(true);
      expect(data.onboarding.currentStep).toBe(5); // Final step
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  test.describe('Onboarding Flow Integration', () => {
    test('should support full onboarding flow', async ({ request }) => {
      const api = new ApiClient(request).withAuth(user.token);

      // 1. Get initial status
      let response = await api.get('/api/onboarding/status');
      let data = await response.getData();
      expect(data.onboarding.currentStep).toBe(1);

      // 2. Complete step 1 (Project Creation)
      response = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });
      data = await response.getData();
      expect(data.onboarding.currentStep).toBe(2);
      expect(data.onboarding.completedSteps).toContain(1);

      // 3. Skip step 2 (GSC Connection)
      response = await api.put('/api/onboarding/progress', {
        currentStep: 3,
        completedSteps: [1],
        skippedSteps: [2],
      });
      data = await response.getData();
      expect(data.onboarding.currentStep).toBe(3);
      expect(data.onboarding.skippedSteps).toContain(2);

      // 4. Complete step 3 (Keywords Upload)
      response = await api.put('/api/onboarding/progress', {
        currentStep: 4,
        completedSteps: [1, 3],
        skippedSteps: [2],
      });
      data = await response.getData();
      expect(data.onboarding.currentStep).toBe(4);

      // 5. Complete step 4 (Integrations)
      response = await api.put('/api/onboarding/progress', {
        currentStep: 5,
        completedSteps: [1, 3, 4],
        skippedSteps: [2],
      });
      data = await response.getData();
      expect(data.onboarding.currentStep).toBe(5);

      // 6. Mark complete
      response = await api.post('/api/onboarding/complete');
      data = await response.getData();
      expect(data.success).toBe(true);

      // 7. Verify final status
      response = await api.get('/api/onboarding/status');
      data = await response.getData();
      expect(data.onboarding.isComplete).toBe(true);
    });
  });
});
