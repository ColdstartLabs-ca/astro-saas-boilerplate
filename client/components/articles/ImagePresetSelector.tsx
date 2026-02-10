/**
 * ImagePresetSelector Component
 *
 * A reusable component for selecting image generation presets.
 * Displays available presets with their name, description, and credit cost.
 */

import type { IAvailableImagePreset } from '@shared/types/models.types';

interface IImagePresetSelectorProps {
  selectedPreset: string | null;
  onSelect: (preset: string | null) => void;
  availablePresets: IAvailableImagePreset[];
}

export function ImagePresetSelector({
  selectedPreset,
  onSelect,
  availablePresets,
}: IImagePresetSelectorProps): JSX.Element {
  return (
    <div className="space-y-2">
      {/* None option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3.5 py-3 rounded-lg border transition-all ${
          selectedPreset === null
            ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
            : 'border-border hover:border-accent/40 bg-surface-light/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary">No images</div>
            <div className="text-xs text-muted mt-0.5">Text-only article</div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-light text-muted border border-border">
            Free
          </span>
        </div>
      </button>

      {/* Preset options */}
      {availablePresets.map(preset => {
        const isSelected = selectedPreset === preset.key;
        // Extract model name from replicateModel (e.g., "black-forest-labs/flux-schnell" -> "flux-schnell")
        const modelName = preset.replicateModel.split('/').pop() ?? preset.replicateModel;

        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onSelect(preset.key)}
            className={`w-full text-left px-3.5 py-3 rounded-lg border transition-all ${
              isSelected
                ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                : 'border-border hover:border-accent/40 bg-surface-light/50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary">{preset.displayName}</div>
                <div className="text-xs text-text-secondary mt-0.5">{preset.description}</div>
                <div className="text-[10px] text-muted mt-0.5 flex items-center gap-1">
                  <span>{preset.bestFor}</span>
                  <span className="text-border">•</span>
                  <span className="font-mono">{modelName}</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                  preset.creditCost === 0
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {preset.creditCost === 0 ? 'Included' : `+${preset.creditCost} credit`}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
