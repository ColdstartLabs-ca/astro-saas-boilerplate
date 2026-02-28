'use client';

import { useCallback, useState } from 'react';

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

  const reschedule = useCallback(async (articleId: string, newDate: string) => {
    setIsRescheduling(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scheduled_publish_at: newDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
      throw err; // re-throw so caller can revert optimistic update
    } finally {
      setIsRescheduling(false);
    }
  }, [onSuccess]);

  const publishNow = useCallback(async (articleId: string): Promise<IPublishNowResult | null> => {
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/publish-now`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
      }
      const body = await res.json();
      const data = (body as { data?: IPublishNowResult }).data ?? (body as IPublishNowResult);
      onSuccess?.();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
      throw err;
    } finally {
      setIsPublishing(false);
    }
  }, [onSuccess]);

  return { reschedule, publishNow, isRescheduling, isPublishing, error };
}
