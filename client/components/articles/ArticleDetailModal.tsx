/**
 * ArticleDetailModal Component
 *
 * Modal for viewing, editing, and managing individual articles.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Trash2,
  RotateCcw,
  ExternalLink,
  Edit3,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import type { IArticleWithCampaign } from '@shared/types/article.types';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { createClient } from '@shared/utils/supabase/client';
import { AIDetectionScore } from './AIDetectionScore';
import { SEOScoreDisplay } from './SEOScoreDisplay';
import { DeliveryStatusCard } from '@client/components/dashboard/views/articles/DeliveryStatusCard';
import { useArticleDeliveries } from '@client/hooks/useArticleDeliveries';
import { useTranslations } from '@client/hooks/useTranslations';
import { ImageOff } from 'lucide-react';

function MarkdownImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted text-xs py-1">
        <ImageOff className="w-4 h-4" />
        Image expired
      </span>
    );
  }
  return <img {...props} onError={() => setBroken(true)} />;
}

function GalleryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className={`${className ?? 'w-full h-36'} flex flex-col items-center justify-center gap-1.5 text-muted`}
      >
        <ImageOff className="w-5 h-5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Expired</span>
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setBroken(true)} />
  );
}

// Helper to get access token
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Helper to count words in markdown content
function countWords(markdown: string): number {
  // Remove markdown syntax
  const text = markdown
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\*\*/g, '') // Bold
    .replace(/\*/g, '') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/`{1,3}/g, '') // Code
    .replace(/>\s/g, '') // Blockquotes
    .replace(/\n/g, ' ') // Newlines to spaces
    .trim();

  // Count words (split by whitespace, filter empty)
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Check if content has unsaved changes
function hasUnsavedChanges(original: string, current: string): boolean {
  return original !== current;
}

interface IArticleDetailModalProps {
  article: IArticleWithCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedArticle: IArticleWithCampaign) => void;
}

type IArticleWithImages = IArticleWithCampaign;

export function ArticleDetailModal({
  article,
  isOpen,
  onClose,
  onUpdate,
}: IArticleDetailModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingNow, setIsGeneratingNow] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentArticle, setCurrentArticle] = useState<IArticleWithImages | null>(
    article as IArticleWithImages | null
  );
  const articleId = isOpen ? (currentArticle?.id ?? null) : null;
  const {
    deliveries,
    isLoading: deliveriesLoading,
    retryingId,
    retryDelivery,
  } = useArticleDeliveries(articleId);

  // Track previous article id to avoid unnecessary re-fetches
  const prevArticleIdRef = useRef<string | null>(null);

  // Fetch full article detail (with images) when modal opens
  useEffect(() => {
    if (!article || !isOpen) {
      setCurrentArticle(article as IArticleWithImages | null);
      prevArticleIdRef.current = null;
      return;
    }

    // Check if this is the same article we already loaded
    const isSameArticle = prevArticleIdRef.current === article.id;
    prevArticleIdRef.current = article.id;

    // Skip fetching if it's the same article (just a re-render with same data)
    if (isSameArticle) {
      return;
    }

    // Set initial data from the list item
    setCurrentArticle(article as IArticleWithImages);
    if (article?.content) {
      setEditedContent(article.content);
    }

    // Fetch full detail (includes article_images)
    let cancelled = false;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const res = await fetch(`/api/articles/${article.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.success && json.data?.article && !cancelled) {
          setCurrentArticle(json.data.article as IArticleWithImages);
          if (json.data.article.content) {
            setEditedContent(json.data.article.content);
          }
        }
      } catch {
        // Silently fall back to list data
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [article, isOpen]);

  const handleSave = useCallback(async () => {
    if (!currentArticle) return;
    setIsSaving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save article');
      }

      const result = await response.json();
      const updatedArticle = result.data.article as IArticleWithCampaign;

      // Update local state with the response
      setCurrentArticle(updatedArticle);
      setIsEditing(false);
      onUpdate?.(updatedArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [currentArticle, editedContent, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!currentArticle || !confirm('Are you sure you want to delete this article?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete article');
      }

      onClose();
      onUpdate?.(currentArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [currentArticle, onClose, onUpdate]);

  const handleRegenerate = useCallback(async () => {
    if (
      !currentArticle ||
      !confirm('Regenerate this article? This will use credits based on your current settings.')
    )
      return;

    setIsRegenerating(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to regenerate article');
      }

      onClose();
      onUpdate?.(currentArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  }, [currentArticle, onClose, onUpdate]);

  const handleGenerateNow = useCallback(async () => {
    if (!currentArticle) return;

    setIsGeneratingNow(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}/generate-now`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to queue article for generation');
      }

      onClose();
      onUpdate?.(currentArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGeneratingNow(false);
    }
  }, [currentArticle, onClose, onUpdate]);

  const handleApprove = useCallback(async () => {
    if (!currentArticle) return;
    setIsApproving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to approve article');
      }

      const result = await response.json();
      const updatedArticle = result.data.article as IArticleWithCampaign;
      setCurrentArticle(updatedArticle);
      onUpdate?.(updatedArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsApproving(false);
    }
  }, [currentArticle, onUpdate]);

  const handleReject = useCallback(
    async (reason: string) => {
      if (!currentArticle) return;
      setIsRejecting(true);
      setError(null);

      try {
        const accessToken = await getAccessToken();
        const response = await fetch(`/api/articles/${currentArticle.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to reject article');
        }

        const result = await response.json();
        const updatedArticle = result.data.article as IArticleWithCampaign;
        setCurrentArticle(updatedArticle);
        onUpdate?.(updatedArticle);
        setShowRejectDialog(false);
        setRejectionReason('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      } finally {
        setIsRejecting(false);
      }
    },
    [currentArticle, onUpdate]
  );

  if (!isOpen || !currentArticle) return null;

  return (
    <div
      data-testid="article-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4"
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">
              {currentArticle.title || currentArticle.primary_keyword}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={currentArticle.status} />
              {(isEditing || currentArticle.word_count) && (
                <span className="text-xs text-muted">
                  {isEditing
                    ? t('articles.detailModal.wordCount', { count: countWords(editedContent) })
                    : t('articles.detailModal.wordCount', {
                        count: currentArticle.word_count ?? 0,
                      })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div data-testid="article-inline-error" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* SEO Score Display - show when not editing and content exists */}
          {!isEditing && currentArticle.content && (
            <div className="mb-6">
              <SEOScoreDisplay article={currentArticle} />
            </div>
          )}

          {/* AI Detection Score Display - show when not editing and content exists */}
          {!isEditing && currentArticle.content && (
            <div className="mb-6">
              <AIDetectionScore score={currentArticle.ai_detection_score ?? null} />
            </div>
          )}

          {isEditing ? (
            <div className="border border-border rounded-lg overflow-hidden" data-color-mode="dark">
              <MDEditor
                value={editedContent}
                onChange={value => setEditedContent(value || '')}
                height={400}
                preview="edit"
                hideToolbar={false}
                textareaProps={{
                  placeholder: 'Write your article content in markdown...',
                }}
              />
              {/* Word count and dirty state indicator during editing */}
              <div className="flex items-center justify-between p-3 bg-surface-light text-xs text-muted">
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges(currentArticle.content || '', editedContent) && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>{t('articles.detailModal.unsavedChanges')}</span>
                    </>
                  )}
                </div>
                <span>
                  {t('articles.detailModal.wordCount', { count: countWords(editedContent) })}
                </span>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm">
              {currentArticle.content ? (
                <ReactMarkdown components={{ img: MarkdownImage }}>
                  {currentArticle.content}
                </ReactMarkdown>
              ) : currentArticle.generation_error ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  <p className="font-medium mb-2">{t('articles.detailModal.generationFailed')}</p>
                  <p className="text-sm">{currentArticle.generation_error}</p>
                </div>
              ) : (
                <p className="text-muted italic">{t('articles.detailModal.noContent')}</p>
              )}
            </div>
          )}

          {/* Delivery Status section */}
          {!isEditing && (deliveries.length > 0 || deliveriesLoading) && (
            <div className="mt-6 pt-6 border-t border-border">
              <DeliveryStatusCard
                deliveries={deliveries}
                isLoading={deliveriesLoading}
                retryingId={retryingId}
                onRetry={() => currentArticle?.id && retryDelivery(currentArticle.id)}
                t={t}
              />
            </div>
          )}

          {/* Images section */}
          {!isEditing &&
            currentArticle.article_images &&
            currentArticle.article_images.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-muted" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {t('articles.detailModal.generatedImages', {
                      count: currentArticle.article_images.length,
                    })}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentArticle.article_images
                    .sort((a, b) => a.position - b.position)
                    .map(img => (
                      <div
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border border-border bg-surface-light"
                      >
                        {img.status === 'completed' && img.image_url ? (
                          <>
                            <GalleryImage
                              src={img.image_url}
                              alt={img.prompt?.substring(0, 80) ?? ''}
                              className="w-full h-36 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a
                                href={img.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-xs px-3 py-1.5 bg-accent/90 rounded-md hover:bg-accent transition-colors backdrop-blur-sm"
                              >
                                {t('articles.detailModal.viewFullSize')}
                              </a>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {img.prompt && <p className="text-[10px] text-white/80 truncate">{img.prompt}</p>}
                            </div>
                          </>
                        ) : img.status === 'failed' ? (
                          <div className="w-full h-36 flex flex-col items-center justify-center gap-1.5 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">
                              Failed
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-36 flex flex-col items-center justify-center gap-1.5 text-muted">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">
                              {img.status}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border bg-main/30 rounded-b-xl">
          <div className="flex gap-2">
            {/* Edit button */}
            {currentArticle.content && (
              <DashboardButton
                variant="ghost"
                onClick={() => {
                  if (isEditing && hasUnsavedChanges(currentArticle.content || '', editedContent)) {
                    if (confirm(t('articles.detailModal.unsavedChangesWarning'))) {
                      setIsEditing(false);
                      setEditedContent(currentArticle.content || '');
                    }
                  } else {
                    setIsEditing(!isEditing);
                  }
                }}
                disabled={isSaving || isDeleting || isRegenerating || isApproving || isRejecting}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? t('articles.detailModal.cancelEdit') : t('articles.detailModal.edit')}
              </DashboardButton>
            )}

            {/* Approve/Reject buttons - show for reviewable articles */}
            {!isEditing &&
              (currentArticle.status === 'draft' ||
                currentArticle.status === 'qa_passed' ||
                currentArticle.status === 'reviewed') && (
                <>
                  <DashboardButton
                    data-testid="approve-button"
                    variant="outline"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isApproving
                      ? t('articles.detailModal.approving')
                      : t('articles.detailModal.approve')}
                  </DashboardButton>
                  <DashboardButton
                    data-testid="reject-button"
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isApproving || isRejecting}
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('articles.detailModal.reject')}
                  </DashboardButton>
                </>
              )}

            {/* Generate Now button (for planned articles) */}
            {!isEditing && currentArticle.status === 'planned' && (
              <DashboardButton
                data-testid="generate-now-button"
                variant="primary"
                onClick={handleGenerateNow}
                disabled={isGeneratingNow}
              >
                {isGeneratingNow ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('articles.detailModal.generatingNow')}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {t('articles.detailModal.generateNow')}
                  </>
                )}
              </DashboardButton>
            )}

            {/* Regenerate button (for retryable failure states) */}
            {!isEditing &&
              (currentArticle.status === 'failed' ||
                currentArticle.status === 'failed_quality') && (
              <DashboardButton
                data-testid="regenerate-button"
                variant="outline"
                onClick={handleRegenerate}
                disabled={isSaving || isDeleting || isRegenerating}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isRegenerating
                  ? t('articles.detailModal.regenerating')
                  : t('articles.detailModal.regenerate')}
              </DashboardButton>
            )}

            {/* Delete button */}
            <DashboardButton
              variant="ghost"
              onClick={() => {
                if (confirm(t('articles.detailModal.deleteConfirm'))) {
                  handleDelete();
                }
              }}
              disabled={isSaving || isDeleting || isRegenerating || isApproving || isRejecting || isGeneratingNow}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? t('articles.detailModal.deleting') : t('articles.detailModal.delete')}
            </DashboardButton>
          </div>

          {/* Save button (when editing) */}
          {isEditing && (
            <DashboardButton
              variant="primary"
              onClick={handleSave}
              disabled={
                isSaving ||
                isDeleting ||
                isRegenerating ||
                !hasUnsavedChanges(currentArticle.content || '', editedContent)
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('articles.detailModal.saving')}
                </>
              ) : (
                t('articles.detailModal.saveChanges')
              )}
            </DashboardButton>
          )}

          {/* Published link (when published) */}
          {!isEditing && currentArticle.published_url && (
            <a
              href={currentArticle.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('articles.detailModal.viewLive')}
            </a>
          )}
        </div>
      </div>

      {/* Rejection Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('articles.detailModal.rejectArticle')}
            </h3>
            <p className="text-sm text-muted mb-4">{t('articles.detailModal.rejectReason')}</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder={t('articles.detailModal.rejectReasonPlaceholder')}
              className="w-full h-24 px-3 py-2 bg-surface-light border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <DashboardButton
                variant="ghost"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={isRejecting}
              >
                {t('articles.detailModal.cancel')}
              </DashboardButton>
              <DashboardButton
                variant="primary"
                onClick={() => handleReject(rejectionReason)}
                disabled={isRejecting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isRejecting
                  ? t('articles.detailModal.rejecting')
                  : t('articles.detailModal.confirmReject')}
              </DashboardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// StatusBadge
// =============================================================================

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  qa_passed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  qa_failed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  generating: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  queued: 'bg-surface-light text-muted border-border',
  reviewed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  published: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  failed_quality: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  failed_timeout: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${style}`}
    >
      {status}
    </span>
  );
}
