/**
 * Image Generation Models Configuration for Article Images
 *
 * Defines supported image generation presets via Replicate API.
 * Simple tier-based presets: Budget, Balanced, Pro, Ultra.
 */

import type { ModelTier } from '@shared/types/models.types';

/**
 * Image preset types — one per quality tier
 */
export type ImagePresetKey = 'budget' | 'balanced' | 'pro' | 'ultra';

/**
 * Image preset metadata
 */
export interface IImagePreset {
  /** Unique preset key */
  key: ImagePresetKey;
  /** Display name for UI */
  displayName: string;
  /** Description of the preset */
  description: string;
  /** What this preset is best for */
  bestFor: string;
  /** Replicate model identifier (e.g., 'black-forest-labs/flux-schnell') */
  replicateModel: string;
  /** Default parameters for the model */
  defaultParams: Record<string, unknown>;
  /** Credit cost per article (0 = bundled, 1 = +1 credit) */
  creditCost: number;
  /** Aspect ratio for generated images */
  aspectRatio: string;
  /** Quality tier for UI grouping */
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
    replicateModel: 'black-forest-labs/flux-schnell',
    defaultParams: {
      aspect_ratio: '16:9',
      output_format: 'jpg',
      output_quality: 80,
    },
    creditCost: 0,
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
      output_format: 'jpg',
      output_quality: 90,
    },
    creditCost: 0,
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
      output_format: 'jpg',
      output_quality: 95,
    },
    creditCost: 1,
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
    },
    creditCost: 1,
    aspectRatio: '16:9',
    tier: 'ultra',
  },
};

/**
 * Array of preset keys for iteration
 */
export const IMAGE_PRESET_KEYS: ImagePresetKey[] = Object.keys(IMAGE_PRESETS) as ImagePresetKey[];

/**
 * Check if a preset key is valid
 */
export function isValidImagePreset(key: string): key is ImagePresetKey {
  return key in IMAGE_PRESETS;
}

/**
 * Get preset metadata by key
 */
export function getImagePreset(key: ImagePresetKey): IImagePreset {
  const preset = IMAGE_PRESETS[key];
  if (!preset) {
    throw new Error(`Invalid image preset key: ${key}`);
  }
  return preset as IImagePreset;
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
 * - 800-1200 words -> 2 images (1 hero + 1 in-section)
 * - 1200-2000 words -> 3 images (1 hero + 2 in-section)
 * - 2000-3000 words -> 3 images (same -- diminishing returns above 3)
 */
export function getImageCountForWordCount(targetWordCount: number): number {
  if (targetWordCount < 800) {
    return 0;
  }
  if (targetWordCount <= 1200) {
    return 2;
  }
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
 * Parse comma-separated env string into available image presets.
 * Empty string = all presets available.
 */
export function getAvailableImagePresets(envValue: string): IImagePreset[] {
  const enabledKeys = envValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const keys =
    enabledKeys.length > 0
      ? IMAGE_PRESET_KEYS.filter(k => enabledKeys.includes(k))
      : IMAGE_PRESET_KEYS;

  return keys.map(k => IMAGE_PRESETS[k]);
}

/**
 * Check if a specific preset key is available based on env value.
 */
export function isAvailableImagePreset(presetKey: string, envValue: string): boolean {
  const available = getAvailableImagePresets(envValue);
  return available.some(p => p.key === presetKey);
}
