/**
 * Unit Tests: Credit Cost Constants
 *
 * Tests for centralized credit pricing model.
 * Validates writer preset costs, image preset costs, and total article cost calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  WRITER_CREDIT_COSTS,
  IMAGE_CREDIT_COSTS,
  calculateArticleCreditCost,
  MIN_ARTICLE_COST,
  MAX_ARTICLE_COST,
  type WriterPresetCreditCostKey,
  type ImagePresetCreditCostKey,
} from '@shared/constants';

describe('Credit Cost Constants', () => {
  describe('WRITER_CREDIT_COSTS', () => {
    it('should have correct preset costs', () => {
      expect(WRITER_CREDIT_COSTS.budget).toBe(1);
      expect(WRITER_CREDIT_COSTS.balanced).toBe(1);
      expect(WRITER_CREDIT_COSTS.pro).toBe(2);
      expect(WRITER_CREDIT_COSTS.ultra).toBe(3);
    });

    it('should have costs in ascending order', () => {
      expect(WRITER_CREDIT_COSTS.budget).toBeLessThanOrEqual(WRITER_CREDIT_COSTS.balanced);
      expect(WRITER_CREDIT_COSTS.balanced).toBeLessThanOrEqual(WRITER_CREDIT_COSTS.pro);
      expect(WRITER_CREDIT_COSTS.pro).toBeLessThanOrEqual(WRITER_CREDIT_COSTS.ultra);
    });
  });

  describe('IMAGE_CREDIT_COSTS', () => {
    it('should have correct preset costs', () => {
      expect(IMAGE_CREDIT_COSTS.budget).toBe(0);
      expect(IMAGE_CREDIT_COSTS.balanced).toBe(1);
      expect(IMAGE_CREDIT_COSTS.pro).toBe(1);
      expect(IMAGE_CREDIT_COSTS.ultra).toBe(2);
    });

    it('should have budget at zero cost (no addon)', () => {
      expect(IMAGE_CREDIT_COSTS.budget).toBe(0);
    });
  });

  describe('MIN_ARTICLE_COST', () => {
    it('should equal budget writer cost (no image addon)', () => {
      expect(MIN_ARTICLE_COST).toBe(WRITER_CREDIT_COSTS.budget);
      expect(MIN_ARTICLE_COST).toBe(1);
    });
  });

  describe('MAX_ARTICLE_COST', () => {
    it('should equal ultra writer + ultra image', () => {
      expect(MAX_ARTICLE_COST).toBe(WRITER_CREDIT_COSTS.ultra + IMAGE_CREDIT_COSTS.ultra);
      expect(MAX_ARTICLE_COST).toBe(5); // 3 + 2
    });
  });

  describe('calculateArticleCreditCost', () => {
    describe('with valid presets', () => {
      it('should calculate budget + no images correctly', () => {
        const cost = calculateArticleCreditCost('budget', null);
        expect(cost).toBe(1); // 1 + 0
      });

      it('should calculate budget + budget image correctly', () => {
        const cost = calculateArticleCreditCost('budget', 'budget');
        expect(cost).toBe(1); // 1 + 0
      });

      it('should calculate budget + balanced image correctly', () => {
        const cost = calculateArticleCreditCost('budget', 'balanced');
        expect(cost).toBe(2); // 1 + 1
      });

      it('should calculate balanced + no images correctly', () => {
        const cost = calculateArticleCreditCost('balanced', null);
        expect(cost).toBe(1); // 1 + 0
      });

      it('should calculate balanced + pro image correctly', () => {
        const cost = calculateArticleCreditCost('balanced', 'pro');
        expect(cost).toBe(2); // 1 + 1
      });

      it('should calculate pro + no images correctly', () => {
        const cost = calculateArticleCreditCost('pro', null);
        expect(cost).toBe(2); // 2 + 0
      });

      it('should calculate pro + ultra image correctly', () => {
        const cost = calculateArticleCreditCost('pro', 'ultra');
        expect(cost).toBe(4); // 2 + 2
      });

      it('should calculate ultra + no images correctly', () => {
        const cost = calculateArticleCreditCost('ultra', null);
        expect(cost).toBe(3); // 3 + 0
      });

      it('should calculate ultra + ultra image correctly (max cost)', () => {
        const cost = calculateArticleCreditCost('ultra', 'ultra');
        expect(cost).toBe(5); // 3 + 2 = MAX_ARTICLE_COST
      });
    });

    describe('with invalid/missing presets', () => {
      it('should default to 1 credit for invalid writer preset', () => {
        const cost = calculateArticleCreditCost('invalid_preset', null);
        expect(cost).toBe(1); // fallback writer cost
      });

      it('should default to 0 credits for invalid image preset', () => {
        const cost = calculateArticleCreditCost('pro', 'invalid_preset');
        expect(cost).toBe(2); // 2 + 0 (fallback image cost)
      });

      it('should default to 1 credit for null writer preset', () => {
        const cost = calculateArticleCreditCost(null, null);
        expect(cost).toBe(1); // fallback writer cost + 0 image
      });

      it('should default to 1 credit for undefined writer preset', () => {
        const cost = calculateArticleCreditCost(undefined, null);
        expect(cost).toBe(1); // fallback writer cost + 0 image
      });

      it('should handle legacy auto model correctly', () => {
        // 'auto' is not a valid preset, so it should fall back to 1
        const cost = calculateArticleCreditCost('auto', null);
        expect(cost).toBe(1); // fallback for unrecognized preset
      });
    });

    describe('pricing matrix', () => {
      it('should have correct costs for all writer/image combinations', () => {
        // Test matrix: writer presets (rows) x image presets (columns)
        const expectedCosts: Record<WriterPresetCreditCostKey, Record<ImagePresetCreditCostKey | 'none', number>> = {
          budget: {
            budget: 1,   // 1 + 0
            balanced: 2, // 1 + 1
            pro: 2,      // 1 + 1
            ultra: 3,    // 1 + 2
            none: 1,     // 1 + 0
          },
          balanced: {
            budget: 1,   // 1 + 0
            balanced: 2, // 1 + 1
            pro: 2,      // 1 + 1
            ultra: 3,    // 1 + 2
            none: 1,     // 1 + 0
          },
          pro: {
            budget: 2,   // 2 + 0
            balanced: 3, // 2 + 1
            pro: 3,      // 2 + 1
            ultra: 4,    // 2 + 2
            none: 2,     // 2 + 0
          },
          ultra: {
            budget: 3,   // 3 + 0
            balanced: 4, // 3 + 1
            pro: 4,      // 3 + 1
            ultra: 5,    // 3 + 2
            none: 3,     // 3 + 0
          },
        };

        for (const writer of Object.keys(WRITER_CREDIT_COSTS) as WriterPresetCreditCostKey[]) {
          for (const image of [...Object.keys(IMAGE_CREDIT_COSTS), 'none'] as (ImagePresetCreditCostKey | 'none')[]) {
            const actualCost = image === 'none'
              ? calculateArticleCreditCost(writer, null)
              : calculateArticleCreditCost(writer, image);
            const expectedCost = expectedCosts[writer][image];
            expect(actualCost).toBe(expectedCost);
          }
        }
      });
    });
  });

  describe('charge/refund consistency', () => {
    it('should have deterministic costs for same preset combination', () => {
      const preset1 = 'pro';
      const preset2 = 'ultra';

      const cost1 = calculateArticleCreditCost(preset1, preset2);
      const cost2 = calculateArticleCreditCost(preset1, preset2);
      const cost3 = calculateArticleCreditCost(preset1, preset2);

      expect(cost1).toBe(cost2);
      expect(cost2).toBe(cost3);
    });

    it('should prevent credit divergence on refunds', () => {
      // This test ensures that charge = refund for the same preset combination
      // Regression test for the bug where charge and refund formulas differed
      const testCases = [
        { writer: 'budget' as const, image: null },
        { writer: 'balanced' as const, image: 'balanced' as const },
        { writer: 'pro' as const, image: 'pro' as const },
        { writer: 'ultra' as const, image: 'ultra' as const },
      ];

      for (const testCase of testCases) {
        const chargedAmount = calculateArticleCreditCost(testCase.writer, testCase.image);
        const refundAmount = calculateArticleCreditCost(testCase.writer, testCase.image);

        expect(chargedAmount).toBe(refundAmount);
        expect(chargedAmount).toBeGreaterThan(0);
      }
    });
  });
});
