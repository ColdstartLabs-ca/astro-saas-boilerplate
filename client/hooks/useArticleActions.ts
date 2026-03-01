'use client';

import { useCallback, useState } from 'react';
import { useApiRequest } from '@client/hooks/useApiRequest';

interface IArticleActionsOptions {
  onSuccess?: () => void; // call to refetch calendar data
}

interface IPublishNowResult {
  published_at: string;
  successful: number;
}

interface IUseArticleActionsResult {
  reschedule: (articleId: string, newDate: string) => Promise<void>;
  publishNow: (articleId: string) => Promise<IPublishNowResult | null>;
  isRescheduling: boolean;
  isPublishing: boolean;
  error: string | null;
}

export function useArticleActions({ onSuccess }: IArticleActionsOptions = {}): IUseArticleActionsResult {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { request } = useApiRequest();

  const reschedule = useCallback(async (articleId: string, newDate: string) => {
    setIsRescheduling(true);
    setError(null);
    try {
      await request(`/api/articles/${articleId}/schedule`, {
        method: 'PATCH',
        body: { scheduled_publish_at: newDate },
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
      throw err; // re-throw so caller can revert optimistic update
    } finally {
      setIsRescheduling(false);
    }
  }, [onSuccess, request]);

  const publishNow = useCallback(async (articleId: string): Promise<IPublishNowResult | null> => {
    setIsPublishing(true);
    setError(null);
    try {
      const data = await request<IPublishNowResult>(`/api/articles/${articleId}/publish-now`, {
        method: 'POST',
      });
      onSuccess?.();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, [onSuccess, request]);

  return { reschedule, publishNow, isRescheduling, isPublishing, error };
}
