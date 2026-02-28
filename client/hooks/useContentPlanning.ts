'use client';

import { useCallback, useState } from 'react';
import type { IPlanContentResponse } from '@shared/types/calendar.types';
import { ClientLogger } from '@client/utils/logger';

interface IUseContentPlanningResult {
  planContent: (campaignId: string) => Promise<void>;
  isPlanning: boolean;
  result: IPlanContentResponse | null;
  error: string | null;
  reset: () => void;
}

export function useContentPlanning(): IUseContentPlanningResult {
  const [isPlanning, setIsPlanning] = useState(false);
  const [result, setResult] = useState<IPlanContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsPlanning(false);
    setResult(null);
    setError(null);
  }, []);

  const planContent = useCallback(async (campaignId: string) => {
    setIsPlanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/plan-content`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
        );
      }
      const body = await res.json();
      const data = (body as { data?: IPlanContentResponse }).data ?? (body as IPlanContentResponse);
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to plan content';
      ClientLogger.error('useContentPlanning: planContent failed', { campaignId, message });
      setError(message);
    } finally {
      setIsPlanning(false);
    }
  }, []);

  return { planContent, isPlanning, result, error, reset };
}
