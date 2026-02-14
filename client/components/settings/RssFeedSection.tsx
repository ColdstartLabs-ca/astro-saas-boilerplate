/**
 * RssFeedSection Component
 *
 * Displays RSS feed settings for the current user:
 * - Feed URL with copy button
 * - Regenerate token button with confirmation
 *
 * Features:
 * - Fetches feed token from API
 * - Copy to clipboard functionality
 * - Regenerate token with confirmation dialog
 * - i18n support via settings namespace
 */

'use client';

import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { useTranslations } from '@client/hooks/useTranslations';
import { useLogger } from '@client/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@client/utils/api-client';
import { Check, Copy, Loader2, Rss, RefreshCw, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback } from 'react';

// =============================================================================
// API Functions
// =============================================================================

interface IFeedTokenResponse {
  feedToken: string | null;
  feedUrl: string | null;
}

async function fetchFeedToken(): Promise<IFeedTokenResponse> {
  const data = await apiFetch<{ data: IFeedTokenResponse }>('/api/settings/feed/token', {
    method: 'GET',
  });
  return data.data;
}

async function regenerateFeedToken(): Promise<IFeedTokenResponse> {
  const data = await apiFetch<{ data: IFeedTokenResponse }>(
    '/api/settings/feed/token/regenerate',
    {
      method: 'POST',
    }
  );
  return data.data;
}

// =============================================================================
// RssFeedSection Component
// =============================================================================

export function RssFeedSection(): JSX.Element {
  const t = useTranslations('settings');
  const logger = useLogger('RssFeedSection');
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Fetch feed token
  const {
    data: feedData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['feedToken'],
    queryFn: fetchFeedToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: regenerateFeedToken,
    onSuccess: newData => {
      queryClient.setQueryData(['feedToken'], newData);
    },
  });

  const handleCopy = useCallback(async () => {
    if (feedData?.feedUrl) {
      await navigator.clipboard.writeText(feedData.feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [feedData?.feedUrl]);

  const handleRegenerate = useCallback(async () => {
    try {
      await regenerateMutation.mutateAsync();
      setShowRegenerateConfirm(false);
    } catch (error) {
      logger.error('Failed to regenerate feed token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [regenerateMutation, logger]);

  const isRegenerating = regenerateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Rss className="w-5 h-5 text-orange-400" />
          {t('rssFeed.title')}
        </h3>
        <p className="text-sm text-secondary mt-1">{t('rssFeed.description')}</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400">{t('rssFeed.loadError')}</p>
          <DashboardButton variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Retry
          </DashboardButton>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">{t('rssFeed.warning')}</p>
          </div>

          {/* Feed URL Display */}
          {feedData?.feedUrl ? (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('rssFeed.feedUrl')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={feedData.feedUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-main border border-border rounded-lg text-sm text-secondary font-mono"
                />
                <DashboardButton
                  variant={copied ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleCopy}
                  className="min-w-[100px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('rssFeed.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('rssFeed.copyButton')}
                    </>
                  )}
                </DashboardButton>
              </div>
            </div>
          ) : (
            <div className="bg-surface-light/30 border border-border/50 rounded-lg p-4">
              <p className="text-sm text-secondary">
                No feed token generated yet. Click the button below to generate one.
              </p>
              <DashboardButton
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="mt-3"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('rssFeed.regenerating')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Feed Token
                  </>
                )}
              </DashboardButton>
            </div>
          )}

          {/* Regenerate Button */}
          {feedData?.feedUrl && (
            <div className="pt-2">
              <DashboardButton
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('rssFeed.regenerating')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('rssFeed.regenerate')}
                  </>
                )}
              </DashboardButton>
            </div>
          )}
        </div>
      )}

      {/* Regenerate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerate}
        title={t('rssFeed.regenerate')}
        message={t('rssFeed.regenerateConfirm')}
        variant="warning"
        labels={{
          confirm: t('rssFeed.regenerate'),
          confirming: t('rssFeed.regenerating'),
        }}
        isConfirming={isRegenerating}
      />
    </div>
  );
}
