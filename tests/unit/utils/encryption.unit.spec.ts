/**
 * Unit tests for server/utils/encryption.ts
 *
 * Tests for AES-256-GCM encryption utilities including:
 * - encrypt() function
 * - decrypt() function
 * - encryptJSON() and decryptJSON() functions
 * - Error handling (EncryptionKeyError, DecryptionError)
 *
 * Uses Web Crypto API (Cloudflare Workers compatible)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock serverEnv before importing the module
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    CMS_ENCRYPTION_KEY: 'test-encryption-key-with-at-least-32-chars-for-secure',
    ENV: 'test',
  },
  isDevelopment: () => true,
  isTest: () => true,
  clientEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  EncryptionKeyError,
  DecryptionError,
  isEncryptionKeyError,
  isDecryptionError,
} from '@server/utils/encryption';

const mockCMSKey = 'test-encryption-key-with-at-least-32-chars-for-secure';

describe('server/utils/encryption', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt roundtrip correctly', async () => {
      const plaintext = 'Hello, World!';
      const ciphertext = await encrypt(plaintext);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      const plaintext = 'Same text';
      const ciphertext1 = await encrypt(plaintext);
      const ciphertext2 = await encrypt(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);

      // But both should decrypt to the same plaintext
      expect(await decrypt(ciphertext1)).toBe(plaintext);
      expect(await decrypt(ciphertext2)).toBe(plaintext);
    });

    it('should handle empty strings', async () => {
      const plaintext = '';
      const ciphertext = await encrypt(plaintext);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', async () => {
      const plaintext = 'Hello 世界! 🚀 Special chars: !@#$%^&*()';
      const ciphertext = await encrypt(plaintext);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', async () => {
      const plaintext = 'A'.repeat(10000); // 10KB of data
      const ciphertext = await encrypt(plaintext);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce base64-encoded output', async () => {
      const plaintext = 'Test';
      const ciphertext = await encrypt(plaintext);

      // Base64 regex pattern
      const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
      expect(ciphertext).toMatch(base64Pattern);
    });

    it('should fail to decrypt corrupted data', async () => {
      const corruptedCiphertext = 'not-valid-base64!!!';

      await expect(decrypt(corruptedCiphertext)).rejects.toThrow(DecryptionError);
    });

    it('should fail to decrypt truncated data', async () => {
      const plaintext = 'Test';
      const ciphertext = await encrypt(plaintext);

      // Truncate the ciphertext
      const truncatedCiphertext = ciphertext.substring(0, 10);

      await expect(decrypt(truncatedCiphertext)).rejects.toThrow(DecryptionError);
    });
  });

  describe('encryptJSON and decryptJSON', () => {
    it('should encrypt and decrypt JSON objects', async () => {
      const data = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'sk_test_12345',
      };

      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<typeof data>(ciphertext);

      expect(decrypted).toEqual(data);
    });

    it('should handle nested objects', async () => {
      const data = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
      };

      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<typeof data>(ciphertext);

      expect(decrypted).toEqual(data);
    });

    it('should handle arrays', async () => {
      const data = {
        items: ['apple', 'banana', 'cherry'],
        numbers: [1, 2, 3, 4, 5],
      };

      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<typeof data>(ciphertext);

      expect(decrypted).toEqual(data);
    });

    it('should handle empty objects', async () => {
      const data: Record<string, unknown> = {};
      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<Record<string, unknown>>(ciphertext);

      expect(decrypted).toEqual(data);
    });

    it('should handle WordPress credentials', async () => {
      const data = {
        appPassword: 'abcd 1234 efgh 5678 ijkl 8900',
      };

      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<typeof data>(ciphertext);

      expect(decrypted.appPassword).toBe(data.appPassword);
    });

    it('should handle webhook credentials', async () => {
      const data = {
        secret: 'webhook-secret-key',
      };

      const ciphertext = await encryptJSON(data);
      const decrypted = await decryptJSON<typeof data>(ciphertext);

      expect(decrypted.secret).toBe(data.secret);
    });

    it('should fail to decrypt corrupted JSON', async () => {
      const data = { test: 'value' };
      const ciphertext = await encryptJSON(data);

      // Corrupt the ciphertext by modifying bytes (not just character replacement)
      const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
      combined[0] = combined[0] ^ 0xff; // Flip bits in first byte
      const corruptedCiphertext = btoa(String.fromCharCode(...combined));

      await expect(decryptJSON(corruptedCiphertext)).rejects.toThrow(DecryptionError);
    });
  });

  describe('EncryptionKeyError', () => {
    it('should create EncryptionKeyError with correct message', () => {
      const error = new EncryptionKeyError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EncryptionKeyError');
      expect(error.message).toContain('CMS_ENCRYPTION_KEY');
    });

    it('should be catchable as Error', () => {
      expect(() => {
        throw new EncryptionKeyError();
      }).toThrow(EncryptionKeyError);
    });
  });

  describe('DecryptionError', () => {
    it('should create DecryptionError with custom message', () => {
      const errorMessage = 'Invalid ciphertext';
      const error = new DecryptionError(errorMessage);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DecryptionError');
      expect(error.message).toContain(errorMessage);
    });

    it('should be catchable as Error', () => {
      expect(() => {
        throw new DecryptionError('Test error');
      }).toThrow(DecryptionError);
    });
  });

  describe('Type guards', () => {
    it('should identify EncryptionKeyError correctly', () => {
      const error = new EncryptionKeyError();

      expect(isEncryptionKeyError(error)).toBe(true);
      expect(isDecryptionError(error)).toBe(false);
    });

    it('should identify DecryptionError correctly', () => {
      const error = new DecryptionError('Test error');

      expect(isDecryptionError(error)).toBe(true);
      expect(isEncryptionKeyError(error)).toBe(false);
    });

    it('should handle regular Error', () => {
      const error = new Error('Regular error');

      expect(isEncryptionKeyError(error)).toBe(false);
      expect(isDecryptionError(error)).toBe(false);
    });

    it('should handle non-Error values', () => {
      expect(isEncryptionKeyError(null)).toBe(false);
      expect(isDecryptionError(null)).toBe(false);
      expect(isEncryptionKeyError('string')).toBe(false);
      expect(isDecryptionError({})).toBe(false);
    });
  });

  describe('Edge cases and security properties', () => {
    it('should not leak key information in errors', async () => {
      const plaintext = 'Secret';

      try {
        await decrypt('invalid-ciphertext');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain(mockCMSKey);
        }
      }
    });

    it('should maintain ciphertext length consistency for same plaintext', async () => {
      const plaintext = 'Test';
      const ciphertexts = await Promise.all([
        encrypt(plaintext),
        encrypt(plaintext),
        encrypt(plaintext),
        encrypt(plaintext),
      ]);

      // All ciphertexts should have the same length (IV + ciphertext + tag)
      const lengths = ciphertexts.map(c => c.length);
      expect(new Set(lengths).size).toBe(1);
    });

    it('should generate different IVs for each encryption', async () => {
      const plaintext = 'Test';
      const ciphertext1 = await encrypt(plaintext);
      const ciphertext2 = await encrypt(plaintext);

      // Extract IV (first 12 bytes in base64 is ~16 chars)
      const iv1 = ciphertext1.substring(0, 16);
      const iv2 = ciphertext2.substring(0, 16);

      expect(iv1).not.toBe(iv2);
    });
  });

  describe('Real-world use cases', () => {
    it('should encrypt WordPress application password', async () => {
      const wpPassword = 'abcd 1234 efgh 5678 ijkl 8900 mnop';

      const ciphertext = await encrypt(wpPassword);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(wpPassword);
    });

    it('should encrypt webhook secret', async () => {
      const webhookSecret = 'whsec_test_secret_key_for_signing';

      const ciphertext = await encrypt(webhookSecret);
      const decrypted = await decrypt(ciphertext);

      expect(decrypted).toBe(webhookSecret);
    });

    it('should encrypt full WordPress credentials object', async () => {
      const credentials = {
        appPassword: 'abcd 1234 efgh 5678 ijkl 8900 mnop',
      };

      const ciphertext = await encryptJSON(credentials);
      const decrypted = await decryptJSON<typeof credentials>(ciphertext);

      expect(decrypted).toEqual(credentials);
    });

    it('should encrypt full webhook credentials object', async () => {
      const credentials = {
        secret: 'whsec_test_secret_key_for_signing_webhooks',
      };

      const ciphertext = await encryptJSON(credentials);
      const decrypted = await decryptJSON<typeof credentials>(ciphertext);

      expect(decrypted).toEqual(credentials);
    });
  });
});
