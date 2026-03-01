'use client';

import { useCallback } from 'react';
import { useApiRequest } from '@client/hooks/useApiRequest';
import { useAsyncAction } from '@client/hooks/useAsyncAction';

interface IArticleActionsOptions {
  onSuccess?: () => void; // call to refetch calendar data
}

interface IPublishNowResult {
  published_at: string;
  successful: number;
}

interface ISyncToBlogResult {
  slug: string;
  isNew: boolean;
}

interface IUseArticleActionsResult {
  reschedule: (articleId: string, newDate: string) => Promise<void>;
  publishNow: (articleId: string) => Promise<IPublishNowResult | null>;
  fixQAIssues: (articleId: string) => Promise<void>;
  syncToBlog: (articleId: string) => Promise<ISyncToBlogResult | null>;
  isRescheduling: boolean;
  isPublishing: boolean;
  isFixingQA: boolean;
  isSyncingToBlog: boolean;
  error: string | null;
}

export function useArticleActions({
  onSuccess,
}: IArticleActionsOptions = {}): IUseArticleActionsResult {
  const { request } = useApiRequest();

  // Define async functions for each action
  const rescheduleFn = useCallback(
    async (articleId: string, newDate: string): Promise<void> => {
      await request(`/api/articles/${articleId}/schedule`, {
        method: 'PATCH',
        body: { scheduled_publish_at: newDate },
      });
    },
    [request]
  );

  const publishNowFn = useCallback(
    async (articleId: string): Promise<IPublishNowResult | null> => {
      return request<IPublishNowResult>(`/api/articles/${articleId}/publish-now`, {
        method: 'POST',
      });
    },
    [request]
  );

  const fixQAIssuesFn = useCallback(
    async (articleId: string): Promise<void> => {
      await request(`/api/articles/${articleId}/fix-qa`, { method: 'POST' });
    },
    [request]
  );

  const syncToBlogFn = useCallback(
    async (articleId: string): Promise<ISyncToBlogResult | null> => {
      return request<ISyncToBlogResult>(`/api/articles/${articleId}/sync-to-blog`, {
        method: 'POST',
      });
    },
    [request]
  );

  // Create async action hooks for each action
  const rescheduleAction = useAsyncAction<[string, string], void>(rescheduleFn, {
    onSuccess: () => onSuccess?.(),
    errorMessage: 'Failed to reschedule',
  });

  const publishNowAction = useAsyncAction<[string], IPublishNowResult | null>(publishNowFn, {
    onSuccess: () => onSuccess?.(),
    errorMessage: 'Failed to publish',
  });

  const fixQAIssuesAction = useAsyncAction<[string], void>(fixQAIssuesFn, {
    onSuccess: () => onSuccess?.(),
    errorMessage: 'Failed to fix QA issues',
  });

  const syncToBlogAction = useAsyncAction<[string], ISyncToBlogResult | null>(syncToBlogFn, {
    onSuccess: () => onSuccess?.(),
    errorMessage: 'Failed to sync to blog',
  });

  return {
    reschedule: rescheduleAction.run,
    publishNow: publishNowAction.run,
    fixQAIssues: fixQAIssuesAction.run,
    syncToBlog: syncToBlogAction.run,
    isRescheduling: rescheduleAction.isLoading,
    isPublishing: publishNowAction.isLoading,
    isFixingQA: fixQAIssuesAction.isLoading,
    isSyncingToBlog: syncToBlogAction.isLoading,
    // Use the first action's error (they all share the same error pattern)
    error:
      rescheduleAction.error ||
      publishNowAction.error ||
      fixQAIssuesAction.error ||
      syncToBlogAction.error,
  };
}
