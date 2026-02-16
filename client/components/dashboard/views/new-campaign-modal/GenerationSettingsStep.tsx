/**
 * Generation Settings Step (Step 2 of NewCampaignModal)
 * Handles AI model selection, tone, word count, and credit calculation
 */
'use client';

import { ModelSelect } from '@client/components/ui/ModelSelect';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useTranslations } from '@client/hooks/useTranslations';
import { useUserStore } from '@client/store/userStore';
import { imagePresetToOption, writerPresetToOption } from '@client/utils/modelAdapters';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import { Zap, Loader2 } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CampaignFormData } from './validationSchema';
import { TONE_OPTIONS, WORD_COUNT_OPTIONS } from './constants';

interface IGenerationSettingsStepProps {
  register: UseFormRegister<CampaignFormData>;
  setValue: UseFormSetValue<CampaignFormData>;
  watch: UseFormWatch<CampaignFormData>;
}

export function GenerationSettingsStep({
  register,
  setValue,
  watch,
}: IGenerationSettingsStepProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { user } = useUserStore();
  const { writerPresets, imagePresets, isLoading: modelsLoading } = useAvailableModels();

  const watchedTone = watch('tone');
  const watchedImagePreset = watch('imagePreset');
  const watchedKeywords = watch('keywords');
  const watchedModel = watch('model');

  // Parse keywords from textarea (one per line, trimmed, filtered)
  const parsedKeywords =
    watchedKeywords
      ?.split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0) ?? [];

  const keywordCount = parsedKeywords.length;

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

  return (
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
                <input {...register('tone')} type="radio" value={tone.value} className="sr-only" />
                <span className="text-xs font-bold uppercase tracking-wide">{tone.label}</span>
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
  );
}
