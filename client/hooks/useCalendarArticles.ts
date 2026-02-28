'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ICalendarArticle, ICalendarArticlesResponse } from '@shared/types/calendar.types';
import { getCampaignColorPalette } from '@client/utils/calendarHelpers';

interface IUseCalendarArticlesOptions {
  dateFrom: string; // ISO date string YYYY-MM-DD
  dateTo: string;   // ISO date string YYYY-MM-DD
}

interface IUseCalendarArticlesResult {
  articles: ICalendarArticle[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCalendarArticles({ dateFrom, dateTo }: IUseCalendarArticlesOptions): IUseCalendarArticlesResult {
  const [articles, setArticles] = useState<ICalendarArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const url = `/api/calendar/articles?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data?: ICalendarArticlesResponse; error?: unknown }>;
      })
      .then(body => {
        if (!cancelled) {
          const data = body.data ?? (body as unknown as ICalendarArticlesResponse);
          // Enrich articles with campaignColor derived from campaignId
          const enriched = (data.articles ?? []).map(a => ({
            ...a,
            campaignColor: getCampaignColorPalette(a.campaignId).hex,
          }));
          setArticles(enriched);
          setTotal(data.total ?? enriched.length);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [dateFrom, dateTo, refreshKey]);

  return { articles, total, isLoading, error, refetch };
}
