/**
 * Website Crawler Service Unit Tests
 * Tests for website metadata extraction with SSRF protection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  WebsiteCrawlerService,
  InvalidUrlError,
  SsrProtectionError,
  FetchTimeoutError,
  NonHtmlResponseError,
} from '../website-crawler.service';

describe('WebsiteCrawlerService', () => {
  let service: WebsiteCrawlerService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new WebsiteCrawlerService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ==========================================================================
  // HTML Extraction Tests
  // ==========================================================================

  describe('extractTitle', () => {
    it('should extract title from HTML', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Website Title</title>
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBe('Test Website Title');
    });

    it('should extract title with HTML entities', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test &amp; Company &mdash; Products</title>
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toContain('Test & Company');
    });
  });

  describe('extractDescription', () => {
    it('should extract meta description from HTML', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="This is a test description for the website.">
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.description).toBe('This is a test description for the website.');
    });

    it('should handle missing tags gracefully', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <!-- No title or description -->
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
    });

    it('should handle missing description with title present', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Only Title</title>
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBe('Only Title');
      expect(result.description).toBeNull();
    });
  });

  // ==========================================================================
  // SSRF Protection Tests
  // ==========================================================================

  describe('SSRF Protection', () => {
    it('should reject localhost', async () => {
      await expect(service.fetchMetadata('http://localhost/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 127.0.0.1', async () => {
      await expect(service.fetchMetadata('http://127.0.0.1/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 10.x.x.x private IPs', async () => {
      await expect(service.fetchMetadata('http://10.0.0.1/test')).rejects.toThrow(SsrProtectionError);
      await expect(service.fetchMetadata('http://10.255.255.255/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 192.168.x.x private IPs', async () => {
      await expect(service.fetchMetadata('http://192.168.0.1/test')).rejects.toThrow(
        SsrProtectionError
      );
      await expect(service.fetchMetadata('http://192.168.255.255/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 172.16.x.x - 172.31.x.x private IPs', async () => {
      await expect(service.fetchMetadata('http://172.16.0.1/test')).rejects.toThrow(
        SsrProtectionError
      );
      await expect(service.fetchMetadata('http://172.31.255.255/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 169.254.x.x link-local IPs', async () => {
      await expect(service.fetchMetadata('http://169.254.0.1/test')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject 0.0.0.0', async () => {
      await expect(service.fetchMetadata('http://0.0.0.0/test')).rejects.toThrow(SsrProtectionError);
    });

    it('should reject metadata.google.internal', async () => {
      await expect(service.fetchMetadata('http://metadata.google.internal/computeMetadata/v1/')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject kubernetes.default', async () => {
      await expect(service.fetchMetadata('http://kubernetes.default/api/v1/')).rejects.toThrow(
        SsrProtectionError
      );
    });

    it('should reject non-HTTP protocols', async () => {
      await expect(service.fetchMetadata('ftp://example.com/file')).rejects.toThrow(InvalidUrlError);
      await expect(service.fetchMetadata('file:///etc/passwd')).rejects.toThrow(InvalidUrlError);
      await expect(service.fetchMetadata('javascript:alert(1)')).rejects.toThrow(InvalidUrlError);
    });

    it('should reject invalid URL format', async () => {
      await expect(service.fetchMetadata('not-a-url')).rejects.toThrow(InvalidUrlError);
      await expect(service.fetchMetadata('')).rejects.toThrow(InvalidUrlError);
      await expect(service.fetchMetadata('http://')).rejects.toThrow(InvalidUrlError);
    });

    it('should allow public IPs', async () => {
      const mockHtml = '<html><head><title>Test</title></head><body></body></html>';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      // 8.8.8.8 is Google's public DNS - should be allowed
      const result = await service.fetchMetadata('http://8.8.8.8/');
      expect(result.title).toBe('Test');
    });
  });

  // ==========================================================================
  // Timeout Tests
  // ==========================================================================

  describe('Timeout Handling', () => {
    it('should timeout on slow responses', async () => {
      // Mock a slow response that never completes
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          })
      );

      await expect(service.fetchMetadata('https://example.com')).rejects.toThrow(FetchTimeoutError);
    });
  });

  // ==========================================================================
  // Non-HTML Response Tests
  // ==========================================================================

  describe('Non-HTML Response Handling', () => {
    it('should reject non-HTML responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
      });

      await expect(service.fetchMetadata('https://example.com/api/data')).rejects.toThrow(
        NonHtmlResponseError
      );
    });

    it('should reject PDF responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/pdf',
        }),
      });

      await expect(service.fetchMetadata('https://example.com/document.pdf')).rejects.toThrow(
        NonHtmlResponseError
      );
    });

    it('should accept XHTML responses', async () => {
      const mockHtml =
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>XHTML Page</title></head><body></body></html>';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/xhtml+xml',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');
      expect(result.title).toBe('XHTML Page');
    });
  });

  // ==========================================================================
  // HTTP Error Tests
  // ==========================================================================

  describe('HTTP Error Handling', () => {
    it('should handle 404 errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.fetchMetadata('https://example.com/nonexistent')).rejects.toThrow(
        'HTTP error: 404'
      );
    });

    it('should handle 500 errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.fetchMetadata('https://example.com/error')).rejects.toThrow(
        'HTTP error: 500'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(service.fetchMetadata('https://example.com')).rejects.toThrow(
        'Failed to fetch URL: Network error'
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty HTML', async () => {
      const mockHtml = '';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
    });

    it('should handle HTML with multiple meta description tags', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta name="description" content="First description">
            <meta name="description" content="Second description">
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      // Should extract the first one
      expect(result.description).toBe('First description');
    });

    it('should handle case-insensitive meta tags', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <TITLE>Test Title</TITLE>
            <META NAME="DESCRIPTION" CONTENT="Test Description">
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBe('Test Title');
      expect(result.description).toBe('Test Description');
    });

    it('should handle Open Graph description as fallback', async () => {
      // Note: Current implementation doesn't extract og:description,
      // but this test documents expected behavior
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
            <meta property="og:description" content="OG Description">
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      // Currently returns null since we only look for name="description"
      expect(result.description).toBeNull();
    });

    it('should trim whitespace from title and description', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>   Spaced Title   </title>
            <meta name="description" content="   Spaced Description   ">
          </head>
          <body></body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8',
        }),
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockHtml),
              })
              .mockResolvedValueOnce({ done: true }),
            cancel: vi.fn(),
          }),
        },
      });

      const result = await service.fetchMetadata('https://example.com');

      expect(result.title).toBe('Spaced Title');
      expect(result.description).toBe('Spaced Description');
    });
  });
});
