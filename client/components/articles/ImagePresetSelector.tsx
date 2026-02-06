/**
 * ImagePresetSelector Component
 *
 * A reusable component for selecting image generation presets.
 * Displays all available presets with their name, description, and credit cost.
 */

import { IMAGE_PRESETS, getImagePresetCreditCost } from '@shared/config/image-models.config';
import type { ImagePresetKey } from '@shared/config/image-models.config';

interface ImagePresetSelectorProps {
  selectedPreset: string | null;
  onSelect: (preset: string | null) => void;
}

export function ImagePresetSelector({ selectedPreset, onSelect }: ImagePresetSelectorProps) {
  return (
    <div className="space-y-3">
      {/* None option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
          selectedPreset === null
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-gray-100">None (text only)</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate articles without images
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              No images
            </span>
          </div>
        </div>
      </button>

      {/* Preset options */}
      {Object.values(IMAGE_PRESETS).map(preset => {
        const creditCost = getImagePresetCreditCost(preset.key);
        const isSelected = selectedPreset === preset.key;

        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onSelect(preset.key)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100">{preset.displayName}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {preset.description}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Best for: {preset.bestFor}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    creditCost === 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {creditCost === 0 ? 'Included' : `+${creditCost} credit`}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
