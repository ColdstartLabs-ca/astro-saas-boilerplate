/**
 * Constants and utilities for ArticleList
 */
import type { ArticleStatus } from '@shared/types/article.types';

export const ARTICLE_STATUSES: readonly (ArticleStatus | 'approved' | 'rejected' | 'all')[] = [
  'all',
  'planned',
  'queued',
  'generating',
  'draft',
  'approved',
  'rejected',
  'reviewed',
  'published',
  'failed',
] as const;

export const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  planned: { bg: 'bg-amber-500/8', text: 'text-amber-400', dot: 'bg-amber-400' },
  draft: { bg: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400' },
  generating: { bg: 'bg-sky-500/8', text: 'text-sky-400', dot: 'bg-sky-400' },
  queued: { bg: 'bg-surface-light', text: 'text-muted', dot: 'bg-muted' },
  reviewed: { bg: 'bg-purple-500/8', text: 'text-purple-400', dot: 'bg-purple-400' },
  approved: { bg: 'bg-green-500/8', text: 'text-green-400', dot: 'bg-green-400' },
  rejected: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
  published: { bg: 'bg-brand-500/8', text: 'text-brand-400', dot: 'bg-brand-400' },
  failed: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
};

/**
 * Parse date from HTML date input to ISO string
 */
export function parseDateFromInput(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toISOString();
}

/**
 * Get status badge element
 */
export function getStatusBadge(status: string): JSX.Element {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'generating' ? 'animate-pulse' : ''}`}
      />
      {status}
    </span>
  );
}
