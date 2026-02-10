/**
 * Types for available AI models and image presets API
 */

export type ModelTier = 'budget' | 'balanced' | 'pro' | 'ultra';

export interface IAvailableWriterModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  tier: ModelTier;
  creditCost: number;
}

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

export interface IAvailableModelsResponse {
  writerModels: IAvailableWriterModel[];
  imagePresets: IAvailableImagePreset[];
}
