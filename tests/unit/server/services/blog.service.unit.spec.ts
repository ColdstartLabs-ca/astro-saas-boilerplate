import { describe, it, expect } from 'vitest';
import { generateSlug, calculateReadingTime } from '@shared/utils/string';
import {
  renderMarkdownToHtml,
  dbPostToPublicPost,
  dbPostToMeta,
} from '@server/services/blog.service';
import type { IDbBlogPost } from '@shared/types/blog.types';

describe('blog.service', () => {
  describe('generateSlug', () => {
    it('converts title to lowercase kebab-case', () => {
      expect(generateSlug('My Blog Post Title')).toBe('my-blog-post-title');
    });

    it('removes special characters', () => {
      expect(generateSlug('Hello, World! This is a post.')).toBe('hello-world-this-is-a-post');
    });

    it('collapses multiple hyphens', () => {
      expect(generateSlug('  multiple   spaces   here  ')).toBe('multiple-spaces-here');
    });

    it('removes leading and trailing hyphens', () => {
      expect(generateSlug('---leading-trailing---')).toBe('leading-trailing');
    });

    it('handles underscores', () => {
      expect(generateSlug('snake_case_title')).toBe('snake-case-title');
    });
  });

  describe('calculateReadingTime', () => {
    it('returns 1 min for short content', () => {
      expect(calculateReadingTime('Hello world')).toBe('1 min read');
    });

    it('returns 1 min for empty content', () => {
      expect(calculateReadingTime('')).toBe('1 min read');
    });

    it('calculates correctly for longer content', () => {
      const words = Array(400).fill('word').join(' ');
      expect(calculateReadingTime(words)).toBe('2 min read');
    });

    it('rounds up reading time', () => {
      const words = Array(250).fill('word').join(' ');
      expect(calculateReadingTime(words)).toBe('2 min read');
    });
  });

  describe('renderMarkdownToHtml', () => {
    it('returns empty string for empty content', () => {
      expect(renderMarkdownToHtml('')).toBe('');
    });

    it('converts headers', () => {
      const result = renderMarkdownToHtml('# Heading 1');
      expect(result).toContain('<h1>Heading 1</h1>');
    });

    it('converts bold text', () => {
      const result = renderMarkdownToHtml('**bold text**');
      expect(result).toContain('<strong>bold text</strong>');
    });

    it('converts italic text', () => {
      const result = renderMarkdownToHtml('*italic text*');
      expect(result).toContain('<em>italic text</em>');
    });

    it('converts links', () => {
      const result = renderMarkdownToHtml('[click here](https://example.com)');
      expect(result).toContain('<a href="https://example.com">click here</a>');
    });

    it('converts inline code', () => {
      const result = renderMarkdownToHtml('Use `const x = 1`');
      expect(result).toContain('<code>const x = 1</code>');
    });
  });

  describe('dbPostToPublicPost', () => {
    const mockDbPost: IDbBlogPost = {
      id: 'post-1',
      title: 'Test Post',
      slug: 'test-post',
      description: 'A test post',
      content: '# Hello',
      content_html: '<h1>Hello</h1>',
      author: 'John',
      category_id: 'cat-1',
      cover_image_id: 'img-1',
      status: 'published',
      reading_time: '3 min read',
      meta_title: 'Test Post Meta',
      meta_description: 'Meta desc',
      published_at: '2025-01-15T00:00:00Z',
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
      created_by: 'user-1',
      source: 'db',
      category_name: 'Tech',
      category_slug: 'tech',
      cover_image_url: 'https://example.com/image.jpg',
      tags: ['seo', 'blog'],
    };

    it('maps all fields correctly', () => {
      const result = dbPostToPublicPost(mockDbPost);
      expect(result.slug).toBe('test-post');
      expect(result.title).toBe('Test Post');
      expect(result.description).toBe('A test post');
      expect(result.author).toBe('John');
      expect(result.category).toBe('Tech');
      expect(result.tags).toEqual(['seo', 'blog']);
      expect(result.image).toBe('https://example.com/image.jpg');
      expect(result.readingTime).toBe('3 min read');
      expect(result.source).toBe('db');
      expect(result.content).toBe('<h1>Hello</h1>');
    });

    it('uses published_at for date when available', () => {
      const result = dbPostToPublicPost(mockDbPost);
      expect(result.date).toBe('2025-01-15T00:00:00Z');
    });

    it('falls back to created_at when published_at is null', () => {
      const result = dbPostToPublicPost({ ...mockDbPost, published_at: null });
      expect(result.date).toBe('2025-01-10T00:00:00Z');
    });

    it('defaults author to team name when null', () => {
      const result = dbPostToPublicPost({ ...mockDbPost, author: null });
      expect(result.author).toBe('AutopilotRank Team');
    });

    it('defaults category to General when null', () => {
      const result = dbPostToPublicPost({ ...mockDbPost, category_name: null });
      expect(result.category).toBe('General');
    });
  });

  describe('dbPostToMeta', () => {
    const mockDbPost: IDbBlogPost = {
      id: 'post-1',
      title: 'Test Post',
      slug: 'test-post',
      description: 'A test post',
      content: '# Hello',
      content_html: '<h1>Hello</h1>',
      author: 'John',
      category_id: 'cat-1',
      cover_image_id: 'img-1',
      status: 'published',
      reading_time: '3 min read',
      meta_title: null,
      meta_description: null,
      published_at: '2025-01-15T00:00:00Z',
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
      created_by: 'user-1',
      source: 'db',
      category_name: 'Tech',
      category_slug: 'tech',
      cover_image_url: null,
      tags: ['seo'],
    };

    it('does not include content field', () => {
      const result = dbPostToMeta(mockDbPost);
      expect(result).not.toHaveProperty('content');
    });

    it('maps metadata fields correctly', () => {
      const result = dbPostToMeta(mockDbPost);
      expect(result.slug).toBe('test-post');
      expect(result.title).toBe('Test Post');
      expect(result.source).toBe('db');
      expect(result.tags).toEqual(['seo']);
    });

    it('sets image to undefined when cover_image_url is null', () => {
      const result = dbPostToMeta(mockDbPost);
      expect(result.image).toBeUndefined();
    });
  });
});
