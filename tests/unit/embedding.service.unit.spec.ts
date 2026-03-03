/**
 * Unit Tests: EmbeddingService
 *
 * Tests for server/services/embedding.service.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock env before importing the service
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    OPENAI_API_KEY: 'test-api-key',
  },
  clientEnv: {},
}));

import { EmbeddingService } from '@server/services/embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new EmbeddingService();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('embedText', () => {
    it('returns null when OPENAI_API_KEY is empty string (graceful degradation)', async () => {
      vi.resetModules();

      vi.doMock('@shared/config/env', () => ({
        serverEnv: { OPENAI_API_KEY: '' },
        clientEnv: {},
      }));

      const { EmbeddingService: LocalService } = await import('@server/services/embedding.service');
      const localService = new LocalService();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await localService.embedText('test text');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OPENAI_API_KEY not configured')
      );

      consoleSpy.mockRestore();
      vi.resetModules();
    });

    it('returns a 1536-dimension vector on success', async () => {
      const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: fakeEmbedding }],
          usage: { total_tokens: 10 },
          model: 'text-embedding-3-small',
        }),
      });

      const result = await service.embedText('a photo of a cat');

      expect(result).not.toBeNull();
      expect(result!.length).toBe(1536);
      expect(result![0]).toBeCloseTo(0);
      expect(result![1]).toBeCloseTo(0.001);
    });

    it('returns null on API error response (graceful degradation)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.embedText('test prompt');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate embedding'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('returns null on network error (graceful degradation)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.embedText('test prompt');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('calls OpenAI with correct request body', async () => {
      const fakeEmbedding = new Array(1536).fill(0.5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: fakeEmbedding }],
          usage: { total_tokens: 5 },
          model: 'text-embedding-3-small',
        }),
      });

      await service.embedText('seo content marketing strategy');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('text-embedding-3-small'),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input).toBe('seo content marketing strategy');
      expect(body.dimensions).toBe(1536);
    });
  });

  describe('embedBatch', () => {
    it('returns empty array for empty input', async () => {
      const result = await service.embedBatch([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns array with same length as input on success', async () => {
      const texts = ['prompt one', 'prompt two', 'prompt three'];
      const fakeEmbeddings = texts.map((_, i) =>
        Array.from({ length: 1536 }, () => i * 0.1)
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: fakeEmbeddings.map((embedding, index) => ({ index, embedding })),
          usage: { total_tokens: 15 },
        }),
      });

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1536);
      expect(result[1]).toHaveLength(1536);
      expect(result[2]).toHaveLength(1536);
    });

    it('returns all nulls when OPENAI_API_KEY is empty (graceful degradation)', async () => {
      vi.resetModules();

      vi.doMock('@shared/config/env', () => ({
        serverEnv: { OPENAI_API_KEY: '' },
        clientEnv: {},
      }));

      const { EmbeddingService: LocalService } = await import('@server/services/embedding.service');
      const localService = new LocalService();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const texts = ['a', 'b', 'c'];
      const result = await localService.embedBatch(texts);

      expect(result).toHaveLength(3);
      expect(result.every(v => v === null)).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      vi.resetModules();
    });

    it('returns all nulls on API error (graceful degradation)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const texts = ['x', 'y'];
      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(2);
      expect(result.every(v => v === null)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('sorts returned embeddings by index to preserve input order', async () => {
      const texts = ['first', 'second', 'third'];

      // Return in reverse order
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { index: 2, embedding: new Array(1536).fill(2) },
            { index: 0, embedding: new Array(1536).fill(0) },
            { index: 1, embedding: new Array(1536).fill(1) },
          ],
          usage: { total_tokens: 10 },
        }),
      });

      const result = await service.embedBatch(texts);

      expect(result[0]![0]).toBe(0);
      expect(result[1]![0]).toBe(1);
      expect(result[2]![0]).toBe(2);
    });
  });
});
