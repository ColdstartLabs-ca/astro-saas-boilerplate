'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Calendar, Clock } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { writerPresetToOption, imagePresetToOption } from '@client/utils/modelAdapters';
import { useTranslations } from '@client/hooks/useTranslations';
import type { CampaignTone, ScheduleFrequency, CampaignStatus } from '@shared/types/campaign.types';
import type { IAvailableWriterPreset, IAvailableImagePreset } from '@shared/types/models.types';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import { SCHEDULE_FREQUENCY_UI_GROUPS } from '@shared/config/scheduling.config';

interface ICampaignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ICampaignSettings) => void | Promise<void>;
  initialSettings: ICampaignSettings;
  writerPresets: IAvailableWriterPreset[];
  imagePresets: IAvailableImagePreset[];
  isSaving?: boolean;
  campaignStatus?: CampaignStatus;
}

export interface ICampaignSettings {
  name: string;
  tone: CampaignTone | '';
  targetWordCount: number;
  model: string;
  imagePreset: string;
  // Schedule fields
  scheduleFrequency?: ScheduleFrequency | null;
  scheduleBatchSize?: number;
  scheduleHour?: number;
  scheduleTimezone?: string;
}

const TONE_OPTIONS: readonly CampaignTone[] = [
  'professional',
  'casual',
  'witty',
  'academic',
] as const;
const WORD_COUNT_OPTIONS = [800, 1500, 2500] as const;

/** Common timezones for user selection */
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const;

/** Generate hour options (12h format with AM/PM) */
function generateHourOptions(): { value: number; label: string }[] {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hour12 = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    options.push({
      value: i,
      label: `${hour12}:00 ${ampm}`,
    });
  }
  return options;
}

const HOUR_OPTIONS = generateHourOptions();

/**
 * Check if schedule settings are editable based on campaign status.
 * Only draft, scheduled, and paused campaigns can have their schedule modified.
 */
function isScheduleEditable(status?: CampaignStatus): boolean {
  return status === 'draft' || status === 'scheduled' || status === 'paused';
}

/**
 * Get total credit cost for an article (writer + image).
 */
function getTotalCreditCost(writerPresetKey: string, imagePresetKey: string): number {
  const writerCost = WRITER_PRESET_COSTS[writerPresetKey as keyof typeof WRITER_PRESET_COSTS] ?? 1;
  const imageCost = getImagePresetCreditCost(imagePresetKey);
  return writerCost + imageCost;
}

/**
 * Credit costs for writer presets (from shared constants).
 */
