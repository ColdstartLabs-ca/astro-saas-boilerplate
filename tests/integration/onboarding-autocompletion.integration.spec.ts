import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '../helpers';

/**
 * Onboarding Auto-Completion Integration Tests
 *
 * Tests edge cases in the onboarding flow including auto-completion
 * for users with existing projects and unique constraint handling.
 */

let ctx: TestContext;

test.beforeAll(async () => {
  ctx = new TestContext();
});

test.afterAll(async () => {
  await ctx.cleanup();
});

test.describe('Onboarding Auto-Completion Integration Tests', () => {
  test.describe('Initial State', () => {
    test('should start at step 1 for new user', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/onboarding/status');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      expect(data.currentStep).toBe(1);
      expect(data.isComplete).toBe(false);
      expect(data.completedSteps).toEqual([]);
      expect(data.skippedSteps).toEqual([]);
    });
  });

  test.describe('Auto-Completion', () => {
    test('should auto-complete for user with existing projects', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      // Create a project for the user before checking onboarding
      await ctx.createProject(user.id, {
        name: 'Existing Project',
        url: 'https://existing.com',
      });

      const api = new ApiClient(request).withAuth(user.token);
      const response = await api.get('/api/onboarding/status');

      response.expectStatus(200).expectSuccess();
      const data = await response.getData();

      // User with existing projects should be auto-completed
      expect(data.isComplete).toBe(true);
      expect(data.currentStep).toBe(5);
    });
  });

  test.describe('Unique Constraint', () => {
    test('should handle duplicate onboarding creation gracefully', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      const api = new ApiClient(request).withAuth(user.token);

      // First call - creates onboarding record
      const response1 = await api.get('/api/onboarding/status');
      response1.expectStatus(200).expectSuccess();
      const data1 = await response1.getData();

      // Second call - should return existing record (not error)
      const response2 = await api.get('/api/onboarding/status');
      response2.expectStatus(200).expectSuccess();
      const data2 = await response2.getData();

      // Both should return the same state
      expect(data1.currentStep).toBe(data2.currentStep);
      expect(data1.isComplete).toBe(data2.isComplete);
    });
  });

  test.describe('Progress Persistence', () => {
    test('should persist step completion across requests', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      const api = new ApiClient(request).withAuth(user.token);

      // Initialize onboarding
      await api.get('/api/onboarding/status');

      // Complete step 1
      const progressResponse = await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });
      progressResponse.expectStatus(200);

      // Verify persistence
      const statusResponse = await api.get('/api/onboarding/status');
      statusResponse.expectStatus(200).expectSuccess();
      const data = await statusResponse.getData();

      expect(data.completedSteps).toContain(1);
      expect(data.currentStep).toBe(2);
    });

    test('should persist skipped steps across requests', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      const api = new ApiClient(request).withAuth(user.token);

      // Initialize onboarding
      await api.get('/api/onboarding/status');

      // Complete step 1, skip step 2
      await api.put('/api/onboarding/progress', {
        currentStep: 3,
        completedSteps: [1],
        skippedSteps: [2],
      });

      // Verify persistence
      const statusResponse = await api.get('/api/onboarding/status');
      statusResponse.expectStatus(200).expectSuccess();
      const data = await statusResponse.getData();

      expect(data.completedSteps).toContain(1);
      expect(data.skippedSteps).toContain(2);
      expect(data.currentStep).toBe(3);
    });
  });

  test.describe('Full Completion Flow', () => {
    test('should complete entire onboarding flow', async ({ request }) => {
      const user = await ctx.createUser({ subscription: 'active', tier: 'growth', credits: 100 });

      const api = new ApiClient(request).withAuth(user.token);

      // Initialize
      await api.get('/api/onboarding/status');

      // Complete steps progressively
      await api.put('/api/onboarding/progress', {
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      await api.put('/api/onboarding/progress', {
        currentStep: 3,
        completedSteps: [1],
        skippedSteps: [2],
      });

      await api.put('/api/onboarding/progress', {
        currentStep: 4,
        completedSteps: [1, 3],
        skippedSteps: [2],
      });

      await api.put('/api/onboarding/progress', {
        currentStep: 5,
        completedSteps: [1, 3],
        skippedSteps: [2, 4],
      });

      // Mark as complete
      const completeResponse = await api.post('/api/onboarding/complete');
      completeResponse.expectStatus(200).expectSuccess();

      // Verify final state
      const statusResponse = await api.get('/api/onboarding/status');
      statusResponse.expectStatus(200).expectSuccess();
      const data = await statusResponse.getData();

      expect(data.isComplete).toBe(true);
      expect(data.currentStep).toBe(5);
    });
  });
});
