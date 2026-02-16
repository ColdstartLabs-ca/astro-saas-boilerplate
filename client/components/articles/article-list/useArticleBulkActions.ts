/**
 * useArticleBulkActions Hook
 *
 * Provides bulk action functions (approve, reject) for articles.
 * Selection state is managed externally and passed as parameter.
 */
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@shared/utils/supabase/client';

export interface IUseArticleBulkActionsOptions {
  onRefetch: () => void;
  onClearSelection: () => void;
  translations: {
    bulkApprovePartial: string;
    bulkApproveFailed: string;
    bulkRejectPartial: string;
    bulkRejectFailed: string;
  };
}

export interface IUseArticleBulkActionsReturn {
  isBulkApproving: boolean;
  isBulkRejecting: boolean;
  handleBulkApprove: (selectedArticleIds: Set<string>) => Promise<void>;
  handleBulkReject: (selectedArticleIds: Set<string>, reason: string) => Promise<void>;
  showBulkRejectDialog: boolean;
  openBulkRejectDialog: () => void;
  closeBulkRejectDialog: () => void;
  bulkError: string | null;
  bulkSuccessCount: number | null;
  bulkFailureCount: number | null;
  clearBulkResult: () => void;
}

/**
 * Helper to get access token
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function useArticleBulkActions(
  options: IUseArticleBulkActionsOptions
): IUseArticleBulkActionsReturn {
  const { onRefetch, onClearSelection, translations } = options;

  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number | null>(null);
  const [bulkFailureCount, setBulkFailureCount] = useState<number | null>(null);

  const handleBulkApprove = useCallback(
    async (selectedArticleIds: Set<string>) => {
      if (selectedArticleIds.size === 0) return;
      setIsBulkApproving(true);
      setBulkError(null);
      setBulkSuccessCount(null);
      setBulkFailureCount(null);

      try {
        const accessToken = await getAccessToken();
        const promises = Array.from(selectedArticleIds).map(articleId =>
          fetch(`/api/articles/${articleId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status: 'approved' }),
          })
        );

        const results = await Promise.allSettled(promises);

        // Count successes and failures based on response.ok
        let successCount = 0;
        let failureCount = 0;

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const response = result.value;
            if (response.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          } else {
            // Promise was rejected (network error, etc.)
            failureCount++;
          }
        }

        setBulkSuccessCount(successCount);
        setBulkFailureCount(failureCount);

        if (failureCount > 0) {
          setBulkError(
            translations.bulkApprovePartial
              .replace('{success}', String(successCount))
              .replace('{failed}', String(failureCount))
          );
        }

        onClearSelection();
        onRefetch();
      } catch {
        setBulkError(translations.bulkApproveFailed);
        setBulkSuccessCount(null);
        setBulkFailureCount(null);
      } finally {
        setIsBulkApproving(false);
      }
    },
    [onRefetch, onClearSelection, translations]
  );

  const handleBulkReject = useCallback(
    async (selectedArticleIds: Set<string>, reason: string) => {
      if (selectedArticleIds.size === 0) return;
      setIsBulkRejecting(true);
      setBulkError(null);
      setBulkSuccessCount(null);
      setBulkFailureCount(null);

      try {
        const accessToken = await getAccessToken();
        const promises = Array.from(selectedArticleIds).map(articleId =>
          fetch(`/api/articles/${articleId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              status: 'rejected',
              rejection_reason: reason || null,
            }),
          })
        );

        const results = await Promise.allSettled(promises);

        // Count successes and failures based on response.ok
        let successCount = 0;
        let failureCount = 0;

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const response = result.value;
            if (response.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          } else {
            // Promise was rejected (network error, etc.)
            failureCount++;
          }
        }

        setBulkSuccessCount(successCount);
        setBulkFailureCount(failureCount);

        if (failureCount > 0) {
          setBulkError(
            translations.bulkRejectPartial
              .replace('{success}', String(successCount))
              .replace('{failed}', String(failureCount))
          );
        }

        setShowBulkRejectDialog(false);
        onClearSelection();
        onRefetch();
      } catch {
        setBulkError(translations.bulkRejectFailed);
        setBulkSuccessCount(null);
        setBulkFailureCount(null);
      } finally {
        setIsBulkRejecting(false);
      }
    },
    [onRefetch, onClearSelection, translations]
  );

  const openBulkRejectDialog = useCallback(() => {
    setShowBulkRejectDialog(true);
  }, []);

  const closeBulkRejectDialog = useCallback(() => {
    setShowBulkRejectDialog(false);
  }, []);

  const clearBulkResult = useCallback(() => {
    setBulkError(null);
    setBulkSuccessCount(null);
    setBulkFailureCount(null);
  }, []);

  return {
    isBulkApproving,
    isBulkRejecting,
    handleBulkApprove,
    handleBulkReject,
    showBulkRejectDialog,
    openBulkRejectDialog,
    closeBulkRejectDialog,
    bulkError,
    bulkSuccessCount,
    bulkFailureCount,
    clearBulkResult,
  };
}
