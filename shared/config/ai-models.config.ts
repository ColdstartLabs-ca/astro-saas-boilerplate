/**
 * AI Models Configuration for Article Generation
 *
 * Defines supported AI models for text generation via OpenRouter.
 * Each model has metadata for display and configuration purposes.
 */

export const AI_MODELS = {
  'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', tier: 'all' },
  'openai/gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', tier: 'all' },
  'anthropic/claude-sonnet-4-5': { name: 'Claude Sonnet 4.5', provider: 'Anthropic', tier: 'all' },
  'google/gemini-2.0-flash': { name: 'Gemini 2.0 Flash', provider: 'Google', tier: 'all' },
  'openrouter/auto': { name: 'Auto (Best Match)', provider: 'OpenRouter', tier: 'all' },
} as const;

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
 * Get models by tier (currently all models are 'all')
 */
export function getModelsByTier(tier: string): AIModelId[] {
  return MODEL_IDS.filter(id => AI_MODELS[id].tier === tier || AI_MODELS[id].tier === 'all');
}