const WRITER_PRESET_COSTS = {
  budget: 1,
  balanced: 1,
  pro: 2,
  ultra: 3,
} as const;

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
  campaignStatus,
}: ICampaignSettingsModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const [settings, setSettings] = useState<ICampaignSettings>(initialSettings);
  const [showScheduleSettings, setShowScheduleSettings] = useState(
    !!initialSettings.scheduleFrequency
  );

  // Update settings when initial settings change
  useEffect(() => {
    setSettings(initialSettings);
    setShowScheduleSettings(!!initialSettings.scheduleFrequency);
  }, [initialSettings]);

  const scheduleEditable = isScheduleEditable(campaignStatus);

  const handleSave = async () => {
    if (!settings.tone) return;
    try {
      // If schedule is not shown or disabled, clear schedule settings
      const settingsToSave: ICampaignSettings = {
        ...settings,
        scheduleFrequency: showScheduleSettings ? settings.scheduleFrequency : null,
        scheduleBatchSize: showScheduleSettings ? settings.scheduleBatchSize : undefined,
        scheduleHour: showScheduleSettings ? settings.scheduleHour : undefined,
        scheduleTimezone: showScheduleSettings ? settings.scheduleTimezone : undefined,
      };
      await onSave(settingsToSave);
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
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-surface z-10">
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
              showCreditCost
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
              showCreditCost
            />
          </div>

          {/* Cost Summary */}
          <div
            className={`p-3 rounded-lg border ${
              getTotalCreditCost(settings.model, settings.imagePreset) > 3
                ? 'bg-amber-900/10 border-amber-500/20'
                : 'bg-blue-900/10 border-blue-500/20'
            }`}
          >
            <div className="flex items-start gap-2">
              <Zap
                className={`w-4 h-4 mt-0.5 ${
                  getTotalCreditCost(settings.model, settings.imagePreset) > 3
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-xs font-medium ${
                    getTotalCreditCost(settings.model, settings.imagePreset) > 3
                      ? 'text-amber-200'
                      : 'text-blue-200'
                  }`}
                >
                  Cost: {getTotalCreditCost(settings.model, settings.imagePreset)} credit
                  {getTotalCreditCost(settings.model, settings.imagePreset) !== 1 ? 's' : ''} per
                  article
                  {settings.imagePreset && (
                    <span>
                      {' '}
                      ({writerPresets.find(p => p.key === settings.model)?.creditCost ?? 1} writer +{' '}
                      {getImagePresetCreditCost(settings.imagePreset)} image)
                    </span>
                  )}
                </p>
                {getTotalCreditCost(settings.model, settings.imagePreset) > 3 && (
                  <p className="text-xs text-amber-300/80 mt-1">
                    Premium model combination - uses more credits per article
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Section Divider */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-white">Schedule Settings</span>
              </div>
              {!scheduleEditable && campaignStatus && (
                <span className="text-xs text-muted bg-surface-light/50 px-2 py-1 rounded">
                  Cannot modify schedule for {campaignStatus} campaigns
                </span>
              )}
            </div>

            {/* Schedule Toggle */}
            {scheduleEditable && (
              <div className="flex items-center justify-between mb-4 p-3 bg-main/30 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-white">Enable Schedule</p>
                  <p className="text-xs text-muted">Drip-feed articles over time</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScheduleSettings}
                    onChange={e => setShowScheduleSettings(e.target.checked)}
                    className="sr-only peer"
                    disabled={isSaving}
                  />
                  <div className="w-11 h-6 bg-surface-light rounded-full peer peer-checked:bg-accent peer-focus:ring-2 peer-focus:ring-accent/30 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            )}

            {/* Schedule Configuration */}
            {(showScheduleSettings || !scheduleEditable) && settings.scheduleFrequency && (
              <div className="space-y-4">
                {/* Frequency Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Frequency
                  </label>
                  <div className="space-y-3">
                    {SCHEDULE_FREQUENCY_UI_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs text-muted mb-1.5 font-medium">{group.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {group.options.map(option => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => updateSetting('scheduleFrequency', option.key)}
                              disabled={isSaving || !scheduleEditable}
                              className={`p-2 rounded-lg text-left border transition-colors disabled:opacity-50 ${
                                settings.scheduleFrequency === option.key
                                  ? 'bg-accent/20 border-accent text-accent-hover'
                                  : 'bg-main border-border text-muted hover:border-border'
                              }`}
                            >
                              <span className="text-xs font-semibold block">{option.label}</span>
                              <span className="text-[10px] text-muted">{option.subtitle}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Articles per Run
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={settings.scheduleBatchSize ?? 3}
                      onChange={e =>
                        updateSetting('scheduleBatchSize', parseInt(e.target.value) || 1)
                      }
                      min={1}
                      max={50}
                      disabled={isSaving || !scheduleEditable}
                      className="w-20 bg-main border border-border rounded-lg px-3 py-2 text-white text-center focus:ring-1 focus:ring-accent outline-none disabled:opacity-50"
                    />
                    <span className="text-sm text-secondary">articles per run</span>
                  </div>
                </div>

                {/* Time Settings */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Preferred Hour */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-secondary mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Preferred Time
                    </label>
                    <select
                      value={settings.scheduleHour ?? 9}
                      onChange={e => updateSetting('scheduleHour', parseInt(e.target.value))}
                      disabled={isSaving || !scheduleEditable}
                      className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {HOUR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      Timezone
                    </label>
                    <select
                      value={settings.scheduleTimezone ?? 'UTC'}
                      onChange={e => updateSetting('scheduleTimezone', e.target.value)}
                      disabled={isSaving || !scheduleEditable}
                      className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule Change Notice */}
                {scheduleEditable && campaignStatus === 'scheduled' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-200">
                      Changing schedule settings will recalculate the next run time for this
                      campaign.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* No Schedule Set (when editable and not showing) */}
            {scheduleEditable && !showScheduleSettings && !settings.scheduleFrequency && (
              <div className="bg-main/30 rounded-lg p-4 text-center">
                <Calendar className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-secondary">No schedule configured</p>
                <p className="text-xs text-muted mt-1">
                  Toggle &quot;Enable Schedule&quot; to set up drip-feed generation
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-surface">
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
