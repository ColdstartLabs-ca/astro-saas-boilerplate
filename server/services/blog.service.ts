/**
 * Blog Service
 *
 * Handles database CRUD operations for blog posts, categories, and media.
 * Works alongside the MDX-based blog system.
 */

import { supabaseAdmin } from '../supabase/supabaseAdmin';
// Import MDX blog data directly to avoid circular dependency with blog.ts
import blogDataRaw from '@/content/blog-data.json';
import { generateSlug, calculateReadingTime } from '@shared/utils/string';
import type {
  IBlogCategory,
  IBlogCategoryCreate,
  IBlogMedia,
  IBlogMediaCreate,
  IBlogMediaListParams,
  IBlogMediaListResponse,
  IBlogMediaUpdate,
  IBlogPost,
  IBlogPostCreate,
  IBlogPostListParams,
  IBlogPostListResponse,
  IBlogPostMeta,
  IBlogPostUpdate,
  IDbBlogPost,
  BlogPostStatus,
} from '@shared/types/blog.types';

// Type for MDX blog data structure
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

// Parse blog data once at module load
const blogData = blogDataRaw as { posts: IMdxBlogPost[] };

/**
 * Get all MDX post slugs (for slug uniqueness validation)
 * Used internally to prevent DB posts from colliding with MDX post slugs
 */
function getMdxSlugs(): string[] {
  return blogData.posts.map(p => p.slug);
}

/**
 * Render markdown to HTML using markdown-it
 */
export function renderMarkdownToHtml(content: string): string {
  if (!content) return '';

  // Use dynamic import for markdown-it (ESM compatibility)
  // For now, we'll do basic markdown conversion
  // This can be enhanced later with full markdown-it integration
  let html = content;

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Images (must come before links due to ! prefix)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');

  // Paragraphs (must be last)
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<(h[1-6]|ul|ol|blockquote|pre)/g, '<$1');
  html = html.replace(/<\/(h[1-6]|ul|ol|blockquote|pre)>\s*<\/p>/g, '</$1>');

  return html;
}

/**
 * Convert database post to public blog post format
 */
export function dbPostToPublicPost(dbPost: IDbBlogPost): IBlogPost {
  return {
    id: dbPost.id,
    slug: dbPost.slug,
    title: dbPost.title,
    description: dbPost.description || '',
    date: dbPost.published_at || dbPost.created_at,
    author: dbPost.author || 'AutopilotRank Team',
    category: dbPost.category_name || 'General',
    tags: dbPost.tags || [],
    image: dbPost.cover_image_url || undefined,
    readingTime: dbPost.reading_time || '5 min read',
    content: dbPost.content_html || dbPost.content || '',
    source: 'db',
  };
}

/**
 * Convert database post to metadata format
 */
export function dbPostToMeta(dbPost: IDbBlogPost): IBlogPostMeta {
  return {
    slug: dbPost.slug,
    title: dbPost.title,
    description: dbPost.description || '',
    date: dbPost.published_at || dbPost.created_at,
    author: dbPost.author || 'AutopilotRank Team',
    category: dbPost.category_name || 'General',
    tags: dbPost.tags || [],
    image: dbPost.cover_image_url || undefined,
    readingTime: dbPost.reading_time || '5 min read',
    source: 'db',
  };
}

/**
 * Blog Service Class
 */
