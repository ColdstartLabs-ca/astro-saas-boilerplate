/**
 * GscConnectionCard Component
 * Displays Google Search Console connection status with three states:
 * - Not connected: Prominent CTA to connect
 * - Connected: Compact inline status with site info and auto-analyze toggle
 * - Error: Error state with reconnect option
 */

'use client';

import { useState } from 'react';
import { Search, ExternalLink, CheckCircle2, AlertCircle, Unlink, Loader2, Clock, Settings, AlertTriangle, Zap, TrendingUp, FileText } from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';
import { GscSiteSelector } from './GscSiteSelector';
import { useTranslations } from '@client/hooks/useTranslations';
import type { IGscConnectionSafe, IGscSite } from '@shared/types/opportunity.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// =============================================================================
// Props
// =============================================================================

interface IGscConnectionCardProps {
  connection: IGscConnectionSafe | null;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectSite: (siteUrl: string) => void;
  sites: IGscSite[];
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  isLoadingSites?: boolean;
  onUpdateSchedule?: (connectionId: string, settings: { autoAnalyze?: boolean; analyzeFrequency?: 'daily' | 'weekly' | 'biweekly' }) => Promise<void>;
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Not connected state — full CTA card with feature warnings */
function NotConnectedState({
  onConnect,
  isConnecting,
  t,
}: {
  onConnect: () => void;
  isConnecting: boolean;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <div data-testid="gsc-connection-card" className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Warning banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-400">
              {t('opportunities.gsc.warningTitle')}
            </h4>
            <p className="text-xs text-secondary mt-1">
              {t('opportunities.gsc.warningDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div className="px-6 py-4 border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{t('opportunities.gsc.warningFeature1')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{t('opportunities.gsc.warningFeature2')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <span>{t('opportunities.gsc.warningFeature3')}</span>
          </div>
        </div>
      </div>

      {/* Connect CTA */}
      <div className="flex flex-col items-center text-center p-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-primary" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">{t('opportunities.gsc.connect')}</h3>

        <p className="text-sm text-secondary mb-6 max-w-md">
          {t('opportunities.gsc.connectDescription')}
        </p>

        <DashboardButton size="sm" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          {t('opportunities.gsc.connect')}
        </DashboardButton>

        <p className="text-xs text-muted mt-3">{t('opportunities.gsc.freeNote')}</p>

        {/* Note about backwards compatibility */}
        <p className="text-xs text-muted mt-4 max-w-md">
          {t('opportunities.gsc.warningNote')}
        </p>
      </div>
    </div>
  );
}

/** Connected state — compact inline card with auto-analyze toggle */
function ConnectedState({
  connection,
  sites,
  onDisconnect,
  onSelectSite,
  isDisconnecting,
  isLoadingSites,
  onUpdateSchedule,
  t,
}: {
  connection: IGscConnectionSafe;
  sites: IGscSite[];
  onDisconnect: () => void;
  onSelectSite: (siteUrl: string) => void;
  isDisconnecting: boolean;
  isLoadingSites: boolean;
  onUpdateSchedule?: (connectionId: string, settings: { autoAnalyze?: boolean; analyzeFrequency?: 'daily' | 'weekly' | 'biweekly' }) => Promise<void>;
  t: (key: string) => string;
}): JSX.Element {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true);
  };

  const handleConfirmDisconnect = () => {
    setShowDisconnectConfirm(false);
    onDisconnect();
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectConfirm(false);
  };

  const handleToggleAutoAnalyze = async () => {
    if (!onUpdateSchedule) return;
    setIsUpdatingSchedule(true);
    try {
      await onUpdateSchedule(connection.id, { autoAnalyze: !connection.auto_analyze });
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const handleFrequencyChange = async (frequency: 'daily' | 'weekly' | 'biweekly') => {
    if (!onUpdateSchedule) return;
    setIsUpdatingSchedule(true);
    try {
      await onUpdateSchedule(connection.id, { analyzeFrequency: frequency });
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  return (
    <div data-testid="gsc-connection-card" className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Left: Status & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">
                {t('opportunities.gsc.connected')}
              </span>
              <span className="text-xs text-muted truncate">{connection.google_email}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {connection.site_url && (
                <span className="text-xs text-secondary truncate">{connection.site_url}</span>
              )}
              {connection.last_synced_at && (
                <span className="text-xs text-muted">
                  {t('opportunities.gsc.lastSynced')} {dayjs(connection.last_synced_at).fromNow()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex-shrink-0 ml-4 flex items-center gap-2">
          {/* Settings button */}
          {onUpdateSchedule && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-muted hover:text-secondary transition-colors flex items-center gap-1"
              title="Auto-analyze settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {showDisconnectConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary">
                {t('opportunities.gsc.disconnectConfirm')}
              </span>
              <DashboardButton
                variant="ghost"
                size="sm"
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="text-red-400 hover:text-red-300"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  t('opportunities.gsc.disconnect')
                )}
              </DashboardButton>
              <DashboardButton variant="ghost" size="sm" onClick={handleCancelDisconnect}>
                Cancel
              </DashboardButton>
            </div>
          ) : (
            <button
              onClick={handleDisconnectClick}
              className="text-xs text-muted hover:text-secondary transition-colors flex items-center gap-1"
            >
              <Unlink className="w-3.5 h-3.5" />
              {t('opportunities.gsc.disconnect')}
            </button>
          )}
        </div>
      </div>

      {/* Auto-analyze settings panel */}
      {showSettings && onUpdateSchedule && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-col gap-3">
            {/* Auto-analyze toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                <span className="text-sm text-secondary">Auto-analyze</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connection.auto_analyze}
                  onChange={handleToggleAutoAnalyze}
                  disabled={isUpdatingSchedule}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-light rounded-full peer peer-checked:bg-primary peer-focus:ring-1 peer-focus:ring-primary/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>

            {/* Frequency selector - only show when auto-analyze is enabled */}
            {connection.auto_analyze && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Frequency</span>
                <div className="flex items-center gap-1">
                  {(['daily', 'weekly', 'biweekly'] as const).map(freq => (
                    <button
                      key={freq}
                      onClick={() => handleFrequencyChange(freq)}
                      disabled={isUpdatingSchedule}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        connection.analyze_frequency === freq
                          ? 'bg-primary text-white'
                          : 'bg-surface-light text-secondary hover:text-white'
                      }`}
                    >
                      {freq === 'daily' ? 'Daily' : freq === 'weekly' ? 'Weekly' : 'Bi-weekly'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Next analysis date */}
            {connection.auto_analyze && connection.next_analyze_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Next analysis</span>
                <span className="text-xs text-secondary">
                  {dayjs(connection.next_analyze_at).format('MMM D, YYYY')}
                </span>
              </div>
            )}

            {/* Last analyzed date */}
            {connection.last_analyzed_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Last analyzed</span>
                <span className="text-xs text-secondary">
                  {dayjs(connection.last_analyzed_at).fromNow()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Site selector — show if no site selected yet */}
      {!connection.site_url && (
        <div className="mt-4 border-t border-border pt-4">
          <GscSiteSelector
            sites={sites}
            selectedSiteUrl={connection.site_url}
            onSelectSite={onSelectSite}
            isLoading={isLoadingSites}
          />
        </div>
      )}
    </div>
  );
}

/** Error state — card with reconnect CTA */
function ErrorState({
  connection,
  onConnect,
  isConnecting,
  t,
}: {
  connection: IGscConnectionSafe;
  onConnect: () => void;
  isConnecting: boolean;
  t: (key: string) => string;
}): JSX.Element {
  return (
    <div data-testid="gsc-connection-card" className="bg-surface border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Left: Error status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">{t('opportunities.gsc.error')}</span>
            </div>
            <p className="text-xs text-secondary mt-1">{connection.google_email}</p>
          </div>
        </div>

        {/* Right: Reconnect button */}
        <DashboardButton size="sm" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          {t('opportunities.gsc.reconnect')}
        </DashboardButton>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function GscConnectionCard({
  connection,
  isLoading,
  onConnect,
  onDisconnect,
  onSelectSite,
  sites,
  isConnecting = false,
  isDisconnecting = false,
  isLoadingSites = false,
  onUpdateSchedule,
}: IGscConnectionCardProps): JSX.Element {
  const t = useTranslations('dashboard');

  // Loading skeleton
  if (isLoading) {
    return (
      <div data-testid="gsc-connection-card" className="bg-surface border border-border rounded-xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-light" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-light rounded w-48" />
            <div className="h-3 bg-surface-light rounded w-72" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (connection?.status === 'error') {
    return (
      <ErrorState connection={connection} onConnect={onConnect} isConnecting={isConnecting} t={t} />
    );
  }

  // Connected state
  if (connection?.status === 'active') {
    return (
      <ConnectedState
        connection={connection}
        sites={sites}
        onDisconnect={onDisconnect}
        onSelectSite={onSelectSite}
        isDisconnecting={isDisconnecting}
        isLoadingSites={isLoadingSites}
        onUpdateSchedule={onUpdateSchedule}
        t={t}
      />
    );
  }

  // Not connected state (default)
  return <NotConnectedState onConnect={onConnect} isConnecting={isConnecting} t={t} />;
}
