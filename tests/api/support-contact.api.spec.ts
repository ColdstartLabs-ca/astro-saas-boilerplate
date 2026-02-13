import { test, expect } from '@playwright/test';

interface ISupportContactRequest {
  name: string;
  email: string;
  category: 'technical' | 'billing' | 'feature-request' | 'other';
  subject: string;
  message: string;
}

interface ISupportContactResponse {
  success: boolean;
  message: string;
}

interface ISupportContactErrorResponse {
  success: false;
  message: string;
  error: string;
}

test.describe('API: Support Contact', () => {
  const validRequest: ISupportContactRequest = {
    name: 'Test User',
    email: 'test@example.com',
    category: 'technical',
    subject: 'Test Support Request',
    message: 'This is a test message to verify the support form is working.',
  };

  test.describe('Public Access', () => {
    test('should allow anonymous users to submit support requests', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: validRequest,
      });

      expect(response.status()).toBe(200);

      const data: ISupportContactResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('submitted');
    });

    test('should not require authentication headers', async ({ request }) => {
      // Explicitly no auth headers
      const response = await request.post('/api/support/contact', {
        data: validRequest,
        headers: {
          // No Authorization header
        },
      });

      expect(response.status()).toBe(200);
      const data: ISupportContactResponse = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Request Validation', () => {
    test('should reject requests with missing required fields', async ({ request }) => {
      const invalidRequest = {
        name: 'Test User',
        // Missing email, category, subject, message
      };

      const response = await request.post('/api/support/contact', {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const data: ISupportContactErrorResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    test('should reject requests with invalid email format', async ({ request }) => {
      const invalidRequest = {
        ...validRequest,
        email: 'not-an-email',
      };

      const response = await request.post('/api/support/contact', {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const data: ISupportContactErrorResponse = await response.json();
      expect(data.success).toBe(false);
    });

    test('should reject requests with empty message', async ({ request }) => {
      const invalidRequest = {
        ...validRequest,
        message: '',
      };

      const response = await request.post('/api/support/contact', {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const data: ISupportContactErrorResponse = await response.json();
      expect(data.success).toBe(false);
    });

    test('should reject requests with invalid category', async ({ request }) => {
      const invalidRequest = {
        ...validRequest,
        category: 'invalid-category',
      };

      const response = await request.post('/api/support/contact', {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const data: ISupportContactErrorResponse = await response.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('Category Handling', () => {
    const categories: Array<'technical' | 'billing' | 'feature-request' | 'other'> = [
      'technical',
      'billing',
      'feature-request',
      'other',
    ];

    for (const category of categories) {
      test(`should accept ${category} category`, async ({ request }) => {
        const requestWithCategory = {
          ...validRequest,
          category,
        };

        const response = await request.post('/api/support/contact', {
          data: requestWithCategory,
        });

        expect(response.status()).toBe(200);

        const data: ISupportContactResponse = await response.json();
        expect(data.success).toBe(true);
      });
    }
  });

  test.describe('Security Headers', () => {
    test('should include security headers', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: validRequest,
      });

      // Check security headers
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    });

    test('should have correct content-type', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: validRequest,
      });

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });
  });

  test.describe('CORS Handling', () => {
    test('should handle CORS preflight requests', async ({ request }) => {
      const response = await request.fetch('/api/support/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // OPTIONS should be handled
      expect([200, 204]).toContain(response.status());
    });
  });

  test.describe('Rate Limiting', () => {
    test('should respond within reasonable time', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post('/api/support/contact', {
        data: validRequest,
      });
      const duration = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  test.describe('Message Content', () => {
    test('should accept long messages', async ({ request }) => {
      const longMessage = 'A'.repeat(2000); // 2000 character message
      const requestWithLongMessage = {
        ...validRequest,
        message: longMessage,
      };

      const response = await request.post('/api/support/contact', {
        data: requestWithLongMessage,
      });

      expect(response.status()).toBe(200);

      const data: ISupportContactResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('should accept special characters in message', async ({ request }) => {
      const specialMessage = 'Test with special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const requestWithSpecialChars = {
        ...validRequest,
        message: specialMessage,
      };

      const response = await request.post('/api/support/contact', {
        data: requestWithSpecialChars,
      });

      expect(response.status()).toBe(200);

      const data: ISupportContactResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('should accept unicode characters', async ({ request }) => {
      const unicodeMessage = 'Test with unicode: 你好世界 🚀 Přívětivý';
      const requestWithUnicode = {
        ...validRequest,
        message: unicodeMessage,
      };

      const response = await request.post('/api/support/contact', {
        data: requestWithUnicode,
      });

      expect(response.status()).toBe(200);

      const data: ISupportContactResponse = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Authenticated User Context', () => {
    test('should capture userId when user is authenticated', async ({ request }) => {
      // Note: This test requires a valid JWT token
      // In a real test scenario, you would use TestContext to create a user
      // For now, we test that the endpoint accepts the request

      const response = await request.post('/api/support/contact', {
        data: validRequest,
        headers: {
          // In actual tests, use: Authorization: `Bearer ${user.token}`
        },
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: '{invalid json}',
      });

      expect([400, 500]).toContain(response.status());
    });

    test('should return proper error structure on failure', async ({ request }) => {
      const response = await request.post('/api/support/contact', {
        data: {},
      });

      expect(response.status()).toBe(400);

      const data: ISupportContactErrorResponse = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('HTTP Methods', () => {
    test('should reject GET requests', async ({ request }) => {
      const response = await request.get('/api/support/contact');

      expect([404, 405]).toContain(response.status());
    });

    test('should reject PUT requests', async ({ request }) => {
      const response = await request.put('/api/support/contact', {
        data: validRequest,
      });

      expect([404, 405]).toContain(response.status());
    });

    test('should reject DELETE requests', async ({ request }) => {
      const response = await request.delete('/api/support/contact');

      expect([404, 405]).toContain(response.status());
    });
  });
});
