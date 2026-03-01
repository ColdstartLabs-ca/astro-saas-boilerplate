/**
 * useCRUD Hook Factory
 * Generic CRUD hook factory that eliminates repetitive patterns across entity hooks.
 *
 * Features:
 * - TanStack Query setup with queryKey, staleTime, enabled
 * - useMutationWithToast wiring for create/update/delete mutations
 * - Automatic query invalidation on mutations
 * - Customizable toast messages
 *
 * Usage:
 * ```tsx
 * const useProjects = () => {
 *   const crud = useCRUD<IProject, ICreateProjectInput, { projectId: string; input: IUpdateProjectInput }>({
 *     queryKey: ['projects', userId],
 *     fetchFn: fetchProjects,
 *     createFn: createProjectApi,
 *     updateFn: ({ projectId, input }) => updateProjectApi(projectId, input),
 *     deleteFn: deleteProjectApi,
 *     enabled: !!userId,
 *     staleTime: 1000 * 60 * 5,
 *     toastMessages: {
 *       create: { success: t('projects.success.created'), error: t('projects.errors.createFailed') },
 *       update: { success: t('projects.success.updated'), error: t('projects.errors.updateFailed') },
 *       delete: { success: t('projects.success.deleted'), error: t('projects.errors.deleteFailed') },
 *     },
 *     loggerContexts: {
 *       create: 'Failed to create project',
 *       update: (vars) => ({ message: 'Failed to update project', context: { projectId: vars.projectId } }),
 *       delete: (id) => ({ message: 'Failed to delete project', context: { projectId: id } }),
 *     },
 *   });
 *   // Add domain-specific logic...
 *   return { ...crud, extraStuff };
 * };
 * ```
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useMutationWithToast, type IMutationToastConfig } from './useMutationWithToast';

// =============================================================================
// Types
// =============================================================================

/**
 * Toast message configuration for a single operation
 */
export interface IToastMessageConfig {
  success: string;
  error: string;
}

/**
 * Logger context configuration - can be a string or a function returning structured log data
 */
export type LoggerContextConfig<T> =
  | string
  | ((variables: T) => { message: string; context: Record<string, unknown> });

/**
 * Configuration for the useCRUD hook factory
 */
export interface ICRUDConfig<T, TCreate, TUpdate, TDeleteInput = string> {
  /** Query key for TanStack Query cache */
  queryKey: unknown[];

  /** Function to fetch the list of items */
  fetchFn: () => Promise<T[]>;

  /** Function to create a new item (optional) */
  createFn?: (data: TCreate) => Promise<T>;

  /**
   * Function to update an existing item (optional)
   * The input type TUpdate can be any shape the API expects
   */
  updateFn?: (params: TUpdate) => Promise<T>;

  /**
   * Function to delete an item (optional)
   * @param id - The identifier for the item to delete
   */
  deleteFn?: (id: TDeleteInput) => Promise<void | { success: boolean }>;

  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;

  /** Stale time for the query in milliseconds (default: 60000 = 1 minute) */
  staleTime?: number;

  /** Toast messages for each operation */
  toastMessages?: {
    create?: IToastMessageConfig;
    update?: IToastMessageConfig;
    delete?: IToastMessageConfig;
  };

  /** Logger contexts for each operation */
  loggerContexts?: {
    create?: LoggerContextConfig<TCreate>;
    update?: LoggerContextConfig<TUpdate>;
    delete?: LoggerContextConfig<TDeleteInput>;
  };

  /**
   * Called after successful deletion with the deleted item's ID.
   * Use for side effects like clearing active project.
   */
  onDeleteSuccess?: (id: TDeleteInput) => void;

  /**
   * Called before query invalidation on delete success.
   * Receives the queryClient and deleted ID for custom cleanup like removeQueries.
   * Use for cleaning up related cached data before refresh.
   */
  onBeforeDeleteInvalidate?: (
    queryClient: ReturnType<typeof useQueryClient>,
    id: TDeleteInput
  ) => void;

  /**
   * Additional query keys to invalidate on mutation success.
   * Use for related data that should be refreshed.
   */
  additionalInvalidateKeys?: unknown[][];
}

/**
 * Return type for the useCRUD hook
 */
export interface ICRUDReturn<T, TCreate, TUpdate, TDeleteInput = string> {
  /** The list of items from the query */
  items: T[];

  /** Whether the query is currently loading */
  isLoading: boolean;

  /** Any error from the query */
  error: Error | null;

  /** Create a new item (only if createFn was provided) */
  create: (data: TCreate) => Promise<T>;

  /** Update an existing item (only if updateFn was provided) */
  update: (params: TUpdate) => Promise<T>;

  /** Delete an item (only if deleteFn was provided) */
  remove: (id: TDeleteInput) => Promise<void>;

  /** Refetch the data */
  refetch: () => void;

