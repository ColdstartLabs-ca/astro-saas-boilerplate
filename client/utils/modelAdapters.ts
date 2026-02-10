/**
 * Adapter functions to convert domain model types into generic ModelSelect options.
 */

import type { IAvailableWriterModel, IAvailableImagePreset } from '@shared/types/models.types';
import type { IModelSelectOption } from '@client/components/ui/ModelSelect';

export function writerModelToOption(model: IAvailableWriterModel): IModelSelectOption {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    detail: model.provider,
    tier: model.tier,
    creditCost: model.creditCost,
  };
}

export function imagePresetToOption(preset: IAvailableImagePreset): IModelSelectOption {
  const modelName = preset.replicateModel.split('/').pop() ?? preset.replicateModel;
  return {
    id: preset.key,
    name: preset.displayName,
    description: preset.description,
    detail: `${preset.bestFor} · ${modelName}`,
    tier: preset.tier,
    creditCost: preset.creditCost,
  };
}
