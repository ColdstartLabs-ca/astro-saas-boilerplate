'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@client/utils/admin-api-client';
import type {
  IBlogMedia,
  IBlogMediaUpdate,
  IBlogMediaListParams,
  IBlogMediaListResponse,
} from '@shared/types/blog.types';

// =============================================================================
// Media Hooks
// =============================================================================

export interface IUseMediaOptions extends IBlogMediaListParams {
  enabled?: boolean;
}

export interface IUseMediaReturn {
  media: IBlogMedia[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch media library items with optional filtering
 */
export function useMedia(options: IUseMediaOptions = {}): IUseMediaReturn {
  const { page = 1, limit = 100, search, tag, enabled = true } = options;

  const [media, setMedia] = useState<IBlogMedia[]>([]);
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
        ...(search && { search }),
        ...(tag && { tag }),
      });
      const data = await adminFetch<IBlogMediaListResponse>(`/api/admin/blog/media?${params}`);
      setMedia(data.media || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || page);
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, tag, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { media, total, page: currentPage, isLoading, error, refetch };
}

export interface IUploadMediaResult {
  id: string;
  public_url: string;
}

export interface IUseUploadMediaReturn {
  uploadMedia: (
    file: File,
    altText?: string,
    tags?: string[]
  ) => Promise<IUploadMediaResult | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Hook to upload media files
 * Note: Uses direct fetch for FormData upload (adminFetch doesn't support multipart)
 */
export function useUploadMedia(
  onSuccess?: (media: IUploadMediaResult) => void
): IUseUploadMediaReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = useCallback(
    async (file: File, altText?: string, tags?: string[]): Promise<IUploadMediaResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Import supabase client dynamically
        const { createClient } = await import('@shared/utils/supabase/client');
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', altText || file.name.replace(/\.[^/.]+$/, ''));
        if (tags && tags.length > 0) {
          formData.append('tags', JSON.stringify(tags));
        }

        setProgress(50);

        const response = await fetch('/api/admin/blog/media', {
          method: 'POST',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || 'Failed to upload media');
        }

        setProgress(100);

        const result = (await response.json()) as IBlogMedia;
        const uploadResult: IUploadMediaResult = {
          id: result.id,
          public_url: result.public_url,
        };
        onSuccess?.(uploadResult);
        return uploadResult;
      } catch (err) {
        console.error('Failed to upload media:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload media';
        setError(errorMessage);
        return null;
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [onSuccess]
  );

  return { uploadMedia, isUploading, progress, error };
}

export interface IUseUpdateMediaReturn {
  updateMedia: (mediaId: string, data: IBlogMediaUpdate) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook to update media metadata (alt text, tags)
 */
export function useUpdateMedia(onSuccess?: (mediaId: string) => void): IUseUpdateMediaReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMedia = useCallback(
    async (mediaId: string, data: IBlogMediaUpdate): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);
      try {
        await adminFetch(`/api/admin/blog/media/${mediaId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        onSuccess?.(mediaId);
        return true;
      } catch (err) {
        console.error('Failed to update media:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to update media';
        setError(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [onSuccess]
  );

  return { updateMedia, isUpdating, error };
}

export interface IUseDeleteMediaReturn {
  deleteMedia: (mediaId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Hook to delete media
 */
export function useDeleteMedia(onSuccess?: () => void): IUseDeleteMediaReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMedia = useCallback(
    async (mediaId: string): Promise<boolean> => {
      setIsDeleting(true);
      setError(null);
      try {
        await adminFetch(`/api/admin/blog/media/${mediaId}`, { method: 'DELETE' });
        onSuccess?.();
        return true;
      } catch (err) {
        console.error('Failed to delete media:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete media';
        setError(errorMessage);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [onSuccess]
  );

  return { deleteMedia, isDeleting, error };
}
