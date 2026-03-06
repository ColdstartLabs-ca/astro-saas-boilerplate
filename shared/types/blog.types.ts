/**
 * Blog TypeScript Types
 * Shared types for both MDX file-based posts and database-backed posts
 */

/**
 * Post source identifier
 * - 'mdx': File-based posts from content/blog/*.mdx
 * - 'db': Database posts from blog_posts table
 */
export type BlogPostSource = 'mdx' | 'db';

/**
 * Blog post status (only applies to DB posts)
 */
export type BlogPostStatus = 'draft' | 'published';

/**
 * Base blog post interface - common fields between MDX and DB posts
 */
export interface IBlogPostBase {
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

/**
 * Blog post metadata (for listings)
 */
export interface IBlogPostMeta extends IBlogPostBase {
  source: BlogPostSource;
}

/**
 * Full blog post with content
 */
export interface IBlogPost extends IBlogPostMeta {
  id?: string;
  content: string;
}

/**
 * Database blog post (raw from database)
 */
export interface IDbBlogPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  content_html: string | null;
  author: string | null;
  category_id: string | null;
  cover_image_id: string | null;
  status: BlogPostStatus;
  reading_time: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Source identifier (always 'db' for database posts)
  source: 'db';
  // Joined fields
  category_name?: string | null;
  category_slug?: string | null;
  cover_image_url?: string | null;
  tags?: string[];
}

/**
 * Blog category
 */
export interface IBlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

/**
 * Blog media (image library)
 */
export interface IBlogMedia {
  id: string;
  filename: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  tags: string[];
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
}

/**
 * Create blog post request
 */
export interface IBlogPostCreate {
  title: string;
  slug?: string;
  description?: string | null;
  content?: string;
  author?: string | null;
  category_id?: string | null;
  cover_image_id?: string | null;
  status?: BlogPostStatus;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string[];
}

/**
 * Update blog post request
 */
export interface IBlogPostUpdate {
  title?: string;
  slug?: string;
  description?: string | null;
  content?: string | null;
  author?: string | null;
  category_id?: string | null;
  cover_image_id?: string | null;
  status?: BlogPostStatus;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string[];
}

/**
 * Create blog category request
 */
export interface IBlogCategoryCreate {
  name: string;
  slug?: string;
  description?: string;
}

/**
 * Create blog media request
 */
export interface IBlogMediaCreate {
  filename: string;
  storage_path: string;
  public_url: string;
  alt_text?: string | null;
  tags?: string[];
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
}

/**
 * Update blog media request
 */
export interface IBlogMediaUpdate {
  alt_text?: string | null;
  tags?: string[];
}

/**
 * Blog post list query params (admin)
 */
export interface IBlogPostListParams {
  page?: number;
  limit?: number;
  status?: BlogPostStatus;
  category_id?: string;
  search?: string;
}

/**
 * Blog post list response (admin)
 */
export interface IBlogPostListResponse {
  posts: IDbBlogPost[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Blog media list query params
 */
export interface IBlogMediaListParams {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}

/**
 * Blog media list response
 */
export interface IBlogMediaListResponse {
  media: IBlogMedia[];
  total: number;
  page: number;
  limit: number;
}
