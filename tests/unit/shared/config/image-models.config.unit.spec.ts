/**
 * Image Model Config Unit Tests
 *
 * Tests for image generation preset configuration and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  IMAGE_PRESETS,
  IMAGE_PRESET_KEYS,
  getImagePreset,
  getImagePresetCreditCost,
  getImageCountForWordCount,
  getPresetDescription,
  isValidImagePreset,
  type ImagePresetKey,
} from '@shared/config/image-models.config';

describe('image-models.config', () => {
  describe('IMAGE_PRESETS', () => {
    it('should have all 6 required presets', () => {
      expect(Object.keys(IMAGE_PRESETS)).toHaveLength(6);
    });

    it('should include all expected preset keys', () => {
      const expectedKeys: ImagePresetKey[] = [
        'blog-hero',
        'social-card',
        'product-shot',
        'premium-hero',
        'photorealistic',
        'illustration',
      ];
      expectedKeys.forEach(key => {
        expect(IMAGE_PRESETS[key]).toBeDefined();
      });
    });

    it('should have required fields for each preset', () => {
      Object.values(IMAGE_PRESETS).forEach(preset => {
        expect(preset).toHaveProperty('key');
        expect(preset).toHaveProperty('displayName');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('bestFor');
        expect(preset).toHaveProperty('replicateModel');
        expect(preset).toHaveProperty('defaultParams');
        expect(preset).toHaveProperty('creditCost');
        expect(preset).toHaveProperty('aspectRatio');
      });
    });

    it('should have valid preset keys', () => {
      Object.values(IMAGE_PRESETS).forEach(preset => {
        expect(isValidImagePreset(preset.key)).toBe(true);
      });
    });

    it('should have valid credit costs (0 or 1)', () => {
      Object.values(IMAGE_PRESETS).forEach(preset => {
        expect([0, 1]).toContain(preset.creditCost);
      });
    });
  });

  describe('IMAGE_PRESET_KEYS', () => {
    it('should return array of 6 preset keys', () => {
      expect(IMAGE_PRESET_KEYS).toHaveLength(6);
    });

    it('should match keys from IMAGE_PRESETS', () => {
      const configKeys = Object.keys(IMAGE_PRESETS) as ImagePresetKey[];
      expect(IMAGE_PRESET_KEYS).toEqual(expect.arrayContaining(configKeys));
    });
  });

  describe('isValidImagePreset', () => {
    it('should return true for valid preset keys', () => {
      expect(isValidImagePreset('blog-hero')).toBe(true);
      expect(isValidImagePreset('social-card')).toBe(true);
      expect(isValidImagePreset('product-shot')).toBe(true);
      expect(isValidImagePreset('premium-hero')).toBe(true);
      expect(isValidImagePreset('photorealistic')).toBe(true);
      expect(isValidImagePreset('illustration')).toBe(true);
    });

    it('should return false for invalid preset keys', () => {
      expect(isValidImagePreset('invalid')).toBe(false);
      expect(isValidImagePreset('')).toBe(false);
      expect(isValidImagePreset(null)).toBe(false);
      expect(isValidImagePreset(undefined)).toBe(false);
    });
  });

  describe('getImagePreset', () => {
    it('should return preset for valid key', () => {
      const preset = getImagePreset('blog-hero');
      expect(preset.key).toBe('blog-hero');
      expect(preset.displayName).toBe('Blog Hero');
      expect(preset.replicateModel).toBe('black-forest-labs/flux-schnell');
    });

    it('should throw for invalid key', () => {
      expect(() => getImagePreset('invalid' as ImagePresetKey)).toThrow(
        'Invalid image preset key: invalid'
      );
    });
  });

  describe('getImagePresetCreditCost', () => {
    it('should return 0 for standard/bundled presets', () => {
      expect(getImagePresetCreditCost('blog-hero')).toBe(0);
      expect(getImagePresetCreditCost('social-card')).toBe(0);
      expect(getImagePresetCreditCost('product-shot')).toBe(0);
    });

    it('should return 1 for premium presets', () => {
      expect(getImagePresetCreditCost('premium-hero')).toBe(1);
      expect(getImagePresetCreditCost('photorealistic')).toBe(1);
      expect(getImagePresetCreditCost('illustration')).toBe(1);
    });

    it('should return 0 for null/undefined/invalid preset', () => {
      expect(getImagePresetCreditCost(null)).toBe(0);
      expect(getImagePresetCreditCost(undefined)).toBe(0);
      expect(getImagePresetCreditCost('invalid')).toBe(0);
    });
  });

  describe('getImageCountForWordCount', () => {
    it('should return 0 for short articles (< 800 words)', () => {
      expect(getImageCountForWordCount(700)).toBe(0);
      expect(getImageCountForWordCount(0)).toBe(0);
      expect(getImageCountForWordCount(799)).toBe(0);
    });

    it('should return 2 for medium articles (800-1200 words)', () => {
      expect(getImageCountForWordCount(800)).toBe(2);
      expect(getImageCountForWordCount(1000)).toBe(2);
      expect(getImageCountForWordCount(1200)).toBe(2);
    });

    it('should return 3 for long articles (1200-3000 words)', () => {
      expect(getImageCountForWordCount(1201)).toBe(3);
      expect(getImageCountForWordCount(2000)).toBe(3);
      expect(getImageCountForWordCount(3000)).toBe(3);
    });

    it('should return 3 for very long articles (> 3000 words)', () => {
      expect(getImageCountForWordCount(3001)).toBe(3);
      expect(getImageCountForWordCount(5000)).toBe(3);
    });
  });

  describe('getPresetDescription', () => {
    it('should return description for each preset', () => {
      const descriptions = [
        getPresetDescription('blog-hero'),
        getPresetDescription('social-card'),
        getPresetDescription('product-shot'),
        getPresetDescription('premium-hero'),
        getPresetDescription('photorealistic'),
        getPresetDescription('illustration'),
      ];

      descriptions.forEach(desc => {
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      });
    });

    it('should return appropriate description for blog-hero', () => {
      const desc = getPresetDescription('blog-hero');
      expect(desc).toContain('blog');
    });

    it('should return appropriate description for illustration', () => {
      const desc = getPresetDescription('illustration');
      expect(desc).toContain('illustration');
    });
  });

  describe('Credit cost calculations', () => {
    it('should calculate total cost for standard preset article', () => {
      const baseCost = 1; // 1 credit for article
      const imageCost = getImagePresetCreditCost('blog-hero');
      expect(baseCost + imageCost).toBe(1); // No extra cost
    });

    it('should calculate total cost for premium preset article', () => {
      const baseCost = 1; // 1 credit for article
      const imageCost = getImagePresetCreditCost('premium-hero');
      expect(baseCost + imageCost).toBe(2); // +1 credit for premium
    });

    it('should calculate total cost for campaign with multiple keywords', () => {
      const keywordCount = 10;
      const imageCost = getImagePresetCreditCost('premium-hero');
      const totalCredits = keywordCount * (1 + imageCost);
      expect(totalCredits).toBe(20); // 10 keywords × 2 credits each
    });
  });
});
