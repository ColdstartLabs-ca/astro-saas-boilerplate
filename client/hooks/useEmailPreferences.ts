'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@shared/utils/supabase/client';

export interface IEmailPreferences {
  marketing_emails: boolean;
  product_updates: boolean;
  low_credit_alerts: boolean;
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export function useEmailPreferences(): {
  preferences: IEmailPreferences | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updatePreference: (key: keyof IEmailPreferences, value: boolean) => Promise<void>;
  toggle: (key: keyof IEmailPreferences) => void;
} {
  const [preferences, setPreferences] = useState<IEmailPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const headers = await getAuthHeaders();
        const response = await fetch('/api/email/preferences', { headers });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to fetch preferences');
        }

        setPreferences(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Update a single preference
  const updatePreference = useCallback(
    async (key: keyof IEmailPreferences, value: boolean): Promise<void> => {
      try {
        setIsUpdating(true);
        setError(null);

        const headers = await getAuthHeaders();
        const response = await fetch('/api/email/preferences', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ [key]: value }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to update preferences');
        }

        setPreferences(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
        // Revert the change on error
        setPreferences(prev => (prev ? { ...prev, [key]: !value } : null));
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  // Toggle helper
  const toggle = useCallback(
    (key: keyof IEmailPreferences): void => {
      if (!preferences) return;
      updatePreference(key, !preferences[key]);
    },
    [preferences, updatePreference]
  );

  return {
    preferences,
    isLoading,
    isUpdating,
    error,
    updatePreference,
    toggle,
  };
}
