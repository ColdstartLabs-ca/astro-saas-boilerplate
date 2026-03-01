'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Calendar, Zap, Play, Trash2, Info, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ICalendarArticle } from '@shared/types/calendar.types';
import { getCampaignColorPalette, getCalendarStatusConfig } from '@client/utils/calendarHelpers';
import { useApiRequest } from '@client/hooks/useApiRequest';
import { DashboardButton } from '../../ui/DashboardButton';
import type { ArticleStatus } from '@shared/types/article.types';
import {
  useArticlePoller,
  isArticleSuccess,
  ARTICLE_SUCCESS_STATUSES,
} from '@client/hooks/useArticlePoller';

interface IArticleDetailModalProps {
  article: ICalendarArticle;
  onClose: () => void;
  onReschedule: (articleId: string, newDate: string) => Promise<void>;
  onPublishNow: (articleId: string) => Promise<unknown>;
  isRescheduling?: boolean;
  isPublishing?: boolean;
  onSuccess?: () => void;
}

const PUBLISHABLE_STATUSES = ['draft', 'reviewed', 'approved', 'qa_passed'];
const FAILURE_STATUSES: ArticleStatus[] = ['failed', 'failed_quality', 'qa_failed', 'failed_timeout'];
const POLL_TIMEOUT_MS = 120000;

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'queuing' }
  | { phase: 'polling' }
  | { phase: 'success' }
  | { phase: 'failed'; message: string }
  | { phase: 'timeout' };

function getPollingStatusLabel(status: ArticleStatus | undefined): string {
  if (status === 'queued') return 'Queued for generation...';
  if (status === 'generating') return 'Generating article...';
  return 'Processing...';
}

