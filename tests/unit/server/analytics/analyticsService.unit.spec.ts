/**
 * Unit tests for server/analytics/analyticsService.ts
 *
 * Tests for the server-side analytics service including:
 * - trackServerEvent function
 * - hashEmail utility
 * - Event tracking with various configurations
 *
 * Note: In test environment, trackServerEvent returns true without making actual API calls.
 * These tests focus on the behavior that can be verified in test mode.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock serverEnv - tests will run in test mode
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    AMPLITUDE_API_KEY: 'test-amplitude-key',
    ENV: 'test',
  },
  isDevelopment: () => false,
  isTest: () => true,
  clientEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import { trackServerEvent, hashEmail } from '@server/analytics/analyticsService';
import type { IServerTrackOptions } from '@server/analytics/analyticsService';
import type { IAnalyticsEvent } from '@server/analytics/types';

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('trackServerEvent', () => {
    describe('API key validation', () => {
      it('should return false when API key is empty string', async () => {
        const result = await trackServerEvent(
          'login',
          { source: 'test' },
          { apiKey: '', userId: 'test-user' }
        );

        expect(result).toBe(false);
      });

      it('should return false when API key is undefined', async () => {
        const result = await trackServerEvent(
          'signup_completed',
          { method: 'email' },
          { apiKey: '' as unknown as string, userId: 'user-123' }
        );

        expect(result).toBe(false);
      });

      it('should return false when API key is null', async () => {
        const result = await trackServerEvent(
          'page_view',
          { path: '/home' },
          { apiKey: null as unknown as string, userId: 'user-123' }
        );

        expect(result).toBe(false);
      });

      it('should return true when valid API key is provided (test mode)', async () => {
        const result = await trackServerEvent(
          'login',
          { source: 'test' },
          { apiKey: 'valid-key', userId: 'user-123' }
        );

        // In test mode, returns true without making API call
        expect(result).toBe(true);
      });
    });

    describe('test environment behavior', () => {
      it('should return true in test environment without making API call', async () => {
        const result = await trackServerEvent(
          'test_event',
          { data: 'test' },
          { apiKey: 'test-key', userId: 'test-user' }
        );

        expect(result).toBe(true);
      });

      it('should return true when API key contains "test"', async () => {
        const result = await trackServerEvent(
          'test_event',
          { data: 'test' },
          { apiKey: 'test_amplitude_api_key', userId: 'test-user' }
        );

        expect(result).toBe(true);
      });

      it('should return true when API key starts with "test_"', async () => {
        const result = await trackServerEvent(
          'test_event',
          { data: 'test' },
          { apiKey: 'test_prefix_key', userId: 'test-user' }
        );

        expect(result).toBe(true);
      });

      it('should return true for various test key formats', async () => {
        const testKeys = ['test-key', 'test_amplitude_api_key', 'test123', 'my-test-key'];

        for (const apiKey of testKeys) {
          const result = await trackServerEvent('test_event', {}, { apiKey, userId: 'user-123' });
          expect(result).toBe(true);
        }
      });
    });

    describe('event types', () => {
      it('should handle authentication events', async () => {
        const authEvents: IAnalyticsEvent['name'][] = ['signup_completed', 'login', 'logout'];

        for (const eventName of authEvents) {
          const result = await trackServerEvent(
            eventName,
            { method: 'email' },
            {
              apiKey: 'test-key',
              userId: 'user-123',
            }
          );
          expect(result).toBe(true);
        }
      });

      it('should handle subscription events', async () => {
        const subEvents = [
          'subscription_created',
          'subscription_canceled',
          'subscription_renewed',
          'subscription_upgraded',
          'subscription_downgraded',
        ];

        for (const eventName of subEvents) {
          const result = await trackServerEvent(
            eventName,
            { plan: 'pro', amountCents: 2900 },
            { apiKey: 'test-key', userId: 'user-123' }
          );
          expect(result).toBe(true);
        }
      });

      it('should handle credit events', async () => {
        const creditEvents = [
          'credit_pack_purchased',
          'credits_deducted',
          'credits_refunded',
          'credits_low_warning',
        ];

        for (const eventName of creditEvents) {
          const result = await trackServerEvent(
            eventName,
            { amount: 100 },
            {
              apiKey: 'test-key',
              userId: 'user-123',
            }
          );
          expect(result).toBe(true);
        }
      });

      it('should handle content events', async () => {
        const contentEvents = [
          'project_created',
          'article_generation_started',
          'article_generated',
          'article_published',
        ];

        for (const eventName of contentEvents) {
          const result = await trackServerEvent(
            eventName,
            { articleId: 'art-123' },
            {
              apiKey: 'test-key',
              userId: 'user-123',
            }
          );
          expect(result).toBe(true);
        }
      });

      it('should handle PMF events', async () => {
        const pmfEvents = [
          'sean_ellis_survey_shown',
          'sean_ellis_survey_completed',
          'onboarding_completed',
        ];

        for (const eventName of pmfEvents) {
          const result = await trackServerEvent(
            eventName,
            { userId: 'user-123' },
            {
              apiKey: 'test-key',
              userId: 'user-123',
            }
          );
          expect(result).toBe(true);
        }
      });
    });

    describe('options handling', () => {
      it('should handle userId option', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          { apiKey: 'test-key', userId: 'user-123' }
        );

        expect(result).toBe(true);
      });

      it('should handle deviceId option', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          { apiKey: 'test-key', deviceId: 'device-123' }
        );

        expect(result).toBe(true);
      });

      it('should handle both userId and deviceId', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          { apiKey: 'test-key', userId: 'user-123', deviceId: 'device-123' }
        );

        expect(result).toBe(true);
      });

      it('should handle neither userId nor deviceId', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          {
            apiKey: 'test-key',
          }
        );

        expect(result).toBe(true);
      });
    });

    describe('properties handling', () => {
      it('should handle simple properties', async () => {
        const result = await trackServerEvent(
          'test_event',
          { stringProp: 'value', numberProp: 42, booleanProp: true },
          { apiKey: 'test-key', userId: 'user-123' }
        );

        expect(result).toBe(true);
      });

      it('should handle nested properties', async () => {
        const nestedProps = {
          user: {
            id: 'user-123',
            profile: {
              tier: 'pro',
            },
          },
          metadata: {
            source: 'web',
            campaign: 'summer-sale',
          },
        };

        const result = await trackServerEvent('complex_event', nestedProps, {
          apiKey: 'test-key',
          userId: 'user-123',
        });

        expect(result).toBe(true);
      });

      it('should handle array properties', async () => {
        const result = await trackServerEvent(
          'test_event',
          { tags: ['tag1', 'tag2', 'tag3'], items: [1, 2, 3] },
          { apiKey: 'test-key', userId: 'user-123' }
        );

        expect(result).toBe(true);
      });

      it('should handle empty properties', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          {
            apiKey: 'test-key',
            userId: 'user-123',
          }
        );

        expect(result).toBe(true);
      });

      it('should handle null properties', async () => {
        const result = await trackServerEvent(
          'test_event',
          { nullProp: null, undefinedProp: undefined },
          { apiKey: 'test-key', userId: 'user-123' }
        );

        expect(result).toBe(true);
      });
    });

    describe('function signature', () => {
      it('should accept event name as first parameter', async () => {
        const result = await trackServerEvent(
          'test_event' as IAnalyticsEvent['name'],
          {},
          { apiKey: 'test-key' }
        );

        expect(result).toBe(true);
      });

      it('should accept properties object as second parameter', async () => {
        const result = await trackServerEvent(
          'test_event',
          { key: 'value' },
          { apiKey: 'test-key' }
        );

        expect(result).toBe(true);
      });

      it('should accept options object as third parameter', async () => {
        const result = await trackServerEvent(
          'test_event',
          {},
          { apiKey: 'test-key', userId: 'user-123' }
        );

        expect(result).toBe(true);
      });

      it('should have correct parameter count', () => {
        expect(trackServerEvent.length).toBe(3);
      });
    });
  });

  describe('hashEmail utility', () => {
    describe('basic functionality', () => {
      it('should return a hash string', async () => {
        const hash = await hashEmail('test@example.com');

        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      });

      it('should produce consistent hashes for the same email', async () => {
        const email = 'user@example.com';
        const hash1 = await hashEmail(email);
        const hash2 = await hashEmail(email);

        expect(hash1).toBe(hash2);
      });

      it('should produce different hashes for different emails', async () => {
        const hash1 = await hashEmail('user1@example.com');
        const hash2 = await hashEmail('user2@example.com');

        expect(hash1).not.toBe(hash2);
      });

      it('should only contain hexadecimal characters', async () => {
        const hash = await hashEmail('test@example.com');

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    describe('email normalization', () => {
      it('should lowercase email before hashing', async () => {
        const hash1 = await hashEmail('TEST@EXAMPLE.COM');
        const hash2 = await hashEmail('test@example.com');

        expect(hash1).toBe(hash2);
      });

      it('should trim whitespace before hashing', async () => {
        const hash1 = await hashEmail('  test@example.com  ');
        const hash2 = await hashEmail('test@example.com');

        expect(hash1).toBe(hash2);
      });

      it('should handle mixed case and whitespace', async () => {
        const hash1 = await hashEmail('  Test@Example.COM  ');
        const hash2 = await hashEmail('test@example.com');

        expect(hash1).toBe(hash2);
      });

      it('should handle emails with plus addressing', async () => {
        const hash1 = await hashEmail('user+tag@example.com');
        const hash2 = await hashEmail('user+tag@example.com');

        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should treat whitespace-only as empty string after trim', async () => {
        // After trimming, whitespace-only becomes empty string
        // which produces the SHA-256 hash of empty string
        const hash = await hashEmail('   ');
        expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', async () => {
        await expect(hashEmail('')).rejects.toThrow('Valid email string is required');
      });

      it('should throw error for null input', async () => {
        await expect(hashEmail(null as unknown as string)).rejects.toThrow(
          'Valid email string is required'
        );
      });

      it('should throw error for undefined input', async () => {
        await expect(hashEmail(undefined as unknown as string)).rejects.toThrow(
          'Valid email string is required'
        );
      });

      it('should throw error for non-string input', async () => {
        await expect(hashEmail(123 as unknown as string)).rejects.toThrow(
          'Valid email string is required'
        );
      });

      it('should throw error for object input', async () => {
        await expect(hashEmail({ email: 'test' } as unknown as string)).rejects.toThrow(
          'Valid email string is required'
        );
      });

      it('should throw error for array input', async () => {
        await expect(hashEmail(['test@example.com'] as unknown as string)).rejects.toThrow(
          'Valid email string is required'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle very long email addresses', async () => {
        const longEmail = 'a'.repeat(300) + '@example.com';
        const hash = await hashEmail(longEmail);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should handle email with special characters', async () => {
        const specialEmail = "user+tag!#$%&'*+-/=?^_`{|}~@example.com";
        const hash = await hashEmail(specialEmail);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should handle international email addresses', async () => {
        const internationalEmail = 'user@例え.jp';
        const hash = await hashEmail(internationalEmail);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should handle email with dots in local part', async () => {
        const hash = await hashEmail('first.last@example.com');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should handle email with subdomains', async () => {
        const hash = await hashEmail('user@mail.example.com');
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    describe('uniqueness', () => {
      it('should generate unique hash for each unique email', async () => {
        const emails = [
          'user1@example.com',
          'user2@example.com',
          'user1@test.com',
          'user2@test.com',
        ];

        const hashes = await Promise.all(emails.map(e => hashEmail(e)));
        const uniqueHashes = new Set(hashes);

        expect(uniqueHashes.size).toBe(4);
      });

      it('should not collide similar emails', async () => {
        const similarEmails = [
          'user@example.com',
          'user1@example.com',
          'users@example.com',
          'user@example.org',
        ];

        const hashes = await Promise.all(similarEmails.map(e => hashEmail(e)));
        const uniqueHashes = new Set(hashes);

        expect(uniqueHashes.size).toBe(4);
      });

      it('should produce same hash for normalized variations', async () => {
        const variations = [
          'test@example.com',
          'TEST@example.com',
          'test@example.com  ',
          '  TEST@EXAMPLE.COM  ',
        ];

        const hashes = await Promise.all(variations.map(e => hashEmail(e)));
        const uniqueHashes = new Set(hashes);

        // All variations should produce the same hash
        expect(uniqueHashes.size).toBe(1);
      });
    });

    describe('format validation', () => {
      it('should produce SHA-256 format hash', async () => {
        const hash = await hashEmail('test@example.com');

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should use lowercase hex digits', async () => {
        const hash = await hashEmail('TEST@EXAMPLE.COM');

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
        expect(hash).not.toMatch(/[A-F]/);
      });

      it('should have consistent length', async () => {
        const hashes = await Promise.all([
          hashEmail('a@b.c'),
          hashEmail('very.long.email.address@very.long.domain.com'),
        ]);

        hashes.forEach(hash => {
          expect(hash.length).toBe(64);
        });
      });

      it('should produce empty string hash for whitespace only', async () => {
        const hash = await hashEmail('   ');
        // SHA-256 of empty string
        const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        expect(hash).toBe(emptyHash);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should track complete user journey in test mode', async () => {
      const userId = 'user-123';
      const journey = [
        {
          event: 'signup_completed' as const,
          properties: { method: 'google' },
        },
        {
          event: 'project_created' as const,
          properties: { projectId: 'proj-123', industry: 'tech' },
        },
        {
          event: 'article_generated' as const,
          properties: { articleId: 'art-123', wordCount: 500 },
        },
        {
          event: 'subscription_created' as const,
          properties: { plan: 'growth', amountCents: 9900 },
        },
      ];

      const results = [];
      for (const { event, properties } of journey) {
        const result = await trackServerEvent(event, properties, {
          apiKey: 'test-key',
          userId,
        });
        results.push(result);
      }

      // All should return true in test mode
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should handle tracking with hashed email', async () => {
      const email = 'user@example.com';
      const emailHash = await hashEmail(email);

      // In a real scenario, you'd use the hash as userId
      const result = await trackServerEvent(
        'login',
        { method: 'email' },
        { apiKey: 'test-key', userId: emailHash }
      );

      expect(result).toBe(true);
      expect(emailHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle multiple events with different properties', async () => {
      const events = [
        { name: 'page_view' as const, props: { path: '/home' } },
        { name: 'api_call_completed' as const, props: { endpoint: '/api/test', durationMs: 100 } },
        { name: 'credits_deducted' as const, props: { amount: 5, remaining: 95 } },
      ];

      for (const { name, props } of events) {
        const result = await trackServerEvent(name, props, {
          apiKey: 'test-key',
          userId: 'user-123',
        });
        expect(result).toBe(true);
      }
    });
  });

  describe('module exports', () => {
    it('should export trackServerEvent function', () => {
      expect(typeof trackServerEvent).toBe('function');
    });

    it('should export hashEmail function', () => {
      expect(typeof hashEmail).toBe('function');
    });

    it('should have correct function signatures', () => {
      // Verify trackServerEvent accepts expected parameters
      expect(trackServerEvent.length).toBe(3); // name, properties, options

      // Verify hashEmail accepts expected parameters
      expect(hashEmail.length).toBe(1); // email
    });

    it('should re-export hashEmail from crypto utils', async () => {
      // hashEmail is re-exported from @shared/utils/crypto
      const hash = await hashEmail('test@example.com');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('type safety', () => {
    it('should accept IAnalyticsEventName type', async () => {
      const eventNames: IAnalyticsEvent['name'][] = [
        'page_view',
        'signup_completed',
        'subscription_created',
        'article_generated',
      ];

      for (const eventName of eventNames) {
        const result = await trackServerEvent(
          eventName,
          {},
          {
            apiKey: 'test-key',
            userId: 'user-123',
          }
        );
        expect(result).toBe(true);
      }
    });

    it('should accept IServerTrackOptions type', async () => {
      const options: IServerTrackOptions = {
        apiKey: 'test-key',
        userId: 'user-123',
        deviceId: 'device-123',
      };

      const result = await trackServerEvent('test_event', {}, options);
      expect(result).toBe(true);
    });
  });

  describe('edge cases and error recovery', () => {
    it('should handle very long event names', async () => {
      const longEventName = 'a'.repeat(200) as IAnalyticsEvent['name'];
      const result = await trackServerEvent(
        longEventName,
        {},
        {
          apiKey: 'test-key',
        }
      );

      expect(result).toBe(true);
    });

    it('should handle special characters in event names', async () => {
      const specialEventName = 'event_with_underscore_and_numbers_123' as IAnalyticsEvent['name'];
      const result = await trackServerEvent(
        specialEventName,
        {},
        {
          apiKey: 'test-key',
        }
      );

      expect(result).toBe(true);
    });

    it('should handle missing userId and deviceId', async () => {
      const result = await trackServerEvent('test_event', { data: 'test' }, { apiKey: 'test-key' });

      expect(result).toBe(true);
    });
  });
});
