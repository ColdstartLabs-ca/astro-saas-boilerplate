'use client';

import { Modal } from '@client/components/modal/Modal';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useTranslations } from '@client/hooks/useTranslations';
import { useUserStore } from '@client/store/userStore';
import { imagePresetToOption, writerPresetToOption } from '@client/utils/modelAdapters';
import { zodResolver } from '@hookform/resolvers/zod';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import type { CampaignTone } from '@shared/types/campaign.types';
import { ArrowRight, Loader2, Upload, Zap } from 'lucide-react';
import { useState } from 'react';
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
      model: 'balanced',
      tone: 'professional',
      targetWordCount: 1500,
      imagePreset: 'balanced',
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
  // Total credits = writer base cost + image cost (writer costs are 1/1/2/3, image costs are 0/1/1/2)
  const creditsPerKeyword = writerCreditCost + imageCreditCost;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('campaigns.newCampaign.title')}
      subtitle={t('campaigns.newCampaign.stepOf', { current: step, total: 2 })}
      size="xl"
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Step 1: Campaign Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Campaign Name */}
            <div>
              <label
                htmlFor="campaign-name"
                className="block text-sm font-medium text-white mb-2"
              >
                {t('campaigns.newCampaign.name')}
              </label>
              <input
                {...register('name')}
                id="campaign-name"
                type="text"
                placeholder={t('campaigns.newCampaign.namePlaceholder')}
                className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none transition-all ${errors.name ? 'border-red-500 ring-1 ring-red-500/20' : ''
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
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${keywordInputTab === 'manual'
                      ? 'text-accent bg-accent/5'
                      : 'text-muted hover:text-secondary hover:bg-surface-light/50'
                      }`}
                  >
                    {t('campaigns.newCampaign.keywordsManual')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordInputTab('csv')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${keywordInputTab === 'csv'
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
                        className={`w-full h-40 bg-transparent text-white focus:outline-none outline-none resize-none font-mono text-sm ${errors.keywords ? 'placeholder:text-red-400/50' : ''
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
                          {watchedKeywords ? `Selected ${keywordCount} keywords` : t('campaigns.newCampaign.csvDrop')}
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
                <span>Smart Clustering: We&apos;ll automatically group similar keywords to prevent content cannibalization and ensure each article covers its topic comprehensively.</span>
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
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">Writer Engine</label>
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
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">Visual Assets</label>
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
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">{t('campaigns.newCampaign.tone')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map(tone => (
                    <label
                      key={tone.value}
                      className={`flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all ${watchedTone === tone.value
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
                      <span className="text-xs font-bold uppercase tracking-wide">{tone.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Word Count */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-white uppercase tracking-wider">{t('campaigns.newCampaign.wordCount')}</label>
                <select
                  {...register('targetWordCount', { valueAsNumber: true })}
                  className="w-full bg-main border border-border rounded-lg px-3 py-2 h-[42px] text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  {WORD_COUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted uppercase tracking-widest pl-1 font-semibold">Average content length</p>
              </div>
            </div>

            {/* Summary Box */}
            <div
              className={`p-6 rounded-2xl border transition-colors ${hasEnoughCredits
                ? 'bg-accent/5 border-accent/20'
                : 'bg-red-500/5 border-red-500/20'
                }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${hasEnoughCredits ? 'bg-accent/10 border border-accent/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <Zap
                    className={`w-6 h-6 ${hasEnoughCredits ? 'text-accent' : 'text-red-400'}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className={`text-sm font-bold uppercase tracking-wider ${hasEnoughCredits ? 'text-white' : 'text-red-200'}`}>
                      {hasEnoughCredits
                        ? t('campaigns.newCampaign.creditCost')
                        : t('campaigns.newCampaign.insufficientCredits')}
                    </h4>
                    <span className={`text-xl font-black ${hasEnoughCredits ? 'text-accent' : 'text-red-400'}`}>
                      {creditCost} <span className="text-xs uppercase font-bold text-muted ml-0.5">Credits</span>
                    </span>
                  </div>

                  <p className={`text-xs ${hasEnoughCredits ? 'text-secondary' : 'text-red-300'}`}>
                    {keywordCount} articles × {creditsPerKeyword} credits each
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border/30 mt-4">
          <div>
            {step === 2 && (
              <DashboardButton variant="ghost" size="sm" onClick={() => setStep(1)} disabled={loading} className="px-6">
                Back to Content
              </DashboardButton>
            )}
            {step === 1 && (
              <DashboardButton variant="ghost" size="sm" onClick={onClose} className="px-6">
                Cancel
              </DashboardButton>
            )}
          </div>

          <div className="flex gap-3">
            {step === 1 ? (
              <DashboardButton onClick={handleStep1Next} className="shadow-lg shadow-accent/20 px-8">
                {t('campaigns.newCampaign.next')} <ArrowRight className="w-4 h-4 ml-2" />
              </DashboardButton>
            ) : (
              <DashboardButton
                onClick={handleSubmit(handleLaunch)}
                disabled={loading || !hasEnoughCredits}
                className={`shadow-lg px-10 ${hasEnoughCredits ? 'shadow-accent/20' : 'opacity-50 grayscale cursor-not-allowed shadow-none'}`}
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
    </Modal>
  );
}
