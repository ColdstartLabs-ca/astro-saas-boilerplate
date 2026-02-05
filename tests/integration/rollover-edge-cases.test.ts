import { describe, expect, test } from 'vitest';
import { CREDIT_COSTS } from '../../shared/config/credits.config';
import { calculateBalanceWithExpiration } from '../../shared/config/subscription.utils';

describe('Credit Rollover Edge Cases', () => {
  describe('3x Cap Scenarios', () => {
    test('should handle exact cap limit scenarios for all tiers', () => {
      const scenarios = [
        {
          name: 'Starter at exact 3x cap',
          currentBalance: 90, // 30 * 3
          newCredits: 30,
          maxRollover: 90,
          expected: 90,
        },
        {
          name: 'Growth at exact 3x cap',
          currentBalance: 300, // 100 * 3
          newCredits: 100,
          maxRollover: 300,
          expected: 300,
        },
        {
          name: 'Agency at no rollover',
          currentBalance: 0, // 500 * 0 (no rollover)
          newCredits: 500,
          maxRollover: 0,
          expected: 500, // No cap means balance is just new credits
        },
      ];

      scenarios.forEach(({ name: _name, currentBalance, newCredits, maxRollover, expected }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance,
          newCredits,
          expirationMode: 'never',
          maxRollover,
        });

        expect(result.newBalance).toBe(expected);
        expect(result.expiredAmount).toBe(0);
      });
    });

    test('should handle balance just under 3x cap', () => {
      const scenarios = [
        {
          name: 'Starter: 89 credits (1 under cap)',
          currentBalance: 89,
          newCredits: 30,
          maxRollover: 90,
          expected: 90, // Capped
        },
        {
          name: 'Growth: 299 credits (1 under cap)',
          currentBalance: 299,
          newCredits: 100,
          maxRollover: 300,
          expected: 300, // Capped
        },
      ];

      scenarios.forEach(({ name: _name, currentBalance, newCredits, maxRollover, expected }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance,
          newCredits,
          expirationMode: 'never',
          maxRollover,
        });

        expect(result.newBalance).toBe(expected);
        expect(result.expiredAmount).toBe(0);
      });
    });

    test('should handle massive overage scenarios', () => {
      const scenarios = [
        {
          name: 'Starter: 10x over cap',
          currentBalance: 900, // 10x the cap
          newCredits: 30,
          maxRollover: 90,
          expected: 90, // Capped
        },
        {
          name: 'Growth: 50x over cap',
          currentBalance: 15000, // 50x the cap
          newCredits: 100,
          maxRollover: 300,
          expected: 300, // Capped
        },
      ];

      scenarios.forEach(({ name: _name, currentBalance, newCredits, maxRollover, expected }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance,
          newCredits,
          expirationMode: 'never',
          maxRollover,
        });

        expect(result.newBalance).toBe(expected);
        expect(result.expiredAmount).toBe(0);
      });
    });
  });

  describe('Downgrade Preservation Tests', () => {
    test('should preserve credits up to new cap on downgrade', () => {
      const downgradeScenarios = [
        {
          from: 'Growth',
          to: 'Starter',
          fromBalance: 300,
          toCap: 90,
          newCredits: 30,
          expected: 90, // Capped at Starter level
        },
        {
          from: 'Agency',
          to: 'Growth',
          fromBalance: 500,
          toCap: 300,
          newCredits: 100,
          expected: 300, // Capped at Growth level
        },
        {
          from: 'Agency',
          to: 'Starter',
          fromBalance: 500,
          toCap: 90,
          newCredits: 30,
          expected: 90, // Capped at Starter level
        },
      ];

      downgradeScenarios.forEach(
        ({ from: _from, to: _to, fromBalance, toCap, newCredits, expected }) => {
          const result = calculateBalanceWithExpiration({
            currentBalance: fromBalance,
            newCredits,
            expirationMode: 'never',
            maxRollover: toCap,
          });

          expect(result.newBalance).toBe(expected);
          expect(result.expiredAmount).toBe(0);
        }
      );
    });

    test('should not lose credits when downgrading from higher balance', () => {
      // User has 150 credits (exceeds Starter cap but within Growth cap)
      // Downgrades from Growth to Starter
      const result = calculateBalanceWithExpiration({
        currentBalance: 150,
        newCredits: 30, // Starter monthly allocation
        expirationMode: 'never',
        maxRollover: 90, // Starter cap
      });

      expect(result.newBalance).toBe(90); // Preserved up to Starter cap
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle multiple downgrades in sequence', () => {
      let balance = 500; // Starting with Agency-like balance

      // First downgrade: Agency -> Growth
      balance = calculateBalanceWithExpiration({
        currentBalance: balance,
        newCredits: 0, // No new credits
        expirationMode: 'never',
        maxRollover: 300, // Growth cap
      }).newBalance;
      expect(balance).toBe(300);

      // Second downgrade: Growth -> Starter
      balance = calculateBalanceWithExpiration({
        currentBalance: balance,
        newCredits: 0, // No new credits
        expirationMode: 'never',
        maxRollover: 90, // Starter cap
      }).newBalance;
      expect(balance).toBe(90);
    });
  });

  describe('Upgrade Scenarios', () => {
    test('should allow accumulation when upgrading tiers', () => {
      const scenarios = [
        {
          name: 'Starter -> Growth upgrade',
          fromBalance: 90, // At Starter cap
          fromCap: 90,
          toCap: 300, // Growth cap
          newCredits: 100,
          expected: 190, // 90 + 100 (no cap hit)
        },
        {
          name: 'Growth -> Agency upgrade',
          fromBalance: 300, // At Growth cap
          fromCap: 300,
          toCap: 0, // Agency has no rollover
          newCredits: 500,
          expected: 800, // 300 + 500 (no cap)
        },
      ];

      scenarios.forEach(({ name: _name, fromBalance, toCap, newCredits, expected }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance: fromBalance,
          newCredits,
          expirationMode: 'never',
          maxRollover: toCap,
        });

        expect(result.newBalance).toBe(expected);
        expect(result.expiredAmount).toBe(0);
      });
    });
  });

  describe('Zero Rollover (Agency Tier)', () => {
    test('should handle Agency tier with no rollover', () => {
      const scenarios = [
        {
          name: 'Agency: use it or lose it',
          currentBalance: 0,
          newCredits: 500,
          maxRollover: 0,
          expected: 500,
        },
        {
          name: 'Agency: unused credits expire',
          currentBalance: 200,
          newCredits: 500,
          maxRollover: 0,
          expected: 500, // Previous 200 are "lost"
        },
      ];

      scenarios.forEach(({ name: _name, currentBalance, newCredits, maxRollover, expected }) => {
        const result = calculateBalanceWithExpiration({
          currentBalance,
          newCredits,
          expirationMode: 'never',
          maxRollover,
        });

        expect(result.newBalance).toBe(expected);
        expect(result.expiredAmount).toBe(currentBalance);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid tier changes', () => {
      // Rapid upgrade: Starter -> Growth -> Agency
      const starterPlan = CREDIT_COSTS.STARTER_MONTHLY_CREDITS;
      const growthPlan = CREDIT_COSTS.GROWTH_MONTHLY_CREDITS;
      const agencyPlan = CREDIT_COSTS.AGENCY_MONTHLY_CREDITS;

      let balance = 0;

      // To Starter
      balance = calculateBalanceWithExpiration({
        currentBalance: balance,
        newCredits: starterPlan,
        expirationMode: 'never',
        maxRollover: starterPlan * 3, // 90
      }).newBalance;
      expect(balance).toBe(starterPlan);

      // To Growth
      balance = calculateBalanceWithExpiration({
        currentBalance: balance,
        newCredits: growthPlan,
        expirationMode: 'never',
        maxRollover: growthPlan * 3, // 300
      }).newBalance;
      expect(balance).toBe(starterPlan + growthPlan);

      // To Agency
      balance = calculateBalanceWithExpiration({
        currentBalance: balance,
        newCredits: agencyPlan,
        expirationMode: 'never',
        maxRollover: 0, // Agency has no rollover
      }).newBalance;
      expect(balance).toBe(starterPlan + growthPlan + agencyPlan);
    });

    test('should handle zero balance scenarios', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 0,
        newCredits: 30,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(30);
      expect(result.expiredAmount).toBe(0);
    });

    test('should handle zero new credits with existing balance', () => {
      const result = calculateBalanceWithExpiration({
        currentBalance: 50,
        newCredits: 0,
        expirationMode: 'never',
        maxRollover: 90,
      });

      expect(result.newBalance).toBe(50);
      expect(result.expiredAmount).toBe(0);
    });
  });
});
