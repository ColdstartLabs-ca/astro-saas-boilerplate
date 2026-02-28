'use client';

import React from 'react';
import type { ICalendarArticle } from '@shared/types/calendar.types';
import type { ArticleStatus } from '@shared/types/article.types';

export type CalendarStatusFilter = 'all' | 'scheduled' | 'ready' | 'published' | 'failed';

interface ICalendarFiltersProps {
  activeStatusFilter: CalendarStatusFilter;
  onStatusFilterChange: (filter: CalendarStatusFilter) => void;
}

export function CalendarFilters({ activeStatusFilter, onStatusFilterChange }: ICalendarFiltersProps): JSX.Element {
  const filters: { key: CalendarStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'ready', label: 'Ready' },
    { key: 'published', label: 'Published' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted font-medium">Status:</span>
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onStatusFilterChange(f.key)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            activeStatusFilter === f.key
              ? 'bg-accent/20 border-accent text-accent'
              : 'border-border text-secondary hover:text-white hover:border-secondary'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_GROUPS: Record<CalendarStatusFilter, ArticleStatus[]> = {
  all: [],
  scheduled: ['queued', 'generating'],
  ready: ['draft', 'qa_passed', 'approved', 'reviewed', 'qa_checking'],
  published: ['published'],
  failed: ['failed', 'failed_quality', 'failed_timeout', 'qa_failed', 'rejected'],
};

/**
 * Map CalendarStatusFilter to the ArticleStatus values it covers.
 */
export function filterArticlesByStatus(
  articles: ICalendarArticle[],
  filter: CalendarStatusFilter
): ICalendarArticle[] {
  if (filter === 'all') return articles;

  const allowedStatuses = STATUS_GROUPS[filter];
  return articles.filter(a => allowedStatuses.includes(a.status));
}
