'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@client/utils/admin-api-client';
import type {
  IDbBlogPost,
  IBlogPostCreate,
  IBlogPostUpdate,
  IBlogPostListParams,
  IBlogPostListResponse,
} from '@shared/types/blog.types';

// =============================================================================
// Posts Hooks
// =============================================================================

export interface IUsePostsOptions extends IBlogPostListParams {
  enabled?: boolean;
}

export interface IUsePostsReturn {
  posts: IDbBlogPost[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch blog posts with optional filtering and pagination
 */
export function usePosts(options: IUsePostsOptions = {}): IUsePostsReturn {
  const { page = 1, limit = 20, status, category_id, search, enabled = true } = options;

  const [posts, setPosts] = useState<IDbBlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(category_id && { category_id }),
        ...(search && { search }),
      });
      const data = await adminFetch<IBlogPostListResponse>(`/api/admin/blog/posts?${params}`);
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, status, category_id, search, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { posts, total, page: currentPage, isLoading, error, refetch };
}

export interface IUsePostReturn {
  post: IDbBlogPost | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch a single blog post by ID
 */
export function usePost(postId: string | null, enabled = true): IUsePostReturn {
  const [post, setPost] = useState<IDbBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!postId || !enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await adminFetch<IDbBlogPost>(`/api/admin/blog/posts/${postId}`);
      setPost(data);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [postId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { post, isLoading, error, refetch };
}

export interface IUseCreatePostReturn {
  createPost: (data: IBlogPostCreate) => Promise<{ id: string } | null>;
  isCreating: boolean;
  error: string | null;
}

/**
 * Hook to create a new blog post
 */
export function useCreatePost(onSuccess?: (postId: string) => void): IUseCreatePostReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(
    async (data: IBlogPostCreate): Promise<{ id: string } | null> => {
      setIsCreating(true);
      setError(null);
      try {
        const result = await adminFetch<{ id: string }>('/api/admin/blog/posts', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        onSuccess?.(result.id);
        return result;
      } catch (err) {
        console.error('Failed to create post:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
        setError(errorMessage);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [onSuccess]
  );

  return { createPost, isCreating, error };
}

export interface IUseUpdatePostReturn {
  updatePost: (postId: string, data: IBlogPostUpdate) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook to update an existing blog post
 */
export function useUpdatePost(onSuccess?: (postId: string) => void): IUseUpdatePostReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePost = useCallback(
    async (postId: string, data: IBlogPostUpdate): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);
      try {
        await adminFetch(`/api/admin/blog/posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        onSuccess?.(postId);
        return true;
      } catch (err) {
        console.error('Failed to update post:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
        setError(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [onSuccess]
  );

  return { updatePost, isUpdating, error };
}

export interface IUseDeletePostReturn {
  deletePost: (postId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Hook to delete a blog post
 */
export function useDeletePost(onSuccess?: () => void): IUseDeletePostReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);
      try {
        await adminFetch(`/api/admin/blog/posts/${postId}`, { method: 'DELETE' });
        onSuccess?.();
        return true;
      } catch (err) {
        console.error('Failed to delete post:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
        setError(errorMessage);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess]
  );

  return { deletePost, isDeleting, error };
}
