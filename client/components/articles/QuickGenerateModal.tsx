/**
 * QuickGenerateModal Component
 *
 * Modal for generating SEO articles from keywords.
 * Opens on demand, shows generation form, and closes on completion/error.
 *
 * States:
 * - Idle: Form visible, ready to submit
 * - Generating: Form disabled, show progress
 * - Success: Show ArticlePreview inside modal
 * - Failed: Show error with retry
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { useArticleGeneration } from '@client/hooks/useArticleGeneration';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import { useTranslations } from '@client/hooks/useTranslations';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import { imagePresetToOption } from '@client/utils/modelAdapters';
import { ArticlePreview } from './ArticlePreview';
import type { IArticle } from '@shared/types/article.types';

// =============================================================================
// Schema
// =============================================================================

const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long'),
  campaignId: z.string().min(1, 'Campaign is required'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
  imagePreset: z.string().optional(),
});

type GenerateFormData = z.infer<typeof generateSchema>;

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'academic', label: 'Academic' },
] as const;

const WORD_COUNT_OPTIONS = [
  { value: 800, label: '~800 words' },
  { value: 1200, label: '~1200 words' },
  { value: 1500, label: '~1500 words' },
  { value: 2000, label: '~2000 words' },
  { value: 2500, label: '~2500 words' },
  { value: 3000, label: '~3000 words' },
] as const;

// =============================================================================
// Props
// =============================================================================

interface IQuickGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateComplete?: (article: IArticle) => void;
}

// =============================================================================
// Component
// =============================================================================

export function QuickGenerateModal({
  isOpen,
  onClose,
  onGenerateComplete,
}: IQuickGenerateModalProps): JSX.Element | null {
  const _t = useTranslations('dashboard');
  const { activeProject, isLoading: projectsLoading } = useProjects();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns(activeProject?.id ?? null);
  const { imagePresets, isLoading: _modelsLoading } = useAvailableModels();
  const [articleId, setArticleId] = useState<string | null>(null);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const { article, isGenerating, error, generate, reset } = useArticleGeneration(
    articleId,
    setArticleId
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset: resetForm,
    setValue,
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      keyword: '',
      campaignId: '',
      model: 'openrouter/auto',
      tone: 'professional',
      targetWordCount: 1500,
      imagePreset: undefined,
    },
  });

  const watchedImagePreset = watch('imagePreset');
  const watchedTone = watch('tone');
  const _watchedCampaignId = watch('campaignId');

  // Close modal on successful generation

  useEffect(() => {
    if (article && article.status === 'draft') {
      if (onGenerateComplete) {
        onGenerateComplete(article);
      }
      // Close modal after a short delay to show success
      const timer = setTimeout(() => {
        handleClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [article, onGenerateComplete]);

  const onSubmit = useCallback(
    async (data: GenerateFormData) => {
      if (!activeProject || !data.campaignId) return;

      const input = {
        keyword: data.keyword,
        projectId: activeProject.id,
        campaignId: data.campaignId,
        model: data.model === 'openrouter/auto' ? undefined : data.model,
        tone: data.tone,
        targetWordCount: data.targetWordCount ?? 1500,
        imagePreset: data.imagePreset,
      };

      try {
        await generate(input);
      } catch (err) {
        console.error('Failed to generate article:', err);
      }
    },
    [activeProject, generate]
  );

  const handleClose = useCallback(() => {
    reset();
    resetForm();
    setArticleId(null);
    setShowImageSettings(false);
    onClose();
  }, [reset, resetForm, onClose]);

  // Calculate total credit cost
  const imageCreditCost = getImagePresetCreditCost(watchedImagePreset || null);
  const totalCredits = 1 + imageCreditCost;

  // Don't render if closed
  if (!isOpen) return null;

  // No project state
  if (!activeProject && !projectsLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <p className="text-text-secondary mb-4">{_t('quickGenerate.noProject.title')}</p>
          <DashboardButton variant="primary" onClick={handleClose}>
            {_t('quickGenerate.noProject.close')}
          </DashboardButton>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {_t('quickGenerate.generatingState.title')}
          </h3>
          <p className="text-text-secondary text-sm">
            {_t('quickGenerate.generatingState.subtitle')}
          </p>
          {watchedImagePreset && (
            <p className="text-text-secondary text-xs mt-2">
              {_t('quickGenerate.generatingState.includingImages')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Success state - show article preview
  if (article && article.status === 'draft') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <h2 className="text-xl font-bold text-white">{_t('quickGenerate.success.title')}</h2>
            <button onClick={handleClose} className="text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <ArticlePreview article={article} onGenerateAnother={handleClose} />
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (article?.status === 'failed' || error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
            <X className="w-6 h-6 text-error" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {_t('quickGenerate.failed.title')}
          </h3>
          <p className="text-text-secondary text-sm mb-4">
            {article?.generation_error || error || 'Something went wrong'}
          </p>
          <p className="text-text-secondary text-xs mb-6">
            {_t('quickGenerate.failed.creditsRefunded')}
          </p>
          <DashboardButton variant="primary" onClick={handleClose}>
            {_t('quickGenerate.failed.tryAgain')}
          </DashboardButton>
        </div>
      </div>
    );
  }

  // Idle state - show form
  // Check if user has campaigns
  if (!campaignsLoading && campaigns.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
        <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-8 text-center">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {_t('quickGenerate.noCampaigns')}
          </h3>
          <p className="text-text-secondary text-sm mb-6">
            {_t('quickGenerate.noCampaignsDescription')}
          </p>
          <DashboardButton variant="primary" onClick={() => onClose()}>
            {_t('quickGenerate.goToCampaigns')}
          </DashboardButton>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">{_t('quickGenerate.title')}</h2>
            <p className="text-secondary text-sm mt-1">
              {activeProject?.name && `For ${activeProject.name}`}
            </p>
          </div>
          <button onClick={handleClose} className="text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campaign Selector (required, first field) */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {_t('quickGenerate.campaign')} <span className="text-red-400">*</span>
              </label>
              <select
                {...register('campaignId')}
                className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none ${
                  errors.campaignId ? 'border-red-500' : ''
                }`}
              >
                <option value="">{_t('quickGenerate.selectCampaign')}</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              {errors.campaignId && (
                <p className="text-red-400 text-xs mt-1">{errors.campaignId.message}</p>
              )}
              <p className="text-xs text-muted mt-1">{_t('quickGenerate.campaignHint')}</p>
            </div>

            {/* Keyword Input */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {_t('quickGenerate.keyword')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={_t('quickGenerate.keywordPlaceholder')}
                {...register('keyword')}
                className={`w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none ${
                  errors.keyword ? 'border-red-500' : ''
                }`}
              />
              {errors.keyword && (
                <p className="text-red-400 text-xs mt-1">{errors.keyword.message}</p>
              )}
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {_t('quickGenerate.tone')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map(tone => (
                  <label
                    key={tone.value}
                    className={`flex items-center justify-center p-2.5 bg-main border rounded-lg cursor-pointer hover:border-border hover:bg-surface transition-colors ${
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

            {/* Word Count Selector */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {_t('quickGenerate.wordCount')}
              </label>
              <select
                {...register('targetWordCount', { valueAsNumber: true })}
                className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none"
              >
                {WORD_COUNT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Generation Section */}
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary">
                    {_t('quickGenerate.images.title')}
                  </label>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {_t('quickGenerate.images.description')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showImageSettings;
                    setShowImageSettings(next);
                    if (next) {
                      // Auto-select first available preset when toggling ON
                      const firstPreset = imagePresets[0];
                      if (firstPreset) {
                        setValue('imagePreset', firstPreset.key);
                      }
                    } else {
                      // Clear preset when toggling OFF
                      setValue('imagePreset', undefined);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    showImageSettings ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showImageSettings ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {showImageSettings && (
                <div className="mt-3">
                  <ModelSelect
                    options={imagePresets.map(imagePresetToOption)}
                    selectedId={watchedImagePreset || null}
                    onSelect={preset => setValue('imagePreset', preset || undefined)}
                    placeholder="Select image preset..."
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <DashboardButton
              type="submit"
              variant="primary"
              disabled={!isValid || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {_t('quickGenerate.generating')}
                </>
              ) : (
                _t('quickGenerate.generateWithCredits', {
                  count: totalCredits,
                  plural: totalCredits > 1 ? 's' : '',
                })
              )}
            </DashboardButton>
          </form>
        </div>
      </div>
    </div>
  );
}
