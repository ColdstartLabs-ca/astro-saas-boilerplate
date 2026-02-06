/**
 * Project Onboarding Wizard
 * 3-step modal for creating the first project
 *
 * Step 1: Basic Info (name, domain, industry)
 * Step 2: Platform Selection (CMS type - no credentials)
 * Step 3: Content Preferences (tone, frequency)
 */

'use client';

import React, { useState } from 'react';
import {
  X,
  Loader2,
  Check,
  ArrowRight,
  Globe,
  Code,
  ShoppingBag,
  Database,
  Zap,
} from 'lucide-react';
import { Button } from '@client/components/ui/Button';
import { useProjects } from '@client/hooks/useProjects';
import { useLogger } from '@client/utils/logger';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { cn } from '@client/utils/cn';

interface IProjectOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IFormData {
  // Step 1
  name: string;
  domain: string;
  industry: string;
  // Step 2
  cmsType: 'wordpress' | 'webflow' | 'shopify' | 'other';
  // Step 3
  tone: 'professional' | 'casual' | 'witty' | 'academic';
  frequency: 'daily' | '3x_week' | 'weekly';
}

const CMS_OPTIONS = [
  { id: 'wordpress' as const, name: 'WordPress', icon: Globe },
  { id: 'webflow' as const, name: 'Webflow', icon: Code },
  { id: 'shopify' as const, name: 'Shopify', icon: ShoppingBag },
  { id: 'other' as const, name: 'Other/None', icon: Database },
] as const;

const INDUSTRY_OPTIONS = [
  { value: 'tech', label: 'Technology & SaaS' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'finance', label: 'Finance & Investing' },
  { value: 'ecommerce', label: 'E-commerce & Retail' },
  { value: 'education', label: 'Education' },
  { value: 'lifestyle', label: 'Lifestyle & Travel' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'legal', label: 'Legal' },
  { value: 'marketing', label: 'Marketing & Agency' },
  { value: 'other', label: 'Other' },
] as const;

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Authoritative' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'witty', label: 'Witty & Humorous' },
  { value: 'academic', label: 'Academic & Technical' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '3x_week', label: '3x / Week' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export function ProjectOnboarding({
  isOpen,
  onClose,
}: IProjectOnboardingProps): JSX.Element | null {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const onb = (key: string, params?: Record<string, string | number>) =>
    t(`projects.onboarding.${key}`, params);
  const logger = useLogger('ProjectOnboarding');
  const { createProject } = useProjects();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<IFormData>({
    name: '',
    domain: '',
    industry: '',
    cmsType: 'wordpress',
    tone: 'professional',
    frequency: 'weekly',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        name: '',
        domain: '',
        industry: '',
        cmsType: 'wordpress',
        tone: 'professional',
        frequency: 'weekly',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Submit on step 3
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createProject({
        name: formData.name.trim(),
        domain: formData.domain.trim() || undefined,
        industry: formData.industry || undefined,
        cms_type: formData.cmsType,
        content_preferences: {
          tone: formData.tone,
          frequency: formData.frequency,
        },
      });

      logger.info('Project created successfully', { projectName: formData.name });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      logger.error('Failed to create project', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.name.trim().length > 0;
    }
    return true; // Steps 2 and 3 have defaults
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-elevated/30 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">{onb('title')}</h2>
            <p className="text-secondary text-sm mt-1">{onb('stepOf', { step })}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white p-2 hover:bg-surface-light rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-light h-1">
          <div
            className="bg-accent h-1 transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    {onb('step1.websiteName')}
                  </label>
                  <input
                    type="text"
                    placeholder={onb('step1.websiteNamePlaceholder')}
                    className="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    {onb('step1.domainUrl')}
                  </label>
                  <input
                    type="text"
                    placeholder={onb('step1.domainUrlPlaceholder')}
                    className="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                    value={formData.domain}
                    onChange={e => setFormData({ ...formData, domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    {onb('step1.industry')}
                  </label>
                  <select
                    className="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                    value={formData.industry}
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">{onb('step1.industryPlaceholder')}</option>
                    {INDUSTRY_OPTIONS.map(ind => (
                      <option key={ind.value} value={ind.value}>
                        {onb(`step1.industries.${ind.value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Platform Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-secondary mb-4">
                  {onb('step2.choosePlatform')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {CMS_OPTIONS.map(cms => {
                    const Icon = cms.icon;
                    return (
                      <button
                        key={cms.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, cmsType: cms.id })}
                        className={cn(
                          'flex flex-col items-center justify-center p-4 rounded-xl border transition-all',
                          formData.cmsType === cms.id
                            ? 'bg-accent/20 border-accent ring-1 ring-accent/50'
                            : 'bg-elevated border-border hover:border-muted hover:bg-surface'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-8 h-8 mb-2',
                            formData.cmsType === cms.id ? 'text-accent' : 'text-secondary'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            formData.cmsType === cms.id ? 'text-accent-light' : 'text-secondary'
                          )}
                        >
                          {onb(`step2.${cms.id}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Zap className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-200">{onb('step2.cmsNote')}</p>
              </div>
            </div>
          )}

          {/* Step 3: Content Preferences */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-elevated/50 border border-border rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  {onb('step3.contentStrategy')}
                </h3>

                <div className="space-y-5">
                  {/* Publishing Frequency */}
                  <div>
                    <label className="text-sm font-medium text-secondary block mb-2">
                      {onb('step3.publishingFrequency')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {FREQUENCY_OPTIONS.map(freq => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, frequency: freq.value })}
                          className={cn(
                            'py-2 px-3 text-sm rounded-lg border transition-colors',
                            formData.frequency === freq.value
                              ? 'bg-accent text-white border-accent'
                              : 'bg-elevated text-secondary border-border hover:border-muted'
                          )}
                        >
                          {onb(`step3.frequencies.${freq.value}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone of Voice */}
                  <div>
                    <label className="text-sm font-medium text-secondary block mb-2">
                      {onb('step3.toneOfVoice')}
                    </label>
                    <select
                      className="w-full bg-elevated border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                      value={formData.tone}
                      onChange={e =>
                        setFormData({ ...formData, tone: e.target.value as IFormData['tone'] })
                      }
                    >
                      {TONE_OPTIONS.map(tone => (
                        <option key={tone.value} value={tone.value}>
                          {onb(`step3.tones.${tone.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Confirmation Note */}
              <p className="text-sm text-muted">{onb('step3.confirmationNote')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between bg-elevated/30 rounded-b-2xl">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            disabled={isSubmitting}
          >
            {onb(`buttons.${step === 1 ? 'cancel' : 'back'}`)}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {onb('buttons.settingUp')}
              </>
            ) : step === 3 ? (
              <>
                {onb('step3.completeSetup')} <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {onb('buttons.nextStep')} <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
