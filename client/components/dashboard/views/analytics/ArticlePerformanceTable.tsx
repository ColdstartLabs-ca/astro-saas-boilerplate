'use client';

import { useState, useMemo, useCallback, type KeyboardEvent } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from 'lucide-react';
import { useTranslations } from '@client/hooks/useTranslations';
import type { IArticlePerformanceRow, ITopQuery } from '@shared/types/article-performance.types';
import dayjs from 'dayjs';

// =============================================================================
// Formatting Helpers
// =============================================================================

const formatNumber = (n: number): string => n.toLocaleString();
const formatCtr = (ctr: number): string => `${(ctr * 100).toFixed(2)}%`;
const formatPosition = (pos: number): string => pos.toFixed(1);

// =============================================================================
// Types
// =============================================================================

type SortField = 'clicks' | 'impressions' | 'avg_position';
type SortDirection = 'asc' | 'desc';

interface ISortState {
  field: SortField;
  direction: SortDirection;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ISortIconProps {
  field: SortField;
  sortState: ISortState;
}

function SortIcon({ field, sortState }: ISortIconProps): JSX.Element {
  if (sortState.field !== field) {
    return <ChevronsUpDown className="w-3.5 h-3.5 text-muted" />;
  }
  if (sortState.direction === 'asc') {
    return <ChevronUp className="w-3.5 h-3.5 text-accent" />;
  }
  return <ChevronDown className="w-3.5 h-3.5 text-accent" />;
}

interface ITopQueriesExpandedProps {
  queries: ITopQuery[];
  t: (key: string) => string;
}

function TopQueriesExpanded({ queries, t }: ITopQueriesExpandedProps): JSX.Element {
  if (queries.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-muted text-center">
        {t('analytics.table.noQueries')}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-surface-light/30 border-t border-border">
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
        {t('analytics.table.topQueries')}
      </p>
      <div className="space-y-1.5">
        {queries.map((q, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_80px_80px_80px] gap-3 text-xs text-secondary"
          >
            <span className="truncate">{q.query}</span>
            <span className="text-right tabular-nums">{formatNumber(q.clicks)}</span>
            <span className="text-right tabular-nums">{formatNumber(q.impressions)}</span>
            <span className="text-right tabular-nums">{formatPosition(q.position)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IArticleRowProps {
  article: IArticlePerformanceRow;
  t: (key: string) => string;
}

function ArticleRow({ article, t }: IArticleRowProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div data-testid="article-row">
      <div
        className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_80px_100px_100px_36px] gap-2 md:gap-4 px-4 py-3 hover:bg-surface-light/40 cursor-pointer transition-colors group"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        {/* Article title + keyword */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">
            {article.title ?? t('analytics.table.untitled')}
          </span>
          <span className="text-xs text-muted truncate mt-0.5">{article.primary_keyword}</span>
        </div>

        {/* Clicks */}
        <div className="flex items-center md:justify-end">
          <span className="md:hidden text-xs text-muted mr-1.5">
            {t('analytics.table.clicks')}:
          </span>
          <span className="text-sm tabular-nums text-secondary">
            {formatNumber(article.clicks)}
          </span>
        </div>

        {/* Impressions */}
        <div className="flex items-center md:justify-end">
          <span className="md:hidden text-xs text-muted mr-1.5">
            {t('analytics.table.impressions')}:
          </span>
          <span className="text-sm tabular-nums text-secondary">
            {formatNumber(article.impressions)}
          </span>
        </div>

        {/* CTR */}
        <div className="flex items-center md:justify-end">
          <span className="md:hidden text-xs text-muted mr-1.5">{t('analytics.table.ctr')}:</span>
          <span className="text-sm tabular-nums text-secondary">{formatCtr(article.ctr)}</span>
        </div>

        {/* Avg Position */}
        <div className="flex items-center md:justify-end">
          <span className="md:hidden text-xs text-muted mr-1.5">
            {t('analytics.table.position')}:
          </span>
          <span className="text-sm tabular-nums text-secondary">
            {formatPosition(article.avg_position)}
          </span>
        </div>

        {/* Snapshot Date */}
        <div className="flex items-center md:justify-end">
          <span className="md:hidden text-xs text-muted mr-1.5">
            {t('analytics.table.snapshotDate')}:
          </span>
          <span className="text-xs text-muted">{dayjs(article.snapshot_date).format('MMM D')}</span>
        </div>

        {/* Expand icon */}
        <div className="hidden md:flex items-center justify-end">
          <ChevronRight
            className={`w-4 h-4 text-muted transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Top queries expansion */}
      {isExpanded && <TopQueriesExpanded queries={article.top_queries} t={t} />}
    </div>
  );
}

// =============================================================================
// Props
// =============================================================================

interface IArticlePerformanceTableProps {
  articles: IArticlePerformanceRow[];
}

// =============================================================================
// Main Component
// =============================================================================

export function ArticlePerformanceTable({ articles }: IArticlePerformanceTableProps): JSX.Element {
  const t = useTranslations('dashboard');
  const [sortState, setSortState] = useState<ISortState>({
    field: 'clicks',
    direction: 'desc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSortState(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { field, direction: 'desc' };
    });
  }, []);

  const sortedArticles = useMemo(() => {
    const sorted = [...articles];
    sorted.sort((a, b) => {
      const aVal = a[sortState.field];
      const bVal = b[sortState.field];
      const diff = aVal - bVal;
      return sortState.direction === 'desc' ? -diff : diff;
    });
    return sorted;
  }, [articles, sortState]);

  if (articles.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl px-4 py-12 text-center text-secondary text-sm">
        {t('analytics.table.empty')}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Table header — desktop only */}
      <div className="hidden md:grid grid-cols-[1fr_100px_120px_80px_100px_100px_36px] gap-4 px-4 py-3 border-b border-border text-xs font-medium text-muted uppercase tracking-wider">
        <span>{t('analytics.table.article')}</span>
        <button
          type="button"
          className="flex items-center justify-end gap-1 hover:text-secondary transition-colors"
          onClick={() => handleSort('clicks')}
        >
          {t('analytics.table.clicks')}
          <SortIcon field="clicks" sortState={sortState} />
        </button>
        <button
          type="button"
          className="flex items-center justify-end gap-1 hover:text-secondary transition-colors"
          onClick={() => handleSort('impressions')}
        >
          {t('analytics.table.impressions')}
          <SortIcon field="impressions" sortState={sortState} />
        </button>
        <span className="text-right">{t('analytics.table.ctr')}</span>
        <button
          type="button"
          className="flex items-center justify-end gap-1 hover:text-secondary transition-colors"
          onClick={() => handleSort('avg_position')}
        >
          {t('analytics.table.position')}
          <SortIcon field="avg_position" sortState={sortState} />
        </button>
        <span className="text-right">{t('analytics.table.snapshotDate')}</span>
        <span />
      </div>

      {/* Table body */}
      <div className="divide-y divide-border">
        {sortedArticles.map(article => (
          <ArticleRow key={article.article_id} article={article} t={t} />
        ))}
      </div>
    </div>
  );
}
