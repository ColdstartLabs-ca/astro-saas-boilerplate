/**
 * Types for available AI models and image presets API
 */

export type ModelTier = 'budget' | 'balanced' | 'pro' | 'ultra';

// =============================================================================
// Writer Presets (new)
// =============================================================================

export interface IAvailableWriterPreset {
  key: string;
  displayName: string;
  description: string;
  /** Resolved OpenRouter model ID (may be env-overridden) */
  model: string;
  tier: ModelTier;
  creditCost: number;
}

// =============================================================================
// Image Presets
// =============================================================================

export interface IAvailableImagePreset {
  key: string;
  displayName: string;
  description: string;
  bestFor: string;
  replicateModel: string;
  creditCost: number;
  aspectRatio: string;
  tier: ModelTier;
}

// =============================================================================
// API Response
// =============================================================================

export interface IAvailableModelsResponse {
  writerPresets: IAvailableWriterPreset[];
  imagePresets: IAvailableImagePreset[];
  /** @deprecated Use writerPresets instead */
  writerModels: IAvailableWriterModel[];
}

// =============================================================================
// Deprecated types — backward compatibility
// =============================================================================

/** @deprecated Use IAvailableWriterPreset instead */
export interface IAvailableWriterModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  tier: ModelTier;
  creditCost: number;
}
