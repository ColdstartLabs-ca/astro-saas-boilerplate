/**
 * Blog Service - Hybrid MDX + Database Blog System
 *
 * This module provides a unified interface for blog posts from two sources:
 * 1. MDX file-based posts (compiled to blog-data.json at build time)
 * 2. Database posts (stored in Supabase blog_posts table)
 *
 * Both sources are merged at read time, sorted by date, and de-duplicated by slug.
 * Database posts take precedence on slug collision.
 */

import blogDataRaw from '@/content/blog-data.json';
import { marked } from 'marked';
import { blogService } from './services/blog.service';
import type { IBlogPostMeta as ISharedBlogPostMeta } from '@shared/types/blog.types';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: false,
});

const blogData = blogDataRaw as { posts: IMdxBlogPost[] };

/**
 * Legacy MDX blog post interface (backward compatible)
 */
export interface IBlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: string;
  content: string;
  source?: 'mdx' | 'db';
}

/**
 * Legacy blog post metadata interface (backward compatible)
 */
export interface IBlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: string;
  source?: 'mdx' | 'db';
}

/**
 * Internal MDX post structure from blog-data.json
 */
interface IMdxBlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime?: string;
  content: string;
}

/**
 * Merge MDX posts with DB posts
 * - DB posts win on slug collision
 * - Results sorted by date (newest first)
 */
function mergePostSources(
  mdxPosts: IBlogPostMeta[],
  dbPosts: ISharedBlogPostMeta[]
): IBlogPostMeta[] {
  const mdxWithSource = mdxPosts.map(p => ({ ...p, source: 'mdx' as const }));
  const dbWithSource = dbPosts.map(p => ({
    ...p,
    source: 'db' as const,
    readingTime: p.readingTime,
  }));

  // Use Map to deduplicate by slug (DB posts win on collision)
  const bySlug = new Map<string, IBlogPostMeta>();
  for (const post of [...mdxWithSource, ...dbWithSource]) {
    if (!bySlug.has(post.slug) || post.source === 'db') {
      bySlug.set(post.slug, post);
    }
  }

  // Sort by date (newest first)
  return Array.from(bySlug.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Get MDX posts as metadata (synchronous)
 */
function getMdxPostsMeta(): IBlogPostMeta[] {
  return blogData.posts.map(post => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    author: post.author,
    category: post.category,
    tags: post.tags,
    image: post.image,
    readingTime: post.readingTime || '5 min read',
    source: 'mdx' as const,
  }));
}

/**
 * Get all blog posts (sorted by date, newest first)
 * Edge-compatible - no filesystem access
 * Synchronous version: returns only MDX posts
 */
export function getAllPosts(): IBlogPostMeta[] {
  return getMdxPostsMeta();
}

/**
 * Get all blog posts (async version, includes DB posts)
 * Merges MDX + DB posts, sorted by date
 */
export async function getAllPostsAsync(): Promise<IBlogPostMeta[]> {
  try {
    const [mdxPosts, dbPosts] = await Promise.all([
      Promise.resolve(getMdxPostsMeta()),
      blogService.getPublishedDbPosts(),
    ]);
    return mergePostSources(mdxPosts, dbPosts);
  } catch (error) {
    console.warn('Failed to fetch DB posts, falling back to MDX-only:', error);
    return getMdxPostsMeta();
  }
}

/**
 * Get a single post by slug
 * Edge-compatible - no filesystem access
 * Synchronous version: returns only MDX posts
 */
export function getPostBySlug(slug: string): IBlogPost | null {
  const post = blogData.posts.find(p => p.slug === slug);
  if (!post) return null;
  return {
    ...post,
    readingTime: post.readingTime || '5 min read',
    content: marked.parse(post.content, { async: false }) as string,
    source: 'mdx' as const,
  };
}

/**
 * Get a single post by slug (async version, checks DB first)
 */
export async function getPostBySlugAsync(slug: string): Promise<IBlogPost | null> {
  try {
    // Check DB first (DB posts take precedence)
    const dbPost = await blogService.getPublishedDbPostBySlug(slug);
    if (dbPost) {
      return {
        ...dbPost,
        source: 'db' as const,
      };
    }
  } catch (error) {
    console.warn('Failed to fetch DB post, falling back to MDX:', error);
  }

  // Fall back to MDX
  return getPostBySlug(slug);
}

/**
 * Get all slugs for static generation
 */
export function getAllSlugs(): string[] {
  return blogData.posts.map(p => p.slug);
}

/**
 * Get posts by category
 */
export function getPostsByCategory(category: string): IBlogPostMeta[] {
  return getAllPosts().filter(post => post.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get posts by category (async, includes DB)
 */
export async function getPostsByCategoryAsync(category: string): Promise<IBlogPostMeta[]> {
  const posts = await getAllPostsAsync();
  return posts.filter(post => post.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get posts by tag
 */
export function getPostsByTag(tag: string): IBlogPostMeta[] {
  return getAllPosts().filter(post => post.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
}

/**
 * Get posts by tag (async, includes DB)
 */
export async function getPostsByTagAsync(tag: string): Promise<IBlogPostMeta[]> {
  const posts = await getAllPostsAsync();
  return posts.filter(post => post.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(blogData.posts.map(p => p.category));
  return Array.from(categories);
}

/**
 * Get all unique categories (async, includes DB)
 */
export async function getAllCategoriesAsync(): Promise<string[]> {
  const posts = await getAllPostsAsync();
  const categories = new Set(posts.map(p => p.category));
  return Array.from(categories);
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set(blogData.posts.flatMap(p => p.tags));
  return Array.from(tags);
}

/**
 * Get all unique tags (async, includes DB)
 */
export async function getAllTagsAsync(): Promise<string[]> {
  const posts = await getAllPostsAsync();
  const tags = new Set(posts.flatMap(p => p.tags));
  return Array.from(tags);
}

/**
 * Get posts by slugs (for related posts sections)
 */
export function getPostsBySlugs(slugs: string[]): IBlogPostMeta[] {
  return slugs
    .map(slug => blogData.posts.find(p => p.slug === slug))
    .filter((post): post is IMdxBlogPost => post !== undefined)
    .map(post => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      author: post.author,
      category: post.category,
      tags: post.tags,
      image: post.image,
      readingTime: post.readingTime || '5 min read',
      source: 'mdx' as const,
    }));
}
