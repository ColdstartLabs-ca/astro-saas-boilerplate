/**
 * Blog Controller
 *
 * Handles admin-only API endpoints for blog management:
 * - Posts CRUD
 * - Categories CRUD
 * - Media library CRUD
 */

import { BaseController } from './BaseController';
import { requireAdmin, type IAdminCheckResult } from '../middleware/requireAdmin';
import { blogService, generateSlug } from '../services/blog.service';
import { supabaseAdmin } from '../supabase/supabaseAdmin';
import type {
  IBlogPostCreate,
  IBlogPostUpdate,
  IBlogCategoryCreate,
  IBlogMediaCreate,
  IBlogMediaUpdate,
  IBlogPostListParams,
  IBlogMediaListParams,
} from '@shared/types/blog.types';
import { z } from 'zod';

/**
 * Validation schemas
 */
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  author: z.string().max(100).optional(),
  category_id: z.string().uuid().optional().nullable(),
  cover_image_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  cover_image_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const updateMediaSchema = z.object({
  alt_text: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

/**
 * Blog Controller
 */
export class BlogController extends BaseController {
  /**
   * Verify admin access
   */
  private async checkAdminAccess(req: Request): Promise<IAdminCheckResult> {
    return requireAdmin(req);
  }

  /**
   * Handle incoming request
   */
  protected async handle(req: Request): Promise<Response> {
    const path = this.getPath(req);

    // Posts routes
    if (path.includes('/api/admin/blog/posts')) {
      // Check for specific post ID
      const postIdMatch = path.match(/\/api\/admin\/blog\/posts\/([a-f0-9-]+)/);
      if (postIdMatch) {
        const postId = postIdMatch[1];
        if (this.isGet(req)) return this.getPost(req, postId);
        if (this.isPatch(req)) return this.updatePost(req, postId);
        if (this.isDelete(req)) return this.deletePost(req, postId);
        return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
      }

      if (this.isGet(req)) return this.listPosts(req);
      if (this.isPost(req)) return this.createPost(req);
      return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }

    // Categories routes
    if (path.includes('/api/admin/blog/categories')) {
      if (this.isGet(req)) return this.listCategories(req);
      if (this.isPost(req)) return this.createCategory(req);
      return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }

    // Media routes
    if (path.includes('/api/admin/blog/media')) {
      const mediaIdMatch = path.match(/\/api\/admin\/blog\/media\/([a-f0-9-]+)/);
      if (mediaIdMatch) {
        const mediaId = mediaIdMatch[1];
        if (this.isGet(req)) return this.getMedia(req, mediaId);
        if (this.isPatch(req)) return this.updateMediaHandler(req, mediaId);
        if (this.isDelete(req)) return this.deleteMedia(req, mediaId);
        return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
      }

      if (this.isGet(req)) return this.listMedia(req);
      if (this.isPost(req)) return this.uploadMedia(req);
      return this.error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }

    return this.error('NOT_FOUND', 'Endpoint not found', 404);
  }

  // ==========================================
  // Posts endpoints
  // ==========================================

  /**
   * GET /api/admin/blog/posts
   */
  private async listPosts(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const params: IBlogPostListParams = {
      page: parseInt(this.getQueryParam(req, 'page') || '1'),
      limit: Math.min(parseInt(this.getQueryParam(req, 'limit') || '20'), 100),
      status: (this.getQueryParam(req, 'status') as 'draft' | 'published') || undefined,
      category_id: this.getQueryParam(req, 'category_id') || undefined,
      search: this.getQueryParam(req, 'search') || undefined,
    };

    try {
      const result = await blogService.getAllDbPostsAdmin(params);
      return this.json(result);
    } catch (err) {
      console.error('Error listing posts:', err);
      return this.error('FETCH_ERROR', 'Failed to fetch posts', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/blog/posts
   */
  private async createPost(req: Request): Promise<Response> {
    const { isAdmin, userId, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await this.getBody<IBlogPostCreate>(req);

    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      return this.error('VALIDATION_ERROR', 'Invalid input', 400, {
        details: validation.error.flatten(),
      });
    }

    const data = validation.data;

    // Check slug uniqueness
    const slug = data.slug || generateSlug(data.title);
    const slugExists = await blogService.slugExists(slug);
    if (slugExists) {
      return this.error('SLUG_EXISTS', 'A post with this slug already exists', 409);
    }

    try {
      const post = await blogService.createPost(data, userId!);
      return this.json(post, 201);
    } catch (err) {
      console.error('Error creating post:', err);
      return this.error('CREATE_ERROR', 'Failed to create post', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/blog/posts/:id
   */
  private async getPost(req: Request, postId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      const post = await blogService.getDbPostById(postId);
      if (!post) {
        return this.error('NOT_FOUND', 'Post not found', 404);
      }
      return this.json(post);
    } catch (err) {
      console.error('Error fetching post:', err);
      return this.error('FETCH_ERROR', 'Failed to fetch post', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/admin/blog/posts/:id
   */
  private async updatePost(req: Request, postId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await this.getBody<IBlogPostUpdate>(req);

    const validation = updatePostSchema.safeParse(body);
    if (!validation.success) {
      return this.error('VALIDATION_ERROR', 'Invalid input', 400, {
        details: validation.error.flatten(),
      });
    }

    const data = validation.data;

    if (data.slug) {
      const slugExists = await blogService.slugExists(data.slug, postId);
      if (slugExists) {
        return this.error('SLUG_EXISTS', 'A post with this slug already exists', 409);
      }
    }

    try {
      const post = await blogService.updatePost(postId, data);
      return this.json(post);
    } catch (err) {
      console.error('Error updating post:', err);
      return this.error('UPDATE_ERROR', 'Failed to update post', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/admin/blog/posts/:id
   */
  private async deletePost(req: Request, postId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      await blogService.deletePost(postId);
      return this.json({ message: 'Post deleted successfully' });
    } catch (err) {
      console.error('Error deleting post:', err);
      return this.error('DELETE_ERROR', 'Failed to delete post', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ==========================================
  // Categories endpoints
  // ==========================================

  /**
   * GET /api/admin/blog/categories
   */
  private async listCategories(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      const categories = await blogService.getCategories();
      return this.json({ categories });
    } catch (err) {
      console.error('Error listing categories:', err);
      return this.error('FETCH_ERROR', 'Failed to fetch categories', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/blog/categories
   */
  private async createCategory(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await this.getBody<IBlogCategoryCreate>(req);

    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      return this.error('VALIDATION_ERROR', 'Invalid input', 400, {
        details: validation.error.flatten(),
      });
    }

    try {
      const category = await blogService.createCategory(validation.data);
      return this.json(category, 201);
    } catch (err) {
      console.error('Error creating category:', err);
      return this.error('CREATE_ERROR', 'Failed to create category', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ==========================================
  // Media endpoints
  // ==========================================

  /**
   * GET /api/admin/blog/media
   */
  private async listMedia(req: Request): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const params: IBlogMediaListParams = {
      page: parseInt(this.getQueryParam(req, 'page') || '1'),
      limit: Math.min(parseInt(this.getQueryParam(req, 'limit') || '20'), 100),
      search: this.getQueryParam(req, 'search') || undefined,
      tag: this.getQueryParam(req, 'tag') || undefined,
    };

    try {
      const result = await blogService.getMedia(params);
      return this.json(result);
    } catch (err) {
      console.error('Error listing media:', err);
      return this.error('FETCH_ERROR', 'Failed to fetch media', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/blog/media/:id
   */
  private async getMedia(req: Request, mediaId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      const media = await blogService.getMediaById(mediaId);
      if (!media) {
        return this.error('NOT_FOUND', 'Media not found', 404);
      }
      return this.json(media);
    } catch (err) {
      console.error('Error fetching media:', err);
      return this.error('FETCH_ERROR', 'Failed to fetch media', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/blog/media
   */
  private async uploadMedia(req: Request): Promise<Response> {
    const { isAdmin, userId, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return this.error('VALIDATION_ERROR', 'No file provided', 400);
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return this.error('VALIDATION_ERROR', 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 400);
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return this.error('VALIDATION_ERROR', 'File too large. Maximum size: 5MB', 400);
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `blog/${timestamp}-${randomId}.${ext}`;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('autopilotrank-images')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return this.error('UPLOAD_ERROR', 'Failed to upload file', 500, {
          details: uploadError.message,
        });
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from('autopilotrank-images').getPublicUrl(storagePath);

      const metadata: IBlogMediaCreate = {
        filename: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        alt_text: (formData.get('alt_text') as string) || null,
        tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
        mime_type: file.type,
        file_size: file.size,
      };

      const media = await blogService.createMedia(metadata, userId!);
      return this.json(media, 201);
    } catch (err) {
      console.error('Error uploading media:', err);
      return this.error('UPLOAD_ERROR', 'Failed to upload media', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/admin/blog/media/:id
   */
  private async updateMediaHandler(req: Request, mediaId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await this.getBody<IBlogMediaUpdate>(req);

    const validation = updateMediaSchema.safeParse(body);
    if (!validation.success) {
      return this.error('VALIDATION_ERROR', 'Invalid input', 400, {
        details: validation.error.flatten(),
      });
    }

    try {
      const media = await blogService.updateMedia(mediaId, validation.data);
      return this.json(media);
    } catch (err) {
      console.error('Error updating media:', err);
      return this.error('UPDATE_ERROR', 'Failed to update media', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/admin/blog/media/:id
   */
  private async deleteMedia(req: Request, mediaId: string): Promise<Response> {
    const { isAdmin, error } = await this.checkAdminAccess(req);
    if (!isAdmin) return error || this.error('UNAUTHORIZED', 'Unauthorized', 401);

    try {
      await blogService.deleteMedia(mediaId);
      return this.json({ message: 'Media deleted successfully' });
    } catch (err) {
      console.error('Error deleting media:', err);
      return this.error('DELETE_ERROR', 'Failed to delete media', 500, {
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
