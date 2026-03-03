/**
 * NewCampaignModal Component
 *
 * Multi-step modal for creating new campaigns with keyword management,
 * AI model selection, and scheduling options.
 * All campaigns are schedule-only — auto-activated on creation.
 */
'use client';

import { Modal } from '@client/components/modal/Modal';
import { useTranslations } from '@client/hooks/useTranslations';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ScheduleFrequency, ICreateCampaignInput } from '@shared/types/campaign.types';
import { ArrowRight, Loader2, Calendar, CalendarDays } from 'lucide-react';
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
      scheduleFrequency: 'daily',
      scheduleBatchSize: 3,
      scheduleHour: 9,
      scheduleTimezone: detectTimezone(),
      // Content style defaults
      articleStyle: 'informative',
      internalLinksCount: 2,
      globalInstructions: '',
      includeYoutube: false,
      includeCta: false,
      includeEmojis: false,
      includeInfographics: false,
    },
  });

  // Reset schedule defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue('scheduleTimezone', detectTimezone());
    }
  }, [isOpen, setValue]);

  const watchedKeywords = watch('keywords');

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
          scheduleFrequency: data.scheduleFrequency as ScheduleFrequency,
          scheduleBatchSize: data.scheduleBatchSize ?? 1,
          scheduleTimezone: data.scheduleTimezone ?? 'UTC',
          scheduleHour: data.scheduleHour ?? 9,
          // Content style preferences
          articleStyle: data.articleStyle ?? undefined,
          internalLinksCount: data.internalLinksCount,
          globalInstructions: data.globalInstructions || undefined,
          includeYoutube: data.includeYoutube,
          includeCta: data.includeCta,
          includeEmojis: data.includeEmojis,
          includeInfographics: data.includeInfographics,
          imageStyle: data.imageStyle ?? undefined,
        });
        setCreatedCampaign(campaign);
        setStep(4);
      } finally {
        setLoading(false);
      }
    },
    [onSubmit, projectId, parsedKeywords]
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
            creditCost={0}
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
                disabled={loading}
                className="shadow-lg shadow-accent/20 px-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                    {t('campaigns.newCampaign.creating')}
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" /> {t('campaigns.newCampaign.create')}
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
