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
import { X, Loader2, Zap } from 'lucide-react';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { useArticleGeneration } from '@client/hooks/useArticleGeneration';
import { isArticleSuccess } from '@client/hooks/useArticlePoller';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useUserStore } from '@client/store/userStore';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';
import { ModelSelect } from '@client/components/ui/ModelSelect';
import type { IModelSelectOption } from '@client/components/ui/ModelSelect';
import { imagePresetToOption } from '@client/utils/modelAdapters';
import { ArticlePreview } from './ArticlePreview';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import type { IArticle } from '@shared/types/article.types';
import { WRITER_CREDIT_COSTS } from '@shared/constants/credit-costs.constants';

// =============================================================================
// Schema
// =============================================================================

const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long'),
  campaignId: z.string().min(1, 'Campaign is required'),
  writerPreset: z.enum(['budget', 'balanced', 'pro', 'ultra']).default('budget'),
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

const WRITER_TIER_OPTIONS: IModelSelectOption[] = [
  { id: 'budget', name: 'Budget', description: 'Fast, cost-effective text generation', tier: 'budget', creditCost: WRITER_CREDIT_COSTS.budget },
  { id: 'balanced', name: 'Balanced', description: 'Strong all-round writing quality', tier: 'balanced', creditCost: WRITER_CREDIT_COSTS.balanced },
  { id: 'pro', name: 'Pro', description: 'Professional-grade AI writing', tier: 'pro', creditCost: WRITER_CREDIT_COSTS.pro },
  { id: 'ultra', name: 'Ultra', description: 'Premium writing with nuance and depth', tier: 'ultra', creditCost: WRITER_CREDIT_COSTS.ultra },
];


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
  const { user } = useUserStore();
  const [articleId, setArticleId] = useState<string | null>(null);
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
      writerPreset: 'budget',
      tone: 'professional',
      targetWordCount: 1500,
      imagePreset: undefined,
    },
  });

  const watchedImagePreset = watch('imagePreset');
  const watchedTone = watch('tone');
  const watchedWriterPreset = watch('writerPreset');
  const _watchedCampaignId = watch('campaignId');

  // Auto-select balanced image preset when modal opens and presets become available
  useEffect(() => {
    if (imagePresets.length > 0 && !watchedImagePreset) {
      const balanced = imagePresets.find(p => p.tier === 'balanced') ?? imagePresets[0];
      setValue('imagePreset', balanced.key);
    }
  }, [imagePresets, watchedImagePreset, setValue]);

  // Notify parent of successful generation (don't auto-close)
  useEffect(() => {
    if (article && isArticleSuccess(article.status)) {
      if (onGenerateComplete) {
        onGenerateComplete(article);
      }
    }
  }, [article, onGenerateComplete]);

  const onSubmit = useCallback(
    async (data: GenerateFormData) => {
      if (!activeProject || !data.campaignId) return;

      const input = {
        keyword: data.keyword,
        projectId: activeProject.id,
        campaignId: data.campaignId,
        model: data.writerPreset,
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
    onClose();
  }, [reset, resetForm, onClose]);

  // Calculate total credit cost
  const writerCost = WRITER_CREDIT_COSTS[watchedWriterPreset] ?? 1;
  const selectedImagePreset = imagePresets.find(p => p.key === watchedImagePreset);
  const imageCost = selectedImagePreset?.creditCost ?? 0;
  const totalCredits = writerCost + imageCost;

  // Check if user has enough credits (from subscription + purchased)
  const userCredits =
    (user?.profile?.subscription_credits_balance ?? 0) +
    (user?.profile?.purchased_credits_balance ?? 0);
  const hasEnoughCredits = userCredits >= totalCredits;

  // Don't render if closed
  if (!isOpen) return null;

  // No project state
  if (!activeProject && !projectsLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-generate-no-project-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <p id="quick-generate-no-project-title" className="text-text-secondary mb-4">
            {_t('quickGenerate.noProject.title')}
          </p>
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-generate-generating-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
          <h3
            id="quick-generate-generating-title"
            className="text-lg font-semibold text-text-primary mb-2"
          >
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
  if (article && isArticleSuccess(article.status)) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-generate-success-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <h2 id="quick-generate-success-title" className="text-xl font-bold text-white">
              {_t('quickGenerate.success.title')}
            </h2>
            <button
              onClick={handleClose}
              className="text-muted hover:text-white"
              aria-label="Close dialog"
            >
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-generate-failed-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
            <X className="w-6 h-6 text-error" />
          </div>
          <h3
            id="quick-generate-failed-title"
            className="text-lg font-semibold text-text-primary mb-2"
          >
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-generate-no-campaigns-title"
      >
        <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-8 text-center">
          <h3
            id="quick-generate-no-campaigns-title"
            className="text-lg font-semibold text-text-primary mb-2"
          >
            {_t('quickGenerate.noCampaigns')}
          </h3>
          <p className="text-text-secondary text-sm mb-6">
            {_t('quickGenerate.noCampaignsDescription')}
          </p>
          <DashboardButton
            variant="primary"
            onClick={() => {
              dashboardNavigate('/dashboard/campaigns');
              onClose();
            }}
          >
            {_t('quickGenerate.goToCampaigns')}
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
      aria-labelledby="quick-generate-title"
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 id="quick-generate-title" className="text-xl font-bold text-white">
              {_t('quickGenerate.title')}
            </h2>
            <p className="text-secondary text-sm mt-1">
              {activeProject?.name && `For ${activeProject.name}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-white"
            aria-label="Close dialog"
          >
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

            {/* Writer Quality + Image Quality — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Writer Quality
                </label>
                <ModelSelect
                  options={WRITER_TIER_OPTIONS}
                  selectedId={watchedWriterPreset}
                  onSelect={id => setValue('writerPreset', (id ?? 'budget') as 'budget' | 'balanced' | 'pro' | 'ultra', { shouldValidate: true })}
                  showCreditCost={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {_t('quickGenerate.images.title')}
                </label>
                <ModelSelect
                  options={imagePresets.map(imagePresetToOption)}
                  selectedId={watchedImagePreset || null}
                  onSelect={preset => setValue('imagePreset', preset || undefined)}
                  allowNone={true}
                  noneLabel="No images"
                  showCreditCost={true}
                />
              </div>
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

            {/* Credit Cost Summary */}
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
                <div className="flex-1">
                  <h4
                    className={`text-sm font-medium ${hasEnoughCredits ? 'text-blue-200' : 'text-red-200'}`}
                  >
                    {hasEnoughCredits ? 'Credit Cost Breakdown' : 'Insufficient Credits'}
                  </h4>
                  <div className={`text-xs mt-2 space-y-1.5 ${hasEnoughCredits ? 'text-blue-100/80' : 'text-red-200/80'}`}>
                    <div className="flex justify-between items-center">
                      <span>Article ({watchedWriterPreset} writer)</span>
                      <span className="font-semibold text-white">{writerCost} credit{writerCost > 1 ? 's' : ''}</span>
                    </div>
                    {imageCost > 0 ? (
                      <div className="flex justify-between items-center">
                        <span>Images ({selectedImagePreset?.displayName ?? watchedImagePreset})</span>
                        <span className="font-semibold text-white">+{imageCost} credit{imageCost > 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-muted">
                        <span>Images</span>
                        <span>{watchedImagePreset ? 'included' : 'none'}</span>
                      </div>
                    )}
                    <div className="h-px bg-white/10 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-200">Total</span>
                      <span className="font-bold text-white">{totalCredits} credit{totalCredits > 1 ? 's' : ''}</span>
                    </div>
                    {!hasEnoughCredits && (
                      <div className="pt-1 text-red-300 flex items-center gap-1">
                        <span>Required: {totalCredits}</span>
                        <span>·</span>
                        <span>Available: {userCredits}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <DashboardButton
              type="submit"
              variant="primary"
              disabled={!isValid || isGenerating || !hasEnoughCredits}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {_t('quickGenerate.generating')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Article
                </>
              )}
            </DashboardButton>
          </form>
        </div>
      </div>
    </div>
  );
}
