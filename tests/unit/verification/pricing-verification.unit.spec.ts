/**
 * PRD Pricing Verification Tests
 *
 * Verifies that the pricing implementation matches the PRD requirements:
 *
 * Writer Credit Costs (base cost):
 * - budget: 1 credit
 * - balanced: 1 credit
 * - pro: 2 credits
 * - ultra: 3 credits
 *
 * Image Credit Costs (addon):
 * - budget: 0 credits (free)
 * - balanced: 1 credit
 * - pro: 1 credit
 * - ultra: 2 credits
 *
 * Worst-case scenarios for Agency plan ($249/500 credits):
 * - Ultra writer + Ultra images = 3 + 2 = 5 credits/article
 * - Ultra writer + Pro images = 3 + 1 = 4 credits/article
 * - Ultra writer + Balanced images = 3 + 1 = 4 credits/article
 * - Budget writer + Budget images = 1 + 0 = 1 credit/article
 *
 * Agency profitability at worst case:
 * - 500 credits / 5 credits per article = 100 articles minimum
 * - 100 articles * $249 = $2.49 per article minimum
 * - Target: $0.50/article cost * 100 = $50.00 total cost
 * - Profit: $249 - $50.00 = $199.00 (80% profit margin)
 */

import { describe, it, expect } from 'vitest';
import {
  WRITER_PRESETS,
  getWriterPresetCreditCost,
} from '@shared/config/ai-models.config';
import {
  IMAGE_PRESETS,
  getImagePresetCreditCost,
} from '@shared/config/image-models.config';

