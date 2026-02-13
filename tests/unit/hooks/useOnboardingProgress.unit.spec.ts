import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useOnboardingProgress } from '@client/hooks/useOnboardingProgress';
import type { IOnboardingStatus } from '@shared/types/onboarding.types';

// Helper to create a mock Response object with proper headers support
const createMockResponse = (init: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  headers?: Record<string, string>;
}) => {
  const headersGet = vi.fn((key: string) => {
    if (init.headers && key in init.headers) {
      return (init.headers as Record<string, string>)[key];
    }
    return null;
  });

  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: init.json ?? (() => Promise.resolve({})),
    headers: {
      get: headersGet,
      has: vi.fn(() => false),
      forEach: vi.fn(),
      entries: vi.fn(() => []),
      keys: vi.fn(() => []),
      values: vi.fn(() => []),
    } as unknown as Headers,
  };
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@client/utils/logger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock toast store
vi.mock('@client/store/toastStore', () => ({
  useToastStore: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock translations
vi.mock('@src/i18n/utils', () => ({
  getTranslations: () => (_key: string) => (key: string) => key,
}));

// Mock user store
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'user' as const,
  provider: 'email',
  profile: null,
  subscription: null,
};

vi.mock('@client/store/userStore', () => ({
  useUserStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock onboarding store
const mockInitializeFromServer = vi.fn();
const mockSetCurrentStep = vi.fn();
const mockMarkStepComplete = vi.fn();
let storeState = {
  currentStep: 1,
  completedSteps: new Set<number>(),
  skippedSteps: new Set<number>(),
};

vi.mock('@client/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      ...storeState,
      initializeFromServer: mockInitializeFromServer,
      setCurrentStep: mockSetCurrentStep,
      markStepComplete: mockMarkStepComplete,
    };
    return selector ? selector(state) : state;
  }),
}));

// Test data
const mockUpdatedStatus: IOnboardingStatus = {
  isComplete: false,
  currentStep: 2,
  completedSteps: [1],
  skippedSteps: [],
};

const mockCompletedStatus: IOnboardingStatus = {
  isComplete: true,
  currentStep: 5,
  completedSteps: [1, 2, 3, 4],
  skippedSteps: [],
};

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

describe('useOnboardingProgress Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    storeState = {
      currentStep: 1,
      completedSteps: new Set<number>(),
      skippedSteps: new Set<number>(),
    };
  });

  describe('updateProgress', () => {
    it('should update progress successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({
            onboarding: mockUpdatedStatus,
          }),
        })
      );

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      const status = await result.current.updateProgress({
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      expect(status).toEqual(mockUpdatedStatus);
      expect(mockInitializeFromServer).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.updateProgress({
          currentStep: 2,
          completedSteps: [1],
          skippedSteps: [],
        })
      ).rejects.toThrow('Network error');
    });

    it('should show isUpdating during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            pendingPromise.then(() => {
              resolve(
                createMockResponse({
                  ok: true,
                  json: async () => ({
                    onboarding: mockUpdatedStatus,
                  }),
                })
              );
            });
          })
      );

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUpdating).toBe(false);

      const updatePromise = result.current.updateProgress({
        currentStep: 2,
        completedSteps: [1],
        skippedSteps: [],
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(true));

      // Resolve the pending promise
      resolvePromise!(undefined);
      await updatePromise;

      await waitFor(() => expect(result.current.isUpdating).toBe(false));
    });
  });

  describe('markComplete', () => {
    it('should mark onboarding as complete', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({
            onboarding: mockCompletedStatus,
          }),
        })
      );

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      const status = await result.current.markComplete();

      expect(status).toEqual(mockCompletedStatus);
      expect(status.isComplete).toBe(true);
    });

    it('should handle completion errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to complete'));

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.markComplete()).rejects.toThrow('Failed to complete');
    });
  });

  describe('goToNextStep', () => {
    it('should move to next step and mark current as complete', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({
            onboarding: {
              ...mockUpdatedStatus,
              currentStep: 2,
              completedSteps: [1],
            },
          }),
        })
      );

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.goToNextStep();
      });

      expect(mockSetCurrentStep).toHaveBeenCalledWith(2);
      expect(mockMarkStepComplete).toHaveBeenCalledWith(1);
    });

    it('should not proceed past step 5', async () => {
      storeState.currentStep = 5;

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.goToNextStep();
      });

      // Should not call fetch since we're already at the final step
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('goToStep', () => {
    it('should navigate to a specific step', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          json: async () => ({
            onboarding: {
              ...mockUpdatedStatus,
              currentStep: 3,
            },
          }),
        })
      );

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.goToStep(3);
      });

      expect(mockSetCurrentStep).toHaveBeenCalledWith(3);
    });

    it('should reject invalid step numbers', async () => {
      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.goToStep(0);
      });

      expect(mockFetch).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.goToStep(6);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('should expose error from mutations', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useOnboardingProgress(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();

      await act(async () => {
        try {
          await result.current.updateProgress({
            currentStep: 2,
            completedSteps: [1],
            skippedSteps: [],
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    });
  });
});
