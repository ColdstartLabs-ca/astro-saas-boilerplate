/**
 * OnboardingStepIntegrations Component
 * Step 5 of onboarding: CMS integration setup
 * Optional step - can be skipped
 */

'use client';

import { useState, useCallback, useRef } from 'react';
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
  HelpCircle,
  ExternalLink,
  Zap,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useIntegrations } from '@client/hooks/useIntegrations';
import { apiFetch } from '@client/utils/api-client';
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
  helpUrl?: string;
  helpLabel?: string;
}

interface IFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'url' | 'password';
  placeholder: string;
  required: boolean;
  helpText?: string;
  helpUrl?: string;
  helpUrlLabel?: string;
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
    helpUrl: 'https://make.wordpress.org/core/2022/11/02/application-passwords-integration-guide/',
    helpLabel: 'How to create an App Password',
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
        helpText: 'Your WordPress site address (must have REST API enabled)',
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'WordPress username',
        required: true,
        helpText: 'Use an admin or editor account',
      },
      {
        name: 'appPassword',
        label: 'App Password',
        type: 'password',
        placeholder: 'WordPress application password',
        required: true,
        helpText: 'Go to Users > Profile > Application Passwords in WordPress',
        helpUrl:
          'https://make.wordpress.org/core/2022/11/02/application-passwords-integration-guide/',
        helpUrlLabel: 'Setup guide',
      },
    ],
  },
  {
    type: 'wix',
    name: 'Wix',
    description: 'Publish articles to your Wix blog',
    icon: Hexagon,
    helpUrl: 'https://dev.wix.com/docs/rest/account-level-apis/api-keys/introduction',
    helpLabel: 'How to get your API Key',
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
        helpText: 'Found under Settings > Developer Tools in your Wix Dashboard',
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'From Wix Dashboard > Headless Settings > API Keys',
        required: true,
        helpText: 'Create an API key with Blog permissions',
        helpUrl: 'https://dev.wix.com/docs/rest/account-level-apis/api-keys/introduction',
        helpUrlLabel: 'API key docs',
      },
      {
        name: 'accountId',
        label: 'Account ID',
        type: 'text',
        placeholder: 'From Wix Dashboard > Settings > Developer Tools',
        required: true,
        helpText: 'Found under Settings > Developer Tools in your Wix Dashboard',
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
        helpText: 'Your endpoint must accept POST requests and return a 2xx status',
      },
      {
        name: 'secret',
        label: 'Secret Key (optional)',
        type: 'password',
        placeholder: 'Webhook signing secret',
        required: false,
        helpText: 'Used to sign payloads with HMAC-SHA256 via the X-Signature-256 header',
      },
    ],
  },
  {
    type: 'ghost',
    name: 'Ghost',
    description: 'Auto-publish articles to your Ghost blog',
    icon: BookOpen,
    helpUrl: 'https://ghost.org/docs/admin-api/',
    helpLabel: 'Ghost Admin API docs',
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
        helpText: 'Your Ghost site URL (e.g., https://myblog.ghost.io)',
      },
      {
        name: 'adminApiKey',
        label: 'Admin API Key',
        type: 'password',
        placeholder: 'From Ghost Settings > Integrations > Custom Integration',
        required: true,
        helpText: 'Create a Custom Integration in Ghost Settings > Integrations',
        helpUrl: 'https://ghost.org/docs/admin-api/',
        helpUrlLabel: 'Setup guide',
      },
    ],
  },
];

// =============================================================================
// Sub-Components
// =============================================================================

