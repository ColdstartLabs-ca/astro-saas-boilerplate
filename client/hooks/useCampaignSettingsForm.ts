/**
 * useCampaignSettingsForm Hook
 * Manages campaign settings form state and logic
 *
 * Features:
 * - Settings state management
 * - Schedule toggle handling with defaults
 * - Credit cost calculation
 * - Form validation and submission
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CampaignTone, ScheduleFrequency, CampaignStatus } from '@shared/types/campaign.types';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';

// =============================================================================
// Types
// =============================================================================

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

interface IUseCampaignSettingsFormProps {
  initialSettings: ICampaignSettings;
  campaignStatus?: CampaignStatus;
  onSave: (settings: ICampaignSettings) => void | Promise<void>;
  onClose: () => void;
}

interface IUseCampaignSettingsFormReturn {
  // State
  settings: ICampaignSettings;
  showScheduleSettings: boolean;
  scheduleEditable: boolean;
  totalCreditCost: number;
  canSave: boolean;

  // Actions
  updateSetting: <K extends keyof ICampaignSettings>(key: K, value: ICampaignSettings[K]) => void;
  handleScheduleToggle: (enabled: boolean) => void;
  handleSave: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

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
 * Default schedule values for new schedules
 */
const DEFAULT_SCHEDULE = {
  frequency: 'weekly' as ScheduleFrequency,
  batchSize: 3,
  hour: 9,
  timezone:
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
};

// =============================================================================
// Helper Functions
// =============================================================================

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

// =============================================================================
// Hook
// =============================================================================

export function useCampaignSettingsForm({
  initialSettings,
  campaignStatus,
  onSave,
  onClose,
}: IUseCampaignSettingsFormProps): IUseCampaignSettingsFormReturn {
  const [settings, setSettings] = useState<ICampaignSettings>(initialSettings);
  const [showScheduleSettings, setShowScheduleSettings] = useState(
    !!initialSettings.scheduleFrequency
  );

  // Update settings when initial settings change (e.g., when campaign data loads)
  useEffect(() => {
    setSettings(initialSettings);
    setShowScheduleSettings(!!initialSettings.scheduleFrequency);
  }, [initialSettings]);

  // Derived state
  const scheduleEditable = isScheduleEditable(campaignStatus);
  const totalCreditCost = useMemo(
    () => getTotalCreditCost(settings.model, settings.imagePreset),
    [settings.model, settings.imagePreset]
  );
  const canSave = !!settings.tone;

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof ICampaignSettings>(key: K, value: ICampaignSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // Handle schedule toggle with defaults
  const handleScheduleToggle = useCallback((enabled: boolean) => {
    setShowScheduleSettings(enabled);
    if (enabled) {
      setSettings(prev => {
        // Only set defaults if schedule is not already configured
        if (!prev.scheduleFrequency) {
          return {
            ...prev,
            scheduleFrequency: DEFAULT_SCHEDULE.frequency,
            scheduleBatchSize: DEFAULT_SCHEDULE.batchSize,
            scheduleHour: DEFAULT_SCHEDULE.hour,
            scheduleTimezone: DEFAULT_SCHEDULE.timezone,
          };
        }
        return prev;
      });
    }
  }, []);

  // Handle form submission
  const handleSave = useCallback(async () => {
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
  }, [settings, showScheduleSettings, onSave, onClose]);

  // Reset form to initial state
  const reset = useCallback(() => {
    setSettings(initialSettings);
    setShowScheduleSettings(!!initialSettings.scheduleFrequency);
  }, [initialSettings]);

  return {
    // State
    settings,
    showScheduleSettings,
    scheduleEditable,
    totalCreditCost,
    canSave,

    // Actions
    updateSetting,
    handleScheduleToggle,
    handleSave,
    reset,
  };
}