export class BlogService {
  /**
   * Get all published posts from database (for public display)
   */
  async getPublishedDbPosts(): Promise<IBlogPostMeta[]> {
    try {
      const { data: posts, error } = await supabaseAdmin
        .from('blog_posts')
        .select(
          `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `
        )
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching published posts:', error);
        return [];
      }

      return (posts || []).map(post => this.mapDbPostToMeta(post));
    } catch (error) {
      console.error('Error in getPublishedDbPosts:', error);
      return [];
    }
  }

  /**
   * Get a single published post by slug (for public display)
   */
  async getPublishedDbPostBySlug(slug: string): Promise<IBlogPost | null> {
    try {
      const { data: post, error } = await supabaseAdmin
        .from('blog_posts')
        .select(
          `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `
        )
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !post) {
        return null;
      }

      return this.mapDbPostToPublic(post);
    } catch (error) {
      console.error('Error in getPublishedDbPostBySlug:', error);
      return null;
    }
  }

  /**
   * Get all DB posts (admin view - includes drafts)
   */
  async getAllDbPostsAdmin(params: IBlogPostListParams = {}): Promise<IBlogPostListResponse> {
    const { page = 1, limit = 20, status, category_id, search } = params;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('blog_posts')
      .select(
        `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching admin posts:', error);
      return { posts: [], total: 0, page, limit };
    }

    return {
      posts: (posts || []).map(p => this.mapDbPost(p)),
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Get a single DB post by ID (admin view)
   */
  async getDbPostById(postId: string): Promise<IDbBlogPost | null> {
    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .select(
        `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `
      )
      .eq('id', postId)
      .single();

    if (error || !post) {
      return null;
    }

    return this.mapDbPost(post);
  }

  /**
   * Check if slug exists (for uniqueness validation)
   * Checks both DB blog_posts table and MDX posts from blog-data.json
   */
  async slugExists(slug: string, excludePostId?: string): Promise<boolean> {
    // Check DB first
    let query = supabaseAdmin.from('blog_posts').select('id').eq('slug', slug);

    if (excludePostId) {
      query = query.neq('id', excludePostId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking slug:', error);
      // On DB error, still check MDX to avoid false negatives
    }

    const dbExists = (data?.length || 0) > 0;
    if (dbExists) {
      return true;
    }

    // Check MDX posts
    const mdxSlugs = getMdxSlugs();
    const mdxExists = mdxSlugs.includes(slug);

    return mdxExists;
  }

  /**
   * Create a new blog post
   */
  async createPost(data: IBlogPostCreate, userId: string): Promise<IDbBlogPost> {
    const slug = data.slug || generateSlug(data.title);
    const content = data.content || '';
    const contentHtml = renderMarkdownToHtml(content);
    const readingTime = calculateReadingTime(content);

    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title: data.title,
        slug,
        description: data.description || null,
        content,
        content_html: contentHtml,
        author: data.author || null,
        category_id: data.category_id || null,
        cover_image_id: data.cover_image_id || null,
        status: data.status || 'draft',
        reading_time: readingTime,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
        created_by: userId,
      })
      .select(
        `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    // Insert tags if provided
    if (data.tags && data.tags.length > 0) {
      const tagInserts = data.tags.map(tag => ({ post_id: post.id, tag }));
      await supabaseAdmin.from('blog_post_tags').insert(tagInserts);
    }

    return this.mapDbPost(post);
  }

  /**
   * Update an existing blog post
   */
  async updatePost(postId: string, data: IBlogPostUpdate): Promise<IDbBlogPost> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updates.title = data.title;
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description;
    if (data.author !== undefined) updates.author = data.author;
    if (data.category_id !== undefined) updates.category_id = data.category_id;
    if (data.cover_image_id !== undefined) updates.cover_image_id = data.cover_image_id;
    if (data.meta_title !== undefined) updates.meta_title = data.meta_title;
    if (data.meta_description !== undefined) updates.meta_description = data.meta_description;

    // Handle content changes
    if (data.content !== undefined) {
      updates.content = data.content;
      if (data.content) {
        updates.content_html = renderMarkdownToHtml(data.content);
        updates.reading_time = calculateReadingTime(data.content);
      } else {
        updates.content_html = null;
        updates.reading_time = null;
      }
    }

    // Handle status changes
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'published') {
        // Check if this is a new publish (no previous published_at)
        const { data: existingPost } = await supabaseAdmin
          .from('blog_posts')
          .select('published_at')
          .eq('id', postId)
          .single();

        if (!existingPost?.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updates)
      .eq('id', postId)
      .select(
        `
          *,
          category:blog_categories(name, slug),
          cover_image:blog_media(public_url),
          tags:blog_post_tags(tag)
        `
      )
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    // Update tags if provided
    if (data.tags !== undefined) {
      // Delete existing tags
      await supabaseAdmin.from('blog_post_tags').delete().eq('post_id', postId);

      // Insert new tags
      if (data.tags.length > 0) {
        const tagInserts = data.tags.map(tag => ({ post_id: postId, tag }));
        await supabaseAdmin.from('blog_post_tags').insert(tagInserts);
      }
    }

    return this.mapDbPost(post);
  }

  /**
   * Delete a blog post
   */
  async deletePost(postId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', postId);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<IBlogCategory[]> {
    const { data: categories, error } = await supabaseAdmin
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return categories || [];
  }

  /**
   * Create a new category
   */
  async createCategory(data: IBlogCategoryCreate): Promise<IBlogCategory> {
    const slug = data.slug || generateSlug(data.name);

    const { data: category, error } = await supabaseAdmin
      .from('blog_categories')
      .insert({
        name: data.name,
        slug,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return category;
  }

  /**
   * Get media library with optional search and filtering
   */
  async getMedia(params: IBlogMediaListParams = {}): Promise<IBlogMediaListResponse> {
    const { page = 1, limit = 20, search, tag } = params;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('blog_media')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('alt_text', `%${search}%`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: media, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching media:', error);
      return { media: [], total: 0, page, limit };
    }

    return {
      media: media || [],
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Get a single media item by ID
   */
  async getMediaById(mediaId: string): Promise<IBlogMedia | null> {
    const { data: media, error } = await supabaseAdmin
      .from('blog_media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (error || !media) {
      return null;
    }

    return media;
  }

  /**
   * Create a new media record
   */
  async createMedia(data: IBlogMediaCreate, userId: string): Promise<IBlogMedia> {
    const { data: media, error } = await supabaseAdmin
      .from('blog_media')
      .insert({
        filename: data.filename,
        storage_path: data.storage_path,
        public_url: data.public_url,
        alt_text: data.alt_text || null,
        tags: data.tags || [],
        mime_type: data.mime_type || null,
        file_size: data.file_size || null,
        width: data.width || null,
        height: data.height || null,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create media: ${error.message}`);
    }

    return media;
  }

  /**
   * Update media metadata
   */
  async updateMedia(mediaId: string, data: IBlogMediaUpdate): Promise<IBlogMedia> {
    const updates: Record<string, unknown> = {};

    if (data.alt_text !== undefined) updates.alt_text = data.alt_text;
    if (data.tags !== undefined) updates.tags = data.tags;

    const { data: media, error } = await supabaseAdmin
      .from('blog_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update media: ${error.message}`);
    }

    return media;
  }

  /**
   * Delete media record and file from storage
   */
  async deleteMedia(mediaId: string): Promise<void> {
    // Get media record to find storage path
    const { data: media, error: fetchError } = await supabaseAdmin
      .from('blog_media')
      .select('storage_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      throw new Error('Media not found');
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('autopilotrank-images')
      .remove([media.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue to delete the record even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin.from('blog_media').delete().eq('id', mediaId);

    if (dbError) {
      throw new Error(`Failed to delete media: ${dbError.message}`);
    }
  }

  /**
   * Map database row to IDbBlogPost
   */
  private mapDbPost(row: Record<string, unknown>): IDbBlogPost {
    return {
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      description: row.description as string | null,
      content: row.content as string | null,
      content_html: row.content_html as string | null,
      author: row.author as string | null,
      category_id: row.category_id as string | null,
      cover_image_id: row.cover_image_id as string | null,
      status: row.status as BlogPostStatus,
      reading_time: row.reading_time as string | null,
      meta_title: row.meta_title as string | null,
      meta_description: row.meta_description as string | null,
      published_at: row.published_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: row.created_by as string | null,
      source: 'db',
      category_name: (row.category as Record<string, unknown> | null)?.name as string | null,
      category_slug: (row.category as Record<string, unknown> | null)?.slug as string | null,
      cover_image_url: (row.cover_image as Record<string, unknown> | null)?.public_url as
        | string
        | null,
      tags: ((row.tags as Array<{ tag: string }> | null) || []).map(t => t.tag),
    };
  }

  /**
   * Map database row to public blog post
   */
  private mapDbPostToPublic(row: Record<string, unknown>): IBlogPost {
    const dbPost = this.mapDbPost(row);
    return dbPostToPublicPost(dbPost);
  }

  /**
   * Map database row to blog post metadata
   */
  private mapDbPostToMeta(row: Record<string, unknown>): IBlogPostMeta {
    const dbPost = this.mapDbPost(row);
    return dbPostToMeta(dbPost);
  }
}

// Export singleton instance
export const blogService = new BlogService();
