/**
 * AI Models Config Unit Tests
 *
 * Tests for AI model configuration and utility functions,
 * including availability filtering based on environment variables.
 */

import { describe, it, expect } from 'vitest';
import {
  AI_MODELS,
  MODEL_IDS,
  DEFAULT_MODEL,
  isValidModel,
  getModel,
  getModelsByTier,
  getAvailableWriterModels,
  isAvailableWriterModel,
  type AIModelId,
} from '@shared/config/ai-models.config';

describe('ai-models.config', () => {
  describe('AI_MODELS', () => {
    it('should have all 5 required models', () => {
      expect(Object.keys(AI_MODELS)).toHaveLength(5);
    });

    it('should include all expected model IDs', () => {
      const expectedIds: AIModelId[] = [
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-sonnet-4-5',
        'google/gemini-2.0-flash',
        'openrouter/auto',
      ];
      expectedIds.forEach(id => {
        expect(AI_MODELS[id]).toBeDefined();
      });
    });

    it('should have required fields for each model', () => {
      Object.values(AI_MODELS).forEach(model => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('tier');
      });
    });

    it('should have valid tier for each model', () => {
      Object.values(AI_MODELS).forEach(model => {
        expect(['budget', 'balanced', 'ultra']).toContain(model.tier);
      });
    });

    it('should have creditCost and description for each model', () => {
      Object.values(AI_MODELS).forEach(model => {
        expect(model).toHaveProperty('creditCost');
        expect(model).toHaveProperty('description');
        expect(typeof model.creditCost).toBe('number');
        expect(typeof model.description).toBe('string');
      });
    });
  });

  describe('MODEL_IDS', () => {
    it('should return array of 5 model IDs', () => {
      expect(MODEL_IDS).toHaveLength(5);
    });

    it('should match keys from AI_MODELS', () => {
      const configKeys = Object.keys(AI_MODELS) as AIModelId[];
      expect(MODEL_IDS).toEqual(expect.arrayContaining(configKeys));
    });
  });

  describe('DEFAULT_MODEL', () => {
    it('should be set to GPT-4o', () => {
      expect(DEFAULT_MODEL).toBe('openai/gpt-4o');
    });

    it('should be a valid model ID', () => {
      expect(isValidModel(DEFAULT_MODEL)).toBe(true);
    });
  });

  describe('isValidModel', () => {
    it('should return true for valid model IDs', () => {
      expect(isValidModel('openai/gpt-4o')).toBe(true);
      expect(isValidModel('openai/gpt-4o-mini')).toBe(true);
      expect(isValidModel('anthropic/claude-sonnet-4-5')).toBe(true);
      expect(isValidModel('google/gemini-2.0-flash')).toBe(true);
      expect(isValidModel('openrouter/auto')).toBe(true);
    });

    it('should return false for invalid model IDs', () => {
      expect(isValidModel('invalid')).toBe(false);
      expect(isValidModel('')).toBe(false);
      expect(isValidModel('openai/gpt-3')).toBe(false);
      expect(isValidModel(null)).toBe(false);
      expect(isValidModel(undefined)).toBe(false);
    });
  });

  describe('getModel', () => {
    it('should return model metadata for valid key', () => {
      const model = getModel('openai/gpt-4o');
      expect(model.name).toBe('GPT-4o');
      expect(model.provider).toBe('OpenAI');
      expect(model.tier).toBe('balanced');
    });

    it('should return model metadata for all valid keys', () => {
      const models = MODEL_IDS.map(id => getModel(id));
      expect(models).toHaveLength(5);
      models.forEach(model => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('tier');
      });
    });
  });

  describe('getModelsByTier', () => {
    it('should return budget tier models', () => {
      const models = getModelsByTier('budget');
      expect(models).toHaveLength(2);
      expect(models).toContain('openai/gpt-4o-mini');
      expect(models).toContain('google/gemini-2.0-flash');
    });

    it('should return balanced tier models', () => {
      const models = getModelsByTier('balanced');
      expect(models).toHaveLength(2);
      expect(models).toContain('openai/gpt-4o');
      expect(models).toContain('openrouter/auto');
    });

    it('should return ultra tier models', () => {
      const models = getModelsByTier('ultra');
      expect(models).toHaveLength(1);
      expect(models).toContain('anthropic/claude-sonnet-4-5');
    });
  });

  describe('getAvailableWriterModels', () => {
    it('should return all models when env is empty string', () => {
      const available = getAvailableWriterModels('');
      expect(available).toHaveLength(5);
      expect(available.map(m => m.id)).toEqual(expect.arrayContaining(MODEL_IDS));
    });

    it('should return all models when env is whitespace only', () => {
      const available = getAvailableWriterModels('   ');
      expect(available).toHaveLength(5);
    });

    it('should filter to only enabled models when env has values', () => {
      const available = getAvailableWriterModels('openai/gpt-4o,anthropic/claude-sonnet-4-5');
      expect(available).toHaveLength(2);
      expect(available.map(m => m.id)).toEqual(
        expect.arrayContaining(['openai/gpt-4o', 'anthropic/claude-sonnet-4-5'])
      );
    });

    it('should handle comma-separated values with spaces', () => {
      const available = getAvailableWriterModels(
        'openai/gpt-4o, anthropic/claude-sonnet-4-5 , google/gemini-2.0-flash'
      );
      expect(available).toHaveLength(3);
      // Order follows config definition order (budget -> balanced -> ultra)
      expect(available.map(m => m.id)).toEqual([
        'google/gemini-2.0-flash',
        'openai/gpt-4o',
        'anthropic/claude-sonnet-4-5',
      ]);
    });

    it('should silently ignore invalid model IDs', () => {
      const available = getAvailableWriterModels(
        'openai/gpt-4o,invalid-model,another-invalid,anthropic/claude-sonnet-4-5'
      );
      expect(available).toHaveLength(2);
      expect(available.map(m => m.id)).toEqual(
        expect.arrayContaining(['openai/gpt-4o', 'anthropic/claude-sonnet-4-5'])
      );
    });

    it('should return empty array when only invalid IDs are provided', () => {
      const available = getAvailableWriterModels('invalid-model,another-invalid');
      expect(available).toHaveLength(0);
    });

    it('should return models with all required properties', () => {
      const available = getAvailableWriterModels('openai/gpt-4o');
      expect(available[0]).toEqual({
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        description: 'Strong all-round writing quality',
        tier: 'balanced',
        creditCost: 0,
      });
    });

    it('should handle single model without comma', () => {
      const available = getAvailableWriterModels('openai/gpt-4o');
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('openai/gpt-4o');
    });

    it('should be backward compatible (empty = all available)', () => {
      const emptyResult = getAvailableWriterModels('');
      const allResult = getAvailableWriterModels(MODEL_IDS.join(','));
      expect(emptyResult).toHaveLength(allResult.length);
    });
  });

  describe('isAvailableWriterModel', () => {
    it('should return true for all models when env is empty', () => {
      expect(isAvailableWriterModel('openai/gpt-4o', '')).toBe(true);
      expect(isAvailableWriterModel('anthropic/claude-sonnet-4-5', '')).toBe(true);
      expect(isAvailableWriterModel('google/gemini-2.0-flash', '')).toBe(true);
    });

    it('should return true for enabled models', () => {
      const env = 'openai/gpt-4o,anthropic/claude-sonnet-4-5';
      expect(isAvailableWriterModel('openai/gpt-4o', env)).toBe(true);
      expect(isAvailableWriterModel('anthropic/claude-sonnet-4-5', env)).toBe(true);
    });

    it('should return false for disabled models', () => {
      const env = 'openai/gpt-4o,anthropic/claude-sonnet-4-5';
      expect(isAvailableWriterModel('google/gemini-2.0-flash', env)).toBe(false);
      expect(isAvailableWriterModel('openrouter/auto', env)).toBe(false);
    });

    it('should return false for invalid model IDs', () => {
      const env = 'openai/gpt-4o,anthropic/claude-sonnet-4-5';
      expect(isAvailableWriterModel('invalid-model', env)).toBe(false);
      expect(isAvailableWriterModel('', env)).toBe(false);
    });

    it('should handle whitespace in env string', () => {
      const env = 'openai/gpt-4o , anthropic/claude-sonnet-4-5';
      expect(isAvailableWriterModel('openai/gpt-4o', env)).toBe(true);
      expect(isAvailableWriterModel('anthropic/claude-sonnet-4-5', env)).toBe(true);
    });

    it('should return false when no models are enabled', () => {
      const env = 'invalid-model-1,invalid-model-2';
      expect(isAvailableWriterModel('openai/gpt-4o', env)).toBe(false);
      expect(isAvailableWriterModel('anthropic/claude-sonnet-4-5', env)).toBe(false);
    });
  });
});
