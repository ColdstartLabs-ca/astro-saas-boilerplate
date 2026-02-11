'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ArrowRight, Loader2, Zap, Upload } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { writerPresetToOption, imagePresetToOption } from '@client/utils/modelAdapters';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import { useUserStore } from '@client/store/userStore';
import { useTranslations } from '@client/hooks/useTranslations';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import type { CampaignTone } from '@shared/types/campaign.types';

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
      model: 'auto',
      tone: 'professional',
      targetWordCount: 1500,
      imagePreset: '',
    },
  });

  const watchedKeywords = watch('keywords');
  const watchedTone = watch('tone');
  const watchedImagePreset = watch('imagePreset');

  // Parse keywords from textarea (one per line, trimmed, filtered)
  const parsedKeywords = watchedKeywords
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const keywordCount = parsedKeywords.length;
  const watchedModel = watch('model');
  const writerCreditCost = writerPresets.find(p => p.key === watchedModel)?.creditCost ?? 0;
  const imageCreditCost = getImagePresetCreditCost(watchedImagePreset || null);
  const creditsPerKeyword = 1 + writerCreditCost + imageCreditCost;
  const creditCost = keywordCount * creditsPerKeyword;

  // Check if user has enough credits (from subscription + purchased)
  const userCredits =
    (user?.profile?.subscription_credits_balance ?? 0) +
    (user?.profile?.purchased_credits_balance ?? 0);
  const hasEnoughCredits = userCredits >= creditCost;

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

  const handleLaunch = async (data: CampaignFormData) => {
    if (!hasEnoughCredits) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: data.name,
        projectId,
        keywords: parsedKeywords,
        model: data.model,
        tone: data.tone,
        targetWordCount: data.targetWordCount,
        imagePreset: data.imagePreset,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Block campaign creation if no project is selected
  if (!projectId) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-project-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-8 text-center">
          <h3 id="no-project-title" className="text-lg font-semibold text-white mb-2">
            No Project Selected
          </h3>
          <p className="text-secondary text-sm mb-6">
            Please create or select a project before creating a campaign.
          </p>
          <DashboardButton variant="primary" onClick={onClose}>
            Close
          </DashboardButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-campaign-title"
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 id="new-campaign-title" className="text-xl font-bold text-white">
              {t('campaigns.newCampaign.title')}
            </h2>
            <p className="text-secondary text-sm mt-1">
              {t('campaigns.newCampaign.stepOf', { current: step, total: 2 })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Campaign Name */}
              <div>
                <label
                  htmlFor="campaign-name"
                  className="block text-sm font-medium text-secondary mb-2"
                >
                  {t('campaigns.newCampaign.name')}
                </label>
                <input
                  {...register('name')}
                  id="campaign-name"
                  type="text"
                  placeholder={t('campaigns.newCampaign.namePlaceholder')}
                  className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Keywords Input */}
              <div>
                <label
                  htmlFor="keywords-textarea"
                  className="block text-sm font-medium text-secondary mb-2"
                >
                  {t('campaigns.newCampaign.keywords')}
                </label>
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex border-b border-border">
                    <button
                      type="button"
                      onClick={() => setKeywordInputTab('manual')}
                      className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                        keywordInputTab === 'manual'
                          ? 'text-accent-hover border-accent font-medium'
                          : 'text-muted hover:text-secondary border-transparent'
                      }`}
                    >
                      {t('campaigns.newCampaign.keywordsManual')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeywordInputTab('csv')}
                      className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                        keywordInputTab === 'csv'
                          ? 'text-accent-hover border-accent font-medium'
                          : 'text-muted hover:text-secondary border-transparent'
                      }`}
                    >
                      {t('campaigns.newCampaign.keywordsCsv')}
                    </button>
                  </div>

                  {/* Manual Input - Textarea */}
                  {keywordInputTab === 'manual' && (
                    <>
                      <textarea
                        {...register('keywords')}
                        id="keywords-textarea"
                        className={`w-full h-32 bg-main border border-border rounded-lg p-4 text-white focus:ring-1 focus:ring-accent outline-none resize-none font-mono text-sm ${
                          errors.keywords ? 'border-red-500' : ''
                        }`}
                        placeholder={t('campaigns.newCampaign.keywordsPlaceholder')}
                      ></textarea>
                      {errors.keywords && (
                        <p className="text-red-400 text-xs mt-1">{errors.keywords.message}</p>
                      )}

                      {/* Keyword count badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {t('campaigns.newCampaign.keywordsCount', { count: keywordCount })}
                        </span>
                      </div>
                    </>
                  )}

                  {/* CSV Upload */}
                  {keywordInputTab === 'csv' && (
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvUpload(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-accent/50 transition-colors cursor-pointer bg-surface/50">
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                          <span className="text-sm text-secondary block">
                            {t('campaigns.newCampaign.csvDrop')}
                          </span>
                          <span className="text-xs text-muted block mt-1">
                            {t('campaigns.newCampaign.csvBrowse')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted mt-2 flex items-center">
                  <Zap className="w-3 h-3 mr-1 text-accent" />
                  We&apos;ll automatically cluster keywords to prevent cannibalization.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* AI Model */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('campaigns.newCampaign.model')}
                </label>
                {modelsLoading ? (
                  <div className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading models...</span>
                  </div>
                ) : (
                  <ModelSelect
                    options={writerPresets.map(writerPresetToOption)}
                    selectedId={watch('model') || null}
                    onSelect={id => setValue('model', id || 'auto')}
                    placeholder="Select writer model..."
                  />
                )}
              </div>

              {/* Word Count Target */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('campaigns.newCampaign.wordCount')}
                </label>
                <select
                  {...register('targetWordCount', { valueAsNumber: true })}
                  className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none"
                >
                  {WORD_COUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone of Voice */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  {t('campaigns.newCampaign.tone')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TONE_OPTIONS.map(tone => (
                    <label
                      key={tone.value}
                      className={`flex items-center p-3 bg-main border rounded-lg cursor-pointer hover:border-border hover:bg-surface transition-colors ${
                        watchedTone === tone.value ? 'border-accent bg-accent/10' : 'border-border'
                      }`}
                    >
                      <input
                        {...register('tone')}
                        type="radio"
                        value={tone.value}
                        className="sr-only"
                      />
                      <span className="text-sm text-secondary">{tone.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Image Generation */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Generate Images
                </label>
                <div>
                  {modelsLoading ? (
                    <div className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-muted flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading image presets...</span>
                    </div>
                  ) : (
                    <ModelSelect
                      options={imagePresets.map(imagePresetToOption)}
                      selectedId={watchedImagePreset || null}
                      onSelect={preset => setValue('imagePreset', preset || '')}
                      allowNone
                      noneLabel="No images"
                      noneDescription="Text-only article"
                      placeholder="Select image preset..."
                    />
                  )}
                  <p className="text-xs text-muted mt-2">
                    Standard presets are included, premium presets cost 1 additional credit per
                    article.
                  </p>
                </div>
              </div>

              {/* Credit Cost */}
              <div
                className={`p-4 rounded-lg border ${
                  hasEnoughCredits
                    ? 'bg-blue-900/10 border-blue-500/20'
                    : 'bg-red-900/10 border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Zap
                    className={`w-5 h-5 mt-0.5 ${hasEnoughCredits ? 'text-blue-400' : 'text-red-400'}`}
                  />
                  <div>
                    <h4
                      className={`text-sm font-medium ${hasEnoughCredits ? 'text-blue-200' : 'text-red-200'}`}
                    >
                      {hasEnoughCredits
                        ? t('campaigns.newCampaign.creditCost')
                        : t('campaigns.newCampaign.insufficientCredits')}
                    </h4>
                    <p
                      className={`text-xs mt-1 ${hasEnoughCredits ? 'text-secondary' : 'text-red-300'}`}
                    >
                      {keywordCount} keywords × {creditsPerKeyword} credit
                      {creditsPerKeyword > 1 ? 's' : ''} per article = {creditCost} total credits
                      {!hasEnoughCredits && (
                        <span className="block mt-1">
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-main/30 rounded-b-xl flex justify-between">
          {step === 1 ? (
            <DashboardButton variant="ghost" onClick={onClose}>
              {t('campaigns.newCampaign.cancel')}
            </DashboardButton>
          ) : (
            <DashboardButton variant="ghost" onClick={() => setStep(1)} disabled={loading}>
              {t('campaigns.newCampaign.back')}
            </DashboardButton>
          )}

          {step === 1 ? (
            <DashboardButton onClick={handleStep1Next}>
              {t('campaigns.newCampaign.next')} <ArrowRight className="w-4 h-4 ml-2" />
            </DashboardButton>
          ) : (
            <DashboardButton
              onClick={handleSubmit(handleLaunch)}
              disabled={loading || !hasEnoughCredits}
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                  {t('campaigns.newCampaign.creating')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" /> {t('campaigns.newCampaign.create')}
                </>
              )}
            </DashboardButton>
          )}
        </div>
      </div>
    </div>
  );
}
