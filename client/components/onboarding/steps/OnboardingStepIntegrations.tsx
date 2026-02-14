/**
 * OnboardingStepIntegrations Component
 * Step 4 of onboarding: Set up a CMS integration
 * Optional step - can be skipped
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Loader2,
  Plug,
  Globe,
  Webhook,
  CheckCircle2,
  ArrowRight,
  SkipForward,
  AlertTriangle,
  Hexagon,
  BookOpen,
} from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useIntegrations } from '@client/hooks/useIntegrations';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import { OnboardingStep } from '@shared/types/onboarding.types';
import type { IntegrationType } from '@shared/types/integration.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepIntegrationsProps {
  /** Callback when step is completed successfully */
  onComplete: () => void;
  /** Callback when step is skipped */
  onSkip: () => void;
}

// =============================================================================
// Types
// =============================================================================

interface IIntegrationOption {
  type: IntegrationType;
  name: string;
  description: string;
  icon: typeof Globe;
  fields: IFieldConfig[];
}

interface IFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'url' | 'password';
  placeholder: string;
  required: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const INTEGRATION_OPTIONS: IIntegrationOption[] = [
  {
    type: 'wordpress',
    name: 'WordPress',
    description: 'Auto-publish articles directly to your WordPress site',
    icon: Globe,
    fields: [
      {
        name: 'name',
        label: 'Integration Name',
        type: 'text',
        placeholder: 'My WordPress Site',
        required: true,
      },
      {
        name: 'siteUrl',
        label: 'Site URL',
        type: 'url',
        placeholder: 'https://yoursite.com',
        required: true,
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'WordPress username',
        required: true,
      },
      {
        name: 'appPassword',
        label: 'App Password',
        type: 'password',
        placeholder: 'WordPress application password',
        required: true,
      },
    ],
  },
  {
    type: 'wix',
    name: 'Wix',
    description: 'Publish articles to your Wix blog',
    icon: Hexagon,
    fields: [
      {
        name: 'name',
        label: 'Integration Name',
        type: 'text',
        placeholder: 'My Wix Site',
        required: true,
      },
      {
        name: 'siteId',
        label: 'Site ID',
        type: 'text',
        placeholder: 'From Wix Dashboard > Settings > Developer Tools',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'From Wix Dashboard > Headless Settings > API Keys',
        required: true,
      },
      {
        name: 'accountId',
        label: 'Account ID',
        type: 'text',
        placeholder: 'From Wix Dashboard > Settings > Developer Tools',
        required: true,
      },
    ],
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Send articles to any endpoint via webhook',
    icon: Webhook,
    fields: [
      {
        name: 'name',
        label: 'Integration Name',
        type: 'text',
        placeholder: 'My Webhook',
        required: true,
      },
      {
        name: 'url',
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://api.example.com/articles',
        required: true,
      },
      {
        name: 'secret',
        label: 'Secret Key (optional)',
        type: 'password',
        placeholder: 'Webhook signing secret',
        required: false,
      },
    ],
  },
  {
    type: 'ghost',
    name: 'Ghost',
    description: 'Auto-publish articles to your Ghost blog',
    icon: BookOpen,
    fields: [
      {
        name: 'name',
        label: 'Integration Name',
        type: 'text',
        placeholder: 'My Ghost Blog',
        required: true,
      },
      {
        name: 'siteUrl',
        label: 'Site URL',
        type: 'url',
        placeholder: 'https://myblog.ghost.io',
        required: true,
      },
      {
        name: 'adminApiKey',
        label: 'Admin API Key',
        type: 'password',
        placeholder: 'From Ghost Settings > Integrations > Custom Integration',
        required: true,
      },
    ],
  },
];

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepIntegrations({
  onComplete,
  onSkip,
}: IOnboardingStepIntegrationsProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { completedSteps, skippedSteps, setHasIntegration, markStepComplete, markStepSkipped } =
    useOnboardingStore();
  const { createIntegration } = useIntegrations();
  const { updateProgress, isUpdating } = useOnboardingProgress();

  const selectedOption = INTEGRATION_OPTIONS.find(o => o.type === selectedType);

  // Check if all required fields are filled
  const canSubmit = selectedOption?.fields.every(
    f => !f.required || (formData[f.name] && formData[f.name].trim().length > 0)
  );

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build the integration input based on type
      let input;
      if (selectedType === 'wordpress') {
        input = {
          type: 'wordpress' as const,
          name: formData.name,
          siteUrl: formData.siteUrl,
          username: formData.username,
          appPassword: formData.appPassword,
        };
      } else if (selectedType === 'wix') {
        input = {
          type: 'wix' as const,
          name: formData.name,
          siteId: formData.siteId,
          apiKey: formData.apiKey,
          accountId: formData.accountId,
        };
      } else if (selectedType === 'ghost') {
        input = {
          type: 'ghost' as const,
          name: formData.name,
          siteUrl: formData.siteUrl,
          adminApiKey: formData.adminApiKey,
        };
      } else {
        input = {
          type: 'webhook' as const,
          name: formData.name,
          url: formData.url,
          secret: formData.secret || undefined,
        };
      }

      await createIntegration(input);

      // Update store
      setHasIntegration(true);
      markStepComplete(OnboardingStep.INTEGRATIONS);

      // Persist progress
      const newCompletedSteps = new Set(completedSteps);
      newCompletedSteps.add(OnboardingStep.INTEGRATIONS);

      await updateProgress({
        currentStep: OnboardingStep.COMPLETION,
        completedSteps: Array.from(newCompletedSteps),
        skippedSteps: Array.from(skippedSteps),
      });

      onComplete();
    } catch (err) {
      console.error('Failed to create integration:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create integration. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedType,
    canSubmit,
    formData,
    completedSteps,
    skippedSteps,
    createIntegration,
    setHasIntegration,
    markStepComplete,
    updateProgress,
    onComplete,
  ]);

  const handleSkip = useCallback(async () => {
    setIsSkipping(true);
    try {
      markStepSkipped(OnboardingStep.INTEGRATIONS);

      const newSkippedSteps = new Set(skippedSteps);
      newSkippedSteps.add(OnboardingStep.INTEGRATIONS);

      await updateProgress({
        currentStep: OnboardingStep.COMPLETION,
        completedSteps: Array.from(completedSteps),
        skippedSteps: Array.from(newSkippedSteps),
      });

      onSkip();
    } catch (err) {
      console.error('Failed to skip step:', err);
    } finally {
      setIsSkipping(false);
    }
  }, [completedSteps, skippedSteps, markStepSkipped, updateProgress, onSkip]);

  const isLoading = isSubmitting || isUpdating || isSkipping;

  return (
    <div className="space-y-4">
      {/* Integration Type Selection */}
      {!selectedType && (
        <div className="space-y-3">
          {INTEGRATION_OPTIONS.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => setSelectedType(option.type)}
                disabled={isLoading}
                className="w-full flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-accent/50 hover:bg-surface-light transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{option.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{option.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Integration Form */}
      {selectedType && selectedOption && (
        <div className="space-y-4">
          {/* Back to type selection */}
          <button
            type="button"
            onClick={() => {
              setSelectedType(null);
              setFormData({});
              setError(null);
            }}
            disabled={isLoading}
            className="text-sm text-muted hover:text-secondary transition-colors"
          >
            &larr; Choose different type
          </button>

          {/* Selected type indicator */}
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
            <span className="text-sm text-white font-medium">{selectedOption.name}</span>
          </div>

          {/* Form Fields */}
          {selectedOption.fields.map(field => (
            <div key={field.name} className="space-y-1.5">
              <label
                htmlFor={`integration-${field.name}`}
                className="block text-sm font-medium text-white"
              >
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              <input
                id={`integration-${field.name}`}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                disabled={isLoading}
                className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white placeholder:text-muted focus:ring-1 focus:ring-accent outline-none transition-all"
              />
            </div>
          ))}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <DashboardButton
            type="button"
            onClick={handleSubmit}
            className="w-full shadow-lg shadow-accent/20"
            disabled={isLoading || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plug className="w-4 h-4 mr-2" />
                Connect {selectedOption.name}
              </>
            )}
          </DashboardButton>
        </div>
      )}

      {/* Skip Button / Confirmation */}
      {showSkipConfirm ? (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-secondary">
              Are you sure? Without an integration, you&apos;ll need to manually copy and publish
              every generated article.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowSkipConfirm(false)}
              disabled={isLoading}
              className="flex-1 py-2 text-sm text-secondary border border-border rounded-lg hover:bg-surface-light transition-colors"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 py-2 text-sm text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
            >
              {isSkipping ? 'Skipping...' : 'Skip Anyway'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSkipConfirm(true)}
          disabled={isLoading}
          className="w-full py-2.5 text-sm text-muted hover:text-secondary transition-colors flex items-center justify-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Skip for now
        </button>
      )}

      {/* Help Text */}
      <div className="bg-accent/5 border border-accent/10 rounded-lg p-4">
        <p className="text-xs text-secondary">
          <strong className="text-white">Note:</strong> Without an integration, you&apos;ll need to
          manually copy and publish generated articles. You can add integrations anytime from the
          Dashboard.
        </p>
      </div>
    </div>
  );
}
