/**
 * OnboardingStepGSC Component
 * Step 2 of onboarding: Connect Google Search Console
 * Optional step - can be skipped
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  ArrowRight,
  SkipForward,
  AlertTriangle,
} from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { GscSiteSelector } from '@client/components/dashboard/views/opportunities/GscSiteSelector';
import { useOnboardingStore } from '@client/store/onboardingStore';
import { useProjectStore } from '@client/store/projectStore';
import { apiFetch } from '@client/utils/api-client';
import type { IGscConnectionSafe, IGscSite } from '@shared/types/opportunity.types';

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
  data: { authUrl: string };
}

interface IGscConnectionResponse {
  data: { connection: IGscConnectionSafe | null };
}

interface IGscSitesResponse {
  data: {
    sites: IGscSite[];
    recommendedSiteUrl?: string | null;
    selectedSiteUrl?: string | null;
  };
}

interface IUpdateConnectionResponse {
  data: { connection: IGscConnectionSafe };
}

// =============================================================================
// Main Component
// =============================================================================

export function OnboardingStepGSC({ onComplete, onSkip }: IOnboardingStepGSCProps): JSX.Element {
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingForPopup, setIsWaitingForPopup] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [connection, setConnection] = useState<IGscConnectionSafe | null>(null);
  const [sites, setSites] = useState<IGscSite[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isSelectingSite, setIsSelectingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projectId: onboardingProjectId, setHasGscConnection } = useOnboardingStore();
  const { activeProjectId } = useProjectStore();

  // Onboarding store projectId is in-memory only; fall back to the persisted active project
  const projectId = onboardingProjectId || activeProjectId;

  // Fetch existing GSC connection on mount — BUG H20: abort on unmount
  useEffect(() => {
    const controller = new AbortController();

    const fetchConnection = async () => {
      if (!projectId) {
        setIsLoadingConnection(false);
        return;
      }

      try {
        const res = await apiFetch<IGscConnectionResponse>(
          `/api/gsc/connection?projectId=${projectId}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setConnection(res.data.connection);

        if (res.data.connection?.status === 'active') {
          setHasGscConnection(true);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch GSC connection:', err);
        // Connection doesn't exist yet, that's okay
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingConnection(false);
        }
      }
    };

    void fetchConnection();
    return () => controller.abort();
  }, [projectId, setHasGscConnection]);

  // Fetch available properties once a connection is active — BUG H20: abort on unmount
  useEffect(() => {
    const controller = new AbortController();

    const fetchSites = async () => {
      if (!connection?.id || connection.status !== 'active') {
        setSites([]);
        return;
      }

      setIsLoadingSites(true);
      try {
        const res = await apiFetch<IGscSitesResponse>(
          `/api/gsc/connections/${connection.id}/sites`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );
        if (controller.signal.aborted) return;
        setSites(res.data.sites || []);

        if (res.data.selectedSiteUrl) {
          setConnection(prev =>
            prev
              ? {
                  ...prev,
                  site_url: res.data.selectedSiteUrl ?? prev.site_url,
                }
              : prev
          );
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch GSC sites:', err);
        setSites([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSites(false);
        }
      }
    };

    void fetchSites();
    return () => controller.abort();
  }, [connection?.id, connection?.status]);

  // Listen for the popup postMessage when OAuth completes
  useEffect(() => {
    if (!isWaitingForPopup) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'gsc_oauth_complete') return;

      setIsWaitingForPopup(false);
      setIsConnecting(false);

      if (event.data.error) {
        setError('Failed to connect to Google Search Console. Please try again.');
        return;
      }

      // Re-fetch the connection now that OAuth succeeded
      if (!projectId) return;
      setIsLoadingConnection(true);
      try {
        const res = await apiFetch<IGscConnectionResponse>(
          `/api/gsc/connection?projectId=${projectId}`
        );
        setConnection(res.data.connection);
        if (res.data.connection?.status === 'active') {
          setHasGscConnection(true);
        }
      } catch (err) {
        console.error('Failed to fetch GSC connection after OAuth:', err);
        setError('Connected, but failed to load connection details. Please refresh.');
      } finally {
        setIsLoadingConnection(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isWaitingForPopup, projectId, setHasGscConnection]);

  // Handle GSC connection initiation
  const handleConnect = useCallback(async () => {
    if (!projectId) {
      setError('Please create a project first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const res = await apiFetch<IGscConnectResponse>('/api/gsc/connect', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      });

      // Open OAuth in a popup — keeps the onboarding modal open
      const popup = window.open(
        res.data.authUrl,
        'gsc-oauth',
        'width=600,height=700,left=200,top=100,resizable=yes,scrollbars=yes'
      );

      if (!popup) {
        // Popup blocked — fall back to full-page redirect
        window.location.href = res.data.authUrl;
        return;
      }

      setIsWaitingForPopup(true);
    } catch (err) {
      console.error('Failed to initiate GSC connection:', err);
      setError('Failed to connect to Google Search Console. Please try again.');
      setIsConnecting(false);
    }
  }, [projectId]);

  // Handle skip
  // BUG L4 note: isSkipping is intentionally never reset — the component unmounts
  // immediately after onSkip() is called (wizard advances to next step).
  const handleSkip = useCallback(() => {
    setIsSkipping(true);
    onSkip();
  }, [onSkip]);

  // Handle continue when already connected
  const handleContinue = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleSelectSite = useCallback(
    async (siteUrl: string) => {
      if (!connection?.id) return;
      setIsSelectingSite(true);
      setError(null);
      try {
        const res = await apiFetch<IUpdateConnectionResponse>(
          `/api/gsc/connections/${connection.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({ siteUrl }),
          }
        );
        setConnection(res.data.connection);
      } catch (err) {
        console.error('Failed to select GSC property:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to save selected property. Please try again.'
        );
      } finally {
        setIsSelectingSite(false);
      }
    },
    [connection?.id]
  );

  const isLoading = isSkipping || isSelectingSite;

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Already Connected State */}
      {connection?.status === 'active' && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
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
            <div className="space-y-4">
              <GscSiteSelector
                sites={sites}
                selectedSiteUrl={connection.site_url}
                onSelectSite={handleSelectSite}
                isLoading={isLoadingSites || isSelectingSite}
              />

              <DashboardButton
                onClick={handleContinue}
                disabled={isLoading || (sites.length > 0 && !connection.site_url)}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue to Keywords
              </DashboardButton>
            </div>
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
                  <p className="text-xs text-muted">
                    Find keywords you already rank for but could improve
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-accent">2</span>
                </div>
                <div>
                  <p className="text-sm text-white">Track Performance</p>
                  <p className="text-xs text-muted">
                    Monitor impressions, clicks, and rankings over time
                  </p>
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
            <div className="bg-error/10 border border-error/30 rounded-lg p-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Connect Button */}
          <div className="space-y-4">
            <DashboardButton
              onClick={handleConnect}
              disabled={isConnecting || isWaitingForPopup || isLoading || !projectId}
              className="w-full"
            >
              {isWaitingForPopup ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Waiting for Google...
                </>
              ) : isConnecting ? (
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
