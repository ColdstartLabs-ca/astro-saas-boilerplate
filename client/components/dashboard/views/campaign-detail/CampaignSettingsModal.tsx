'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { writerPresetToOption, imagePresetToOption } from '@client/utils/modelAdapters';
import { useTranslations } from '@client/hooks/useTranslations';
import type { CampaignTone } from '@shared/types/campaign.types';
import type { IAvailableWriterPreset, IAvailableImagePreset } from '@shared/types/models.types';

interface ICampaignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ICampaignSettings) => void | Promise<void>;
  initialSettings: ICampaignSettings;
  writerPresets: IAvailableWriterPreset[];
  imagePresets: IAvailableImagePreset[];
  isSaving?: boolean;
}

export interface ICampaignSettings {
  name: string;
  tone: CampaignTone | '';
  targetWordCount: number;
  model: string;
  imagePreset: string;
}

const TONE_OPTIONS: readonly CampaignTone[] = [
  'professional',
  'casual',
  'witty',
  'academic',
] as const;
const WORD_COUNT_OPTIONS = [800, 1500, 2500] as const;

/**
 * Modal for editing campaign settings.
 */
export function CampaignSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  writerPresets,
  imagePresets,
  isSaving = false,
}: ICampaignSettingsModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const [settings, setSettings] = useState<ICampaignSettings>(initialSettings);

  // Update settings when initial settings change
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleSave = async () => {
    if (!settings.tone) return;
    try {
      await onSave(settings);
      onClose();
    } catch {
      // Error handled by parent
    }
  };

  const updateSetting = <K extends keyof ICampaignSettings>(
    key: K,
    value: ICampaignSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-bold text-white">{t('campaigns.detail.metadata.title')}</h3>
          <button onClick={onClose} className="text-muted hover:text-white" disabled={isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {t('campaigns.newCampaign.name')}
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={e => updateSetting('name', e.target.value)}
              className="w-full bg-main border border-border rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-accent outline-none"
              placeholder={t('campaigns.newCampaign.namePlaceholder')}
              disabled={isSaving}
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {t('projects.onboarding.step3.toneOfVoice')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(toneOption => (
                <button
                  key={toneOption}
                  type="button"
                  onClick={() => updateSetting('tone', toneOption)}
                  disabled={isSaving}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    settings.tone === toneOption
                      ? 'bg-accent/20 border-accent text-accent-hover'
                      : 'bg-main border-border text-muted hover:border-border'
                  }`}
                >
                  {t(`projects.onboarding.step3.tones.${toneOption}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Target Word Count */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {t('projects.onboarding.step3.targetWordCount')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WORD_COUNT_OPTIONS.map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => updateSetting('targetWordCount', count)}
                  disabled={isSaving}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    settings.targetWordCount === count
                      ? 'bg-accent/20 border-accent text-accent-hover'
                      : 'bg-main border-border text-muted hover:border-border'
                  }`}
                >
                  ~{count}
                </button>
              ))}
            </div>
          </div>

          {/* Writer Preset */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Writer Model</label>
            <ModelSelect
              options={writerPresets.map(writerPresetToOption)}
              selectedId={settings.model || null}
              onSelect={id => updateSetting('model', id || '')}
              disabled={isSaving}
              placeholder="Select writer model..."
            />
          </div>

          {/* Image Preset */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Image Preset</label>
            <ModelSelect
              options={imagePresets.map(imagePresetToOption)}
              selectedId={settings.imagePreset || null}
              onSelect={id => updateSetting('imagePreset', id || '')}
              allowNone
              noneLabel="No images"
              noneDescription="Text-only article"
              disabled={isSaving}
              placeholder="Select image preset..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <DashboardButton variant="ghost" onClick={onClose} disabled={isSaving}>
            {t('campaigns.keywords.cancel')}
          </DashboardButton>
          <DashboardButton onClick={handleSave} disabled={isSaving || !settings.tone}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}
