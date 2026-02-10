/**
 * useMutationWithToast Hook
 * React hook wrapper that adds automatic toast notifications and error logging
 * to TanStack Query mutations.
 *
 * This eliminates the repetitive pattern of:
 * - try/catch around mutateAsync
 * - Success toast on success
 * - Error toast + logger.error on failure
 * - Re-throwing errors
 *
 * Usage:
 * ```tsx
 * const createMutation = useMutation({
 *   mutationFn: createProject,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['projects'] });
 *   },
 * });
 *
 * const createProject = useMutationWithToast(createMutation, {
 *   successMessage: t('projects.success.created'),
 *   errorMessage: t('projects.errors.createFailed'),
 *   loggerContext: 'Failed to create project',
 * });
 * ```
 */

'use client';

import { useCallback } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useLogger } from '@client/utils/logger';
import { useToastStore } from '@client/store/toastStore';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for toast messages in useMutationWithToast
 */
export interface IMutationToastConfig<TData, TError, TVariables> {
  /**
   * Success message to show when mutation succeeds.
   * Can be a string or a function that receives the mutation data.
   */
  successMessage: string | ((data: TData, variables: TVariables) => string);

  /**
   * Error message to show when mutation fails.
   * Can be a string or a function that receives the error.
   */
  errorMessage: string | ((error: TError, variables: TVariables) => string);

  /**
   * Context to use for logging errors.
   * Can be a string (for simple cases) or a function that receives variables and returns { message, context }.
   */
  loggerContext:
    | string
    | ((variables: TVariables) => { message: string; context: Record<string, unknown> });
}

/**
 * Return type for the mutation wrapper function
 */
export type IMutationWithToastFn<TVariables, TData> = (
  variables: TVariables
) => Promise<TData>;

// =============================================================================
// Hook
// =============================================================================

/**
 * Wraps a TanStack Query mutation with automatic toast notifications and error logging.
 *
 * @param mutation - The useMutation result from TanStack Query
 * @param config - Toast and logging configuration
 * @returns A mutation function that handles success/error toasts automatically
 *
 * @example
 * ```tsx
 * const deleteMutation = useMutation({
 *   mutationFn: deleteProject,
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
 * });
 *
 * const deleteProject = useMutationWithToast(deleteMutation, {
 *   successMessage: t('projects.success.deleted'),
 *   errorMessage: t('projects.errors.deleteFailed'),
 *   loggerContext: (projectId) => ({
 *     message: 'Failed to delete project',
 *     context: { projectId },
 *   }),
 * });
 * ```
 */
export function useMutationWithToast<
  TData = unknown,
  TError = Error,
  TVariables = void,
>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  config: IMutationToastConfig<TData, TError, TVariables>
): IMutationWithToastFn<TVariables, TData> {
  const logger = useLogger('useMutationWithToast');
  const { showToast } = useToastStore();

  const mutateWithToast = useCallback(
    async (variables: TVariables): Promise<TData> => {
      try {
        const result = await mutation.mutateAsync(variables);

        // Show success toast
        const successMsg =
          typeof config.successMessage === 'function'
            ? config.successMessage(result, variables)
            : config.successMessage;

        showToast({
          message: successMsg,
          type: 'success',
        });

        return result;
      } catch (error) {
        // Log error with context
        const loggerInput = config.loggerContext;
        if (typeof loggerInput === 'function') {
          const logs = loggerInput(variables);
          logger.error(logs.message, logs.context);
        } else {
          logger.error(loggerInput, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Show error toast
        const errorMsg =
          typeof config.errorMessage === 'function'
            ? config.errorMessage(error as TError, variables)
            : config.errorMessage;

        showToast({
          message: errorMsg,
          type: 'error',
        });

        // Re-throw to allow caller to handle if needed
        throw error;
      }
    },
    [mutation, config, logger, showToast]
  );

  return mutateWithToast;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Simplified version that creates both the mutation and wrapper in one step.
 * Use this when you don't need custom onSuccess/onError callbacks.
 *
 * @param mutationFn - The async function to execute
 * @param config - Toast and logging configuration
 * @returns An object with the wrapped mutation function and the mutation state
 *
 * @example
 * ```tsx
 * const { mutateAsync: createProject, isLoading } = useSimpleMutation(
 *   createProject,
 *   {
 *     successMessage: t('projects.success.created'),
 *     errorMessage: t('projects.errors.createFailed'),
 *     loggerContext: 'Failed to create project',
 *   }
 * );
 * ```
 */
export function useSimpleMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config: IMutationToastConfig<TData, TError, TVariables>
): {
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: TError | null;
} {
  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn,
  });

  const mutateAsync = useMutationWithToast(mutation, config);

  return {
    mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
