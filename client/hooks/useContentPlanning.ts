'use client';

import { useCallback, useState } from 'react';
import type { IPlanContentResponse } from '@shared/types/calendar.types';
import { ClientLogger } from '@client/utils/logger';
import { useApiRequest } from '@client/hooks/useApiRequest';

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
  const { request } = useApiRequest();

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
      const data = await request<IPlanContentResponse>(`/api/campaigns/${campaignId}/plan-content`, {
        method: 'POST',
      });
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to plan content';
      ClientLogger.error('useContentPlanning: planContent failed', { campaignId, message });
      setError(message);
    } finally {
      setIsPlanning(false);
    }
  }, [request]);

  return { planContent, isPlanning, result, error, reset };
}
