/**
 * OnboardingStepGSC Component
 * Step 2 of onboarding: Connect Google Search Console
 * Optional step - can be skipped
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, Loader2, CheckCircle2, ArrowRight, SkipForward, AlertTriangle } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import { apiFetch } from '@client/utils/api-client';
import { OnboardingStep } from '@shared/types/onboarding.types';
import type { IGscConnectionSafe } from '@shared/types/opportunity.types';

// =============================================================================
// Props
// =============================================================================

interface IOnboardingStepGSCProps {
  /** Callback when step is completed successfully */
  onComplete: () => void;
  /** Callback when step is skipped */
  onSkip: () => void;
}

// =============================================================================
// Types
// =============================================================================

interface IGscConnectResponse {
  authUrl: string;
}

interface IGscConnectionResponse {
  connection: IGscConnectionSafe | null;
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepGSC({ onComplete, onSkip }: IOnboardingStepGSCProps): JSX.Element {
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [connection, setConnection] = useState<IGscConnectionSafe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    projectId,
    completedSteps,
    skippedSteps,
    setHasGscConnection,
    markStepComplete,
    markStepSkipped,
  } = useOnboardingStore();
  const { updateProgress, isUpdating } = useOnboardingProgress();

  // Fetch existing GSC connection on mount
  useEffect(() => {
    const fetchConnection = async () => {
      if (!projectId) {
        setIsLoadingConnection(false);
        return;
      }

      try {
        const data = await apiFetch<IGscConnectionResponse>(
          `/api/gsc/connection?projectId=${projectId}`
        );
        setConnection(data.connection);

        // If already connected, mark step as complete
        if (data.connection?.status === 'active') {
          setHasGscConnection(true);
          markStepComplete(OnboardingStep.GSC_CONNECTION);
        }
      } catch (err) {
        console.error('Failed to fetch GSC connection:', err);
        // Connection doesn't exist yet, that's okay
      } finally {
        setIsLoadingConnection(false);
      }
    };

    fetchConnection();
  }, [projectId, setHasGscConnection, markStepComplete]);

  // Handle GSC connection initiation
  const handleConnect = useCallback(async () => {
    if (!projectId) {
      setError('Please create a project first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get OAuth URL from API
      const data = await apiFetch<IGscConnectResponse>('/api/gsc/connect', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      });

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Failed to initiate GSC connection:', err);
      setError('Failed to connect to Google Search Console. Please try again.');
      setIsConnecting(false);
    }
  }, [projectId]);

  // Handle skip
  const handleSkip = useCallback(async () => {
    setIsSkipping(true);
    try {
      markStepSkipped(OnboardingStep.GSC_CONNECTION);

      await updateProgress({
        currentStep: OnboardingStep.KEYWORDS_UPLOAD,
        completedSteps: Array.from(completedSteps),
        skippedSteps: [OnboardingStep.GSC_CONNECTION],
      });

      onSkip();
    } catch (err) {
      console.error('Failed to skip step:', err);
    } finally {
      setIsSkipping(false);
    }
  }, [markStepSkipped, updateProgress, onSkip, completedSteps]);

  // Handle continue when already connected
  const handleContinue = useCallback(async () => {
    markStepComplete(OnboardingStep.GSC_CONNECTION);

    await updateProgress({
      currentStep: OnboardingStep.KEYWORDS_UPLOAD,
      completedSteps: Array.from(completedSteps),
      skippedSteps: Array.from(skippedSteps),
    });

    onComplete();
  }, [markStepComplete, updateProgress, onComplete, completedSteps, skippedSteps]);

  const isLoading = isUpdating || isSkipping;

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Search className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Connect Google Search Console</h2>
        <p className="text-sm text-secondary mt-2 max-w-md mx-auto">
          Link your Google Search Console account to discover keyword opportunities from your
          actual search data.
        </p>
      </div>

      {/* Already Connected State */}
      {connection?.status === 'active' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">GSC Connected</h3>
              <p className="text-sm text-secondary">
                Connected as <span className="text-white">{connection.google_email}</span>
              </p>
              {connection.site_url && (
                <p className="text-xs text-muted mt-1">Site: {connection.site_url}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <DashboardButton onClick={handleContinue} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Continue to Keywords
            </DashboardButton>
          </div>
        </div>
      )}

      {/* Not Connected State */}
      {(!connection || connection.status !== 'active') && (
        <>
          {/* Benefits */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Why Connect GSC?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">1</span>
                </div>
                <div>
                  <p className="text-sm text-white">Discover Real Keywords</p>
                  <p className="text-xs text-muted">Find keywords you already rank for but could improve</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">2</span>
                </div>
                <div>
                  <p className="text-sm text-white">Track Performance</p>
                  <p className="text-xs text-muted">Monitor impressions, clicks, and rankings over time</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">3</span>
                </div>
                <div>
                  <p className="text-sm text-white">No Credits Required</p>
                  <p className="text-xs text-muted">GSC connection is completely free</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Connect Button */}
          <div className="space-y-4">
            <DashboardButton
              onClick={handleConnect}
              disabled={isConnecting || isLoading || !projectId}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Search Console
                </>
              )}
            </DashboardButton>

            {/* Skip Button / Confirmation */}
            {showSkipConfirm ? (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-secondary">
                    Are you sure? Without GSC, you&apos;ll miss out on keyword opportunities from
                    your actual search data.
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
          </div>
        </>
      )}

      {/* Help Text */}
      <div className="bg-accent/5 border border-accent/10 rounded-lg p-4">
        <p className="text-xs text-secondary">
          <strong className="text-white">Note:</strong> You can always connect Google Search Console
          later from the Dashboard. Connecting now helps us provide personalized keyword suggestions
          based on your actual search data.
        </p>
      </div>
    </div>
  );
}
