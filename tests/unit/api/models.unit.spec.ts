import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../src/pages/api/models/index';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

// Mock environment variables by setting import.meta.env directly
// We need to mock before importing the modules that use these values
const mockEnvValues = {
  AVAILABLE_WRITER_MODELS: '',
  AVAILABLE_IMAGE_PRESETS: '',
};

// Mock the env module
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    get AVAILABLE_WRITER_MODELS() {
      return mockEnvValues.AVAILABLE_WRITER_MODELS;
    },
    get AVAILABLE_IMAGE_PRESETS() {
      return mockEnvValues.AVAILABLE_IMAGE_PRESETS;
    },
  },
}));

describe('GET /api/models', () => {
  beforeEach(() => {
    // Reset to default (empty = all models available)
    mockEnvValues.AVAILABLE_WRITER_MODELS = '';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = '';
  });

  test('should return 200 with writerModels and imagePresets', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(data).toHaveProperty('writerModels');
    expect(data).toHaveProperty('imagePresets');
    expect(Array.isArray(data.writerModels)).toBe(true);
    expect(Array.isArray(data.imagePresets)).toBe(true);
  });

  test('should return all models when env is empty', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    // All 5 writer models should be available
    expect(data.writerModels).toHaveLength(5);
    expect(data.writerModels.map(m => m.id)).toEqual(
      expect.arrayContaining([
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-sonnet-4-5',
        'google/gemini-2.0-flash',
        'openrouter/auto',
      ])
    );

    // All 4 image presets should be available
    expect(data.imagePresets).toHaveLength(4);
    expect(data.imagePresets.map(p => p.key)).toEqual([
      'budget',
      'balanced',
      'pro',
      'ultra',
    ]);
  });

  test('should return filtered writer models based on env', async () => {
    // Only enable specific models
    mockEnvValues.AVAILABLE_WRITER_MODELS = 'openai/gpt-4o,anthropic/claude-sonnet-4-5';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerModels).toHaveLength(2);
    expect(data.writerModels.map(m => m.id)).toEqual([
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4-5',
    ]);
  });

  test('should return filtered image presets based on env', async () => {
    // Only enable specific presets
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = 'budget,pro';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.imagePresets).toHaveLength(2);
    expect(data.imagePresets.map(p => p.key)).toEqual(['budget', 'pro']);
  });

  test('should include correct model metadata', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    // Check writer model structure
    const gpt4o = data.writerModels.find(m => m.id === 'openai/gpt-4o');
    expect(gpt4o).toMatchObject({
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      tier: 'balanced',
      creditCost: 0,
    });

    // Check image preset structure (includes replicateModel)
    const budgetPreset = data.imagePresets.find(p => p.key === 'budget');
    expect(budgetPreset).toMatchObject({
      key: 'budget',
      displayName: 'Budget',
      description: 'Fast, good-quality images',
      bestFor: 'Quick drafts, blog posts',
      replicateModel: 'black-forest-labs/flux-schnell',
      creditCost: 0,
      aspectRatio: '16:9',
    });
  });

  test('should ignore invalid model IDs in env', async () => {
    // Include valid and invalid model IDs
    mockEnvValues.AVAILABLE_WRITER_MODELS = 'openai/gpt-4o,invalid/model-id,openai/gpt-4o-mini';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    // Should only return valid models (order follows config definition)
    expect(data.writerModels).toHaveLength(2);
    expect(data.writerModels.map(m => m.id)).toEqual(
      expect.arrayContaining(['openai/gpt-4o', 'openai/gpt-4o-mini'])
    );
  });

  test('should set cache headers', async () => {
    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=600'
    );
  });

  test('should return empty arrays when env contains only invalid values', async () => {
    mockEnvValues.AVAILABLE_WRITER_MODELS = 'invalid/model-1,invalid/model-2';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = 'invalid-preset-1,invalid-preset-2';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerModels).toHaveLength(0);
    expect(data.imagePresets).toHaveLength(0);
  });

  test('should handle whitespace in env values', async () => {
    // Include spaces around commas
    mockEnvValues.AVAILABLE_WRITER_MODELS = ' openai/gpt-4o , anthropic/claude-sonnet-4-5 ';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = ' budget , pro ';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerModels).toHaveLength(2);
    expect(data.imagePresets).toHaveLength(2);
  });
});