  /** The underlying query result for advanced use cases */
  queryResult: {
    data: T[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
}

// =============================================================================
// Hook Factory
// =============================================================================

/**
 * Creates a CRUD hook with standardized patterns for fetching and mutating data.
 *
 * @typeParam T - The entity type (e.g., IProject, IIntegration)
 * @typeParam TCreate - The input type for creating an entity
 * @typeParam TUpdate - The input type for updating an entity (any shape)
 * @typeParam TDeleteInput - The input type for identifying what to delete (default: string)
 */
export function useCRUD<T, TCreate, TUpdate, TDeleteInput = string>(
  config: ICRUDConfig<T, TCreate, TUpdate, TDeleteInput>
): ICRUDReturn<T, TCreate, TUpdate, TDeleteInput> {
  const {
    queryKey,
    fetchFn,
    createFn,
    updateFn,
    deleteFn,
    enabled = true,
    staleTime = 60000,
    toastMessages = {},
    loggerContexts = {},
    onDeleteSuccess,
    onBeforeDeleteInvalidate,
    additionalInvalidateKeys = [],
  } = config;

  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  const queryResult = useQuery<T[], Error>({
    queryKey,
    queryFn: fetchFn,
    enabled,
    staleTime,
  });

  const items = queryResult.data ?? [];
  const isLoading = queryResult.isLoading;
  const error = queryResult.error;

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  // Helper to invalidate all relevant query keys
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    for (const additionalKey of additionalInvalidateKeys) {
      queryClient.invalidateQueries({ queryKey: additionalKey });
    }
  }, [queryClient, queryKey, additionalInvalidateKeys]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createFn ?? (() => Promise.reject(new Error('createFn not provided'))),
    onSuccess: () => {
      invalidateQueries();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateFn ?? (() => Promise.reject(new Error('updateFn not provided'))),
    onSuccess: () => {
      invalidateQueries();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFn ?? (() => Promise.reject(new Error('deleteFn not provided'))),
    onSuccess: (_, deletedId) => {
      // Call custom cleanup before invalidation (e.g., removeQueries)
      onBeforeDeleteInvalidate?.(queryClient, deletedId);
      invalidateQueries();
      onDeleteSuccess?.(deletedId);
    },
  });

  // ---------------------------------------------------------------------------
  // Toast-wrapped mutation handlers
  // Note: Hooks must be called unconditionally, so we create stub configs when not provided
  // ---------------------------------------------------------------------------

  // Create with toast - always call the hook, use stub config if not configured
  const effectiveCreateConfig: IMutationToastConfig<T, Error, TCreate> = {
    successMessage: toastMessages.create?.success ?? '',
    errorMessage: toastMessages.create?.error ?? '',
    loggerContext: loggerContexts.create ?? 'Operation failed',
  };
  const createWithToast = useMutationWithToast(createMutation, effectiveCreateConfig);
  const isCreateConfigured = !!(createFn && toastMessages.create && loggerContexts.create);

  // Update with toast - always call the hook, use stub config if not configured
  const effectiveUpdateConfig: IMutationToastConfig<T, Error, TUpdate> = {
    successMessage: toastMessages.update?.success ?? '',
    errorMessage: toastMessages.update?.error ?? '',
    loggerContext: loggerContexts.update ?? 'Operation failed',
  };
  const updateWithToast = useMutationWithToast(updateMutation, effectiveUpdateConfig);
  const isUpdateConfigured = !!(updateFn && toastMessages.update && loggerContexts.update);

  // Delete with toast - always call the hook, use stub config if not configured
  const effectiveDeleteConfig: IMutationToastConfig<
    void | { success: boolean },
    Error,
    TDeleteInput
  > = {
    successMessage: toastMessages.delete?.success ?? '',
    errorMessage: toastMessages.delete?.error ?? '',
    loggerContext: loggerContexts.delete ?? 'Operation failed',
  };
  const deleteWithToast = useMutationWithToast(deleteMutation, effectiveDeleteConfig);
  const isDeleteConfigured = !!(deleteFn && toastMessages.delete && loggerContexts.delete);

  // ---------------------------------------------------------------------------
  // Wrapped action functions
  // ---------------------------------------------------------------------------

  const handleCreate = useCallback(
    async (data: TCreate): Promise<T> => {
      if (!isCreateConfigured) {
        throw new Error('createFn not configured');
      }
      return createWithToast(data);
    },
    [createWithToast, isCreateConfigured]
  );

  const handleUpdate = useCallback(
    async (params: TUpdate): Promise<T> => {
      if (!isUpdateConfigured) {
        throw new Error('updateFn not configured');
      }
      return updateWithToast(params);
    },
    [updateWithToast, isUpdateConfigured]
  );

  const handleDelete = useCallback(
    async (id: TDeleteInput): Promise<void> => {
      if (!isDeleteConfigured) {
        throw new Error('deleteFn not configured');
      }
      await deleteWithToast(id);
    },
    [deleteWithToast, isDeleteConfigured]
  );

  const refetch = useCallback(() => {
    invalidateQueries();
  }, [invalidateQueries]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    items,
    isLoading,
    error,
    create: handleCreate,
    update: handleUpdate,
    remove: handleDelete,
    refetch,
    queryResult: {
      data: queryResult.data,
      isLoading: queryResult.isLoading,
      error: queryResult.error,
    },
  };
}
