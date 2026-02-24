import { test, expect } from '@playwright/test';
import { TestContext, ApiClient } from '@/tests/helpers';

describe('Email API', () => {
  let ctx: TestContext;
  let api: ApiClient;

  test.beforeAll(async () => {
    ctx = new TestContext();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test.beforeEach(async ({ request }) => {
    api = new ApiClient(request);
  });

  describe('POST /api/email/send', () => {
    test('should require authentication', async () => {
      const response = await api.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: { userName: 'Test User' },
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should require admin role', async () => {
      const regularUser = await ctx.createUser();
      const authenticatedApi = api.withAuth(regularUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: { userName: 'Test User' },
      });

      response.expectStatus(403);
      await response.expectErrorCode('NOT_ADMIN');
    });

    test('should validate request body', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'invalid-email', // Invalid email format
        template: 'welcome',
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    test('should send email for valid request with admin user', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: { userName: 'Test User' },
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should reject invalid template names', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'invalid-template',
        data: {},
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    test('should accept all valid template names', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const validTemplates = [
        'welcome',
        'payment-success',
        'subscription-update',
        'low-credits',
        'password-reset',
        'article-complete',
      ] as const;

      for (const template of validTemplates) {
        const response = await authenticatedApi.post('/api/email/send', {
          to: 'test@example.com',
          template,
          data: {},
        });

        response.expectStatus(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    test('should default to transactional type when not specified', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        // type not specified
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should accept transactional type', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        type: 'transactional',
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should accept marketing type', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        type: 'marketing',
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should reject invalid email type', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'test@example.com',
        template: 'welcome',
        data: {},
        type: 'invalid-type',
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    test('should handle emails with special characters', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'user+tag@example.com',
        template: 'welcome',
        data: {},
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should return error details for malformed request', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'not-an-email',
        template: 'invalid-template',
        data: 'not-an-object',
        type: 'invalid-type',
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    test('should handle empty request body', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {});

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    test('should include messageId on success', async () => {
      const adminUser = await ctx.createAdminUser();
      const authenticatedApi = api.withAuth(adminUser.token);

      const response = await authenticatedApi.post('/api/email/send', {
        to: 'recipient@example.com',
        template: 'welcome',
        data: { userName: 'Recipient' },
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.messageId).toBeDefined();
      expect(typeof data.messageId).toBe('string');
    });
  });

  describe('GET /api/email/preferences', () => {
    test('should require authentication', async () => {
      const response = await api.get('/api/email/preferences');

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should return default preferences for new user', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.get('/api/email/preferences');

      response.expectStatus(200);
      const data = await response.json();
      expect(data).toMatchObject({
        marketing_emails: true,
        product_updates: true,
        low_credit_alerts: true,
      });
    });

    test('should return user preferences if set', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      // First set preferences
      await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
      });

      // Then fetch them
      const response = await authenticatedApi.get('/api/email/preferences');

      response.expectStatus(200);
      const data = await response.json();
      expect(data.marketing_emails).toBe(false);
    });

    test('should allow users to opt out of marketing', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
      });

      const response = await authenticatedApi.get('/api/email/preferences');
      response.expectStatus(200);
      const data = await response.json();
      expect(data.marketing_emails).toBe(false);
    });

    test('should preserve other preferences when updating one', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      // Set all to false
      await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
        product_updates: false,
        low_credit_alerts: false,
      });

      // Update only one
      await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: true,
      });

      const response = await authenticatedApi.get('/api/email/preferences');
      const data = await response.json();
      expect(data.marketing_emails).toBe(true);
      expect(data.product_updates).toBe(false);
      expect(data.low_credit_alerts).toBe(false);
    });

    test('should not leak other users preferences', async () => {
      const user1 = await ctx.createUser();
      const user2 = await ctx.createUser();

      const api1 = api.withAuth(user1.token);
      const api2 = api.withAuth(user2.token);

      // User1 opts out
      await api1.patch('/api/email/preferences', {
        marketing_emails: false,
      });

      // User2 should still have defaults
      const response = await api2.get('/api/email/preferences');
      const data = await response.json();
      expect(data.marketing_emails).toBe(true);
    });
  });

  describe('PATCH /api/email/preferences', () => {
    test('should require authentication', async () => {
      const response = await api.patch('/api/email/preferences', {
        marketing_emails: false,
      });

      response.expectStatus(401);
      await response.expectErrorCode('UNAUTHORIZED');
    });

    test('should update email preferences', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
        low_credit_alerts: false,
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.marketing_emails).toBe(false);
      expect(data.low_credit_alerts).toBe(false);
    });

    test('should validate update data', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: 'not-a-boolean', // Invalid type
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    test('should accept valid boolean values', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: true,
        product_updates: false,
        low_credit_alerts: true,
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.marketing_emails).toBe(true);
      expect(data.product_updates).toBe(false);
      expect(data.low_credit_alerts).toBe(true);
    });

    test('should handle partial updates', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
        // Only updating one field
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data.marketing_emails).toBe(false);
    });

    test('should reject invalid field names', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
        invalid_field: true, // Invalid field
      });

      response.expectStatus(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    test('should return updated preferences', async () => {
      const user = await ctx.createUser();
      const authenticatedApi = api.withAuth(user.token);

      const response = await authenticatedApi.patch('/api/email/preferences', {
        marketing_emails: false,
        product_updates: false,
      });

      response.expectStatus(200);
      const data = await response.json();
      expect(data).toMatchObject({
        marketing_emails: false,
        product_updates: false,
      });
      expect(data.updated_at).toBeDefined();
    });
  });
});
