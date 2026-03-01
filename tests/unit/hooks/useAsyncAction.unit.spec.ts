import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsyncAction } from '@client/hooks/useAsyncAction';

describe('useAsyncAction', () => {
  let mockAsyncFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAsyncFn = vi.fn();
  });

  describe('loading state', () => {
    it('should set isLoading true while running', async () => {
      let resolvePromise: (value: string) => void;
      const pendingPromise = new Promise<string>(resolve => {
        resolvePromise = resolve;
      });
      mockAsyncFn.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      expect(result.current.isLoading).toBe(false);

      // Start the async action (don't await it yet)
      let actionPromise: Promise<string>;
      act(() => {
        actionPromise = result.current.run('test-arg');
      });

      // Check loading is true while action is pending
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!('result');
      await actionPromise!;

      // Loading should be false after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading false after error', async () => {
      mockAsyncFn.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toThrow('Test error');
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error on rejection', async () => {
      mockAsyncFn.mockRejectedValue(new Error('Test error message'));

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      expect(result.current.error).toBeNull();

      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toThrow('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
    });

    it('should use custom error message when provided', async () => {
      mockAsyncFn.mockRejectedValue(new Error('Original error'));

      const { result } = renderHook(() =>
        useAsyncAction<[string], string>(mockAsyncFn, {
          errorMessage: 'Custom error message',
        })
      );

      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toThrow('Original error');
      });

      expect(result.current.error).toBe('Original error');
    });

    it('should use fallback message for non-Error rejections', async () => {
      mockAsyncFn.mockRejectedValue('string error');

      const { result } = renderHook(() =>
        useAsyncAction<[string], string>(mockAsyncFn, {
          errorMessage: 'Fallback error message',
        })
      );

      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toBe('string error');
      });

      expect(result.current.error).toBe('Fallback error message');
    });

    it('should clear error on subsequent successful call', async () => {
      mockAsyncFn.mockRejectedValueOnce(new Error('First error'));
      mockAsyncFn.mockResolvedValue('success');

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      // First call fails
      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toThrow('First error');
      });

      expect(result.current.error).toBe('First error');

      // Second call succeeds
      await act(async () => {
        await result.current.run('test-arg');
      });

      expect(result.current.error).toBeNull();
    });

    it('should call onError callback on rejection', async () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      mockAsyncFn.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useAsyncAction<[string], string>(mockAsyncFn, { onError })
      );

      await act(async () => {
        await expect(result.current.run('test-arg')).rejects.toThrow('Test error');
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('success handling', () => {
    it('should call onSuccess callback on resolution', async () => {
      const onSuccess = vi.fn();
      mockAsyncFn.mockResolvedValue('test-result');

      const { result } = renderHook(() =>
        useAsyncAction<[string], string>(mockAsyncFn, { onSuccess })
      );

      await act(async () => {
        await result.current.run('test-arg');
      });

      expect(onSuccess).toHaveBeenCalledWith('test-result');
    });

    it('should return the result from run', async () => {
      mockAsyncFn.mockResolvedValue('test-result');

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      let returnValue: string;
      await act(async () => {
        returnValue = await result.current.run('test-arg');
      });

      expect(returnValue!).toBe('test-result');
    });

    it('should pass arguments to async function', async () => {
      mockAsyncFn.mockResolvedValue('result');

      const { result } = renderHook(() =>
        useAsyncAction<[string, number, boolean], string>(mockAsyncFn)
      );

      await act(async () => {
        await result.current.run('arg1', 42, true);
      });

      expect(mockAsyncFn).toHaveBeenCalledWith('arg1', 42, true);
    });

    it('should clear error before starting new action', async () => {
      mockAsyncFn.mockResolvedValue('success');

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      await act(async () => {
        await result.current.run('test');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('re-throwing errors', () => {
    it('should re-throw error so caller can handle it', async () => {
      const originalError = new Error('Original error');
      mockAsyncFn.mockRejectedValue(originalError);

      const { result } = renderHook(() => useAsyncAction<[string], string>(mockAsyncFn));

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.run('test');
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).toBe(originalError);
    });
  });
});
