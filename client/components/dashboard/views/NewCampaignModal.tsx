'use client';

import { Modal } from '@client/components/modal/Modal';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useTranslations } from '@client/hooks/useTranslations';
import { useUserStore } from '@client/store/userStore';
import { imagePresetToOption, writerPresetToOption } from '@client/utils/modelAdapters';
import { zodResolver } from '@hookform/resolvers/zod';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import {
  SCHEDULE_FREQUENCY_UI_GROUPS,
  estimateCompletionDays,
  getEffectiveArticlesPerDay,
  getSeoVelocityAdvisory,
} from '@shared/config/scheduling.config';
import type {
  CampaignTone,
  ScheduleFrequency,
  IScheduleConfig,
} from '@shared/types/campaign.types';
import {
  ArrowRight,
  Loader2,
  Upload,
  Zap,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DashboardButton } from '../ui/DashboardButton';

interface INewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    projectId: string;
    keywords: string[];
    model?: string;
    tone?: CampaignTone;
    targetWordCount?: number;
    imagePreset?: string;
    scheduleConfig?: IScheduleConfig;
  }) => Promise<void>;
  projectId: string;
}

// Validation schema
const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less'),
  keywords: z.string().min(1, 'At least one keyword is required'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z.string().optional(),
  // Schedule fields
  scheduleEnabled: z.boolean().optional(),
  scheduleFrequency: z
    .enum([
      '3x_daily',
      '2x_daily',
      'daily',
      'every_other_day',
      '3x_weekly',
      '2x_weekly',
      'weekly',
      'every_2_weeks',
    ])
    .optional(),
  scheduleBatchSize: z.number().int().min(1).max(50).optional(),
  scheduleHour: z.number().int().min(0).max(23).optional(),
  scheduleTimezone: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'academic', label: 'Academic' },
] as const;

const WORD_COUNT_OPTIONS = [
  { value: 800, label: '~800 words' },
  { value: 1500, label: '~1500 words' },
  { value: 2500, label: '~2500 words' },
] as const;

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
 * Detect user's timezone from browser
 */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Format rate for display
 */
function formatEffectiveRate(frequency: ScheduleFrequency, batchSize: number): string {
  const articlesPerDay = getEffectiveArticlesPerDay(frequency, batchSize);

  if (articlesPerDay >= 1) {
    const rounded = Math.round(articlesPerDay * 10) / 10;
    return `~${rounded} articles/day`;
  }

  const daysPerArticle = 1 / articlesPerDay;
  if (daysPerArticle <= 7) {
    const articlesPerWeek = 7 / daysPerArticle;
    const rounded = Math.round(articlesPerWeek * 10) / 10;
    return `~${rounded} articles/week`;
  }

  const articlesPerMonth = 30 / daysPerArticle;
  const rounded = Math.round(articlesPerMonth * 10) / 10;
  return `~${rounded} articles/month`;
}

