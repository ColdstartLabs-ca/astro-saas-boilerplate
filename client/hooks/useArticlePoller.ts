/**
 * useArticlePoller
 *
 * Centralized article generation status tracker.
 *
 * All consumers (campaign view, calendar modal, quick-generate modal) use the
 * same TanStack Query key ['article', id] so a status update from any one
 * view is immediately visible in every other view — no duplicate API calls.
 *
 * Usage:
 *   const { articles, hasInProgress } = useArticlePoller(inProgressIds, {
 *     invalidateOnComplete: [['campaign-articles', campaignId]],
 *   });
 */

'use client';

import { useQueries, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { ArticleStatus, IArticle } from '@shared/types/article.types';
import { apiFetch } from '@client/utils/api-client';

// =============================================================================
// Status constants — single source of truth for all consumers
// =============================================================================

export const ARTICLE_IN_PROGRESS_STATUSES = ['queued', 'generating'] as const satisfies readonly ArticleStatus[];

export const ARTICLE_SUCCESS_STATUSES = [
  'draft',
  'qa_passed',
  'approved',
  'reviewed',
  'published',
] as const satisfies readonly ArticleStatus[];

export function isArticleInProgress(status: ArticleStatus): boolean {
  return (ARTICLE_IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}

export function isArticleSuccess(status: ArticleStatus): boolean {
  return (ARTICLE_SUCCESS_STATUSES as readonly string[]).includes(status);
}

// =============================================================================
// Shared fetch — used by all polling consumers
// =============================================================================

export async function fetchArticleById(articleId: string): Promise<IArticle> {
  const data = await apiFetch<{ data: { article: IArticle } }>(
    `/api/articles/${articleId}`,
    { method: 'GET' }
  );
  return data.data.article;
}

// =============================================================================
// Hook
// =============================================================================

interface IUseArticlePollerOptions {
  /** How often to poll while in-progress. Default: 3000ms */
  pollInterval?: number;
  /** Called once when an individual article transitions out of in-progress. */
  onComplete?: (article: IArticle) => void;
  /** TanStack Query keys to invalidate whenever any article completes. */
  invalidateOnComplete?: QueryKey[];
}

interface IUseArticlePollerReturn {
  /** Polled articles (only those whose IDs were passed in). */
  articles: IArticle[];
  /** True while any passed-in article is still queued or generating. */
  hasInProgress: boolean;
}

/**
 * Polls the given article IDs using shared ['article', id] query keys.
 *
 * Because all callers share the same cache key, a status change detected by
 * one component (e.g. QuickGenerateModal) is immediately reflected in every
 * other component that references the same article (e.g. CampaignDetailView).
 */
export function useArticlePoller(
  articleIds: string[],
  options?: IUseArticlePollerOptions
): IUseArticlePollerReturn {
  const queryClient = useQueryClient();
  const { pollInterval = 3000, onComplete, invalidateOnComplete = [] } = options ?? {};

  // Track previous statuses to detect transitions without triggering extra renders
  const prevStatusesRef = useRef<Map<string, ArticleStatus>>(new Map());

  const results = useQueries({
    queries: articleIds.map(id => ({
      queryKey: ['article', id] as const,
      queryFn: () => fetchArticleById(id),
      enabled: !!id,
      refetchInterval: (query: { state: { data: IArticle | undefined } }): number | false => {
        const status = query.state.data?.status;
        if (!status) return pollInterval; // Keep polling until we have data
        return isArticleInProgress(status) ? pollInterval : false;
      },
      refetchIntervalInBackground: true,
      staleTime: 0,
    })),
  });

  // Fire callbacks on in-progress → terminal transitions
  useEffect(() => {
    results.forEach(result => {
      const article = result.data;
      if (!article) return;

      const prev = prevStatusesRef.current.get(article.id);
      const curr = article.status;

      if (prev !== curr) {
        prevStatusesRef.current.set(article.id, curr);

        // Only fire when transitioning FROM in-progress (not on first load)
        if (prev !== undefined && isArticleInProgress(prev) && !isArticleInProgress(curr)) {
          onComplete?.(article);
          invalidateOnComplete.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      }
    });
  });

  const articles = results.map(r => r.data).filter((a): a is IArticle => Boolean(a));
  const hasInProgress = articles.some(a => isArticleInProgress(a.status));

  return { articles, hasInProgress };
}
