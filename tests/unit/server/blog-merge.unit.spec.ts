import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock blog-data.json
vi.mock('@/content/blog-data.json', () => ({
  default: {
    posts: [
      {
        slug: 'mdx-post-1',
        title: 'MDX Post 1',
        description: 'First MDX post',
        date: '2025-01-10',
        author: 'Author A',
        category: 'SEO',
        tags: ['seo', 'tips'],
        image: '/images/mdx1.jpg',
        readingTime: '3 min read',
        content: '# MDX Post 1 content',
      },
      {
        slug: 'shared-slug',
        title: 'MDX Shared Post',
        description: 'MDX post that shares slug with DB',
        date: '2025-01-05',
        author: 'Author B',
        category: 'Marketing',
        tags: ['marketing'],
        content: '# Shared slug MDX content',
      },
      {
        slug: 'mdx-post-2',
        title: 'MDX Post 2',
        description: 'Second MDX post',
        date: '2025-01-01',
        author: 'Author A',
        category: 'SEO',
        tags: ['seo'],
        content: '# MDX Post 2 content',
      },
    ],
  },
}));

// Mock blog service
const mockGetPublishedDbPosts = vi.fn();
const mockGetPublishedDbPostBySlug = vi.fn();

vi.mock('@server/services/blog.service', () => ({
  blogService: {
    getPublishedDbPosts: () => mockGetPublishedDbPosts(),
    getPublishedDbPostBySlug: (slug: string) => mockGetPublishedDbPostBySlug(slug),
  },
  dbPostToPublicPost: vi.fn((post) => ({
    ...post,
    source: 'db',
  })),
  dbPostToMeta: vi.fn((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description || '',
    date: post.published_at || post.created_at,
    author: post.author || 'AutopilotRank Team',
    category: post.category_name || 'General',
    tags: post.tags || [],
    readingTime: post.reading_time || '5 min read',
    source: 'db',
  })),
}));

import {
  getAllPosts,
  getAllPostsAsync,
  getPostBySlug,
  getPostBySlugAsync,
  getAllSlugs,
  getPostsByCategory,
} from '@server/blog';

describe('server/blog.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPosts (sync, MDX only)', () => {
    it('returns all MDX posts sorted by date', () => {
      const posts = getAllPosts();
      expect(posts).toHaveLength(3);
      expect(posts[0].slug).toBe('mdx-post-1');
      expect(posts[1].slug).toBe('shared-slug');
      expect(posts[2].slug).toBe('mdx-post-2');
    });

    it('marks all posts as mdx source', () => {
      const posts = getAllPosts();
      posts.forEach(post => {
        expect(post.source).toBe('mdx');
      });
    });

    it('defaults readingTime when not provided', () => {
      const posts = getAllPosts();
      const sharedPost = posts.find(p => p.slug === 'shared-slug');
      expect(sharedPost?.readingTime).toBe('5 min read');
    });
  });

  describe('getAllPostsAsync (hybrid MDX + DB)', () => {
    it('merges MDX and DB posts', async () => {
      mockGetPublishedDbPosts.mockResolvedValue([
        {
          slug: 'db-post-1',
          title: 'DB Post 1',
          description: 'A DB post',
          date: '2025-01-20',
          author: 'DB Author',
          category: 'Tech',
          tags: ['tech'],
          readingTime: '4 min read',
          source: 'db',
        },
      ]);

      const posts = await getAllPostsAsync();
      expect(posts.length).toBe(4); // 3 MDX + 1 DB
      const slugs = posts.map(p => p.slug);
      expect(slugs).toContain('mdx-post-1');
      expect(slugs).toContain('db-post-1');
    });

    it('DB posts win on slug collision', async () => {
      mockGetPublishedDbPosts.mockResolvedValue([
        {
          slug: 'shared-slug',
          title: 'DB Version of Shared Post',
          description: 'DB wins',
          date: '2025-01-25',
          author: 'DB Author',
          category: 'Tech',
          tags: ['tech'],
          readingTime: '2 min read',
          source: 'db',
        },
      ]);

      const posts = await getAllPostsAsync();
      const sharedPost = posts.find(p => p.slug === 'shared-slug');
      expect(sharedPost?.source).toBe('db');
      expect(sharedPost?.title).toBe('DB Version of Shared Post');
      // Total should be 3 (2 unique MDX + 1 DB that replaced MDX)
      expect(posts).toHaveLength(3);
    });

    it('falls back to MDX-only when DB fetch fails', async () => {
      mockGetPublishedDbPosts.mockRejectedValue(new Error('DB connection failed'));

      const posts = await getAllPostsAsync();
      expect(posts).toHaveLength(3);
      posts.forEach(post => {
        expect(post.source).toBe('mdx');
      });
    });

    it('sorts merged posts by date (newest first)', async () => {
      mockGetPublishedDbPosts.mockResolvedValue([
        {
          slug: 'newest-db-post',
          title: 'Newest Post',
          description: 'Newest',
          date: '2025-02-01',
          author: 'Author',
          category: 'General',
          tags: [],
          readingTime: '1 min read',
          source: 'db',
        },
      ]);

      const posts = await getAllPostsAsync();
      expect(posts[0].slug).toBe('newest-db-post');
    });
  });

  describe('getPostBySlug (sync)', () => {
    it('returns post by slug', () => {
      const post = getPostBySlug('mdx-post-1');
      expect(post).not.toBeNull();
      expect(post?.title).toBe('MDX Post 1');
      expect(post?.source).toBe('mdx');
    });

    it('returns null for non-existent slug', () => {
      const post = getPostBySlug('nonexistent');
      expect(post).toBeNull();
    });
  });

  describe('getPostBySlugAsync (hybrid)', () => {
    it('returns DB post when found', async () => {
      mockGetPublishedDbPostBySlug.mockResolvedValue({
        slug: 'db-post',
        title: 'DB Post',
        content: 'DB content',
        source: 'db',
      });

      const post = await getPostBySlugAsync('db-post');
      expect(post?.source).toBe('db');
    });

    it('falls back to MDX when DB post not found', async () => {
      mockGetPublishedDbPostBySlug.mockResolvedValue(null);

      const post = await getPostBySlugAsync('mdx-post-1');
      expect(post).not.toBeNull();
      expect(post?.source).toBe('mdx');
    });

    it('falls back to MDX when DB call fails', async () => {
      mockGetPublishedDbPostBySlug.mockRejectedValue(new Error('DB error'));

      const post = await getPostBySlugAsync('mdx-post-1');
      expect(post).not.toBeNull();
      expect(post?.source).toBe('mdx');
    });
  });

  describe('getAllSlugs', () => {
    it('returns all MDX post slugs', () => {
      const slugs = getAllSlugs();
      expect(slugs).toEqual(['mdx-post-1', 'shared-slug', 'mdx-post-2']);
    });
  });

  describe('getPostsByCategory', () => {
    it('filters posts by category (case insensitive)', () => {
      const posts = getPostsByCategory('seo');
      expect(posts).toHaveLength(2);
      posts.forEach(post => {
        expect(post.category.toLowerCase()).toBe('seo');
      });
    });

    it('returns empty array for non-existent category', () => {
      const posts = getPostsByCategory('nonexistent');
      expect(posts).toHaveLength(0);
    });
  });
});
