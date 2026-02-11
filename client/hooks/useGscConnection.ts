/**
 * useGscConnection Hook
 * React hook for Google Search Console connection management with React Query
 *
 * Features:
 * - Fetch GSC connection for a project
 * - Initiate OAuth connection flow (redirect to Google)
 * - Disconnect GSC
 * - Select a site URL for the connection
 * - Toast notifications via useMutationWithToast
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type {
  IGscConnectionSafe,
  IGscConnectResponse,
  IGscSitesResponse,
  IGscSite,
} from '@shared/types/opportunity.types';
import { apiFetch } from '@client/utils/api-client';
import { getTranslations } from '@src/i18n/utils';
import { useMutationWithToast } from './useMutationWithToast';

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch the GSC connection for a project (returns the first active connection)
 */
async function fetchConnection(projectId: string): Promise<IGscConnectionSafe | null> {
  const data = await apiFetch<{ connections: IGscConnectionSafe[] }>(
    `/api/gsc/connections?projectId=${projectId}`,
    { method: 'GET' }
  );
  return data.connections?.[0] ?? null;
}

/**
 * Initiate GSC OAuth flow — returns an authUrl to redirect to
 */
async function connectGsc(projectId: string): Promise<IGscConnectResponse> {
  const data = await apiFetch<IGscConnectResponse>('/api/gsc/connect', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });
  return data;
}

/**
 * Disconnect a GSC connection
 */
async function disconnectGsc(connectionId: string): Promise<void> {
  await apiFetch<void>(`/api/gsc/connections?connectionId=${connectionId}`, {
    method: 'DELETE',
  });
}

/**
 * Update the selected site URL for a connection
 */
async function updateSiteUrl(connectionId: string, siteUrl: string): Promise<IGscConnectionSafe> {
  const data = await apiFetch<{ connection: IGscConnectionSafe }>(
    `/api/gsc/connections/${connectionId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ siteUrl }),
    }
  );
  return data.connection;
}

/**
 * Fetch verified sites for a connection
 */
async function fetchSites(connectionId: string): Promise<IGscSite[]> {
  const data = await apiFetch<IGscSitesResponse>(`/api/gsc/connections/${connectionId}/sites`, {
    method: 'GET',
  });
  return data.sites ?? [];
}

// =============================================================================
// Hook
// =============================================================================

interface IUseGscConnectionReturn {
  /** Current GSC connection (or null if not connected) */
  connection: IGscConnectionSafe | null;
  /** Whether the connection query is loading */
  isLoading: boolean;
  /** Error from the connection query */
  error: Error | null;
  /** Initiate the OAuth flow — redirects to Google */
  connect: (projectId: string) => void;
  /** Disconnect the current GSC connection */
  disconnect: () => Promise<void>;
  /** Select a site URL for the connection */
  selectSite: (siteUrl: string) => Promise<void>;
  /** Whether the connection is active */
  isConnected: boolean;
  /** Whether a connect mutation is in progress */
  isConnecting: boolean;
  /** Whether a disconnect mutation is in progress */
  isDisconnecting: boolean;
  /** Whether a site selection mutation is in progress */
  isSelectingSite: boolean;
  /** Available GSC sites for the connection */
  sites: IGscSite[];
  /** Whether the sites query is loading */
  isLoadingSites: boolean;
  /** Refetch the connection */
  refetch: () => void;
}

export function useGscConnection(projectId: string | null | undefined): IUseGscConnectionReturn {
  const queryClient = useQueryClient();
  const t = useMemo(() => getTranslations('dashboard'), []);

  // Fetch connection query
  const {
    data: connection = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gsc-connection', projectId],
    queryFn: () => (projectId ? fetchConnection(projectId) : Promise.resolve(null)),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isConnected = useMemo(() => {
    return connection?.status === 'active';
  }, [connection]);

  // Fetch sites query — only when connected
  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['gsc-sites', connection?.id],
    queryFn: () => (connection?.id ? fetchSites(connection.id) : Promise.resolve([])),
    enabled: !!connection?.id && connection.status === 'active',
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (pId: string) => connectGsc(pId),
    onSuccess: data => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => {
      if (!connection?.id) return Promise.reject(new Error('No connection to disconnect'));
      return disconnectGsc(connection.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gsc-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gsc-connections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gsc-sites'] });
    },
  });

  // Select site mutation
  const selectSiteMutation = useMutation({
    mutationFn: (siteUrl: string) => {
      if (!connection?.id) return Promise.reject(new Error('No connection'));
      return updateSiteUrl(connection.id, siteUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gsc-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gsc-connections', projectId] });
    },
  });

  // Wrapped mutation functions with toast notifications
  const handleConnect = useMutationWithToast(connectMutation, {
    successMessage: t('opportunities.success.connected'),
    errorMessage: t('opportunities.error.connect'),
    loggerContext: 'Failed to connect Google Search Console',
  });

  const handleDisconnect = useMutationWithToast(disconnectMutation, {
    successMessage: t('opportunities.success.disconnected'),
    errorMessage: t('opportunities.error.disconnect'),
    loggerContext: 'Failed to disconnect Google Search Console',
  });

  const handleSelectSite = useMutationWithToast(selectSiteMutation, {
    successMessage: t('opportunities.success.connected'),
    errorMessage: t('opportunities.error.connect'),
    loggerContext: 'Failed to select GSC site',
  });

  const connect = useCallback(
    (pId: string) => {
      handleConnect(pId);
    },
    [handleConnect]
  );

  const disconnect = useCallback(async () => {
    await handleDisconnect(undefined as void);
  }, [handleDisconnect]);

  const selectSite = useCallback(
    async (siteUrl: string) => {
      await handleSelectSite(siteUrl);
    },
    [handleSelectSite]
  );

  return {
    connection,
    isLoading,
    error,
    connect,
    disconnect,
    selectSite,
    isConnected,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSelectingSite: selectSiteMutation.isPending,
    sites,
    isLoadingSites,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['gsc-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gsc-connections', projectId] });
    },
  };
}
