import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../src/pages/api/models/index';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

// Mock environment variables
const mockEnvValues = {
  AVAILABLE_WRITER_PRESETS: '',
  AVAILABLE_IMAGE_PRESETS: '',
};

// Mock the env module
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    get AVAILABLE_WRITER_PRESETS() {
      return mockEnvValues.AVAILABLE_WRITER_PRESETS;
    },
    get AVAILABLE_IMAGE_PRESETS() {
      return mockEnvValues.AVAILABLE_IMAGE_PRESETS;
    },
  },
}));

describe('GET /api/models', () => {
  beforeEach(() => {
    // Reset to default (empty = all presets available)
    mockEnvValues.AVAILABLE_WRITER_PRESETS = '';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = '';
  });

  test('should return 200 with writerPresets, writerModels, and imagePresets', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(data).toHaveProperty('writerPresets');
    expect(data).toHaveProperty('writerModels'); // deprecated but still present
    expect(data).toHaveProperty('imagePresets');
    expect(Array.isArray(data.writerPresets)).toBe(true);
    expect(Array.isArray(data.writerModels)).toBe(true);
    expect(Array.isArray(data.imagePresets)).toBe(true);
  });

  test('should return all presets when env is empty', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    // All 4 writer presets should be available
    expect(data.writerPresets).toHaveLength(4);
    expect(data.writerPresets.map(p => p.key)).toEqual(
      expect.arrayContaining(['budget', 'balanced', 'pro', 'ultra'])
    );

    // Deprecated writerModels also returns 4
    expect(data.writerModels).toHaveLength(4);

    // All 4 image presets should be available
    expect(data.imagePresets).toHaveLength(4);
    expect(data.imagePresets.map(p => p.key)).toEqual(['budget', 'balanced', 'pro', 'ultra']);
  });

  test('should return filtered writer presets based on env', async () => {
    mockEnvValues.AVAILABLE_WRITER_PRESETS = 'budget,ultra';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerPresets).toHaveLength(2);
    expect(data.writerPresets.map(p => p.key)).toEqual(expect.arrayContaining(['budget', 'ultra']));
  });

  test('should support model override in writer presets', async () => {
    mockEnvValues.AVAILABLE_WRITER_PRESETS = 'budget(custom/fast-model),balanced';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerPresets).toHaveLength(2);
    const budget = data.writerPresets.find(p => p.key === 'budget')!;
    expect(budget.model).toBe('custom/fast-model');
    const balanced = data.writerPresets.find(p => p.key === 'balanced')!;
    expect(balanced.model).toBe('openai/gpt-4o'); // default
  });

  test('should return filtered image presets based on env', async () => {
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = 'budget,pro';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.imagePresets).toHaveLength(2);
    expect(data.imagePresets.map(p => p.key)).toEqual(['budget', 'pro']);
  });

  test('should include correct writer preset metadata', async () => {
    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    const balanced = data.writerPresets.find(p => p.key === 'balanced');
    expect(balanced).toMatchObject({
      key: 'balanced',
      displayName: 'Balanced',
      description: 'Strong all-round writing quality',
      model: 'openai/gpt-4o',
      tier: 'balanced',
      creditCost: 1, // Updated to match new pricing (1/1/2/3)
    });

    // Check image preset structure
    const budgetPreset = data.imagePresets.find(p => p.key === 'budget');
    expect(budgetPreset).toMatchObject({
      key: 'budget',
      displayName: 'Budget',
      description: 'Fast, good-quality images',
      bestFor: 'Quick drafts, blog posts',
      replicateModel: 'prunaai/z-image-turbo',
      creditCost: 0,
      aspectRatio: '16:9',
    });
  });

  test('should ignore invalid preset keys in env', async () => {
    mockEnvValues.AVAILABLE_WRITER_PRESETS = 'budget,invalid-key,ultra';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerPresets).toHaveLength(2);
    expect(data.writerPresets.map(p => p.key)).toEqual(expect.arrayContaining(['budget', 'ultra']));
  });

  test('should set cache headers', async () => {
    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=120'
    );
  });

  test('should return empty arrays when env contains only invalid values', async () => {
    mockEnvValues.AVAILABLE_WRITER_PRESETS = 'invalid-1,invalid-2';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = 'invalid-preset-1,invalid-preset-2';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerPresets).toHaveLength(0);
    expect(data.writerModels).toHaveLength(0);
    expect(data.imagePresets).toHaveLength(0);
  });

  test('should handle whitespace in env values', async () => {
    mockEnvValues.AVAILABLE_WRITER_PRESETS = ' budget , ultra ';
    mockEnvValues.AVAILABLE_IMAGE_PRESETS = ' budget , pro ';

    const response = await GET();
    const data = (await response.json()) as IAvailableModelsResponse;

    expect(data.writerPresets).toHaveLength(2);
    expect(data.imagePresets).toHaveLength(2);
  });
});
