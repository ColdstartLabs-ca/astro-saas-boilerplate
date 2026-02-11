/**
 * AI Writer Presets Configuration
 *
 * Preset-based system for text generation via OpenRouter.
 * Each preset key (budget, balanced, auto, ultra) maps to a default OpenRouter model
 * that can be overridden via AVAILABLE_WRITER_PRESETS env var.
 *
 * Env format: "budget(openai/gpt-4o-mini),balanced(openai/gpt-4o),auto,ultra(anthropic/claude-sonnet-4-5)"
 */

import type { ModelTier } from '@shared/types/models.types';
import type { IAvailableWriterPreset } from '@shared/types/models.types';
import { parsePresetEnv } from './preset-parser';

// =============================================================================
// Writer Preset Definitions
// =============================================================================

export type WriterPresetKey = 'budget' | 'balanced' | 'auto' | 'ultra';

export interface IWriterPreset {
  key: WriterPresetKey;
  displayName: string;
  description: string;
  defaultModel: string;
  tier: ModelTier;
  creditCost: number;
}

export const WRITER_PRESETS: Record<WriterPresetKey, IWriterPreset> = {
  budget: {
    key: 'budget',
    displayName: 'Budget',
    description: 'Fast, cost-effective text generation',
    defaultModel: 'openai/gpt-4o-mini',
    tier: 'budget',
    creditCost: 0,
  },
  balanced: {
    key: 'balanced',
    displayName: 'Balanced',
    description: 'Strong all-round writing quality',
    defaultModel: 'openai/gpt-4o',
    tier: 'balanced',
    creditCost: 0,
  },
  auto: {
    key: 'auto',
    displayName: 'Auto (Best Match)',
    description: 'Automatically picks the best model',
    defaultModel: 'openrouter/auto',
    tier: 'balanced',
    creditCost: 0,
  },
  ultra: {
    key: 'ultra',
    displayName: 'Ultra',
    description: 'Premium writing with nuance and depth',
    defaultModel: 'anthropic/claude-sonnet-4-5',
    tier: 'ultra',
    creditCost: 1,
  },
};

export const WRITER_PRESET_KEYS = Object.keys(WRITER_PRESETS) as WriterPresetKey[];

const VALID_WRITER_KEYS = new Set<string>(WRITER_PRESET_KEYS);
const WRITER_DEFAULTS = new Map<string, string>(
  WRITER_PRESET_KEYS.map(k => [k, WRITER_PRESETS[k].defaultModel])
);

export const DEFAULT_WRITER_PRESET: WriterPresetKey = 'auto';

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a preset key is valid.
 */
export function isValidWriterPreset(key: string): key is WriterPresetKey {
  return key in WRITER_PRESETS;
}

/**
 * Get available writer presets from env value.
 * Returns presets with resolved model IDs (env override or default).
 *
 * @param envValue - Raw AVAILABLE_WRITER_PRESETS env string
 */
export function getAvailableWriterPresets(envValue: string): IAvailableWriterPreset[] {
  const resolved = parsePresetEnv(envValue, VALID_WRITER_KEYS, WRITER_DEFAULTS);

  return Array.from(resolved.entries()).map(([key, model]) => {
    const preset = WRITER_PRESETS[key as WriterPresetKey];
    return {
      key: key as WriterPresetKey,
      displayName: preset.displayName,
      description: preset.description,
      model,
      tier: preset.tier,
      creditCost: preset.creditCost,
    };
  });
}

/**
 * Check if a writer preset is available based on env configuration.
 */
export function isAvailableWriterPreset(presetKey: string, envValue: string): boolean {
  const available = getAvailableWriterPresets(envValue);
  return available.some(p => p.key === presetKey);
}

/**
 * Resolve a writer preset key to an OpenRouter model ID.
 * Returns the env-overridden model if configured, otherwise the default.
 */
export function resolveWriterModel(presetKey: string, envValue: string): string {
  const resolved = parsePresetEnv(envValue, VALID_WRITER_KEYS, WRITER_DEFAULTS);
  return resolved.get(presetKey) ?? WRITER_PRESETS[DEFAULT_WRITER_PRESET].defaultModel;
}

/**
 * Get the credit cost for a writer preset.
 */
export function getWriterPresetCreditCost(presetKey: string | null | undefined): number {
  if (!presetKey || !isValidWriterPreset(presetKey)) return 0;
  return WRITER_PRESETS[presetKey].creditCost;
}

// =============================================================================
// Deprecated exports — backward compatibility during transition
// =============================================================================

/** @deprecated Use WRITER_PRESETS instead */
export const AI_MODELS = Object.fromEntries(
  WRITER_PRESET_KEYS.map(k => [
    WRITER_PRESETS[k].defaultModel,
    {
      name: WRITER_PRESETS[k].displayName,
      provider: WRITER_PRESETS[k].defaultModel.split('/')[0] ?? 'Unknown',
      tier: WRITER_PRESETS[k].tier,
      description: WRITER_PRESETS[k].description,
      creditCost: WRITER_PRESETS[k].creditCost,
    },
  ])
);

/** @deprecated Use WriterPresetKey instead */
export type AIModelId = string;

/** @deprecated Use DEFAULT_WRITER_PRESET instead */
export const DEFAULT_MODEL = WRITER_PRESETS[DEFAULT_WRITER_PRESET].defaultModel;

/** @deprecated Use isValidWriterPreset instead */
export function isValidModel(model: string): boolean {
  return model in AI_MODELS || isValidWriterPreset(model);
}

/** @deprecated Use getAvailableWriterPresets instead */
export function getAvailableWriterModels(
  envValue: string
): Array<{
  id: string;
  name: string;
  provider: string;
  description: string;
  tier: ModelTier;
  creditCost: number;
}> {
  const presets = getAvailableWriterPresets(envValue);
  return presets.map(p => ({
    id: p.key,
    name: p.displayName,
    provider: p.model.split('/')[0] ?? 'Unknown',
    description: p.description,
    tier: p.tier,
    creditCost: p.creditCost,
  }));
}

/** @deprecated Use isAvailableWriterPreset instead */
export function isAvailableWriterModel(modelId: string, envValue: string): boolean {
  return isAvailableWriterPreset(modelId, envValue);
}