export function ArticleDetailModal({
  article,
  onClose,
  onReschedule,
  onPublishNow,
  isRescheduling,
  isPublishing,
  onSuccess,
}: IArticleDetailModalProps): JSX.Element {
  const [newDate, setNewDate] = useState(
    article.scheduledPublishAt
      ? article.scheduledPublishAt.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({ phase: 'idle' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollingArticleId, setPollingArticleId] = useState<string | null>(null);
  const { request } = useApiRequest();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use the shared poller — same ['article', id] cache key as every other view
  const { articles: polledArticles } = useArticlePoller(
    pollingArticleId ? [pollingArticleId] : [],
    {
      onComplete: polledArticle => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setPollingArticleId(null);
        if (isArticleSuccess(polledArticle.status)) {
          setGenerationState({ phase: 'success' });
          onSuccess?.();
          setTimeout(() => onClose(), 2000);
        } else {
          setGenerationState({ phase: 'failed', message: 'Article generation failed.' });
        }
      },
    }
  );

  const polledArticle = polledArticles[0];

  // Timeout: if article hasn't finished within POLL_TIMEOUT_MS, give up
  useEffect(() => {
    if (!pollingArticleId) return;
    timeoutRef.current = setTimeout(() => {
      setPollingArticleId(null);
      setGenerationState({ phase: 'timeout' });
    }, POLL_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pollingArticleId]);

  const statusConfig = getCalendarStatusConfig(article.status);
  const campaignColors = getCampaignColorPalette(article.campaignId);
  const canPublish = PUBLISHABLE_STATUSES.includes(article.status);
  const isPlanned = article.status === 'planned';

  const handleReschedule = async () => {
    const isoDate = `${newDate}T09:00:00.000Z`;
    await onReschedule(article.id, isoDate);
    onClose();
  };

  const handlePublishNow = async () => {
    if (!publishConfirm) {
      setPublishConfirm(true);
      return;
    }
    await onPublishNow(article.id);
    onClose();
  };

  const handleGenerateNow = useCallback(async () => {
    setGenerationState({ phase: 'queuing' });
    setActionError(null);
    try {
      await request(`/api/articles/${article.id}/generate-now`, { method: 'POST' });
      setGenerationState({ phase: 'polling' });
      setPollingArticleId(article.id);
    } catch (err) {
      setGenerationState({ phase: 'idle' });
      setActionError(err instanceof Error ? err.message : 'Failed to queue article for generation');
    }
  }, [article.id, request]);

  const handleRegenerate = useCallback(async () => {
    setGenerationState({ phase: 'queuing' });
    setActionError(null);
    try {
      await request(`/api/articles/${article.id}/regenerate`, { method: 'POST' });
      setGenerationState({ phase: 'polling' });
      setPollingArticleId(article.id);
    } catch (err) {
      setGenerationState({ phase: 'idle' });
      setActionError(err instanceof Error ? err.message : 'Failed to queue article for regeneration');
    }
  }, [article.id, request]);

  const handleDeletePlan = useCallback(async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await request(`/api/articles/${article.id}`, { method: 'DELETE' });
      onSuccess?.();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete planned article');
    } finally {
      setIsDeleting(false);
    }
  }, [article.id, deleteConfirm, onSuccess, onClose, request]);

  const isGenerating =
    generationState.phase === 'queuing' || generationState.phase === 'polling';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="article-detail-modal"
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${campaignColors.dot}`} />
            <span className="text-xs text-muted">{article.campaignName ?? 'No Campaign'}</span>
            <span
              className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white leading-snug">
            {article.title ?? article.primaryKeyword}
          </h3>
          {article.title && <p className="text-xs text-muted mt-1">{article.primaryKeyword}</p>}
        </div>

        {/* Planned article info banner */}
        {isPlanned && generationState.phase === 'idle' && (
          <div
            className="mb-5 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex gap-2"
            data-testid="planned-article-banner"
          >
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              This article is planned but not yet generated. It will auto-generate 3 days before its
              publish date.
            </p>
          </div>
        )}

        {/* Generation status indicator */}
        {generationState.phase === 'queuing' && (
          <div className="mb-5 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
            <p className="text-xs text-accent">Queuing for generation...</p>
          </div>
        )}

        {generationState.phase === 'polling' && (
          <div className="mb-5 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
            <p className="text-xs text-accent">{getPollingStatusLabel(polledArticle?.status)}</p>
          </div>
        )}

        {generationState.phase === 'success' && (
          <div className="mb-5 p-3 bg-green-900/20 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-300">Article generated successfully. Closing...</p>
          </div>
        )}

        {generationState.phase === 'failed' && (
          <div className="mb-5 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            <p className="text-xs text-error">{generationState.message}</p>
          </div>
        )}

        {generationState.phase === 'timeout' && (
          <div className="mb-5 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">Generation timed out. Check back later.</p>
          </div>
        )}

        {/* Current Schedule */}
        <div className="mb-5 p-3 bg-main rounded-lg border border-border">
          <div className="text-xs text-muted mb-1">Scheduled for</div>
          <div className="text-sm text-white font-medium">
            {article.scheduledPublishAt
              ? new Intl.DateTimeFormat('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(new Date(article.scheduledPublishAt))
              : 'Not scheduled'}
          </div>
        </div>

        {/* Reschedule */}
        {article.status !== 'published' && !isGenerating && generationState.phase !== 'success' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-secondary mb-2">
              <Calendar className="w-4 h-4 inline mr-1.5" />
              Reschedule
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 bg-main border border-border rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-accent outline-none"
              />
              <DashboardButton
                size="sm"
                variant="outline"
                onClick={handleReschedule}
                disabled={isRescheduling}
              >
                {isRescheduling ? 'Saving...' : 'Save'}
              </DashboardButton>
            </div>
          </div>
        )}

        {/* Planned article actions */}
        {isPlanned && !isGenerating && generationState.phase === 'idle' && (
          <div className="mb-4 flex flex-col gap-2">
            <DashboardButton
              className="w-full"
              onClick={handleGenerateNow}
              disabled={isGenerating}
              data-testid="generate-now-button"
            >
              <Play className="w-4 h-4 mr-2" />
              Generate Now
            </DashboardButton>
            <DashboardButton
              variant="outline"
              className="w-full border-error/40 text-error hover:bg-error/10"
              onClick={handleDeletePlan}
              disabled={isDeleting}
              data-testid="delete-plan-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? (isDeleting ? 'Deleting...' : 'Confirm Delete') : 'Delete Plan'}
            </DashboardButton>
            {deleteConfirm && !isDeleting && (
              <p className="text-xs text-muted text-center">
                Click again to confirm deletion of this planned article
              </p>
            )}
          </div>
        )}

        {/* Regenerate button for failed articles */}
        {FAILURE_STATUSES.includes(article.status as ArticleStatus) &&
          !isGenerating &&
          generationState.phase === 'idle' && (
            <div className="mb-4">
              <DashboardButton
                className="w-full"
                onClick={handleRegenerate}
                data-testid="regenerate-button"
              >
                <Play className="w-4 h-4 mr-2" />
                Regenerate Article
              </DashboardButton>
            </div>
          )}

        {/* Close button for terminal failure states */}
        {(generationState.phase === 'failed' || generationState.phase === 'timeout') && (
          <div className="mb-4">
            <DashboardButton variant="outline" className="w-full" onClick={onClose}>
              Close
            </DashboardButton>
          </div>
        )}

        {/* Publish Now */}
        {canPublish && !isPlanned && (
          <div className="mb-4">
            <DashboardButton className="w-full" onClick={handlePublishNow} disabled={isPublishing}>
              <Zap className="w-4 h-4 mr-2" />
              {publishConfirm
                ? isPublishing
                  ? 'Publishing...'
                  : 'Confirm Publish Now'
                : 'Publish Now'}
            </DashboardButton>
            {publishConfirm && !isPublishing && (
              <p className="text-xs text-muted text-center mt-2">
                Click again to confirm immediate publishing
              </p>
            )}
          </div>
        )}

        {/* Published state */}
        {article.status === 'published' && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-500/20 rounded-lg p-3">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span>Article is published</span>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-xs text-error">{actionError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export so callers don't need to import from two places
export { ARTICLE_SUCCESS_STATUSES };
