/**
 * AI Models Configuration for Article Generation
 *
 * Defines supported AI models for text generation via OpenRouter.
 * Each model has metadata for display and configuration purposes.
 *
 * creditCost values are placeholders — update when real pricing is implemented.
 */

import type { ModelTier } from '@shared/types/models.types';

export const AI_MODELS: Record<
  string,
  { name: string; provider: string; tier: ModelTier; description: string; creditCost: number }
> = {
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    tier: 'budget',
    description: 'Fast, cost-effective text generation',
    creditCost: 0,
  },
  'google/gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    tier: 'budget',
    description: 'High-speed, efficient content creation',
    creditCost: 0,
  },
  'openai/gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    tier: 'balanced',
    description: 'Strong all-round writing quality',
    creditCost: 0,
  },
  'openrouter/auto': {
    name: 'Auto (Best Match)',
    provider: 'OpenRouter',
    tier: 'balanced',
    description: 'Automatically picks the best model',
    creditCost: 0,
  },
  'anthropic/claude-sonnet-4-5': {
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    tier: 'ultra',
    description: 'Premium writing with nuance and depth',
    creditCost: 1,
  },
};

export type AIModelId = keyof typeof AI_MODELS;

export const DEFAULT_MODEL: AIModelId = 'openai/gpt-4o';

export const MODEL_IDS = Object.keys(AI_MODELS) as AIModelId[];

/**
 * Check if a model ID is valid
 */
export function isValidModel(model: string): model is AIModelId {
  return MODEL_IDS.includes(model as AIModelId);
}

/**
 * Get model metadata by ID
 */
export function getModel(modelId: AIModelId): (typeof AI_MODELS)[AIModelId] {
  return AI_MODELS[modelId];
}

/**
 * Get models by tier
 */
export function getModelsByTier(tier: ModelTier): AIModelId[] {
  return MODEL_IDS.filter(id => AI_MODELS[id].tier === tier);
}

/**
 * Parse comma-separated env string into available model IDs.
 * Empty string = all models available.
 */
export function getAvailableWriterModels(
  envValue: string
): Array<{ id: AIModelId; name: string; provider: string; description: string; tier: ModelTier; creditCost: number }> {
  const enabledIds = envValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const ids = enabledIds.length > 0 ? MODEL_IDS.filter(id => enabledIds.includes(id)) : MODEL_IDS;

  return ids.map(id => {
    const { name, provider, description, tier, creditCost } = AI_MODELS[id];
    return { id, name, provider, description, tier, creditCost };
  });
}

/**
 * Check if a model is available based on env configuration.
 */
export function isAvailableWriterModel(modelId: string, envValue: string): boolean {
  const available = getAvailableWriterModels(envValue);
  return available.some(m => m.id === modelId);
}