export function NewCampaignModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
}: INewCampaignModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const { user } = useUserStore();
  const { writerPresets, imagePresets, isLoading: modelsLoading } = useAvailableModels();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keywordInputTab, setKeywordInputTab] = useState<'manual' | 'csv'>('manual');
  const [seoAdvisoryDismissed, setSeoAdvisoryDismissed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      keywords: '',
      model: 'balanced',
      tone: 'professional',
      targetWordCount: 1500,
      imagePreset: 'balanced',
      scheduleEnabled: false,
      scheduleFrequency: 'daily',
      scheduleBatchSize: 3,
      scheduleHour: 9,
      scheduleTimezone: detectTimezone(),
    },
  });

  // Reset schedule defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue('scheduleTimezone', detectTimezone());
    }
  }, [isOpen, setValue]);

  const watchedKeywords = watch('keywords');
  const watchedTone = watch('tone');
  const watchedImagePreset = watch('imagePreset');
  const watchedScheduleEnabled = watch('scheduleEnabled');
  const watchedScheduleFrequency = watch('scheduleFrequency');
  const watchedScheduleBatchSize = watch('scheduleBatchSize');

  // Parse keywords from textarea (one per line, trimmed, filtered)
  const parsedKeywords = watchedKeywords
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const keywordCount = parsedKeywords.length;
  const watchedModel = watch('model');
  const writerCreditCost = writerPresets.find(p => p.key === watchedModel)?.creditCost ?? 0;
  const imageCreditCost = getImagePresetCreditCost(watchedImagePreset || null);
  // Total credits = writer base cost + image cost (writer costs are 1/1/2/3, image costs are 0/1/1/2)
  const creditsPerKeyword = writerCreditCost + imageCreditCost;
  const creditCost = keywordCount * creditsPerKeyword;

  // Check if user has enough credits (from subscription + purchased)
  const userCredits =
    (user?.profile?.subscription_credits_balance ?? 0) +
    (user?.profile?.purchased_credits_balance ?? 0);
  const hasEnoughCredits = userCredits >= creditCost;

  // Schedule-related calculations
  const scheduleFrequency = watchedScheduleFrequency as ScheduleFrequency | undefined;
  const scheduleBatchSize = watchedScheduleBatchSize ?? 3;

  const effectiveArticlesPerDay = useMemo(() => {
    if (!scheduleFrequency) return 0;
    return getEffectiveArticlesPerDay(scheduleFrequency, scheduleBatchSize);
  }, [scheduleFrequency, scheduleBatchSize]);

  const seoAdvisory = useMemo(() => {
    return getSeoVelocityAdvisory(effectiveArticlesPerDay);
  }, [effectiveArticlesPerDay]);

  const estimatedDaysToComplete = useMemo(() => {
    if (!scheduleFrequency || keywordCount === 0) return 0;
    return estimateCompletionDays(scheduleFrequency, scheduleBatchSize, keywordCount);
  }, [scheduleFrequency, scheduleBatchSize, keywordCount]);

  const effectiveRateDisplay = useMemo(() => {
    if (!scheduleFrequency) return '';
    return formatEffectiveRate(scheduleFrequency, scheduleBatchSize);
  }, [scheduleFrequency, scheduleBatchSize]);

  // Handle CSV file upload
  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      // Parse CSV (one keyword per line, or single column)
      const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.toLowerCase().startsWith('keyword'));
      setValue('keywords', lines.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleStep1Next = async () => {
    const valid = await trigger(['name', 'keywords']);
    if (valid) {
      setStep(2);
    }
  };

  const handleStep2Next = async () => {
    setStep(3);
  };

  const handleLaunch = async (data: CampaignFormData) => {
    // For immediate mode, check credits
    if (!data.scheduleEnabled && !hasEnoughCredits) {
      return;
    }

    setLoading(true);
    try {
      const scheduleConfig: IScheduleConfig | undefined = data.scheduleEnabled
        ? {
            frequency: data.scheduleFrequency as ScheduleFrequency,
            batchSize: data.scheduleBatchSize ?? 3,
            timezone: data.scheduleTimezone ?? 'UTC',
            hour: data.scheduleHour ?? 9,
          }
        : undefined;

      await onSubmit({
        name: data.name,
        projectId,
        keywords: parsedKeywords,
        model: data.model,
        tone: data.tone,
        targetWordCount: data.targetWordCount,
        imagePreset: data.imagePreset,
        scheduleConfig,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Block campaign creation if no project is selected
  if (!projectId) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="No Project Selected"
        showCloseButton={true}
        size="sm"
      >
        <div className="text-center py-4">
          <p className="text-secondary text-sm mb-6">
            Please create or select a project before creating a campaign.
          </p>
          <DashboardButton variant="primary" onClick={onClose} className="w-full">
            Close
          </DashboardButton>
        </div>
      </Modal>
    );
  }

  const totalSteps = 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('campaigns.newCampaign.title')}
      subtitle={t('campaigns.newCampaign.stepOf', { current: step, total: totalSteps })}
      size="xl"
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Step 1: Campaign Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Campaign Name */}
            <div>
              <label htmlFor="campaign-name" className="block text-sm font-medium text-white mb-2">
                {t('campaigns.newCampaign.name')}
              </label>
              <input
                {...register('name')}
                id="campaign-name"
                type="text"
                placeholder={t('campaigns.newCampaign.namePlaceholder')}
                className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none transition-all ${
                  errors.name ? 'border-red-500 ring-1 ring-red-500/20' : ''
                }`}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Keywords Input */}
            <div>
              <label
                htmlFor="keywords-textarea"
                className="block text-sm font-medium text-white mb-2"
              >
                {t('campaigns.newCampaign.keywords')}
              </label>
              <div className="bg-main/50 border border-border rounded-xl overflow-hidden">
                {/* Tabs */}
                <div className="flex bg-surface-light/30 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setKeywordInputTab('manual')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      keywordInputTab === 'manual'
                        ? 'text-accent bg-accent/5'
                        : 'text-muted hover:text-secondary hover:bg-surface-light/50'
                    }`}
                  >
                    {t('campaigns.newCampaign.keywordsManual')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordInputTab('csv')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      keywordInputTab === 'csv'
                        ? 'text-accent bg-accent/5 border-l border-border'
                        : 'text-muted hover:text-secondary hover:bg-surface-light/50 border-l border-border'
                    }`}
                  >
                    {t('campaigns.newCampaign.keywordsCsv')}
                  </button>
                </div>

                <div className="p-4">
                  {/* Manual Input - Textarea */}
                  {keywordInputTab === 'manual' && (
                    <div className="space-y-3">
                      <textarea
                        {...register('keywords')}
                        id="keywords-textarea"
                        className={`w-full h-40 bg-transparent text-white focus:outline-none outline-none resize-none font-mono text-sm ${
                          errors.keywords ? 'placeholder:text-red-400/50' : ''
                        }`}
                        placeholder={t('campaigns.newCampaign.keywordsPlaceholder')}
                      ></textarea>
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                          {t('campaigns.newCampaign.keywordsCount', { count: keywordCount })}
                        </span>
                        {errors.keywords && (
                          <p className="text-red-400 text-xs">{errors.keywords.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CSV Upload */}
                  {keywordInputTab === 'csv' && (
                    <div className="relative h-40">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvUpload(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-accent/40 hover:bg-accent/5 transition-all text-center">
                        <Upload className="w-10 h-10 text-muted mb-3 group-hover:text-accent transition-colors" />
                        <span className="text-sm font-medium text-secondary">
                          {watchedKeywords
                            ? `Selected ${keywordCount} keywords`
                            : t('campaigns.newCampaign.csvDrop')}
                        </span>
                        <span className="text-xs text-muted mt-1">
                          {t('campaigns.newCampaign.csvBrowse')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted mt-3 flex items-start gap-2 bg-accent/5 p-3 rounded-lg border border-accent/10">
                <Zap className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
                <span>
                  Smart Clustering: We&apos;ll automatically group similar keywords to prevent
                  content cannibalization and ensure each article covers its topic comprehensively.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Generation Settings */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            {/* AI Selection Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Writer */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                  Writer Engine
                </label>
                {modelsLoading ? (
                  <div className="w-full h-12 bg-main border border-border rounded-lg px-3 py-2.5 text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading models...</span>
                  </div>
                ) : (
                  <ModelSelect
                    options={writerPresets.map(writerPresetToOption)}
                    selectedId={watch('model') || null}
                    onSelect={id => setValue('model', id || 'balanced')}
                    placeholder="Select writer engine..."
                    showCreditCost
                  />
                )}
              </div>

              {/* Images */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                  Visual Assets
                </label>
                {modelsLoading ? (
                  <div className="w-full h-12 bg-main border border-border rounded-lg px-3 py-2.5 text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading presets...</span>
                  </div>
                ) : (
                  <ModelSelect
                    options={imagePresets.map(imagePresetToOption)}
                    selectedId={watchedImagePreset || null}
                    onSelect={preset => setValue('imagePreset', preset || 'balanced')}
                    allowNone
                    noneLabel="No images"
                    noneDescription="Text-only article"
                    placeholder="Select image style..."
                    showCreditCost
                  />
                )}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/30">
              {/* Tone of Voice */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                  {t('campaigns.newCampaign.tone')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map(tone => (
                    <label
                      key={tone.value}
                      className={`flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${
                        watchedTone === tone.value
                          ? 'border-accent bg-accent/10 shadow-sm text-white ring-1 ring-accent/20'
                          : 'border-border bg-main/40 text-secondary hover:border-accent/30 hover:bg-surface/60'
                      }`}
                    >
                      <input
                        {...register('tone')}
                        type="radio"
                        value={tone.value}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {tone.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Word Count */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                  {t('campaigns.newCampaign.wordCount')}
                </label>
                <select
                  {...register('targetWordCount', { valueAsNumber: true })}
                  className="w-full bg-main border border-border rounded-lg px-3 py-2 h-[42px] text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem',
                  }}
                >
                  {WORD_COUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted uppercase tracking-widest pl-1 font-semibold">
                  Average content length
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div
              className={`p-6 rounded-2xl border transition-colors ${
                hasEnoughCredits ? 'bg-accent/5 border-accent/20' : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-xl shrink-0 ${hasEnoughCredits ? 'bg-accent/10 border border-accent/20' : 'bg-red-500/10 border border-red-500/20'}`}
                >
                  <Zap className={`w-6 h-6 ${hasEnoughCredits ? 'text-accent' : 'text-red-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4
                      className={`text-sm font-bold uppercase tracking-wider ${hasEnoughCredits ? 'text-white' : 'text-red-200'}`}
                    >
                      {hasEnoughCredits
                        ? t('campaigns.newCampaign.creditCost')
                        : t('campaigns.newCampaign.insufficientCredits')}
                    </h4>
                    <span
                      className={`text-xl font-black ${hasEnoughCredits ? 'text-accent' : 'text-red-400'}`}
                    >
                      {creditCost}{' '}
                      <span className="text-xs uppercase font-bold text-muted ml-0.5">Credits</span>
                    </span>
                  </div>

                  <p className={`text-xs ${hasEnoughCredits ? 'text-secondary' : 'text-red-300'}`}>
                    {keywordCount} articles x {creditsPerKeyword} credits each
                    {!hasEnoughCredits && (
                      <span className="block mt-2 font-bold bg-red-500/10 p-2 rounded border border-red-500/20 uppercase tracking-tight">
                        {t('campaigns.newCampaign.insufficientCreditsDetail', {
                          required: creditCost,
                          available: userCredits,
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule Configuration */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Schedule Toggle */}
            <div className="bg-main/30 border border-border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Schedule Generation</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Drip-feed articles over time instead of all at once
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('scheduleEnabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-light rounded-full peer peer-checked:bg-accent peer-focus:ring-2 peer-focus:ring-accent/30 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
            </div>

            {/* Schedule Configuration (when enabled) */}
            {watchedScheduleEnabled && (
              <div className="space-y-6">
                {/* Frequency Selector */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                    Generation Frequency
                  </label>
                  <div className="space-y-4">
                    {SCHEDULE_FREQUENCY_UI_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider flex items-center gap-2">
                          {group.label}
                          {'default' in group && group.default && (
                            <span className="text-accent text-[10px] bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                              Recommended
                            </span>
                          )}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {group.options.map(option => (
                            <label
                              key={option.key}
                              className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${
                                watchedScheduleFrequency === option.key
                                  ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent/20'
                                  : 'border-border bg-main/40 hover:border-accent/30 hover:bg-surface/60'
                              }`}
                            >
                              <input
                                {...register('scheduleFrequency')}
                                type="radio"
                                value={option.key}
                                className="sr-only"
                              />
                              <span className="text-sm font-semibold text-white">
                                {option.label}
                              </span>
                              <span className="text-xs text-muted mt-0.5">{option.subtitle}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                    Articles per Run
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      {...register('scheduleBatchSize', { valueAsNumber: true })}
                      min={1}
                      max={50}
                      className="w-24 bg-main border border-border rounded-lg px-3 py-2 text-white text-center focus:ring-1 focus:ring-accent outline-none"
                    />
                    <span className="text-sm text-secondary">articles per scheduled run</span>
                  </div>
                  <p className="text-xs text-muted">
                    How many articles to generate each time the schedule runs (1-50)
                  </p>
                </div>

                {/* Time Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Preferred Hour */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Preferred Time
                    </label>
                    <select
                      {...register('scheduleHour', { valueAsNumber: true })}
                      className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1rem',
                      }}
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
                    <label className="block text-sm font-semibold text-white uppercase tracking-wider">
                      Timezone
                    </label>
                    <select
                      {...register('scheduleTimezone')}
                      className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1rem',
                      }}
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted">Auto-detected from your browser</p>
                  </div>
                </div>

                {/* Schedule Summary */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Schedule Summary</span>
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                          {effectiveRateDisplay}
                        </span>
                      </div>
                      <p className="text-sm text-secondary">
                        <span className="text-white font-medium">{keywordCount} keywords</span> will
                        be processed at
                        <span className="text-white font-medium">
                          {' '}
                          {scheduleBatchSize} articles per run
                        </span>
                        , taking approximately{' '}
                        <span className="text-white font-medium">
                          {estimatedDaysToComplete} days
                        </span>{' '}
                        to complete.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEO Velocity Advisory */}
                {seoAdvisory.level !== 'safe' && !seoAdvisoryDismissed && (
                  <div
                    className={`p-4 rounded-xl border ${
                      seoAdvisory.level === 'moderate'
                        ? 'bg-blue-500/5 border-blue-500/20'
                        : seoAdvisory.level === 'high'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-orange-500/5 border-orange-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {seoAdvisory.level === 'moderate' ? (
                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      ) : seoAdvisory.level === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            seoAdvisory.level === 'moderate'
                              ? 'text-blue-200'
                              : seoAdvisory.level === 'high'
                                ? 'text-amber-200'
                                : 'text-orange-200'
                          }`}
                        >
                          {seoAdvisory.level === 'moderate' &&
                            'Tip: For newer sites, consider starting slower and ramping up over 2-4 weeks.'}
                          {seoAdvisory.level === 'high' &&
                            'High volume: Make sure your site has established authority before publishing at this pace.'}
                          {seoAdvisory.level === 'aggressive' &&
                            "Very high volume: Sudden spikes in content velocity can trigger Google's spam detection. Consider ramping up gradually."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSeoAdvisoryDismissed(true)}
                        className="text-muted hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Immediate Mode Info (when schedule is disabled) */}
            {!watchedScheduleEnabled && (
              <div className="bg-surface-light/30 border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">Immediate Generation</p>
                    <p className="text-xs text-secondary mt-1">
                      All {keywordCount} articles will be generated immediately when you click
                      Start. This will use {creditCost} credits.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border/30 mt-4">
          <div>
            {step > 1 && (
              <DashboardButton
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="px-6"
              >
                Back
              </DashboardButton>
            )}
            {step === 1 && (
              <DashboardButton variant="ghost" size="sm" onClick={onClose} className="px-6">
                Cancel
              </DashboardButton>
            )}
          </div>

          <div className="flex gap-3">
            {step === 1 && (
              <DashboardButton
                onClick={handleStep1Next}
                className="shadow-lg shadow-accent/20 px-8"
              >
                {t('campaigns.newCampaign.next')} <ArrowRight className="w-4 h-4 ml-2" />
              </DashboardButton>
            )}
            {step === 2 && (
              <DashboardButton
                onClick={handleStep2Next}
                className="shadow-lg shadow-accent/20 px-8"
              >
                {t('campaigns.newCampaign.next')} <ArrowRight className="w-4 h-4 ml-2" />
              </DashboardButton>
            )}
            {step === 3 && (
              <DashboardButton
                onClick={handleSubmit(handleLaunch)}
                disabled={loading || (!watchedScheduleEnabled && !hasEnoughCredits)}
                className={`shadow-lg px-10 ${hasEnoughCredits || watchedScheduleEnabled ? 'shadow-accent/20' : 'opacity-50 grayscale cursor-not-allowed shadow-none'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                    {watchedScheduleEnabled
                      ? 'Starting Schedule...'
                      : t('campaigns.newCampaign.creating')}
                  </>
                ) : (
                  <>
                    {watchedScheduleEnabled ? (
                      <>
                        <Calendar className="w-4 h-4 mr-2" /> Start Schedule
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" /> {t('campaigns.newCampaign.create')}
                      </>
                    )}
                  </>
                )}
              </DashboardButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