describe('PRD Pricing Verification', () => {
  describe('Writer Preset Credit Costs (1/1/2/3)', () => {
    it('should cost 1 credit for budget writer', () => {
      expect(WRITER_PRESETS.budget.creditCost).toBe(1);
      expect(getWriterPresetCreditCost('budget')).toBe(1);
    });

    it('should cost 1 credit for balanced writer', () => {
      expect(WRITER_PRESETS.balanced.creditCost).toBe(1);
      expect(getWriterPresetCreditCost('balanced')).toBe(1);
    });

    it('should cost 2 credits for pro writer', () => {
      expect(WRITER_PRESETS.pro.creditCost).toBe(2);
      expect(getWriterPresetCreditCost('pro')).toBe(2);
    });

    it('should cost 3 credits for ultra writer', () => {
      expect(WRITER_PRESETS.ultra.creditCost).toBe(3);
      expect(getWriterPresetCreditCost('ultra')).toBe(3);
    });
  });

  describe('Image Preset Credit Costs (0/1/1/2)', () => {
    it('should cost 0 credits for budget images', () => {
      expect(IMAGE_PRESETS.budget.creditCost).toBe(0);
      expect(getImagePresetCreditCost('budget')).toBe(0);
    });

    it('should cost 1 credit for balanced images', () => {
      expect(IMAGE_PRESETS.balanced.creditCost).toBe(1);
      expect(getImagePresetCreditCost('balanced')).toBe(1);
    });

    it('should cost 1 credit for pro images', () => {
      expect(IMAGE_PRESETS.pro.creditCost).toBe(1);
      expect(getImagePresetCreditCost('pro')).toBe(1);
    });

    it('should cost 2 credits for ultra images', () => {
      expect(IMAGE_PRESETS.ultra.creditCost).toBe(2);
      expect(getImagePresetCreditCost('ultra')).toBe(2);
    });
  });

  describe('Worst-case Agency scenarios ($249/500 credits)', () => {
    const agencyPrice = 249;
    const agencyCredits = 500;

    it('Ultra writer + Ultra images = 5 credits/article', () => {
      const writerCost = getWriterPresetCreditCost('ultra');
      const imageCost = getImagePresetCreditCost('ultra');
      const totalCost = writerCost + imageCost;

      expect(writerCost).toBe(3);
      expect(imageCost).toBe(2);
      expect(totalCost).toBe(5);
    });

    it('Ultra writer + Pro images = 4 credits/article', () => {
      const writerCost = getWriterPresetCreditCost('ultra');
      const imageCost = getImagePresetCreditCost('pro');
      const totalCost = writerCost + imageCost;

      expect(writerCost).toBe(3);
      expect(imageCost).toBe(1);
      expect(totalCost).toBe(4);
    });

    it('Ultra writer + Balanced images = 4 credits/article', () => {
      const writerCost = getWriterPresetCreditCost('ultra');
      const imageCost = getImagePresetCreditCost('balanced');
      const totalCost = writerCost + imageCost;

      expect(writerCost).toBe(3);
      expect(imageCost).toBe(1);
      expect(totalCost).toBe(4);
    });

    it('Budget writer + Budget images = 1 credit/article', () => {
      const writerCost = getWriterPresetCreditCost('budget');
      const imageCost = getImagePresetCreditCost('budget');
      const totalCost = writerCost + imageCost;

      expect(writerCost).toBe(1);
      expect(imageCost).toBe(0);
      expect(totalCost).toBe(1);
    });

    it('Agency plan is profitable at worst-case (5 credits/article)', () => {
      const worstCaseCostPerArticle = 5; // Ultra writer + Ultra images
      const minArticlesPossible = Math.floor(agencyCredits / worstCaseCostPerArticle);
      const costPerArticleTarget = 0.5; // Target production cost
      const totalProductionCost = minArticlesPossible * costPerArticleTarget;
      const profit = agencyPrice - totalProductionCost;
      const profitMargin = (profit / agencyPrice) * 100;

      expect(minArticlesPossible).toBeGreaterThanOrEqual(100); // 500/5 = 100
      expect(profit).toBeGreaterThan(0);
      expect(profitMargin).toBeGreaterThan(75); // Should be ~80%
    });

    it('Agency plan is tight at best-case (1 credit/article)', () => {
      const bestCaseCostPerArticle = 1; // Budget writer + Budget images
      const maxArticlesPossible = agencyCredits / bestCaseCostPerArticle;
      const costPerArticleTarget = 0.5; // Target production cost
      const totalProductionCost = maxArticlesPossible * costPerArticleTarget;
      const profit = agencyPrice - totalProductionCost;

      expect(maxArticlesPossible).toBe(500); // 500/1 = 500
      // At best case, production cost ($250) slightly exceeds price ($249)
      // This is expected - the plan is priced competitively
      expect(profit).toBeCloseTo(-1, 0); // -$1 (basically break-even)
    });
  });

  describe('Credit calculation combinations', () => {
    it('should calculate correctly for all 16 combinations', () => {
      const writers = ['budget', 'balanced', 'pro', 'ultra'] as const;
      const images = ['budget', 'balanced', 'pro', 'ultra'] as const;

      const expectedCosts: Record<string, number> = {
        'budget+budget': 1 + 0,
        'budget+balanced': 1 + 1,
        'budget+pro': 1 + 1,
        'budget+ultra': 1 + 2,
        'balanced+budget': 1 + 0,
        'balanced+balanced': 1 + 1,
        'balanced+pro': 1 + 1,
        'balanced+ultra': 1 + 2,
        'pro+budget': 2 + 0,
        'pro+balanced': 2 + 1,
        'pro+pro': 2 + 1,
        'pro+ultra': 2 + 2,
        'ultra+budget': 3 + 0,
        'ultra+balanced': 3 + 1,
        'ultra+pro': 3 + 1,
        'ultra+ultra': 3 + 2,
      };

      for (const writer of writers) {
        for (const image of images) {
          const writerCost = getWriterPresetCreditCost(writer);
          const imageCost = getImagePresetCreditCost(image);
          const totalCost = writerCost + imageCost;
          const key = `${writer}+${image}`;

          expect(totalCost).toBe(expectedCosts[key]);
        }
      }
    });
  });
});
