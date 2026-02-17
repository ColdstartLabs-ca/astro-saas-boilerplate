/**
 * useMutationWithToast Hook Tests
 * Tests for the mutation wrapper hook that provides automatic toast notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMutationWithToast } from '../useMutationWithToast';
import { useToastStore } from '@client/store/toastStore';

// Mock the logger
vi.mock('@client/utils/logger', () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Create a wrapper with QueryClient for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMutationWithToast', () => {
  let showToastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on the showToast function from the store
    showToastSpy = vi.spyOn(useToastStore.getState(), 'showToast');
  });

  describe('success handling', () => {
    it('should show success toast on mutation success', async () => {
      const successMessage = 'Operation completed successfully';
      const mockData = { id: '123', name: 'Test' };

      const { result } = renderHook(
        () => {
          // Create a simple mutation inline
          const mutation = {
            mutateAsync: vi.fn().mockResolvedValue(mockData),
            isPending: false,
            isError: false,
            error: null,
          } as unknown as ReturnType<typeof vi.fn>;

          return useMutationWithToast(mutation, {
            successMessage,
            errorMessage: 'Error occurred',
            loggerContext: 'Test error',
          });
        },
        { wrapper: createWrapper() }
      );

      // The hook should return a function
      expect(result.current).toBeTypeOf('function');
    });

    it('should call successMessage function with data when mutation succeeds', async () => {
      const mockData = { id: '123', name: 'Test' };
      const successMessageFn = vi.fn().mockReturnValue('Success with data');

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: successMessageFn,
              errorMessage: 'Error occurred',
              loggerContext: 'Test error',
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation
      await result.current({ test: 'input' });

      // Verify successMessage function was called with the data
      expect(successMessageFn).toHaveBeenCalledWith(mockData, { test: 'input' });
      // Verify toast was shown
      expect(showToastSpy).toHaveBeenCalledWith({
        message: 'Success with data',
        type: 'success',
      });
    });
  });

  describe('error handling', () => {
    it('should show error toast and log on failure', async () => {
      const errorMessage = 'Operation failed';
      const testError = new Error('Test error message');
      const loggerContext = 'Failed to perform operation';

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: true,
              error: testError,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage,
              loggerContext,
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation and catch the error
      await expect(result.current({ test: 'input' })).rejects.toThrow('Test error message');

      // Verify error toast was shown
      expect(showToastSpy).toHaveBeenCalledWith({
        message: errorMessage,
        type: 'error',
      });
    });

    it('should call errorMessage function with error when mutation fails', async () => {
      const testError = new Error('Test error message');
      const errorMessageFn = vi.fn().mockReturnValue('Custom error message');

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: true,
              error: testError,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage: errorMessageFn,
              loggerContext: 'Test context',
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation and catch the error
      await expect(result.current({ test: 'input' })).rejects.toThrow();

      // Verify errorMessage function was called with the error
      expect(errorMessageFn).toHaveBeenCalledWith(testError, { test: 'input' });
      // Verify toast was shown with custom message
      expect(showToastSpy).toHaveBeenCalledWith({
        message: 'Custom error message',
        type: 'error',
      });
    });

    it('should use loggerContext function for logging with variables', async () => {
      const testError = new Error('Test error message');
      const loggerContextFn = vi.fn().mockReturnValue({
        message: 'Custom log message',
        context: { projectId: '123', action: 'delete' },
      });

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: true,
              error: testError,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage: 'Error',
              loggerContext: loggerContextFn,
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      const variables = { projectId: '123' };

      // Execute the mutation and catch the error
      await expect(result.current(variables)).rejects.toThrow();

      // Verify loggerContext function was called with the variables
      expect(loggerContextFn).toHaveBeenCalledWith(variables);
    });
  });

  describe('error propagation', () => {
    it('should rethrow error after handling', async () => {
      const testError = new Error('Original error message');

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: true,
              error: testError,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage: 'Error occurred',
              loggerContext: 'Test context',
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation - should throw the original error
      await expect(result.current({ test: 'input' })).rejects.toThrow('Original error message');
    });

    it('should rethrow non-Error errors', async () => {
      const stringError = 'String error message';

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockRejectedValue(stringError);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: true,
              error: stringError,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage: 'Error occurred',
              loggerContext: 'Test context',
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation - should throw the string error
      await expect(result.current({ test: 'input' })).rejects.toBe(stringError);
    });
  });

  describe('return value', () => {
    it('should return the mutation result on success', async () => {
      const mockData = { id: '123', name: 'Test' };

      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });

      const mockMutateAsync = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () =>
          useMutationWithToast(
            {
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null,
            } as unknown as ReturnType<typeof vi.fn>,
            {
              successMessage: 'Success',
              errorMessage: 'Error',
              loggerContext: 'Test context',
            }
          ),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Execute the mutation
      const returnedData = await result.current({ test: 'input' });

      // Verify the returned data is the mutation result
      expect(returnedData).toEqual(mockData);
    });
  });
});
