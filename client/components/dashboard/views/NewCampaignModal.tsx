/**
 * NewCampaignModal Component
 *
 * Multi-step modal for creating new campaigns with keyword management,
 * AI model selection, and scheduling options.
 */
'use client';

import { Modal } from '@client/components/modal/Modal';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { useTranslations } from '@client/hooks/useTranslations';
import { useUserStore } from '@client/store/userStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { getImagePresetCreditCost } from '@shared/config/image-models.config';
import type { ScheduleFrequency, ICreateCampaignInput } from '@shared/types/campaign.types';
import type { IAvailableWriterPreset } from '@shared/types/models.types';
import { ArrowRight, Loader2, Zap, Calendar, CalendarDays } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { DashboardButton } from '../ui/DashboardButton';
import { PlanContentModal } from './calendar/PlanContentModal';
import {
  CampaignInfoStep,
  GenerationSettingsStep,
  ScheduleConfigStep,
  campaignSchema,
  detectTimezone,
} from './new-campaign-modal';
import type { CampaignFormData } from './new-campaign-modal';

interface ICreatedCampaign {
  id: string;
  name: string;
}

interface INewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ICreateCampaignInput) => Promise<ICreatedCampaign>;
  projectId: string;
}

export function NewCampaignModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
}: INewCampaignModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const { user } = useUserStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keywordInputTab, setKeywordInputTab] = useState<'manual' | 'csv'>('manual');
  const [seoAdvisoryDismissed, setSeoAdvisoryDismissed] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<ICreatedCampaign | null>(null);
  const [isPlanContentOpen, setIsPlanContentOpen] = useState(false);

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
      scheduleEnabled: true,
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
  const watchedImagePreset = watch('imagePreset');
  const watchedScheduleEnabled = watch('scheduleEnabled');
  const watchedModel = watch('model');

  // Get available presets for credit calculation
  const { writerPresets } = useAvailableModels();

  // Parse keywords from textarea (one per line, trimmed, filtered)
  const parsedKeywords = useMemo(
    () =>
      watchedKeywords
        ?.split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0) ?? [],
    [watchedKeywords]
  );

  const keywordCount = parsedKeywords.length;
  const writerCreditCost =
    writerPresets.find((p: IAvailableWriterPreset) => p.key === watchedModel)?.creditCost ?? 0;
  const imageCreditCost = getImagePresetCreditCost(watchedImagePreset || null);
  const creditsPerKeyword = writerCreditCost + imageCreditCost;
  const creditCost = keywordCount * creditsPerKeyword;

  // Check if user has enough credits
  const userCredits =
    (user?.profile?.subscription_credits_balance ?? 0) +
    (user?.profile?.purchased_credits_balance ?? 0);
  const hasEnoughCredits = userCredits >= creditCost;

  const handleStep1Next = useCallback(async () => {
    const valid = await trigger(['name', 'keywords']);
    if (valid) {
      setStep(2);
    }
  }, [trigger]);

  const handleStep2Next = useCallback(() => {
    setStep(3);
  }, []);

  const handleLaunch = useCallback(
    async (data: CampaignFormData) => {
      // For immediate mode, check credits
      if (!data.scheduleEnabled && !hasEnoughCredits) {
        return;
      }

      setLoading(true);
      try {
        const campaign = await onSubmit({
          name: data.name,
          projectId,
          keywords: parsedKeywords,
          model: data.model,
          tone: data.tone,
          targetWordCount: data.targetWordCount,
          imagePreset: data.imagePreset,
          ...(data.scheduleEnabled
            ? {
                scheduleFrequency: data.scheduleFrequency as ScheduleFrequency,
                scheduleBatchSize: data.scheduleBatchSize ?? 3,
                scheduleTimezone: data.scheduleTimezone ?? 'UTC',
                scheduleHour: data.scheduleHour ?? 9,
              }
            : {}),
        });
        setCreatedCampaign(campaign);
        setStep(4);
      } finally {
        setLoading(false);
      }
    },
    [hasEnoughCredits, onSubmit, projectId, parsedKeywords]
  );

  const handleSkipPlanning = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOpenPlanContent = useCallback(() => {
    setIsPlanContentOpen(true);
  }, []);

  const handlePlanContentClose = useCallback(() => {
    setIsPlanContentOpen(false);
    onClose();
  }, [onClose]);

  const handlePlanContentSuccess = useCallback(() => {
    setIsPlanContentOpen(false);
    onClose();
    window.location.href = '/dashboard/calendar';
  }, [onClose]);

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

  // Step 4: Planning prompt — shown after successful campaign creation
  if (step === 4 && createdCampaign) {
    return (
      <>
        <Modal
          isOpen={isOpen}
          onClose={handleSkipPlanning}
          title="Campaign Created!"
          size="sm"
          showCloseButton={true}
        >
          <div
            className="flex flex-col items-center gap-6 py-2"
            data-testid="campaign-success-prompt"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20">
              <CalendarDays className="w-7 h-7 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Campaign created!</p>
              <p className="text-secondary text-sm mt-2">
                Want to plan your content calendar for{' '}
                <span className="text-white font-medium">{createdCampaign.name}</span>?
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <DashboardButton
                variant="outline"
                onClick={handleSkipPlanning}
                className="flex-1"
                data-testid="skip-planning-button"
              >
                Skip
              </DashboardButton>
              <DashboardButton
                onClick={handleOpenPlanContent}
                className="flex-1"
                data-testid="plan-content-button-prompt"
              >
                <CalendarDays className="w-4 h-4 mr-2" /> Plan Content
              </DashboardButton>
            </div>
          </div>
        </Modal>

        {isPlanContentOpen && (
          <PlanContentModal
            isOpen={isPlanContentOpen}
            onClose={handlePlanContentClose}
            campaignId={createdCampaign.id}
            campaignName={createdCampaign.name}
            onSuccess={handlePlanContentSuccess}
            autoTrigger={false}
          />
        )}
      </>
    );
  }

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
          <CampaignInfoStep
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            keywordInputTab={keywordInputTab}
            setKeywordInputTab={setKeywordInputTab}
          />
        )}

        {/* Step 2: Generation Settings */}
        {step === 2 && (
          <GenerationSettingsStep register={register} setValue={setValue} watch={watch} />
        )}

        {/* Step 3: Schedule Configuration */}
        {step === 3 && (
          <ScheduleConfigStep
            register={register}
            watch={watch}
            seoAdvisoryDismissed={seoAdvisoryDismissed}
            setSeoAdvisoryDismissed={setSeoAdvisoryDismissed}
            keywordCount={keywordCount}
            creditCost={creditCost}
          />
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
