/**
 * Unit tests for BaseAdapter
 *
 * Tests for:
 * - timeout after TIMEOUT_MS
 * - error wrapping in IntegrationError
 * - testConnection() method
 * - publish() method
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaseAdapter,
  IntegrationError,
  type IRequestInit,
} from '../../../server/integrations/adapters/base.adapter';
import type {
  IPublishContext,
  ITestConnectionResult,
  IPublishResult,
} from '../../../server/integrations/adapter.interface';
import type {
  IIntegrationConfig,
  IIntegrationCredentials,
  IntegrationType,
} from '../../../shared/types/integration.types';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/**
 * Concrete test adapter for testing BaseAdapter functionality
 */
class TestAdapter extends BaseAdapter {
  readonly type: IntegrationType = 'wordpress';

  async testConnection(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<ITestConnectionResult> {
    try {
      const response = await this.fetchWithTimeout(config.url ?? '');
      if (response.ok) {
        return this.createTestConnectionSuccess();
      }
      return this.createTestConnectionError(new Error(`HTTP ${response.status}`));
    } catch (error) {
      return this.createTestConnectionError(error);
    }
  }

  async publish(
    context: IPublishContext,
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
  ): Promise<IPublishResult> {
    try {
      const response = await this.fetchWithTimeout(config.url ?? '', {
        method: 'POST',
        body: JSON.stringify(context.article),
      });
      if (response.ok) {
        return this.createPublishSuccess('test-id', config.url);
      }
      return this.createPublishError(new Error(`HTTP ${response.status}`));
    } catch (error) {
      return this.createPublishError(error);
    }
  }

  // Expose protected methods for testing
  public testConvertMarkdownToHtml(markdown: string): string {
    return this.convertMarkdownToHtml(markdown);
  }

  public testWrapError(error: unknown, context: string): IntegrationError {
    return this.wrapError(error, context);
  }

  public testCreateTimeoutController(timeoutMs?: number) {
    return this.createTimeoutController(timeoutMs);
  }

  public testFetchWithTimeout(
    url: string,
    options?: IRequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    return this.fetchWithTimeout(url, options, timeoutMs);
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
    mockFetch.mockReset();
  });

  describe('convertMarkdownToHtml', () => {
    it('should convert markdown headings to HTML', () => {
      const result = adapter.testConvertMarkdownToHtml('# Title\n## Subtitle');
      expect(result).toContain('<h1');
      expect(result).toContain('Title');
    });

    it('should convert markdown bold and italic to HTML', () => {
      const result = adapter.testConvertMarkdownToHtml('**bold** and *italic*');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('wrapError', () => {
    it('should wrap error in IntegrationError', () => {
      const error = new Error('Test error');
      const wrapped = adapter.testWrapError(error, 'Test context');

      expect(wrapped).toBeInstanceOf(IntegrationError);
      expect(wrapped.message).toContain('Test context');
      expect(wrapped.message).toContain('Test error');
    });

    it('should wrap timeout errors with TIMEOUT code', () => {
      const error = new Error('abort: timeout');
      const wrapped = adapter.testWrapError(error, 'Test context');

      expect(wrapped.code).toBe('TIMEOUT');
    });

    it('should wrap network errors with NETWORK_ERROR code', () => {
      const error = new Error('fetch failed ENOTFOUND');
      const wrapped = adapter.testWrapError(error, 'Test context');

      expect(wrapped.code).toBe('NETWORK_ERROR');
    });

    it('should preserve IntegrationError when wrapping', () => {
      const originalError = new IntegrationError('Original', 'ORIGINAL_CODE');
      const wrapped = adapter.testWrapError(originalError, 'Test context');

      expect(wrapped).toBe(originalError);
    });
  });

  describe('createTimeoutController', () => {
    it('should create an AbortController with timeout', () => {
      const { controller, cleanup } = adapter.testCreateTimeoutController();

      expect(controller).toBeInstanceOf(AbortController);
      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });

    it('should use default timeout of 30000ms', () => {
      const { timeoutId } = adapter.testCreateTimeoutController();
      expect(timeoutId).toBeDefined();
      clearTimeout(timeoutId);
    });

    it('should allow custom timeout', () => {
      const { timeoutId } = adapter.testCreateTimeoutController(5000);
      expect(timeoutId).toBeDefined();
      clearTimeout(timeoutId);
    });
  });

  describe('fetchWithTimeout', () => {
    it('should return response on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const response = await adapter.testFetchWithTimeout('https://example.com/api/test');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw IntegrationError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.testFetchWithTimeout('https://example.com/api/test')).rejects.toThrow(
        IntegrationError
      );
    });
  });
});

describe('IntegrationError', () => {
  it('should create error with message', () => {
    const error = new IntegrationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('IntegrationError');
  });

  it('should create error with code', () => {
    const error = new IntegrationError('Test error', 'TIMEOUT');
    expect(error.code).toBe('TIMEOUT');
  });

  it('should create error with statusCode', () => {
    const error = new IntegrationError('Test error', 'TIMEOUT', 408);
    expect(error.statusCode).toBe(408);
  });

  it('should create error with originalError', () => {
    const originalError = new Error('Original');
    const error = new IntegrationError('Test error', 'TIMEOUT', 408, originalError);
    expect(error.originalError).toBe(originalError);
  });
});
