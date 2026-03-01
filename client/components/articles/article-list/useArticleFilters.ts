/**
 * useArticleFilters Hook
 *
 * Manages article filter state with URL persistence for bookmarking and sharing.
 */
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface IArticleFilters {
  campaignId: string;
  status: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

export interface IUseArticleFiltersOptions {
  /** Initial status filter from props */
  propStatusFilter?: string;
}

export interface IUseArticleFiltersReturn {
  filters: IArticleFilters;
  setFilters: Dispatch<SetStateAction<IArticleFilters>>;
  handleFilterChange: (key: keyof IArticleFilters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  isFilterOpen: boolean;
  setIsFilterOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Parse URL query params for filters
 */
function getUrlFilters(propStatusFilter?: string): IArticleFilters {
  if (typeof window === 'undefined') {
    return { campaignId: '', status: propStatusFilter || '', search: '', dateFrom: '', dateTo: '' };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    campaignId: params.get('campaignId') || '',
    status: params.get('status') || propStatusFilter || '',
    search: params.get('search') || '',
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
  };
}

/**
 * Update URL when filters change
 */
function updateUrlFilters(newFilters: IArticleFilters): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (newFilters.campaignId) params.set('campaignId', newFilters.campaignId);
  if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status);
  if (newFilters.search) params.set('search', newFilters.search);
  if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
  if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

  const newUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, '', newUrl);
}

export function useArticleFilters(
  options: IUseArticleFiltersOptions = {}
): IUseArticleFiltersReturn {
  const { propStatusFilter } = options;

  const [filters, setFilters] = useState<IArticleFilters>(() => getUrlFilters(propStatusFilter));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Update URL when filters change
  const handleFilterChange = useCallback((key: keyof IArticleFilters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      updateUrlFilters(newFilters);
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    const clearedFilters: IArticleFilters = {
      campaignId: '',
      status: propStatusFilter || '',
      search: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    updateUrlFilters(clearedFilters);
  }, [propStatusFilter]);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.campaignId || filters.status || filters.search || filters.dateFrom || filters.dateTo);
  }, [filters]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setFilters(getUrlFilters(propStatusFilter));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [propStatusFilter]);

  return {
    filters,
    setFilters,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
    isFilterOpen,
    setIsFilterOpen,
  };
}
