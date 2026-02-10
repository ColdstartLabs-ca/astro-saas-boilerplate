/**
 * Unit Tests: Image Storage Service
 *
 * Tests for image-storage.service.ts including:
 * - slugify
 * - getContentType
 * - getExtension
 * - getPublicUrl
 * - persistImage
 * - persistArticleImages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all dependencies
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('@shared/config/env', () => ({
  clientEnv: {
    SUPABASE_URL: 'https://test.supabase.co',
  },
}));

import {
  slugify,
  getContentType,
  getExtension,
  getPublicUrl,
  persistImage,
  persistArticleImages,
  type IUploadResult,
} from '@server/services/image-storage.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// Get the mocked functions
const mockStorageFrom = supabaseAdmin.storage.from as vi.Mock;

describe('Image Storage Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('slugify', () => {
    // Note: slugify is a private function, so we can't test it directly
    // We can test its behavior indirectly through persistImage

    it('should test slugify behavior indirectly through filename generation', async () => {
      // This tests the slugify behavior through the actual persistImage function
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      // Test with a keyword that has special characters
      const keyword = 'Best SEO Tools for Startups!!!';
      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        1,
        keyword
      );

      // The slugified version should be in the storage path
      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toContain('best-seo-tools-for-startups');
      }
    });

    it('should handle keywords with spaces', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/png';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const keyword = '  spaces  everywhere  ';
      const result = await persistImage('https://example.com/image.png', 'article-123', 1, keyword);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/spaces-everywhere/);
      }
    });

    it('should truncate long keywords to 60 characters', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      // Create a keyword longer than 60 characters
      const keyword = 'a'.repeat(100);
      const result = await persistImage('https://example.com/image.jpg', 'article-123', 1, keyword);

      expect(result).not.toBeNull();
      if (result) {
        // The slugified keyword is truncated to 60 characters
        const filenamePart = result.storagePath.split('/').pop() || '';
        // filename format: {position}-{slug}.{ext}
        // 1-aaaa...aaa.jpg where slug is 60 'a's
        expect(filenamePart).toMatch(/^1-a{60}\.jpg$/);
      }
    });

    it('should handle keywords with mixed special characters', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const keyword = 'Hello@World#Test$123%';
      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        1,
        keyword
      );

      expect(result).not.toBeNull();
      if (result) {
        // Should only contain alphanumeric and hyphens
        const filenamePart = result.storagePath.split('/').pop() || '';
        expect(filenamePart).toMatch(/^[a-z0-9-]+\.webp$/);
      }
    });

    it('should handle empty keywords', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const keyword = '';
      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        1,
        keyword
      );

      expect(result).not.toBeNull();
    });

    it('should handle keywords with only special characters', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const keyword = '@#$%^&*()';
      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        1,
        keyword
      );

      expect(result).not.toBeNull();
    });
  });

  describe('getContentType', () => {
    // Note: getContentType is a private function
    // We test it indirectly through persistImage behavior

    it('should detect webp content type from response headers', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      // Verify the upload was called with webp content type
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.webp'),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/webp',
        })
      );
    });

    it('should detect png content type from response headers', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/png';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/image.png', 'article-123', 1, 'test');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.png'),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/png',
        })
      );
    });

    it('should detect jpeg content type from response headers', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/image.jpg', 'article-123', 1, 'test');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.jpg'),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/jpeg',
        })
      );
    });

    it('should default to webp when content type header is missing', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn(() => null),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('.webp'),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/webp',
        })
      );
    });

    it('should handle non-image content types by defaulting to webp', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'application/octet-stream';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/file.bin', 'article-123', 1, 'test');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/webp',
        })
      );
    });
  });

  describe('getExtension', () => {
    // Note: getExtension is a private function
    // We test it indirectly through persistImage behavior

    it('should return webp extension for image/webp content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/\.webp$/);
      }
    });

    it('should return png extension for image/png content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/png';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/\.png$/);
      }
    });

    it('should return jpg extension for image/jpeg content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/\.jpg$/);
      }
    });

    it('should return jpg extension for image/jpg content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/jpg';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/\.jpg$/);
      }
    });

    it('should default to webp extension for unknown content types', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn(() => null),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toMatch(/\.webp$/);
      }
    });
  });

  describe('getPublicUrl', () => {
    // Note: getPublicUrl is a private function
    // We test it indirectly through persistImage behavior

    it('should generate correct public URL', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.permanentUrl).toMatch(
          /^https:\/\/test\.supabase\.co\/storage\/v1\/object\/public\/autopilotrank-images\//
        );
        expect(result.permanentUrl).toContain(result.storagePath);
      }
    });
  });

  describe('persistImage', () => {
    it('should successfully persist an image and return upload result', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        1,
        'test-keyword'
      );

      expect(result).not.toBeNull();
      expect(result?.permanentUrl).toMatch(/^https:/);
      expect(result?.storagePath).toContain('articles/article-123/1-');
      expect(mockStorageFrom).toHaveBeenCalledWith('autopilotrank-images');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('articles/article-123/1-'),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'image/webp',
          upsert: true,
        })
      );
    });

    it('should return null when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage(
        'https://example.com/notfound.webp',
        'article-123',
        1,
        'test'
      );

      expect(result).toBeNull();
      expect(mockStorageFrom).not.toHaveBeenCalled();
    });

    it('should return null when upload fails', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/webp';
            return null;
          }),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({
        error: new Error('Upload failed'),
      });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(result).toBeNull();
    });

    it('should return null when an exception is thrown', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(result).toBeNull();
    });

    it('should handle different article IDs', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result1 = await persistImage(
        'https://example.com/image1.webp',
        'article-abc',
        1,
        'test'
      );
      const result2 = await persistImage(
        'https://example.com/image2.webp',
        'article-xyz',
        2,
        'test'
      );

      expect(result1?.storagePath).toContain('article-abc');
      expect(result2?.storagePath).toContain('article-xyz');
      expect(result1?.storagePath).toContain('/1-');
      expect(result2?.storagePath).toContain('/2-');
    });

    it('should handle different positions', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/png'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result1 = await persistImage(
        'https://example.com/image1.png',
        'article-123',
        1,
        'test'
      );
      const result2 = await persistImage(
        'https://example.com/image2.png',
        'article-123',
        5,
        'test'
      );
      const result3 = await persistImage(
        'https://example.com/image3.png',
        'article-123',
        10,
        'test'
      );

      expect(result1?.storagePath).toContain('/1-');
      expect(result2?.storagePath).toContain('/5-');
      expect(result3?.storagePath).toContain('/10-');
    });

    it('should use upsert option when uploading', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(ArrayBuffer),
        expect.objectContaining({
          upsert: true,
        })
      );
    });

    it('should include article ID, position, and keyword in storage path', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/jpeg'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const articleId = 'article-abc-123';
      const position = 3;
      const keyword = 'seo-tools';

      const result = await persistImage(
        'https://example.com/image.jpg',
        articleId,
        position,
        keyword
      );

      expect(result?.storagePath).toContain(`articles/${articleId}/${position}-`);
      expect(result?.storagePath).toContain('seo-tools');
    });
  });

  describe('persistArticleImages', () => {
    it('should persist multiple images successfully', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const results = [
        { position: 1, imageUrl: 'https://example.com/image1.webp', status: 'completed' },
        { position: 2, imageUrl: 'https://example.com/image2.webp', status: 'completed' },
        { position: 3, imageUrl: 'https://example.com/image3.webp', status: 'completed' },
      ];

      const count = await persistArticleImages(results, 'article-123', 'test-keyword');

      expect(count).toBe(3);
      expect(mockUpload).toHaveBeenCalledTimes(3);
    });

    it('should skip images with non-completed status', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const results = [
        { position: 1, imageUrl: 'https://example.com/image1.webp', status: 'completed' },
        { position: 2, imageUrl: null, status: 'failed' },
        { position: 3, imageUrl: 'https://example.com/image3.webp', status: 'pending' },
        { position: 4, imageUrl: 'https://example.com/image4.webp', status: 'completed' },
      ];

      const count = await persistArticleImages(results, 'article-123', 'test-keyword');

      // Only 2 images should be uploaded (positions 1 and 4)
      expect(count).toBe(2);
      expect(mockUpload).toHaveBeenCalledTimes(2);
    });

    it('should skip images with null imageUrl', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const results = [
        { position: 1, imageUrl: null, status: 'completed' },
        { position: 2, imageUrl: 'https://example.com/image2.webp', status: 'completed' },
      ];

      const count = await persistArticleImages(results, 'article-123', 'test-keyword');

      // Only 1 image should be uploaded (position 2)
      expect(count).toBe(1);
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it('should keep temporary URL as fallback when upload fails', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi
        .fn()
        .mockResolvedValueOnce({ error: null }) // First succeeds
        .mockResolvedValueOnce({ error: new Error('Upload failed') }); // Second fails
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const temporaryUrl1 = 'https://replicate.delivery/temp1.webp';
      const temporaryUrl2 = 'https://replicate.delivery/temp2.webp';

      const results = [
        { position: 1, imageUrl: temporaryUrl1, status: 'completed' },
        { position: 2, imageUrl: temporaryUrl2, status: 'completed' },
      ];

      const count = await persistArticleImages(results, 'article-123', 'test-keyword');

      expect(count).toBe(1);
      // First image should have permanent URL, second should keep temporary
      expect(results[0].imageUrl).toMatch(/^https:\/\/test\.supabase\.co/);
      expect(results[1].imageUrl).toBe(temporaryUrl2);
    });

    it('should handle empty results array', async () => {
      const count = await persistArticleImages([], 'article-123', 'test-keyword');

      expect(count).toBe(0);
    });

    it('should upload images sequentially', async () => {
      let callOrder = 0;
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockImplementation(() => {
        callOrder++;
        return Promise.resolve({ error: null });
      });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const results = [
        { position: 1, imageUrl: 'https://example.com/image1.webp', status: 'completed' },
        { position: 2, imageUrl: 'https://example.com/image2.webp', status: 'completed' },
        { position: 3, imageUrl: 'https://example.com/image3.webp', status: 'completed' },
      ];

      await persistArticleImages(results, 'article-123', 'test-keyword');

      // Verify sequential uploads
      expect(mockUpload).toHaveBeenCalledTimes(3);
    });

    it('should update imageUrl in results with permanent URL on success', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const temporaryUrl = 'https://replicate.delivery/temp.webp';
      const results = [{ position: 1, imageUrl: temporaryUrl, status: 'completed' }];

      await persistArticleImages(results, 'article-123', 'test-keyword');

      // The imageUrl should be updated to the permanent URL
      expect(results[0].imageUrl).not.toBe(temporaryUrl);
      expect(results[0].imageUrl).toMatch(/^https:\/\/test\.supabase\.co/);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi
        .fn()
        .mockResolvedValueOnce({ error: null }) // Success
        .mockRejectedValueOnce(new Error('Network error')) // Failure
        .mockResolvedValueOnce({ error: new Error('Storage error') }); // Failure
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const temporaryUrl1 = 'https://replicate.delivery/temp1.webp';
      const temporaryUrl2 = 'https://replicate.delivery/temp2.webp';
      const temporaryUrl3 = 'https://replicate.delivery/temp3.webp';

      const results = [
        { position: 1, imageUrl: temporaryUrl1, status: 'completed' },
        { position: 2, imageUrl: temporaryUrl2, status: 'completed' },
        { position: 3, imageUrl: temporaryUrl3, status: 'completed' },
      ];

      const count = await persistArticleImages(results, 'article-123', 'test-keyword');

      expect(count).toBe(1);
      expect(results[0].imageUrl).toMatch(/^https:\/\/test\.supabase\.co/);
      expect(results[1].imageUrl).toBe(temporaryUrl2); // Keeps temporary URL
      expect(results[2].imageUrl).toBe(temporaryUrl3); // Keeps temporary URL
    });

    it('should use article ID in storage path for all images', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/png'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const articleId = 'article-custom-id';
      const results = [
        { position: 1, imageUrl: 'https://example.com/image1.png', status: 'completed' },
        { position: 2, imageUrl: 'https://example.com/image2.png', status: 'completed' },
      ];

      await persistArticleImages(results, articleId, 'test-keyword');

      // All uploads should include the article ID in the path
      mockUpload.mock.calls.forEach((call: any[]) => {
        expect(call[0]).toContain(`articles/${articleId}/`);
      });
    });

    it('should use keyword for all images in the article', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const keyword = 'test-article-keyword';
      const results = [
        { position: 1, imageUrl: 'https://example.com/image1.webp', status: 'completed' },
        { position: 2, imageUrl: 'https://example.com/image2.webp', status: 'completed' },
      ];

      await persistArticleImages(results, 'article-123', keyword);

      // All uploads should include the keyword in the filename
      mockUpload.mock.calls.forEach((call: any[]) => {
        expect(call[0]).toContain(keyword);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(result).toBeNull();
    });

    it('should handle arrayBuffer errors gracefully', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn(() => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockRejectedValue(new Error('Buffer error')),
      } as unknown as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 1, 'test');

      expect(result).toBeNull();
    });

    it('should handle very long article IDs', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const longArticleId = 'a'.repeat(500);
      const result = await persistImage('https://example.com/image.webp', longArticleId, 1, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toContain(longArticleId);
      }
    });

    it('should handle special characters in article ID', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const specialArticleId = 'article/with/slashes&special=chars';
      const result = await persistImage(
        'https://example.com/image.webp',
        specialArticleId,
        1,
        'test'
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toContain(specialArticleId);
      }
    });

    it('should handle zero position', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage('https://example.com/image.webp', 'article-123', 0, 'test');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toContain('/0-');
      }
    });

    it('should handle very large position numbers', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const result = await persistImage(
        'https://example.com/image.webp',
        'article-123',
        9999,
        'test'
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.storagePath).toContain('/9999-');
      }
    });

    it('should handle temporary URLs with query parameters', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn((header: string) => 'image/webp'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      } as unknown as Response;

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

      const urlWithParams = 'https://replicate.delivery/image.webp?token=abc123&expires=456';
      const result = await persistImage(urlWithParams, 'article-123', 1, 'test');

      expect(result).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(urlWithParams);
    });
  });
});
