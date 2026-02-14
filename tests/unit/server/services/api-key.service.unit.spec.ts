/**
 * Unit tests for server/services/api-key.service.ts
 *
 * Tests for API key generation, hashing, validation, and CRUD operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          single: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  },
}));

// Import after mocks
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  isValidKeyFormat,
  ApiKeyService,
} from '@server/services/api-key.service';
import { ApiKeyNotFoundError } from '@shared/types/api-key.types';

describe('API Key Service', () => {
  describe('generateApiKey', () => {
    it('should generate key with apr_live_ prefix', () => {
      const key = generateApiKey();
      expect(key.startsWith('apr_live_')).toBe(true);
    });

    it('should generate key with correct length', () => {
      const key = generateApiKey();
      // apr_live_ (9 chars) + 32 random chars = 41 chars
      expect(key.length).toBe(41);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });

    it('should only contain valid characters', () => {
      const key = generateApiKey();
      const randomPart = key.slice(9); // Remove apr_live_ prefix
      expect(/^[a-z0-9]+$/.test(randomPart)).toBe(true);
    });
  });

  describe('hashApiKey', () => {
    it('should hash key with SHA-256', async () => {
      const key = 'apr_live_abc123def456ghi789jkl012mno345pqr';
      const hash = await hashApiKey(key);

      // SHA-256 produces 64 character hex string
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should produce consistent hash for same input', async () => {
      const key = 'apr_live_test1234567890123456789012345678';
      const hash1 = await hashApiKey(key);
      const hash2 = await hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const key1 = 'apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const key2 = 'apr_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const hash1 = await hashApiKey(key1);
      const hash2 = await hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getKeyPrefix', () => {
    it('should extract first 8 chars after prefix', () => {
      const key = 'apr_live_abc123def456ghi789jkl012mno345pqr';
      const prefix = getKeyPrefix(key);
      expect(prefix).toBe('apr_live_abc123de');
    });

    it('should return consistent prefix for same key', () => {
      const key = 'apr_live_xyx987wvu654tsr321qpo098mln765kji';
      const prefix1 = getKeyPrefix(key);
      const prefix2 = getKeyPrefix(key);
      expect(prefix1).toBe(prefix2);
    });
  });

  describe('isValidKeyFormat', () => {
    it('should return true for valid key format', () => {
      const key = 'apr_live_abc123def456ghi789jkl012mno345pq'; // 9 + 32 = 41 chars
      expect(isValidKeyFormat(key)).toBe(true);
    });

    it('should return false for key without prefix', () => {
      const key = 'abc123def456ghi789jkl012mno345pqr';
      expect(isValidKeyFormat(key)).toBe(false);
    });

    it('should return false for key with wrong prefix', () => {
      const key = 'sk_live_abc123def456ghi789jkl012mno345pqr';
      expect(isValidKeyFormat(key)).toBe(false);
    });

    it('should return false for key with wrong length', () => {
      const key = 'apr_live_short';
      expect(isValidKeyFormat(key)).toBe(false);
    });

    it('should return false for key with invalid characters', () => {
      const key = 'apr_live_ABC123DEF456GHI789JKL012MNO345PQR';
      expect(isValidKeyFormat(key)).toBe(false);
    });

    it('should return false for key with special characters', () => {
      const key = 'apr_live_abc123def456ghi789jkl012mno345!@#';
      expect(isValidKeyFormat(key)).toBe(false);
    });
  });

  describe('ApiKeyService', () => {
    let service: ApiKeyService;
    let mockSupabase: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.clearAllMocks();
      service = new ApiKeyService();

      // Get the mocked supabaseAdmin
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
      mockSupabase = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    });

    describe('list', () => {
      it('should list API keys for user', async () => {
        const mockKeys = [
          {
            id: 'key-1',
            user_id: 'user-1',
            name: 'Test Key 1',
            key_prefix: 'apr_live_abc123de',
            last_used_at: null,
            rate_limit: 100,
            scopes: ['articles:read'],
            expires_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const mockOrder = vi.fn().mockResolvedValue({ data: mockKeys, error: null });
        const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.mockReturnValue({ select: mockSelect });

        const result = await service.list('user-1');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Test Key 1');
        expect(result[0].scopes).toEqual(['articles:read']);
      });

      it('should throw error on database failure', async () => {
        const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
        const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.mockReturnValue({ select: mockSelect });

        await expect(service.list('user-1')).rejects.toThrow('Failed to list API keys');
      });
    });

    describe('getById', () => {
      it('should return API key by ID', async () => {
        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test Key',
          key_prefix: 'apr_live_abc123de',
          last_used_at: null,
          rate_limit: 100,
          scopes: ['articles:read'],
          expires_at: null,
          created_at: '2024-01-01T00:00:00Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
        mockSupabase.mockReturnValue({ select: mockSelect });

        const result = await service.getById('key-1', 'user-1');

        expect(result).not.toBeNull();
        expect(result?.name).toBe('Test Key');
      });

      it('should return null for non-existent key', async () => {
        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
        mockSupabase.mockReturnValue({ select: mockSelect });

        const result = await service.getById('non-existent', 'user-1');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create API key and return full secret', async () => {
        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          name: 'New Key',
          key_prefix: 'apr_live_abc123de',
          last_used_at: null,
          rate_limit: 100,
          scopes: ['articles:read', 'articles:write'],
          expires_at: null,
          created_at: '2024-01-01T00:00:00Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        mockSupabase.mockReturnValue({ insert: mockInsert });

        const result = await service.create('user-1', {
          name: 'New Key',
          scopes: ['articles:read', 'articles:write'],
        });

        expect(result.name).toBe('New Key');
        expect(result.key).toMatch(/^apr_live_[a-z0-9]{32}$/);
        expect(result.scopes).toEqual(['articles:read', 'articles:write']);
      });

      it('should default to all scopes when not specified', async () => {
        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          name: 'New Key',
          key_prefix: 'apr_live_abc123de',
          last_used_at: null,
          rate_limit: 100,
          scopes: [
            'articles:read',
            'articles:write',
            'campaigns:read',
            'campaigns:write',
            'integrations:read',
          ],
          expires_at: null,
          created_at: '2024-01-01T00:00:00Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        mockSupabase.mockReturnValue({ insert: mockInsert });

        const result = await service.create('user-1', { name: 'New Key' });

        expect(result.scopes).toHaveLength(5);
      });
    });

    describe('update', () => {
      it('should update API key name', async () => {
        const existingMockSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'key-1',
            user_id: 'user-1',
            name: 'Old Name',
            scopes: [],
          },
          error: null,
        });
        const existingMockEq2 = vi.fn().mockReturnValue({ single: existingMockSingle });
        const existingMockEq1 = vi.fn().mockReturnValue({ eq: existingMockEq2 });
        const existingMockSelect = vi.fn().mockReturnValue({ eq: existingMockEq1 });
        mockSupabase.mockReturnValueOnce({ select: existingMockSelect });

        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          name: 'New Name',
          key_prefix: 'apr_live_abc123de',
          last_used_at: null,
          rate_limit: 100,
          scopes: [],
          expires_at: null,
          created_at: '2024-01-01T00:00:00Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq2 = vi.fn().mockReturnValue({ select: mockSelect });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1 });
        mockSupabase.mockReturnValueOnce({ update: mockUpdate });

        const result = await service.update('key-1', 'user-1', { name: 'New Name' });

        expect(result.name).toBe('New Name');
      });

      it('should throw ApiKeyNotFoundError for non-existent key', async () => {
        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
        mockSupabase.mockReturnValue({ select: mockSelect });

        await expect(service.update('non-existent', 'user-1', { name: 'New Name' })).rejects.toThrow(
          ApiKeyNotFoundError
        );
      });
    });

    describe('delete', () => {
      it('should delete API key', async () => {
        const existingMockSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'key-1',
            user_id: 'user-1',
            name: 'Test Key',
            scopes: [],
          },
          error: null,
        });
        const existingMockEq2 = vi.fn().mockReturnValue({ single: existingMockSingle });
        const existingMockEq1 = vi.fn().mockReturnValue({ eq: existingMockEq2 });
        const existingMockSelect = vi.fn().mockReturnValue({ eq: existingMockEq1 });
        mockSupabase.mockReturnValueOnce({ select: existingMockSelect });

        const mockEq2 = vi.fn().mockResolvedValue({ error: null });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
        mockSupabase.mockReturnValueOnce({ delete: mockDelete });

        await expect(service.delete('key-1', 'user-1')).resolves.not.toThrow();
      });
    });

    describe('validateKey', () => {
      it('should return invalid for wrong format', async () => {
        const result = await service.validateKey('invalid-key');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid key format');
      });

      it('should return invalid for non-existent key', async () => {
        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.mockReturnValue({ select: mockSelect });

        const result = await service.validateKey('apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Key not found');
      });

      it('should return valid for correct key', async () => {
        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          rate_limit: 100,
          scopes: ['articles:read'],
          expires_at: null,
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.mockReturnValueOnce({ select: mockSelect });

        // Mock the update for last_used_at
        const mockEq2 = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq2 });
        mockSupabase.mockReturnValueOnce({ update: mockUpdate });

        const result = await service.validateKey('apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        expect(result.valid).toBe(true);
        expect(result.userId).toBe('user-1');
        expect(result.scopes).toEqual(['articles:read']);
      });

      it('should return invalid for expired key', async () => {
        const mockKey = {
          id: 'key-1',
          user_id: 'user-1',
          rate_limit: 100,
          scopes: ['articles:read'],
          expires_at: '2020-01-01T00:00:00Z', // Past date
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockKey, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.mockReturnValue({ select: mockSelect });

        const result = await service.validateKey('apr_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Key has expired');
      });
    });
  });
});