function WebhookHelpPanel(): JSX.Element {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-sm space-y-3">
      <h4 className="font-medium text-white flex items-center gap-2">
        <Webhook className="w-4 h-4 text-accent" />
        How Webhooks Work
      </h4>
      <div className="text-secondary space-y-2">
        <p>
          When an article is published, we send a POST request to your endpoint with the article
          data.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Create an HTTP endpoint that accepts POST requests</li>
          <li>Return a 2xx status code to confirm receipt</li>
          <li>Optionally add a secret to verify payloads via HMAC-SHA256</li>
        </ol>
        <div className="mt-3 p-3 bg-main rounded border border-border/50">
          <p className="text-xs font-medium text-white mb-2">Payload Format:</p>
          <pre className="text-xs text-muted overflow-x-auto">{`{
  "event": "article.published",
  "timestamp": "2024-01-15T10:30:00Z",
  "article": {
    "title": "Article Title",
    "content": "Markdown content...",
    "content_html": "<p>HTML content...</p>",
    "slug": "article-slug",
    "primary_keyword": "target keyword"
  },
  "campaign": { "id": "uuid", "name": "..." },
  "project": { "id": "uuid", "name": "..." }
}`}</pre>
        </div>
        <p className="text-xs text-muted">
          The <code className="text-accent">X-Signature-256</code> header contains an HMAC-SHA256
          signature when a secret is configured.
        </p>
      </div>
    </div>
  );
}

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
  const [showWebhookHelp, setShowWebhookHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // BUG M1: ref-based guard to prevent double-click from firing multiple submits
  const submittingRef = useRef(false);

  const { campaignId, setHasIntegration } = useOnboardingStore();
  const { createIntegration } = useIntegrations();

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
    // BUG M1: prevent double-click from firing multiple concurrent submissions
    if (submittingRef.current) return;
    submittingRef.current = true;

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

      // Server-side glue for onboarding: create + assign integration to campaign
      // in one operation, with rollback if assignment fails.
      if (campaignId) {
        await apiFetch('/api/integrations', {
          method: 'POST',
          body: JSON.stringify({
            ...input,
            campaignId,
            autoPublish: true,
          }),
        });
      } else {
        await createIntegration(input);
      }

      setHasIntegration(true);
      onComplete();
    } catch (err) {
      console.error('Failed to create integration:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create integration. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [
    selectedType,
    canSubmit,
    formData,
    campaignId,
    createIntegration,
    setHasIntegration,
    onComplete,
  ]);

  // BUG L4 note: isSkipping is intentionally never reset — the component unmounts
  // immediately after onSkip() is called (wizard advances to next step).
  const handleSkip = useCallback(() => {
    setIsSkipping(true);
    onSkip();
  }, [onSkip]);

  const isLoading = isSubmitting || isSkipping;

  return (
    <div className="space-y-4">
      {/* Benefits Section - shown before type selection */}
      {!selectedType && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Why Connect a CMS?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-white">Auto-Publish Articles</p>
                <p className="text-xs text-muted">
                  Generated articles go straight to your site, no copy-paste needed
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-white">Save Hours Every Week</p>
                <p className="text-xs text-muted">
                  Automate publishing and focus on strategy instead
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-white">Works With Any Platform</p>
                <p className="text-xs text-muted">
                  WordPress, Wix, Ghost, or any custom site via webhook
                </p>
              </div>
            </li>
          </ul>
        </div>
      )}

      {/* Integration Type Selection */}
      {!selectedType && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-secondary uppercase tracking-wider">
            Choose your platform
          </p>
          <div className="space-y-2">
            {INTEGRATION_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.type);
                    setShowWebhookHelp(false);
                  }}
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
              setShowWebhookHelp(false);
            }}
            disabled={isLoading}
            className="text-sm text-muted hover:text-secondary transition-colors"
          >
            &larr; Choose different type
          </button>

          {/* Selected type indicator with optional help link */}
          <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/10 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm text-white font-medium">{selectedOption.name}</span>
            </div>
            {selectedOption.helpUrl && (
              <a
                href={selectedOption.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {selectedOption.helpLabel || 'Setup guide'}
              </a>
            )}
            {selectedType === 'webhook' && (
              <button
                type="button"
                onClick={() => setShowWebhookHelp(!showWebhookHelp)}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                {showWebhookHelp ? 'Hide details' : 'How webhooks work'}
              </button>
            )}
          </div>

          {/* Webhook Help Panel */}
          {selectedType === 'webhook' && showWebhookHelp && <WebhookHelpPanel />}

          {/* Form Fields */}
          {selectedOption.fields.map(field => (
            <div key={field.name} className="space-y-1.5">
              <label
                htmlFor={`integration-${field.name}`}
                className="block text-sm font-medium text-white"
              >
                {field.label} {field.required && <span className="text-error">*</span>}
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
              {(field.helpText || field.helpUrl) && (
                <div className="flex items-center justify-between">
                  {field.helpText && <p className="text-xs text-muted">{field.helpText}</p>}
                  {field.helpUrl && (
                    <a
                      href={field.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors flex-shrink-0 ml-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {field.helpUrlLabel || 'Docs'}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-4">
              <p className="text-sm text-error">{error}</p>
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
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
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
              className="flex-1 py-2 text-sm text-warning border border-warning/30 rounded-lg hover:bg-warning/10 transition-colors"
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
