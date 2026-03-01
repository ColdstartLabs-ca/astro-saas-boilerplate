'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@client/utils/admin-api-client';
import type { IBlogCategory } from '@shared/types/blog.types';

// =============================================================================
// Categories Hook
// =============================================================================

export interface IUseCategoriesReturn {
  categories: IBlogCategory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch blog categories
 */
export function useCategories(enabled = true): IUseCategoriesReturn {
  const [categories, setCategories] = useState<IBlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ categories: IBlogCategory[] }>('/api/admin/blog/categories');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { categories, isLoading, error, refetch };
}
