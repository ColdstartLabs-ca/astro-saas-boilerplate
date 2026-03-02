/**
 * ArticleTableRow Component
 *
 * Individual row in the article list table.
 */
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  FileText,
  ExternalLink,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ImageOff,
  RefreshCw,
} from 'lucide-react';
import { getSEOScoreColor, getSEOScoreBorderColor } from '@shared/utils/seo';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import type { IArticleWithCampaign } from '@shared/types/article.types';
import {
  useArticleBlogStatus,
  useInvalidateArticleBlogStatus,
} from '@client/hooks/useArticleBlogStatus';
import { useArticleActions } from '@client/hooks/useArticleActions';
import { useToastStore } from '@client/store/toastStore';

interface IArticleTableRowProps {
  article: IArticleWithCampaign;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function ThumbnailImage({ src }: { src: string }): JSX.Element {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageOff className="w-4 h-4 text-muted/50" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

export function ArticleTableRow({
  article,
  isSelected,
  onToggleSelect,
  onOpenDetail,
  getStatusBadge,
}: IArticleTableRowProps): JSX.Element {
  const { showToast } = useToastStore();
  const invalidateBlogStatus = useInvalidateArticleBlogStatus();
  const isPublished = article.status === 'published';

  const { data: blogStatus, isLoading: isBlogStatusLoading } = useArticleBlogStatus(
    article.id,
    isPublished
  );

  const { syncToBlog, isSyncingToBlog } = useArticleActions({
    onSuccess: () => invalidateBlogStatus(article.id),
  });

  const handleSyncToBlog = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await syncToBlog(article.id);
        showToast({ type: 'success', message: 'Article synced to blog' });
      } catch {
        showToast({ type: 'error', message: 'Failed to sync article to blog' });
      }
    },
    [article.id, syncToBlog, showToast]
  );

  // Get featured image URL from article_images (position 1 = hero) or fallback to markdown
  const thumbnailUrl = useMemo(() => {
    const featured = article.article_images
      ?.filter(img => img.status === 'completed' && img.image_url)
      .sort((a, b) => a.position - b.position)[0];
    if (featured?.image_url) return featured.image_url;
    // Fallback: extract first image from markdown content
    if (!article.content) return null;
    const imgMatch = article.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    return imgMatch ? imgMatch[1] : null;
  }, [article.article_images, article.content]);

  return (
    <div
      data-testid="article-card"
      className="group px-3 py-3 hover:bg-surface-light/30 transition-colors grid grid-cols-12 gap-3 items-center"
    >
      {/* Checkbox + Title Column */}
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        {/* Checkbox */}
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="text-muted hover:text-white transition-colors flex-shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-accent" />
          ) : (
            <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Thumbnail */}
        <button
          type="button"
          className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-border bg-surface-light cursor-pointer p-0"
          onClick={onOpenDetail}
          aria-label={`View article: ${article.title || article.primary_keyword}`}
        >
          {thumbnailUrl ? (
            <ThumbnailImage src={thumbnailUrl} />
          ) : article.image_count && article.image_count > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted/50" />
            </div>
          )}
        </button>

        {/* Title */}
        <button
          type="button"
          className="flex-1 min-w-0 cursor-pointer text-left"
          onClick={onOpenDetail}
          aria-label={`View article: ${article.title || article.primary_keyword}`}
        >
          <h3
            data-testid="article-title"
            className="text-sm font-medium text-text-primary truncate"
            title={article.title || article.primary_keyword}
          >
            {article.title || article.primary_keyword}
          </h3>
          {article.title && article.title !== article.primary_keyword && (
            <p className="text-[11px] text-muted truncate" title={article.primary_keyword}>
              {article.primary_keyword}
            </p>
          )}
        </button>
      </div>

      {/* Status Column */}
      <div className="col-span-1" data-testid="article-status-badge">
        {getStatusBadge(article.status)}
      </div>

      {/* SEO Score Column */}
      <div className="col-span-1">
        {article.seo_score != null ? (
          <span
            data-testid="article-seo-score"
            className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${getSEOScoreBorderColor(article.seo_score)} ${getSEOScoreColor(article.seo_score)}`}
          >
            {article.seo_score}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Campaign Column */}
      <div className="col-span-2 min-w-0">
        {article.campaigns && article.campaigns.name !== 'Quick Generate' ? (
          <button
            data-testid="article-campaign"
            type="button"
            onClick={e => {
              e.stopPropagation();
              dashboardNavigate(`/dashboard/campaigns/${article.campaigns!.id}`);
            }}
            className="text-xs text-muted hover:text-accent transition-colors truncate block"
            title={article.campaigns.name}
          >
            {article.campaigns.name}
          </button>
        ) : (
          <span className="text-xs text-muted italic">Uncategorized</span>
        )}
      </div>

      {/* Word Count Column */}
      <div className="col-span-1 text-right">
        {article.word_count ? (
          <span data-testid="article-word-count" className="text-xs text-muted font-mono">
            {article.word_count.toLocaleString()}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Images Column */}
      <div className="col-span-1 text-center">
        {article.image_count != null && article.image_count > 0 ? (
          <span className="text-xs text-muted flex items-center justify-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {article.image_count}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Date Column */}
      <div className="col-span-1 text-right">
        <span data-testid="article-date" className="text-xs text-muted">
          {new Date(article.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Actions Column */}
      <div className="col-span-1 flex justify-end gap-1">
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            onClick={e => e.stopPropagation()}
            title={`Visit published article: ${article.published_url}`}
          >
            <ExternalLink className="w-3 h-3" />
            Visit
          </a>
        )}
        {isPublished &&
          !isBlogStatusLoading &&
          (blogStatus?.synced ? (
            <a
              href={`/blog/${blogStatus.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors flex-shrink-0"
              onClick={e => e.stopPropagation()}
              title="View on blog"
            >
              <FileText className="w-3 h-3" />
              Blog
            </a>
          ) : (
            <button
              type="button"
              disabled={isSyncingToBlog}
              onClick={handleSyncToBlog}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted/10 text-muted hover:bg-muted/20 hover:text-text-primary transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync article to blog"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingToBlog ? 'animate-spin' : ''}`} />
              {isSyncingToBlog ? '...' : 'Sync'}
            </button>
          ))}
      </div>
    </div>
  );
}
