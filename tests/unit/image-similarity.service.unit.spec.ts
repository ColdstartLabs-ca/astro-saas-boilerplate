/**
 * Unit Tests: ImageSimilarityService
 *
 * Tests for server/services/image-similarity.service.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Hoist mock functions so they're available inside vi.mock factories
const { mockRpc } = vi.hoisted(() => {
  return { mockRpc: vi.fn() };
});

// Mock supabaseAdmin
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: mockRpc,
  },
}));

vi.mock('@shared/config/env', () => ({
  serverEnv: {
    OPENAI_API_KEY: 'test-key',
  },
  clientEnv: {},
}));

import {
  ImageSimilarityService,
  SIMILARITY_THRESHOLD,
} from '@server/services/image-similarity.service';

describe('ImageSimilarityService', () => {
  let service: ImageSimilarityService;

  beforeEach(() => {
    service = new ImageSimilarityService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when embedding is null (no RPC call)', async () => {
    const result = await service.findSimilarImage(null, 'balanced');

    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns null when RPC returns empty array', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const embedding = new Array(1536).fill(0.1);
    const result = await service.findSimilarImage(embedding, 'balanced');

    expect(result).toBeNull();
  });

  it('returns null when RPC returns null data', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const embedding = new Array(1536).fill(0.1);
    const result = await service.findSimilarImage(embedding, 'pro');

    expect(result).toBeNull();
  });

  it('returns ISimilarImageMatch with correct fields when RPC returns a match', async () => {
    const matchData = {
      id: 'abc-123',
      image_url: 'https://example.com/image.webp',
      prompt: 'a beautiful sunset over mountains',
      similarity: 0.95,
    };

    mockRpc.mockResolvedValueOnce({ data: [matchData], error: null });

    const embedding = new Array(1536).fill(0.5);
    const result = await service.findSimilarImage(embedding, 'balanced');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('abc-123');
    expect(result!.imageUrl).toBe('https://example.com/image.webp');
    expect(result!.prompt).toBe('a beautiful sunset over mountains');
    expect(result!.similarity).toBe(0.95);
  });

  it('returns null on RPC error (graceful degradation, no throw)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "article_images" does not exist' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const embedding = new Array(1536).fill(0.3);
    const result = await service.findSimilarImage(embedding, 'ultra');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('RPC error'),
      expect.stringContaining('article_images')
    );

    consoleSpy.mockRestore();
  });

  it('returns null on unexpected exception (graceful degradation)', async () => {
    mockRpc.mockRejectedValueOnce(new Error('Database connection lost'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const embedding = new Array(1536).fill(0.7);
    const result = await service.findSimilarImage(embedding, 'budget');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('calls RPC with correct parameters including SIMILARITY_THRESHOLD', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const embedding = new Array(1536).fill(0.2);
    await service.findSimilarImage(embedding, 'pro');

    expect(mockRpc).toHaveBeenCalledWith('find_similar_image', {
      query_embedding: embedding,
      p_preset_key: 'pro',
      similarity_threshold: SIMILARITY_THRESHOLD,
      max_results: 1,
    });
  });

  it('SIMILARITY_THRESHOLD is 0.90', () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.9);
  });

  it('logs a message when a reusable image is found', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'xyz', image_url: 'https://img.com/a.webp', prompt: 'test', similarity: 0.92 }],
      error: null,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const embedding = new Array(1536).fill(0.1);
    await service.findSimilarImage(embedding, 'balanced');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found reusable image'));

    consoleSpy.mockRestore();
  });
});
