/**
 * ArticleTableRow Component
 *
 * Individual row in the article list table.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  FileText,
  ExternalLink,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ImageOff,
} from 'lucide-react';
import { getSEOScoreColor, getSEOScoreBorderColor } from '@shared/utils/seo';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import type { IArticleWithCampaign } from '@shared/types/article.types';

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
  // Extract first image from markdown content (if embedded)
  const thumbnailUrl = useMemo(() => {
    if (!article.content) return null;
    const imgMatch = article.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    return imgMatch ? imgMatch[1] : null;
  }, [article.content]);

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
      <div className="col-span-1 flex justify-end">
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
            title="View published article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
