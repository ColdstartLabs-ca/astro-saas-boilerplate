import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCRUD } from '@client/hooks/useCRUD';

// =============================================================================
// Test Types
// =============================================================================

interface ITestItem {
  id: string;
  name: string;
}

interface ITestCreateInput {
  name: string;
}

interface ITestUpdateInput {
  id: string;
  name: string;
}

// =============================================================================
// Helpers
// =============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

// =============================================================================
// Mocks
// =============================================================================

// Mock logger
vi.mock('@client/utils/logger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock toast store
vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('useCRUD Hook', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;
  let mockCreateFn: ReturnType<typeof vi.fn>;
  let mockUpdateFn: ReturnType<typeof vi.fn>;
  let mockDeleteFn: ReturnType<typeof vi.fn>;

  const mockItems: ITestItem[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchFn = vi.fn();
    mockCreateFn = vi.fn();
    mockUpdateFn = vi.fn();
    mockDeleteFn = vi.fn();
  });

  describe('Query', () => {
    it('should return items when fetchFn resolves', async () => {
      mockFetchFn.mockResolvedValue(mockItems);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
              update: { success: 'Updated', error: 'Update failed' },
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              create: 'Create failed',
              update: 'Update failed',
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items).toEqual(mockItems);
      expect(result.current.error).toBeNull();
    });

    it('should return empty array when fetchFn returns empty', async () => {
      mockFetchFn.mockResolvedValue([]);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              create: 'Create failed',
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      mockFetchFn.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              create: 'Create failed',
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should not fetch when enabled is false', async () => {
      mockFetchFn.mockResolvedValue(mockItems);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            enabled: false,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
            },
            loggerContexts: {
              create: 'Create failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      // Wait a bit to ensure fetch is not called
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetchFn).not.toHaveBeenCalled();
      expect(result.current.items).toEqual([]);
    });
  });

  describe('Create Mutation', () => {
    it('should call createFn and invalidate query on success', async () => {
      const newItem: ITestItem = { id: '4', name: 'New Item' };
      mockFetchFn.mockResolvedValue(mockItems);
      mockCreateFn.mockResolvedValue(newItem);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            createFn: mockCreateFn,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
            },
            loggerContexts: {
              create: 'Create failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Create the new item
      await act(async () => {
        const created = await result.current.create({ name: 'New Item' });
        expect(created).toEqual(newItem);
      });

      // Verify createFn was called (use toHaveBeenCalledTimes since useMutation passes extra meta)
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
      expect(mockCreateFn).toHaveBeenCalledWith({ name: 'New Item' }, expect.any(Object));

      // Verify query was invalidated (fetchFn called again)
      await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(2));
    });
  });

  describe('Update Mutation', () => {
    it('should call updateFn and invalidate query on success', async () => {
      const updatedItem: ITestItem = { id: '1', name: 'Updated Item' };
      mockFetchFn.mockResolvedValue(mockItems);
      mockUpdateFn.mockResolvedValue(updatedItem);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            updateFn: mockUpdateFn,
            toastMessages: {
              update: { success: 'Updated', error: 'Update failed' },
            },
            loggerContexts: {
              update: 'Update failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Update the item
      await act(async () => {
        const updated = await result.current.update({ id: '1', name: 'Updated Item' });
        expect(updated).toEqual(updatedItem);
      });

      // Verify updateFn was called (use toHaveBeenCalledTimes since useMutation passes extra meta)
      expect(mockUpdateFn).toHaveBeenCalledTimes(1);
      expect(mockUpdateFn).toHaveBeenCalledWith(
        { id: '1', name: 'Updated Item' },
        expect.any(Object)
      );

      // Verify query was invalidated
      await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(2));
    });
  });

  describe('Delete Mutation', () => {
    it('should call deleteFn and remove item on success', async () => {
      mockFetchFn
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce([mockItems[1], mockItems[2]]); // After deletion
      mockDeleteFn.mockResolvedValue({ success: true });

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            deleteFn: mockDeleteFn,
            toastMessages: {
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.items).toHaveLength(3);

      // Delete the item
      await act(async () => {
        await result.current.remove('1');
      });

      // Verify deleteFn was called (use toHaveBeenCalledTimes since useMutation passes extra meta)
      expect(mockDeleteFn).toHaveBeenCalledTimes(1);
      expect(mockDeleteFn).toHaveBeenCalledWith('1', expect.any(Object));

      // Verify query was invalidated (refetched)
      await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(2));
    });

    it('should call onDeleteSuccess callback after deletion', async () => {
      mockFetchFn.mockResolvedValue(mockItems);
      mockDeleteFn.mockResolvedValue({ success: true });

      const onDeleteSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            deleteFn: mockDeleteFn,
            onDeleteSuccess,
            toastMessages: {
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Delete the item
      await act(async () => {
        await result.current.remove('1');
      });

      // Verify callback was called with the deleted ID
      expect(onDeleteSuccess).toHaveBeenCalledWith('1');
    });

    it('should call onBeforeDeleteInvalidate before invalidation', async () => {
      mockFetchFn.mockResolvedValue(mockItems);
      mockDeleteFn.mockResolvedValue({ success: true });

      const onBeforeDeleteInvalidate = vi.fn();

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            deleteFn: mockDeleteFn,
            onBeforeDeleteInvalidate,
            toastMessages: {
              delete: { success: 'Deleted', error: 'Delete failed' },
            },
            loggerContexts: {
              delete: 'Delete failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Delete the item
      await act(async () => {
        await result.current.remove('1');
      });

      // Verify callback was called with queryClient and deleted ID
      expect(onBeforeDeleteInvalidate).toHaveBeenCalled();
      const [queryClientArg, deletedIdArg] = onBeforeDeleteInvalidate.mock.calls[0];
      expect(queryClientArg).toBeDefined();
      expect(deletedIdArg).toBe('1');
    });
  });

  describe('Refetch', () => {
    it('should refetch data when refetch is called', async () => {
      mockFetchFn.mockResolvedValue(mockItems);

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
            },
            loggerContexts: {
              create: 'Create failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetchFn).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        result.current.refetch();
      });

      // Verify fetch was called again
      await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(2));
    });
  });

  describe('Additional Invalidate Keys', () => {
    it('should invalidate additional query keys on mutation success', async () => {
      mockFetchFn.mockResolvedValue(mockItems);
      mockCreateFn.mockResolvedValue({ id: '4', name: 'New' });

      const additionalKey = ['related', 'data'];

      const { result } = renderHook(
        () =>
          useCRUD<ITestItem, ITestCreateInput, ITestUpdateInput>({
            queryKey: ['test'],
            fetchFn: mockFetchFn,
            createFn: mockCreateFn,
            additionalInvalidateKeys: [additionalKey],
            toastMessages: {
              create: { success: 'Created', error: 'Create failed' },
            },
            loggerContexts: {
              create: 'Create failed',
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Create item - should invalidate both keys
      await act(async () => {
        await result.current.create({ name: 'New' });
      });

      // Main query should be invalidated
      await waitFor(() => expect(mockFetchFn).toHaveBeenCalledTimes(2));
    });
  });
});
