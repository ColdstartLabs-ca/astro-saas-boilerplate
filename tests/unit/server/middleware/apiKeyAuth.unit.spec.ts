/**
 * Unit tests for server/middleware/apiKeyAuth.ts
 *
 * Tests for API key authentication middleware including extraction,
 * validation, rate limiting, and scope checking.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the api-key service
vi.mock('@server/services/api-key.service', () => ({
  apiKeyService: {
    validateKey: vi.fn(),
  },
  hashApiKey: vi.fn().mockResolvedValue('test-hash'),
  isValidKeyFormat: vi.fn((key: string) => key.startsWith('apr_live_') && key.length === 41),
  createRateLimiter: vi.fn(),
}));

// Mock the rate limiter
vi.mock('@server/rateLimit', () => ({
  createRateLimiter: vi.fn(() => async () => ({
    success: true,
    remaining: 99,
    reset: Date.now() + 60000,
  })),
}));

import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  checkScopes,
  withApiKeyAuth,
} from '@server/middleware/apiKeyAuth';
import { ApiKeyScopeError } from '@shared/types/api-key.types';

describe('API Key Authentication Middleware', () => {
  describe('extractApiKey', () => {
    it('should extract key from valid Bearer header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { authorization: 'Bearer apr_live_abc123def456ghi789jkl012mno345pqr' },
      });

      const result = extractApiKey(request);

      expect(result.success).toBe(true);
      expect(result.key).toBe('apr_live_abc123def456ghi789jkl012mno345pqr');
    });

    it('should reject invalid key format', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { authorization: 'Bearer invalid-key' },
      });

      const result = extractApiKey(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });

    it('should reject missing Authorization header', () => {
      const request = new Request('http://localhost/api/test');

      const result = extractApiKey(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing Authorization header');
    });

    it('should reject wrong Authorization format', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { authorization: 'Basic abc123' },
      });

      const result = extractApiKey(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Authorization header format');
    });

    it('should reject non-Bearer token', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { authorization: 'apr_live_abc123def456ghi789jkl012mno345pqr' },
      });

      const result = extractApiKey(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Authorization header format');
    });
  });

  describe('validateApiKey', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should reject invalid key format', async () => {
      const result = await validateApiKey('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });

    it('should return valid result for correct key', async () => {
      const { apiKeyService } = await import('@server/services/api-key.service');
      vi.mocked(apiKeyService.validateKey).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        keyId: 'key-1',
        scopes: ['articles:read'],
        rateLimit: 100,
      });

      const result = await validateApiKey('apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.scopes).toEqual(['articles:read']);
    });

    it('should return invalid result for non-existent key', async () => {
      const { apiKeyService } = await import('@server/services/api-key.service');
      vi.mocked(apiKeyService.validateKey).mockResolvedValue({
        valid: false,
        error: 'Key not found',
      });

      const result = await validateApiKey('apr_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key not found');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const keyId = 'test-key-1';
      const limit = 5;

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(keyId, limit);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }
    });

    it('should reject requests exceeding limit', () => {
      const keyId = 'test-key-2';
      const limit = 2;

      // First two should succeed
      checkRateLimit(keyId, limit);
      checkRateLimit(keyId, limit);

      // Third should fail
      const result = checkRateLimit(keyId, limit);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different keys independently', () => {
      const key1 = 'test-key-3a';
      const key2 = 'test-key-3b';
      const limit = 2;

      // Use up key1's limit
      checkRateLimit(key1, limit);
      checkRateLimit(key1, limit);

      // key2 should still have full limit
      const result = checkRateLimit(key2, limit);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(limit - 1);
    });

    it('should return reset time', () => {
      const keyId = 'test-key-4';
      const limit = 10;

      const result = checkRateLimit(keyId, limit);
      expect(result.reset).toBeGreaterThan(Date.now());
    });
  });

  describe('checkScopes', () => {
    it('should pass when all required scopes are present', () => {
      const provided = ['articles:read', 'articles:write', 'campaigns:read'];
      const required = ['articles:read', 'articles:write'];

      expect(() => checkScopes(provided, required)).not.toThrow();
    });

    it('should throw when required scope is missing', () => {
      const provided = ['articles:read'];
      const required = ['articles:read', 'campaigns:write'];

      expect(() => checkScopes(provided, required)).toThrow(ApiKeyScopeError);
    });

    it('should throw when no scopes are provided', () => {
      const provided: string[] = [];
      const required = ['articles:read'];

      expect(() => checkScopes(provided as any, required)).toThrow(ApiKeyScopeError);
    });

    it('should pass when no scopes are required', () => {
      const provided = ['articles:read'];
      const required: string[] = [];

      expect(() => checkScopes(provided, required)).not.toThrow();
    });
  });

  describe('withApiKeyAuth', () => {
    const createMockContext = (authHeader?: string) => ({
      request: new Request('http://localhost/api/test', {
        headers: authHeader ? { authorization: authHeader } : {},
      }),
    });

    beforeEach(async () => {
      vi.clearAllMocks();

      // Reset rate limit store
      const { apiKeyService } = await import('@server/services/api-key.service');
      vi.mocked(apiKeyService.validateKey).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        keyId: 'key-1',
        scopes: ['articles:read', 'articles:write'],
        rateLimit: 100,
      });
    });

    it('should reject missing Authorization header', async () => {
      const handler = withApiKeyAuth(['articles:read'], async () => new Response('OK'));
      const context = createMockContext();

      const response = await handler(context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid key', async () => {
      const { apiKeyService } = await import('@server/services/api-key.service');
      vi.mocked(apiKeyService.validateKey).mockResolvedValue({
        valid: false,
        error: 'Key not found',
      });

      const handler = withApiKeyAuth(['articles:read'], async () => new Response('OK'));
      const context = createMockContext('Bearer apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      const response = await handler(context);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject insufficient scopes', async () => {
      const { apiKeyService } = await import('@server/services/api-key.service');
      vi.mocked(apiKeyService.validateKey).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        keyId: 'key-1',
        scopes: ['articles:read'], // Missing articles:write
        rateLimit: 100,
      });

      const handler = withApiKeyAuth(['articles:read', 'articles:write'], async () => new Response('OK'));
      const context = createMockContext('Bearer apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      const response = await handler(context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should call handler with auth info on success', async () => {
      let receivedAuth: any = null;

      const handler = withApiKeyAuth(['articles:read'], async (auth) => {
        receivedAuth = auth;
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const context = createMockContext('Bearer apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      const response = await handler(context);

      expect(response.status).toBe(200);
      expect(receivedAuth).toEqual({
        userId: 'user-1',
        keyId: 'key-1',
        scopes: ['articles:read', 'articles:write'],
      });
    });

    it('should add rate limit headers to response', async () => {
      const handler = withApiKeyAuth(['articles:read'], async () => new Response('OK'));
      const context = createMockContext('Bearer apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      const response = await handler(context);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).not.toBeNull();
      expect(response.headers.get('X-RateLimit-Reset')).not.toBeNull();
    });

    it('should rate limit exceeded requests', async () => {
      // First, use up the rate limit
      const keyId = 'key-1';
      for (let i = 0; i < 100; i++) {
        checkRateLimit(keyId, 100);
      }

      const handler = withApiKeyAuth(['articles:read'], async () => new Response('OK'));
      const context = createMockContext('Bearer apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

      const response = await handler(context);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMITED');
      expect(response.headers.get('Retry-After')).not.toBeNull();
    });
  });
});
