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
  getAvailableImagePresets,
  isAvailableImagePreset,
  type ImagePresetKey,
} from '@shared/config/image-models.config';

describe('image-models.config', () => {
  describe('IMAGE_PRESETS', () => {
    it('should have all 4 required presets', () => {
      expect(Object.keys(IMAGE_PRESETS)).toHaveLength(4);
    });

    it('should include all expected preset keys', () => {
      const expectedKeys: ImagePresetKey[] = ['budget', 'balanced', 'pro', 'ultra'];
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

    it('should have valid credit costs (0, 1, or 2)', () => {
      Object.values(IMAGE_PRESETS).forEach(preset => {
        expect([0, 1, 2]).toContain(preset.creditCost);
      });
    });
  });

  describe('IMAGE_PRESET_KEYS', () => {
    it('should return array of 4 preset keys', () => {
      expect(IMAGE_PRESET_KEYS).toHaveLength(4);
    });

    it('should match keys from IMAGE_PRESETS', () => {
      const configKeys = Object.keys(IMAGE_PRESETS) as ImagePresetKey[];
      expect(IMAGE_PRESET_KEYS).toEqual(expect.arrayContaining(configKeys));
    });
  });

  describe('isValidImagePreset', () => {
    it('should return true for valid preset keys', () => {
      expect(isValidImagePreset('budget')).toBe(true);
      expect(isValidImagePreset('balanced')).toBe(true);
      expect(isValidImagePreset('pro')).toBe(true);
      expect(isValidImagePreset('ultra')).toBe(true);
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
      const preset = getImagePreset('budget');
      expect(preset.key).toBe('budget');
      expect(preset.displayName).toBe('Budget');
      expect(preset.replicateModel).toBe('prunaai/z-image-turbo');
    });

    it('should throw for invalid key', () => {
      expect(() => getImagePreset('invalid' as ImagePresetKey)).toThrow(
        'Invalid image preset key: invalid'
      );
    });
  });

  describe('getImagePresetCreditCost', () => {
    it('should return 0 for budget preset', () => {
      expect(getImagePresetCreditCost('budget')).toBe(0);
    });

    it('should return 1 for balanced preset', () => {
      expect(getImagePresetCreditCost('balanced')).toBe(1);
    });

    it('should return 1 for pro preset', () => {
      expect(getImagePresetCreditCost('pro')).toBe(1);
    });

    it('should return 2 for ultra preset', () => {
      expect(getImagePresetCreditCost('ultra')).toBe(2);
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
        getPresetDescription('budget'),
        getPresetDescription('balanced'),
        getPresetDescription('pro'),
        getPresetDescription('ultra'),
      ];

      descriptions.forEach(desc => {
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      });
    });

    it('should return appropriate description for budget', () => {
      const desc = getPresetDescription('budget');
      expect(desc).toContain('blog');
    });

    it('should return appropriate description for ultra', () => {
      const desc = getPresetDescription('ultra');
      expect(desc).toContain('photorealistic');
    });
  });

  describe('Credit cost calculations', () => {
    it('should calculate total cost for budget writer + budget images', () => {
      // Budget writer = 1 credit, budget images = 0 credits
      const writerCost = 1;
      const imageCost = getImagePresetCreditCost('budget');
      expect(writerCost + imageCost).toBe(1);
    });

    it('should calculate total cost for pro writer + pro images', () => {
      // Pro writer = 2 credits, pro images = 1 credit
      const writerCost = 2;
      const imageCost = getImagePresetCreditCost('pro');
      expect(writerCost + imageCost).toBe(3);
    });

    it('should calculate total cost for ultra writer + ultra images', () => {
      // Ultra writer = 3 credits, ultra images = 2 credits
      const writerCost = 3;
      const imageCost = getImagePresetCreditCost('ultra');
      expect(writerCost + imageCost).toBe(5);
    });

    it('should calculate total cost for campaign with multiple keywords', () => {
      // Pro writer (2) + pro images (1) = 3 credits per article
      const keywordCount = 10;
      const writerCost = 2;
      const imageCost = getImagePresetCreditCost('pro');
      const totalCredits = keywordCount * (writerCost + imageCost);
      expect(totalCredits).toBe(30);
    });
  });

  describe('getAvailableImagePresets', () => {
    it('should return all presets when env string is empty', () => {
      const presets = getAvailableImagePresets('');
      expect(presets).toHaveLength(4);
      expect(presets.map(p => p.key)).toEqual(expect.arrayContaining(IMAGE_PRESET_KEYS));
    });

    it('should return all presets when env string contains only whitespace', () => {
      const presets = getAvailableImagePresets('   ,  ,   ');
      expect(presets).toHaveLength(4);
    });

    it('should filter to only enabled presets when env has values', () => {
      const presets = getAvailableImagePresets('budget,pro');
      expect(presets).toHaveLength(2);
      expect(presets.map(p => p.key)).toEqual(['budget', 'pro']);
    });

    it('should handle single preset', () => {
      const presets = getAvailableImagePresets('balanced');
      expect(presets).toHaveLength(1);
      expect(presets[0].key).toBe('balanced');
    });

    it('should ignore invalid preset keys silently', () => {
      const presets = getAvailableImagePresets('budget,invalid-key,balanced');
      expect(presets).toHaveLength(2);
      expect(presets.map(p => p.key)).toEqual(['budget', 'balanced']);
    });

    it('should handle extra whitespace around comma-separated values', () => {
      const presets = getAvailableImagePresets('  budget  ,  balanced  ,  pro  ');
      expect(presets).toHaveLength(3);
      expect(presets.map(p => p.key)).toEqual(['budget', 'balanced', 'pro']);
    });

    it('should return empty array when no valid keys provided', () => {
      const presets = getAvailableImagePresets('invalid,another-invalid');
      expect(presets).toHaveLength(0);
    });
  });

  describe('isAvailableImagePreset', () => {
    it('should return true for any preset when env is empty', () => {
      expect(isAvailableImagePreset('budget', '')).toBe(true);
      expect(isAvailableImagePreset('pro', '')).toBe(true);
      expect(isAvailableImagePreset('ultra', '')).toBe(true);
    });

    it('should return true for enabled presets', () => {
      expect(isAvailableImagePreset('budget', 'budget,balanced')).toBe(true);
      expect(isAvailableImagePreset('balanced', 'budget,balanced')).toBe(true);
    });

    it('should return false for disabled presets', () => {
      expect(isAvailableImagePreset('pro', 'budget,balanced')).toBe(false);
      expect(isAvailableImagePreset('ultra', 'budget,balanced')).toBe(false);
    });

    it('should return false for invalid preset keys', () => {
      expect(isAvailableImagePreset('invalid-key', 'budget,balanced')).toBe(false);
      expect(isAvailableImagePreset('', 'budget,balanced')).toBe(false);
    });

    it('should handle whitespace in env string', () => {
      expect(isAvailableImagePreset('budget', '  budget  ,  balanced  ')).toBe(true);
      expect(isAvailableImagePreset('pro', '  budget  ,  balanced  ')).toBe(false);
    });
  });
});
