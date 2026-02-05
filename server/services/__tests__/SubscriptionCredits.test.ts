/**
 * SubscriptionCredits Service Tests
 *
 * Tests all credit calculation scenarios for subscription upgrades/downgrades
 */

import { describe, it, expect } from 'vitest';
import { SubscriptionCreditsService } from '../SubscriptionCredits';

// Create service instance for tests
const service = new SubscriptionCreditsService();

describe('SubscriptionCreditsService', () => {
  describe('calculateUpgradeCredits', () => {
    // ========================================================================
    // Scenario 1: Normal Upgrade (User Below Target)
    // ========================================================================
    describe('when user has less than new tier amount', () => {
      it('should add tier difference to preserve user balance', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 210,
          previousTierCredits: 200, // Starter
          newTierCredits: 1000, // Growth
        });

        expect(result.creditsToAdd).toBe(800); // Tier difference
        expect(result.reason).toBe('top_up_to_minimum'); // Because 210 < 1000
        expect(result.isLegitimate).toBe(true);
      });

      it('should work for free user upgrading to starter', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 3, // Free tier initial credits
          previousTierCredits: 3, // Free tier (3 one-time credits)
          newTierCredits: 30, // Starter
        });

        expect(result.creditsToAdd).toBe(27); // Tier difference: 30 - 3
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
      });

      it('should work for starter to agency upgrade', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 150,
          previousTierCredits: 30, // Starter
          newTierCredits: 500, // Agency
        });

        expect(result.creditsToAdd).toBe(470); // Tier difference: 500 - 30
        expect(result.reason).toBe('top_up_to_minimum');
      });
    });

    // ========================================================================
    // Scenario 2: Upgrade with Rollover (User Above Target but Reasonable)
    // ========================================================================
    describe('when user has reasonable excess credits', () => {
      it('should preserve rollover credits by adding tier difference', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 60, // 30 + 30 rollover/purchases
          previousTierCredits: 30, // Starter (max reasonable = 90)
          newTierCredits: 100, // Growth
        });

        // With simplified logic: always add tier difference
        expect(result.creditsToAdd).toBe(70);
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
        expect(result.maxReasonableBalance).toBe(0); // Not used anymore
      });

      it('should handle Growth user with rollover upgrading to Agency', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 250, // 100 + 150 rollover
          previousTierCredits: 100, // Growth (max reasonable = 300)
          newTierCredits: 500, // Agency
        });

        // With simplified logic: always add tier difference
        expect(result.creditsToAdd).toBe(400);
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
        expect(result.maxReasonableBalance).toBe(0); // Not used anymore
      });
    });

    // ========================================================================
    // Scenario 3: High Balance Users (No More Blocking)
    // ========================================================================
    describe('when user has high existing balance', () => {
      it('should still add tier difference for high-balance users (PRD fix)', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 500, // User downgraded from Agency to Starter, now upgrading back
          previousTierCredits: 30, // Starter
          newTierCredits: 500, // Agency
        });

        // With simplified logic: always add tier difference
        expect(result.creditsToAdd).toBe(470); // 500 - 30
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
        expect(result.maxReasonableBalance).toBe(0); // Not used anymore
      });

      it('should add credits for Starter user with 100 credits upgrading to Growth', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 100, // High balance from previous usage
          previousTierCredits: 30, // Starter
          newTierCredits: 100, // Growth
        });

        // With simplified logic: always add tier difference
        expect(result.creditsToAdd).toBe(70); // 100 - 30
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
      });

      it('should handle extreme rollover scenarios', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 1000, // Very high balance from purchases and rollover
          previousTierCredits: 100, // Growth
          newTierCredits: 500, // Agency
        });

        // With simplified logic: still add tier difference
        expect(result.creditsToAdd).toBe(400); // 500 - 100
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
      });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('edge cases', () => {
      it('should handle exact tier match (currentBalance === newTierCredits)', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 100,
          previousTierCredits: 30,
          newTierCredits: 100,
        });

        // With simplified logic: always add tier difference regardless of balance
        expect(result.creditsToAdd).toBe(70); // 100 - 30
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
      });

      it('should handle user with zero balance upgrading', () => {
        const result = service.calculateUpgradeCredits({
          currentBalance: 0,
          previousTierCredits: 30,
          newTierCredits: 100,
        });

        // Always add tier difference
        expect(result.creditsToAdd).toBe(70); // 100 - 30
        expect(result.reason).toBe('top_up_to_minimum');
        expect(result.isLegitimate).toBe(true);
      });
    });

    // ========================================================================
    // Validation
    // ========================================================================
    describe('input validation', () => {
      it('should reject negative current balance', () => {
        expect(() => {
          service.calculateUpgradeCredits({
            currentBalance: -100,
            previousTierCredits: 30,
            newTierCredits: 100,
          });
        }).toThrow('Credit amounts cannot be negative');
      });

      it('should reject negative previous tier credits', () => {
        expect(() => {
          service.calculateUpgradeCredits({
            currentBalance: 100,
            previousTierCredits: -30,
            newTierCredits: 100,
          });
        }).toThrow('Credit amounts cannot be negative');
      });

      it('should reject negative new tier credits', () => {
        expect(() => {
          service.calculateUpgradeCredits({
            currentBalance: 100,
            previousTierCredits: 30,
            newTierCredits: -100,
          });
        }).toThrow('Credit amounts cannot be negative');
      });

      it('should reject downgrade (newTier < previousTier)', () => {
        expect(() => {
          service.calculateUpgradeCredits({
            currentBalance: 100,
            previousTierCredits: 100, // Growth
            newTierCredits: 30, // Starter (downgrade)
          });
        }).toThrow('New tier must have more credits than previous tier');
      });

      it('should reject same tier (newTier === previousTier)', () => {
        expect(() => {
          service.calculateUpgradeCredits({
            currentBalance: 100,
            previousTierCredits: 100,
            newTierCredits: 100,
          });
        }).toThrow('New tier must have more credits than previous tier');
      });
    });
  });

  // ========================================================================
  // Downgrade Tests
  // ========================================================================
  describe('calculateDowngradeCredits', () => {
    it('should always return 0 credits for downgrade (user keeps credits)', () => {
      const result = service.calculateDowngradeCredits();

      expect(result.creditsToAdd).toBe(0);
      expect(result.reason).toBe('preserve_legitimate_excess');
      expect(result.isLegitimate).toBe(true);
    });
  });

  // ========================================================================
  // Explanation Tests
  // ========================================================================
  describe('getExplanation', () => {
    it('should explain top-up scenario', () => {
      const result = service.calculateUpgradeCredits({
        currentBalance: 40,
        previousTierCredits: 30,
        newTierCredits: 100,
      });

      const explanation = service.getExplanation(result, {
        currentBalance: 40,
        previousTierCredits: 30,
        newTierCredits: 100,
      });

      expect(explanation).toContain('40 credits');
      expect(explanation).toContain('100');
      expect(explanation).toContain('70'); // Tier difference
      expect(explanation).toContain('110'); // Final balance
    });

    it('should explain top up with reasonable excess scenario', () => {
      const result = service.calculateUpgradeCredits({
        currentBalance: 150, // Reasonable excess (within 100 * 3 = 300)
        previousTierCredits: 100,
        newTierCredits: 500,
      });

      const explanation = service.getExplanation(result, {
        currentBalance: 150,
        previousTierCredits: 100,
        newTierCredits: 500,
      });

      expect(explanation).toContain('150 credits');
      expect(explanation).toContain('upgrade to');
      expect(explanation).toContain('500'); // New tier amount
      expect(explanation).toContain('400'); // Tier difference
    });

    it('should explain high balance scenario (PRD fix)', () => {
      const result = service.calculateUpgradeCredits({
        currentBalance: 500, // High balance user
        previousTierCredits: 30,
        newTierCredits: 500,
      });

      const explanation = service.getExplanation(result, {
        currentBalance: 500,
        previousTierCredits: 30,
        newTierCredits: 500,
      });

      // With simplified logic, high balance users are no longer blocked
      expect(explanation).toContain('500 credits');
      expect(explanation).toContain('470'); // tier difference
      expect(explanation).toContain('970'); // final balance
      expect(explanation).toContain('upgrade to 500 tier');
    });

    it('should explain downgrade scenario', () => {
      const result = service.calculateDowngradeCredits();

      const explanation = service.getExplanation(result, {
        currentBalance: 100,
        previousTierCredits: 100,
        newTierCredits: 30,
      });

      expect(explanation).toContain('Downgrade');
      expect(explanation).toContain('keeps');
      expect(explanation).toContain('100 credits');
    });
  });
});
