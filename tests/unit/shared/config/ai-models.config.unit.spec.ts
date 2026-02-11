/**
 * AI Writer Presets Config Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WRITER_PRESETS,
  WRITER_PRESET_KEYS,
  DEFAULT_WRITER_PRESET,
  isValidWriterPreset,
  getAvailableWriterPresets,
  isAvailableWriterPreset,
  resolveWriterModel,
  getWriterPresetCreditCost,
  AI_MODELS,
  DEFAULT_MODEL,
  isValidModel,
  getAvailableWriterModels,
  isAvailableWriterModel,
} from '@shared/config/ai-models.config';

describe('ai-models.config (writer presets)', () => {
  describe('WRITER_PRESETS', () => {
    it('should have all 4 presets', () => {
      expect(Object.keys(WRITER_PRESETS)).toHaveLength(4);
    });

    it('should include expected preset keys', () => {
      expect(WRITER_PRESETS).toHaveProperty('budget');
      expect(WRITER_PRESETS).toHaveProperty('balanced');
      expect(WRITER_PRESETS).toHaveProperty('pro');
      expect(WRITER_PRESETS).toHaveProperty('ultra');
    });

    it('should have required fields for each preset', () => {
      Object.values(WRITER_PRESETS).forEach(preset => {
        expect(preset).toHaveProperty('key');
        expect(preset).toHaveProperty('displayName');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('defaultModel');
        expect(preset).toHaveProperty('tier');
        expect(preset).toHaveProperty('creditCost');
      });
    });

    it('should have valid tier for each preset', () => {
      Object.values(WRITER_PRESETS).forEach(preset => {
        expect(['budget', 'balanced', 'ultra']).toContain(preset.tier);
      });
    });

    it('should map correct default models', () => {
      expect(WRITER_PRESETS.budget.defaultModel).toBe('openai/gpt-4o-mini');
      expect(WRITER_PRESETS.balanced.defaultModel).toBe('openai/gpt-4o');
      expect(WRITER_PRESETS.pro.defaultModel).toBe('anthropic/claude-sonnet-4-5');
      expect(WRITER_PRESETS.ultra.defaultModel).toBe('anthropic/claude-opus-4-6');
    });
  });

  describe('WRITER_PRESET_KEYS', () => {
    it('should return array of 4 preset keys', () => {
      expect(WRITER_PRESET_KEYS).toHaveLength(4);
    });

    it('should match keys from WRITER_PRESETS', () => {
      expect(WRITER_PRESET_KEYS).toEqual(
        expect.arrayContaining(['budget', 'balanced', 'pro', 'ultra'])
      );
    });
  });

  describe('DEFAULT_WRITER_PRESET', () => {
    it('should be set to pro', () => {
      expect(DEFAULT_WRITER_PRESET).toBe('pro');
    });

    it('should be a valid preset key', () => {
      expect(isValidWriterPreset(DEFAULT_WRITER_PRESET)).toBe(true);
    });
  });

  describe('isValidWriterPreset', () => {
    it('should return true for valid preset keys', () => {
      expect(isValidWriterPreset('budget')).toBe(true);
      expect(isValidWriterPreset('balanced')).toBe(true);
      expect(isValidWriterPreset('pro')).toBe(true);
      expect(isValidWriterPreset('ultra')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isValidWriterPreset('invalid')).toBe(false);
      expect(isValidWriterPreset('')).toBe(false);
      expect(isValidWriterPreset('openai/gpt-4o')).toBe(false);
    });
  });

  describe('getAvailableWriterPresets', () => {
    it('should return all presets when env is empty string', () => {
      const available = getAvailableWriterPresets('');
      expect(available).toHaveLength(4);
      expect(available.map(p => p.key)).toEqual(
        expect.arrayContaining(['budget', 'balanced', 'pro', 'ultra'])
      );
    });

    it('should return all presets when env is whitespace only', () => {
      const available = getAvailableWriterPresets('   ');
      expect(available).toHaveLength(4);
    });

    it('should filter to only listed presets', () => {
      const available = getAvailableWriterPresets('budget,ultra');
      expect(available).toHaveLength(2);
      expect(available.map(p => p.key)).toEqual(expect.arrayContaining(['budget', 'ultra']));
    });

    it('should support key(model) override format', () => {
      const available = getAvailableWriterPresets('budget(custom/model-a),balanced');
      expect(available).toHaveLength(2);
      const budget = available.find(p => p.key === 'budget')!;
      expect(budget.model).toBe('custom/model-a');
      const balanced = available.find(p => p.key === 'balanced')!;
      expect(balanced.model).toBe('openai/gpt-4o');
    });

    it('should handle comma-separated values with spaces', () => {
      const available = getAvailableWriterPresets(' budget , balanced , ultra ');
      expect(available).toHaveLength(3);
    });

    it('should silently ignore invalid preset keys', () => {
      const available = getAvailableWriterPresets('budget,invalid-key,ultra');
      expect(available).toHaveLength(2);
      expect(available.map(p => p.key)).toEqual(expect.arrayContaining(['budget', 'ultra']));
    });

    it('should return empty array when only invalid keys are provided', () => {
      const available = getAvailableWriterPresets('invalid-1,invalid-2');
      expect(available).toHaveLength(0);
    });

    it('should return presets with all required properties', () => {
      const available = getAvailableWriterPresets('balanced');
      expect(available[0]).toEqual({
        key: 'balanced',
        displayName: 'Balanced',
        description: 'Strong all-round writing quality',
        model: 'openai/gpt-4o',
        tier: 'balanced',
        creditCost: 1,
      });
    });

    it('should handle single preset without comma', () => {
      const available = getAvailableWriterPresets('pro');
      expect(available).toHaveLength(1);
      expect(available[0].key).toBe('pro');
    });

    it('should be backward compatible (empty = all available)', () => {
      const emptyResult = getAvailableWriterPresets('');
      const allResult = getAvailableWriterPresets(WRITER_PRESET_KEYS.join(','));
      expect(emptyResult).toHaveLength(allResult.length);
    });
  });

  describe('isAvailableWriterPreset', () => {
    it('should return true for all presets when env is empty', () => {
      expect(isAvailableWriterPreset('budget', '')).toBe(true);
      expect(isAvailableWriterPreset('balanced', '')).toBe(true);
      expect(isAvailableWriterPreset('pro', '')).toBe(true);
      expect(isAvailableWriterPreset('ultra', '')).toBe(true);
    });

    it('should return true for enabled presets', () => {
      const env = 'budget,ultra';
      expect(isAvailableWriterPreset('budget', env)).toBe(true);
      expect(isAvailableWriterPreset('ultra', env)).toBe(true);
    });

    it('should return false for disabled presets', () => {
      const env = 'budget,ultra';
      expect(isAvailableWriterPreset('balanced', env)).toBe(false);
      expect(isAvailableWriterPreset('pro', env)).toBe(false);
    });

    it('should return false for invalid preset keys', () => {
      expect(isAvailableWriterPreset('invalid-model', '')).toBe(false);
      expect(isAvailableWriterPreset('', '')).toBe(false);
    });

    it('should handle whitespace in env string', () => {
      const env = ' budget , ultra ';
      expect(isAvailableWriterPreset('budget', env)).toBe(true);
      expect(isAvailableWriterPreset('ultra', env)).toBe(true);
    });

    it('should return false when no valid presets are configured', () => {
      const env = 'invalid-1,invalid-2';
      expect(isAvailableWriterPreset('budget', env)).toBe(false);
      expect(isAvailableWriterPreset('ultra', env)).toBe(false);
    });
  });

  describe('resolveWriterModel', () => {
    it('should resolve preset key to default model', () => {
      expect(resolveWriterModel('budget', '')).toBe('openai/gpt-4o-mini');
      expect(resolveWriterModel('balanced', '')).toBe('openai/gpt-4o');
      expect(resolveWriterModel('pro', '')).toBe('anthropic/claude-sonnet-4-5');
      expect(resolveWriterModel('ultra', '')).toBe('anthropic/claude-opus-4-6');
    });

    it('should resolve to overridden model from env', () => {
      const env = 'budget(custom/fast-model),balanced(custom/strong-model)';
      expect(resolveWriterModel('budget', env)).toBe('custom/fast-model');
      expect(resolveWriterModel('balanced', env)).toBe('custom/strong-model');
    });

    it('should fallback to default preset model for unknown key', () => {
      const result = resolveWriterModel('nonexistent', '');
      expect(result).toBe('anthropic/claude-sonnet-4-5');
    });
  });

  describe('getWriterPresetCreditCost', () => {
    it('should return 1 for budget/balanced presets', () => {
      expect(getWriterPresetCreditCost('budget')).toBe(1);
      expect(getWriterPresetCreditCost('balanced')).toBe(1);
    });

    it('should return 2 for pro preset', () => {
      expect(getWriterPresetCreditCost('pro')).toBe(2);
    });

    it('should return 3 for ultra preset', () => {
      expect(getWriterPresetCreditCost('ultra')).toBe(3);
    });

    it('should return 0 for null/undefined/invalid', () => {
      expect(getWriterPresetCreditCost(null)).toBe(0);
      expect(getWriterPresetCreditCost(undefined)).toBe(0);
      expect(getWriterPresetCreditCost('invalid')).toBe(0);
    });
  });

  describe('Deprecated exports', () => {
    it('AI_MODELS should map default model IDs to metadata', () => {
      expect(AI_MODELS['openai/gpt-4o']).toBeDefined();
      expect(AI_MODELS['openai/gpt-4o'].name).toBe('Balanced');
      expect(AI_MODELS['openai/gpt-4o'].tier).toBe('balanced');
    });

    it('DEFAULT_MODEL should be the default preset model', () => {
      expect(DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-5');
    });

    it('isValidModel should accept both model IDs and preset keys', () => {
      expect(isValidModel('openai/gpt-4o')).toBe(true);
      expect(isValidModel('budget')).toBe(true);
      expect(isValidModel('invalid')).toBe(false);
    });

    it('getAvailableWriterModels should return preset keys as IDs', () => {
      const models = getAvailableWriterModels('');
      expect(models.length).toBe(4);
      models.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('provider');
        expect(m).toHaveProperty('tier');
      });
    });

    it('isAvailableWriterModel should delegate to isAvailableWriterPreset', () => {
      expect(isAvailableWriterModel('budget', '')).toBe(true);
      expect(isAvailableWriterModel('invalid', '')).toBe(false);
    });
  });
});
