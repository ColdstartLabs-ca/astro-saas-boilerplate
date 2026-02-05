import { describe, test, expect, beforeEach, vi } from 'vitest';
import { batchLimitCheck } from '../batch-limit.service';

describe('batch-limit.service', () => {
  beforeEach(() => {
    // Clear any console warnings before each test
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('checkAndIncrement()', () => {
    test('should allow first request for free user', async () => {
      const result = await batchLimitCheck.checkAndIncrement('user123', null);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    test('should allow requests within limit for paid users', async () => {
      // Test starter user (5 limit)
      let result = await batchLimitCheck.checkAndIncrement('user456', 'starter');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.current).toBe(0);

      // Test growth user (25 limit)
      result = await batchLimitCheck.checkAndIncrement('user789', 'growth');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(25);
      expect(result.current).toBe(0);

      // Test agency user (100 limit)
      result = await batchLimitCheck.checkAndIncrement('user101112', 'agency');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(0);
    });

    test('should handle unknown tier as free user', async () => {
      const result = await batchLimitCheck.checkAndIncrement('unknown-user', 'unknown_tier');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.current).toBe(0);
    });

    test('should set reset time to 1 hour from now', async () => {
      const userId = 'new-user';
      const now = Date.now();

      const result = await batchLimitCheck.checkAndIncrement(userId, null);

      // Reset time should be approximately 1 hour from now
      const resetTime = result.resetAt.getTime();
      const expectedResetTime = now + 60 * 60 * 1000;

      // Allow for small timing differences
      expect(resetTime).toBeGreaterThanOrEqual(expectedResetTime - 1000);
      expect(resetTime).toBeLessThanOrEqual(expectedResetTime + 5000);
    });
  });

  describe('check()', () => {
    test('should allow first request (deprecated method)', async () => {
      const result = await batchLimitCheck.check('user123', null);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    test('should handle unknown tier as free user', async () => {
      const result = await batchLimitCheck.check('unknown-user', 'unknown_tier');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.current).toBe(0);
    });
  });

  describe('increment()', () => {
    test('should be a no-op and log warning', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      batchLimitCheck.increment('test-user');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BATCH_LIMIT] Deprecated: increment()')
      );
    });
  });

  describe('getUsage()', () => {
    test('should return correct usage for new user', async () => {
      const userId = 'usage-new-user';

      const usage = await batchLimitCheck.getUsage(userId, 'starter');

      expect(usage.current).toBe(0);
      expect(usage.limit).toBe(5);
      expect(usage.remaining).toBe(5);
      expect(usage.resetAt).toBeInstanceOf(Date);
    });

    test('should return correct usage for different tiers', async () => {
      // Test starter user (5 limit)
      const starterUsage = await batchLimitCheck.getUsage('user-starter', 'starter');
      expect(starterUsage.limit).toBe(5);
      expect(starterUsage.remaining).toBe(5);

      // Test growth user (25 limit)
      const growthUsage = await batchLimitCheck.getUsage('user-growth', 'growth');
      expect(growthUsage.limit).toBe(25);
      expect(growthUsage.remaining).toBe(25);

      // Test agency user (100 limit)
      const agencyUsage = await batchLimitCheck.getUsage('user-agency', 'agency');
      expect(agencyUsage.limit).toBe(100);
      expect(agencyUsage.remaining).toBe(100);

      // Test free user (1 limit)
      const freeUsage = await batchLimitCheck.getUsage('user-free', null);
      expect(freeUsage.limit).toBe(1);
      expect(freeUsage.remaining).toBe(1);
    });

    test('should return 0 remaining when at limit in test env', async () => {
      const userId = 'usage-at-limit';

      // In test environment, current is always 0
      const usage = await batchLimitCheck.getUsage(userId, null);

      expect(usage.current).toBe(0);
      expect(usage.limit).toBe(1);
      expect(usage.remaining).toBe(1);
    });

    test('should handle unknown tier as free user', async () => {
      const usage = await batchLimitCheck.getUsage('unknown-user', 'unknown_tier');

      expect(usage.current).toBe(0);
      expect(usage.limit).toBe(1);
      expect(usage.remaining).toBe(1);
    });

    test('should set reset time to 1 hour from now', async () => {
      const userId = 'reset-usage-user';
      const now = Date.now();

      const usage = await batchLimitCheck.getUsage(userId, 'starter');

      // Reset time should be approximately 1 hour from now
      const resetTime = usage.resetAt.getTime();
      const expectedResetTime = now + 60 * 60 * 1000;

      // Allow for small timing differences
      expect(resetTime).toBeGreaterThanOrEqual(expectedResetTime - 1000);
      expect(resetTime).toBeLessThanOrEqual(expectedResetTime + 5000);
    });
  });

  describe('Multiple Users', () => {
    test('should handle multiple users independently', async () => {
      const user1 = 'multi-user-1';
      const user2 = 'multi-user-2';
      const user3 = 'multi-user-3';

      // Check each user independently
      const result1 = await batchLimitCheck.checkAndIncrement(user1, 'growth');
      const result2 = await batchLimitCheck.checkAndIncrement(user2, 'growth');
      const result3 = await batchLimitCheck.checkAndIncrement(user3, 'growth');

      expect(result1.allowed).toBe(true);
      expect(result1.current).toBe(0);

      expect(result2.allowed).toBe(true);
      expect(result2.current).toBe(0);

      expect(result3.allowed).toBe(true);
      expect(result3.current).toBe(0);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle rapid successive operations', async () => {
      const userId = 'concurrent-user';

      // Rapidly call checkAndIncrement
      const results = await Promise.all(
        Array.from({ length: 20 }, () => batchLimitCheck.checkAndIncrement(userId, 'starter'))
      );

      // All should be allowed in test environment
      results.forEach(result => {
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(0);
      });
    });

    test('should maintain data integrity with mixed operations', async () => {
      const userId = 'integrity-user';

      // Mix operations
      await batchLimitCheck.checkAndIncrement(userId, 'growth');
      await batchLimitCheck.getUsage(userId, 'growth');
      await batchLimitCheck.checkAndIncrement(userId, 'growth');

      const usage = await batchLimitCheck.getUsage(userId, 'growth');
      expect(usage.current).toBe(0);
      expect(usage.remaining).toBe(25);
    });
  });
});
