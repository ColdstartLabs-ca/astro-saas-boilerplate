'use client';

import { useCallback, useState } from 'react';

interface IUseAsyncActionOptions<TResult> {
  onSuccess?: (result: TResult) => void;
  onError?: (error: Error) => void;
  errorMessage?: string;
}

interface IUseAsyncActionResult<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Generic hook for managing async action state (loading, error).
 * Encapsulates the common pattern of:
 * - Setting loading state before async operation
 * - Clearing error state
 * - Handling success with optional callback
 * - Capturing errors with optional callback
 * - Re-throwing errors for caller handling
 */
export function useAsyncAction<TArgs extends unknown[], TResult = void>(
  asyncFn: (...args: TArgs) => Promise<TResult>,
  options: IUseAsyncActionOptions<TResult> = {}
): IUseAsyncActionResult<TArgs, TResult> {
  const { onSuccess, onError, errorMessage } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : (errorMessage ?? 'An error occurred');
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, onSuccess, onError, errorMessage]
  );

  return { run, isLoading, error };
}
