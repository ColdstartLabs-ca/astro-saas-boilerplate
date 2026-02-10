/**
 * Types for available AI models and image presets API
 */

export interface IAvailableWriterModel {
  id: string;
  name: string;
  provider: string;
}

export interface IAvailableImagePreset {
  key: string;
  displayName: string;
  description: string;
  bestFor: string;
  replicateModel: string; // Show underlying model for clarity
  creditCost: number;
  aspectRatio: string;
}

export interface IAvailableModelsResponse {
  writerModels: IAvailableWriterModel[];
  imagePresets: IAvailableImagePreset[];
}
