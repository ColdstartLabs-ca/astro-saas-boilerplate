/**
 * Blog Service - MDX File-Based Blog System
 *
 * Reads blog posts from content/blog-data.json (compiled from MDX at build time).
 * Edge-compatible — no filesystem or database access at runtime.
 */

import blogDataRaw from '@/content/blog-data.json';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: false,
});

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
}

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
}

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
  content?: string;
}

const blogData = blogDataRaw as { posts: IMdxBlogPost[] };

export function getAllPosts(): IBlogPostMeta[] {
  return blogData.posts
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
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): IBlogPost | null {
  const post = blogData.posts.find(p => p.slug === slug);
  if (!post) return null;
  return {
    ...post,
    readingTime: post.readingTime || '5 min read',
    content: marked.parse(post.content ?? '', { async: false }) as string,
  };
}

export function getAllSlugs(): string[] {
  return blogData.posts.map(p => p.slug);
}

export function getPostsByCategory(category: string): IBlogPostMeta[] {
  return getAllPosts().filter(p => p.category.toLowerCase() === category.toLowerCase());
}

export function getPostsByTag(tag: string): IBlogPostMeta[] {
  return getAllPosts().filter(p => p.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
}

export function getAllCategories(): string[] {
  return Array.from(new Set(blogData.posts.map(p => p.category)));
}

export function getAllTags(): string[] {
  return Array.from(new Set(blogData.posts.flatMap(p => p.tags)));
}

// Async aliases for forward-compatibility (e.g., adding a DB source later)
export async function getAllPostsAsync(): Promise<IBlogPostMeta[]> {
  return getAllPosts();
}

export async function getPostBySlugAsync(slug: string): Promise<IBlogPost | null> {
  return getPostBySlug(slug);
}
