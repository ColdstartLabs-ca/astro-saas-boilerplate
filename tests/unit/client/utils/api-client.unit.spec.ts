/**
 * API Client Unit Tests
 *
 * Tests for client-side API utilities including:
 * - Authentication and header management
 * - API request handling (apiFetch)
 * - Image analysis functionality
 * - Image processing functionality
 * - File to base64 conversion
 * - Batch limit error handling
 * - Utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAccessToken,
  getAuthHeaders,
  apiFetch,
  analyzeImage,
  processImage,
  imageToBase64,
  formatBytes,
  BatchLimitError,
  type IAnalyzeImageResult,
  type IUpscaleConfig,
} from '@client/utils/api-client';
import { ProcessingStage } from '@shared/types/coreflow.types';

// Helper to create a mock Response object with proper headers support
const createMockResponse = (init: {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  headers?: Record<string, string>;
}) => {
  const headersGet = vi.fn((key: string) => {
    // Simulate Response.headers.get() behavior
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
  } as unknown as Response;
};

// Mock Supabase client
const mockGetSession = vi.fn();
vi.mock('@shared/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

// Mock FileReader globally
class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => unknown) | null = null;
  result: string | ArrayBuffer | null = null;
  readyState = 0;
  error: Error | null = null;

  readAsDataURL(file: Blob) {
    // Simulate async file reading
    Promise.resolve()
      .then(() => {
        this.result = `data:${file.type || 'image/jpeg'};base64,${btoa('mock file content')}`;
        this.readyState = 2;
        this.onload?.(new ProgressEvent('load'));
      })
      .catch(error => {
        this.error = error;
        this.onerror?.(new ProgressEvent('error'));
      });
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

// Mock AbortSignal.timeout for older Node versions
if (!AbortSignal.timeout) {
  AbortSignal.timeout = vi.fn((ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }) as unknown as (ms: number) => AbortSignal;
}

describe('api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should return access token when session exists', async () => {
      const mockToken = 'test-access-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      const token = await getAccessToken();
      expect(token).toBe(mockToken);
    });

    it('should return null when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const token = await getAccessToken();
      expect(token).toBeNull();
    });

    it('should return null when session exists but has no access_token', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: {} },
      });

      const token = await getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with Authorization when authenticated', async () => {
      const mockToken = 'test-access-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockToken}`,
      });
    });

    it('should return headers without Authorization when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('apiFetch', () => {
    it('should make successful GET request and return parsed JSON', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => mockData,
      }));
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const result = await apiFetch<{ id: number; name: string }>('/api/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make successful POST request with body', async () => {
      const mockData = { success: true };
      const requestBody = { name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => mockData,
      }));
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const result = await apiFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should include Authorization header when authenticated', async () => {
      const mockToken = 'test-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({}),
      }));

      await apiFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should merge custom headers with auth headers', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: true,
        json: async () => ({}),
      }));

      const customHeaders = { 'X-Custom-Header': 'custom-value' };
      await apiFetch('/api/test', {
        headers: customHeaders,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should throw error with message from response', async () => {
      const errorMessage = 'Resource not found';
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: false,
        status: 404,
        json: async () => ({ error: errorMessage }),
      }));
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(apiFetch('/api/test')).rejects.toThrow(errorMessage);
    });

    it('should handle nested error objects', async () => {
      const errorMessage = 'Validation failed';
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: errorMessage } }),
      }));
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(apiFetch('/api/test')).rejects.toThrow(errorMessage);
    });

    it('should throw generic error when response JSON is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      }));
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(apiFetch('/api/test')).rejects.toThrow('Unknown error');
    });

    it('should support request cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      global.fetch = vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      });

      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(apiFetch('/api/test', { signal })).rejects.toThrow('Aborted');
    });
  });

  describe('imageToBase64', () => {
    it('should convert HTMLImageElement to base64 data URL', () => {
      // Mock canvas and context
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn(tagName => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLElement;
        }
        return originalCreateElement.call(document, tagName);
      }) as unknown as typeof document.createElement;

      const mockImg = {
        naturalWidth: 100,
        naturalHeight: 200,
      } as HTMLImageElement;

      const result = imageToBase64(mockImg);

      expect(result).toBe('data:image/png;base64,mockdata');
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(200);

      // Restore
      document.createElement = originalCreateElement;
    });

    it('should support custom MIME types', () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toDataURL: vi.fn((mimeType: string) => `data:${mimeType};base64,mockdata`),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn(tagName => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLElement;
        }
        return originalCreateElement.call(document, tagName);
      }) as unknown as typeof document.createElement;

      const mockImg = {
        naturalWidth: 100,
        naturalHeight: 200,
      } as HTMLImageElement;

      const result = imageToBase64(mockImg, 'image/jpeg');

      expect(result).toBe('data:image/jpeg;base64,mockdata');
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg');

      // Restore
      document.createElement = originalCreateElement;
    });

    it('should throw error when canvas context is unavailable', () => {
      const mockCanvas = {
        getContext: vi.fn(() => null),
      };

      const originalCreateElement = document.createElement;
      document.createElement = vi.fn(tagName => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLElement;
        }
        return originalCreateElement.call(document, tagName);
      }) as unknown as typeof document.createElement;

      const mockImg = {
        naturalWidth: 100,
        naturalHeight: 200,
      } as HTMLImageElement;

      expect(() => imageToBase64(mockImg)).toThrow('Could not get canvas context');

      // Restore
      document.createElement = originalCreateElement;
    });
  });

  describe('analyzeImage', () => {
    const mockFile = new File(['test'], 'test.jpg', {
      type: 'image/jpeg',
    });

    it('should analyze image successfully', async () => {
      const mockResult: IAnalyzeImageResult = {
        analysis: {
          issues: [
            {
              type: 'blur',
              severity: 'medium',
              description: 'Slight blur detected',
            },
          ],
          contentType: 'photo',
        },
        recommendation: {
          model: 'real-esrgan',
          reason: 'Best for photo upscaling',
          creditCost: 1,
          confidence: 0.9,
          alternativeModel: 'esrgan-v2',
          alternativeCost: 2,
        },
        enhancementPrompt: 'Enhance photo quality and details',
        provider: 'replicate',
        processingTimeMs: 1500,
      };

      const mockToken = 'test-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await analyzeImage(mockFile);

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analyze-image',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: expect.stringContaining('"imageData":'),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(analyzeImage(mockFile)).rejects.toThrow(
        'You must be logged in to use auto model selection'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle error responses from API', async () => {
      const errorMessage = 'Invalid image format';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: errorMessage }),
      } as Response);

      await expect(analyzeImage(mockFile)).rejects.toThrow(errorMessage);
    });

    it('should handle nested error objects', async () => {
      const errorMessage = 'Analysis failed';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: errorMessage } }),
      } as Response);

      await expect(analyzeImage(mockFile)).rejects.toThrow(errorMessage);
    });

    it('should pass allowExpensiveModels option', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          analysis: { issues: [], contentType: 'photo' },
          recommendation: {
            model: 'high-quality-model',
            reason: 'Expensive model allowed',
            creditCost: 5,
            confidence: 0.95,
            alternativeModel: null,
            alternativeCost: null,
          },
          enhancementPrompt: 'test',
          provider: 'replicate',
        }),
      } as Response);

      await analyzeImage(mockFile, { allowExpensiveModels: true });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.allowExpensiveModels).toBe(true);
    });

    it('should default allowExpensiveModels to false', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          analysis: { issues: [], contentType: 'photo' },
          recommendation: {
            model: 'standard-model',
            reason: 'Standard model',
            creditCost: 1,
            confidence: 0.8,
            alternativeModel: null,
            alternativeCost: null,
          },
          enhancementPrompt: 'test',
          provider: 'replicate',
        }),
      } as Response);

      await analyzeImage(mockFile);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.allowExpensiveModels).toBe(false);
    });
  });

  describe('processImage', () => {
    const mockFile = new File(['test'], 'test.jpg', {
      type: 'image/jpeg',
    });

    const mockConfig: IUpscaleConfig = {
      qualityTier: 'auto',
      scale: 2,
      additionalOptions: {
        customInstructions: '',
        preserveDetails: true,
      },
    };

    it('should process image successfully with imageUrl', async () => {
      const mockApiResponse = {
        imageUrl: 'https://example.com/processed.jpg',
        processing: {
          creditsRemaining: 95,
          creditsUsed: 5,
        },
      };

      const progressCallback = vi.fn();

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await processImage(mockFile, mockConfig, progressCallback);

      expect(result).toHaveProperty('imageUrl', 'https://example.com/processed.jpg');
      expect(result).toHaveProperty('creditsRemaining', 95);
      expect(result).toHaveProperty('creditsUsed', 5);
      expect(progressCallback).toHaveBeenCalledWith(10, ProcessingStage.PREPARING);
      expect(progressCallback).toHaveBeenCalledWith(30, ProcessingStage.PREPARING);
      expect(progressCallback).toHaveBeenCalledWith(50, ProcessingStage.ENHANCING);
      expect(progressCallback).toHaveBeenCalledWith(95, ProcessingStage.FINALIZING);
      expect(progressCallback).toHaveBeenCalledWith(100, ProcessingStage.FINALIZING);
    });

    it('should process image successfully with imageData', async () => {
      const mockApiResponse = {
        imageData: 'data:image/jpeg;base64,processeddata',
        processing: {
          creditsRemaining: 90,
          creditsUsed: 10,
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await processImage(mockFile, mockConfig, vi.fn());

      expect(result.imageData).toBe('data:image/jpeg;base64,processeddata');
    });

    it('should throw error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(processImage(mockFile, mockConfig, vi.fn())).rejects.toThrow(
        'You must be logged in to process images'
      );
    });

    it('should throw BatchLimitError for batch limit exceeded', async () => {
      const resetDate = new Date('2024-02-01T00:00:00Z');
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: 'BATCH_LIMIT_EXCEEDED',
            message: 'Batch limit exceeded',
            details: {
              current: 10,
              limit: 5,
              resetAt: resetDate.toISOString(),
              upgradeUrl: '/pricing',
            },
          },
        }),
      } as Response);

      try {
        await processImage(mockFile, mockConfig, vi.fn());
        expect.fail('Should have thrown BatchLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(BatchLimitError);
        expect((error as BatchLimitError).current).toBe(10);
        expect((error as BatchLimitError).limit).toBe(5);
        expect((error as BatchLimitError).resetAt).toEqual(resetDate);
        expect((error as BatchLimitError).upgradeUrl).toBe('/pricing');
      }
    });

    it('should handle timeout errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      // Create an error that will be caught and transformed
      const abortError = new Error('The operation timed out');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(processImage(mockFile, mockConfig, vi.fn())).rejects.toThrow('Request timeout:');
    });

    it('should handle TimeoutError name', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      const timeoutError = new Error('Request timed out') as Error & { name: string };
      timeoutError.name = 'TimeoutError';

      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      await expect(processImage(mockFile, mockConfig, vi.fn())).rejects.toThrow('Request timeout:');
    });

    it('should throw error when response has no image data', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(processImage(mockFile, mockConfig, vi.fn())).rejects.toThrow(
        'No image data received from server'
      );
    });

    it('should handle custom instructions', async () => {
      const configWithInstructions: IUpscaleConfig = {
        ...mockConfig,
        additionalOptions: {
          ...mockConfig.additionalOptions,
          customInstructions: 'Make it sharper',
        },
      };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/processed.jpg',
          processing: {
            creditsRemaining: 95,
            creditsUsed: 5,
          },
        }),
      } as Response);

      await processImage(mockFile, configWithInstructions, vi.fn());

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.enhancementPrompt).toBe('Make it sharper');
    });

    it('should include Authorization header in request', async () => {
      const mockToken = 'auth-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: mockToken } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/processed.jpg',
          processing: {
            creditsRemaining: 95,
            creditsUsed: 5,
          },
        }),
      } as Response);

      await processImage(mockFile, mockConfig, vi.fn());

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upscale',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should use AbortSignal.timeout for request', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          imageUrl: 'https://example.com/processed.jpg',
          processing: {
            creditsRemaining: 95,
            creditsUsed: 5,
          },
        }),
      } as Response);

      await processImage(mockFile, mockConfig, vi.fn());

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upscale',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('BatchLimitError', () => {
    it('should create error with all properties', () => {
      const resetAt = new Date();
      const error = new BatchLimitError({
        current: 10,
        limit: 5,
        resetAt,
        upgradeUrl: '/upgrade',
        message: 'Custom message',
      });

      expect(error.name).toBe('BatchLimitError');
      expect(error.current).toBe(10);
      expect(error.limit).toBe(5);
      expect(error.resetAt).toBe(resetAt);
      expect(error.upgradeUrl).toBe('/upgrade');
      expect(error.message).toBe('Custom message');
    });

    it('should generate default message with current and limit values', () => {
      const error = new BatchLimitError({
        current: 10,
        limit: 5,
      });

      expect(error.message).toContain('10');
      expect(error.message).toContain('5');
      expect(error.message.toLowerCase()).toContain('upgrade');
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('should respect custom decimals', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });
  });
});
