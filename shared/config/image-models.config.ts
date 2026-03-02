/**
 * Image Generation Presets Configuration
 *
 * Preset-based system for image generation via Replicate API.
 * Each preset key (budget, balanced, pro, ultra) maps to a default Replicate model
 * that can be overridden via AVAILABLE_IMAGE_PRESETS env var.
 *
 * Env format: "budget(prunaai/z-image-turbo),balanced,pro(black-forest-labs/flux-1.1-pro)"
 */

import type { ModelTier } from '@shared/types/models.types';
import { parsePresetEnv } from './preset-parser';
import { IMAGE_CREDIT_COSTS } from '@shared/constants';

/**
 * Image preset types — one per quality tier
 */
export type ImagePresetKey = 'budget' | 'balanced' | 'pro' | 'ultra';

/**
 * Image preset metadata
 */
export interface IImagePreset {
  key: ImagePresetKey;
  displayName: string;
  description: string;
  bestFor: string;
  replicateModel: string;
  defaultParams: Record<string, unknown>;
  creditCost: number;
  aspectRatio: string;
  tier: ModelTier;
}

/**
 * All available image presets
 */
export const IMAGE_PRESETS: Record<ImagePresetKey, IImagePreset> = {
  budget: {
    key: 'budget',
    displayName: 'Budget',
    description: 'Fast, good-quality images',
    bestFor: 'Quick drafts, blog posts',
    replicateModel: 'prunaai/z-image-turbo',
    defaultParams: {
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 80,
    },
    creditCost: IMAGE_CREDIT_COSTS.budget,
    aspectRatio: '16:9',
    tier: 'budget',
  },
  balanced: {
    key: 'balanced',
    displayName: 'Balanced',
    description: 'Higher quality, slower generation',
    bestFor: 'Standard articles, featured posts',
    replicateModel: 'black-forest-labs/flux-dev',
    defaultParams: {
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 90,
    },
    creditCost: IMAGE_CREDIT_COSTS.balanced,
    aspectRatio: '16:9',
    tier: 'balanced',
  },
  pro: {
    key: 'pro',
    displayName: 'Pro',
    description: 'Professional editorial-quality images',
    bestFor: 'High-quality editorial content',
    replicateModel: 'black-forest-labs/flux-1.1-pro',
    defaultParams: {
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 95,
    },
    creditCost: IMAGE_CREDIT_COSTS.pro,
    aspectRatio: '16:9',
    tier: 'pro',
  },
  ultra: {
    key: 'ultra',
    displayName: 'Ultra',
    description: 'Best quality, photorealistic imagery',
    bestFor: 'Premium content, hero images',
    replicateModel: 'bytedance/seedream-4.5',
    defaultParams: {
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 95,
    },
    creditCost: IMAGE_CREDIT_COSTS.ultra,
    aspectRatio: '16:9',
    tier: 'ultra',
  },
};

export const IMAGE_PRESET_KEYS: ImagePresetKey[] = Object.keys(IMAGE_PRESETS) as ImagePresetKey[];

const VALID_IMAGE_KEYS = new Set<string>(IMAGE_PRESET_KEYS);
const IMAGE_DEFAULTS = new Map<string, string>(
  IMAGE_PRESET_KEYS.map(k => [k, IMAGE_PRESETS[k].replicateModel])
);

/**
 * Check if a preset key is valid
 */
export function isValidImagePreset(key: string): key is ImagePresetKey {
  return key in IMAGE_PRESETS;
}

/**
 * Get preset metadata by key.
 * Returns the preset with model potentially overridden from env.
 */
export function getImagePreset(key: ImagePresetKey): IImagePreset {
  const preset = IMAGE_PRESETS[key];
  if (!preset) {
    throw new Error(`Invalid image preset key: ${key}`);
  }
  return preset;
}

/**
 * Get credit cost for a preset key
 */
export function getImagePresetCreditCost(key: string | null | undefined): number {
  if (!key || !isValidImagePreset(key)) {
    return 0;
  }
  return IMAGE_PRESETS[key as ImagePresetKey].creditCost;
}

/**
 * Determine number of images based on word count
 */
export function getImageCountForWordCount(targetWordCount: number): number {
  if (targetWordCount < 800) return 0;
  if (targetWordCount <= 1200) return 2;
  return 3;
}

/**
 * Get description of a preset for prompt generation
 */
export function getPresetDescription(key: ImagePresetKey): string {
  switch (key) {
    case 'budget':
      return 'modern, clean blog-style imagery with good lighting and composition';
    case 'balanced':
      return 'professional imagery with sharp focus, clean composition, and good detail';
    case 'pro':
      return 'editorial magazine-quality imagery with dramatic lighting and high detail';
    case 'ultra':
      return 'photorealistic imagery with natural lighting, realistic textures, and exceptional detail';
    default:
      return 'professional imagery suitable for blog content';
  }
}

/**
 * Parse env string into available image presets.
 * Supports both simple format ("budget,balanced") and override format ("budget(custom/model),balanced").
 * Empty string = all presets available.
 *
 * When a model override is provided, the returned preset's replicateModel is updated.
 */
export function getAvailableImagePresets(envValue: string): IImagePreset[] {
  const resolved = parsePresetEnv(envValue, VALID_IMAGE_KEYS, IMAGE_DEFAULTS);

  return Array.from(resolved.entries()).map(([key, model]) => {
    const preset = IMAGE_PRESETS[key as ImagePresetKey];
    return {
      ...preset,
      replicateModel: model, // May be overridden from env
    };
  });
}

/**
 * Check if a specific preset key is available based on env value.
 */
export function isAvailableImagePreset(presetKey: string, envValue: string): boolean {
  const available = getAvailableImagePresets(envValue);
  return available.some(p => p.key === presetKey);
}

/**
 * Resolve image preset key to a Replicate model ID.
 * Returns env-overridden model if configured, otherwise the default.
 */
export function resolveImageModel(presetKey: string, envValue: string): string {
  const resolved = parsePresetEnv(envValue, VALID_IMAGE_KEYS, IMAGE_DEFAULTS);
  return resolved.get(presetKey) ?? IMAGE_PRESETS.budget.replicateModel;
}
