'use client';

/* global RequestInit, BodyInit */

import { useCallback } from 'react';
import { getAccessToken } from '@client/utils/api-client';

interface IUseApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  authenticated?: boolean;
  headers?: Record<string, string>;
  body?: unknown;
  unwrapData?: boolean;
}

function shouldSerializeJson(body: unknown): boolean {
  if (body === null || body === undefined) return false;
  if (typeof body === 'string') return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof URLSearchParams) return false;
  return true;
}

function getErrorMessage(errorBody: unknown, status: number): string {
  if (!errorBody || typeof errorBody !== 'object') {
    return `HTTP ${status}`;
  }

  const typedError = errorBody as {
    error?: string | { message?: string };
    message?: string;
  };

  if (typeof typedError.error === 'string') {
    return typedError.error;
  }

  if (typeof typedError.error === 'object' && typedError.error?.message) {
    return typedError.error.message;
  }

  if (typeof typedError.message === 'string') {
    return typedError.message;
  }

  return `HTTP ${status}`;
}

export function useApiRequest(): {
  request: <TResponse = unknown>(url: string, options?: IUseApiRequestOptions) => Promise<TResponse>;
} {
  const request = useCallback(
    async <TResponse = unknown>(
      url: string,
      options: IUseApiRequestOptions = {}
    ): Promise<TResponse> => {
      const {
        authenticated = true,
        headers: customHeaders = {},
        body,
        unwrapData = true,
        credentials = 'include',
        ...rest
      } = options;

      const headers: Record<string, string> = { ...customHeaders };

      if (authenticated) {
        const accessToken = await getAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      let fetchBody: BodyInit | undefined;
      if (body !== undefined) {
        if (shouldSerializeJson(body)) {
          headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
          fetchBody = JSON.stringify(body);
        } else {
          fetchBody = body as BodyInit;
        }
      }

      const response = await fetch(url, {
        ...rest,
        credentials,
        headers,
        body: fetchBody,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(getErrorMessage(errorBody, response.status));
      }

      if (response.status === 204 || response.status === 205) {
        return undefined as TResponse;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return undefined as TResponse;
      }

      const raw = (await response.json().catch(() => undefined)) as unknown;
      if (raw === undefined) {
        return undefined as TResponse;
      }

      if (unwrapData && raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
        return (raw as { data: TResponse }).data;
      }

      return raw as TResponse;
    },
    []
  );

  return { request };
}
