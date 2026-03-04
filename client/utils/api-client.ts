/**
 * API Client Utilities
 * Provides typed fetch wrapper with auth header injection
 */
import { createClient } from '@shared/utils/supabase/client';

/**
 * Get the current user's access token for API requests
 * @returns Access token or null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Build auth headers for API requests
 * @returns Headers object with Content-Type and Authorization (if authenticated)
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Typed fetch wrapper that handles auth headers and error parsing
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth headers)
 * @returns Parsed JSON response of type T
 * @throws Error with message from response or generic error message
 */
export async function apiFetch<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    authenticated?: boolean;
  } = {}
): Promise<T> {
  const { authenticated = true, ...fetchOptions } = options;
  const headers = authenticated ? await getAuthHeaders() : { 'Content-Type': 'application/json' };
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = typeof error.error === 'object' ? error.error?.message : error.error;
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json();
}
