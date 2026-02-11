'use client';

import { useOpportunities } from '@client/hooks/useOpportunities';
import { useProjects } from '@client/hooks/useProjects';
import { useGscConnection } from '@client/hooks/useGscConnection';
import { OpportunitiesView } from '@client/components/dashboard/views/OpportunitiesView';
import { OpportunityDetailPanel } from '@client/components/dashboard/views/opportunities/OpportunityDetailPanel';
import { useState, useMemo, useCallback } from 'react';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';

export default function OpportunitiesPage(): JSX.Element {
  const { activeProject } = useProjects();
  const {
    opportunities,
    isLoading,
    isAnalyzing,
    lastAnalyzedAt,
    analyzeOpportunities,
    dismissOpportunity,
    createArticle,
    isCreatingArticle,
    markComplete,
  } = useOpportunities(activeProject?.id ?? null);

  const {
    connection: gscConnection,
    isLoading: isLoadingGsc,
    isConnected: hasGscConnection,
    connect: connectGsc,
    disconnect: disconnectGsc,
    selectSite: selectGscSite,
    sites: gscSites,
    isConnecting: isConnectingGsc,
    isDisconnecting: isDisconnectingGsc,
    isLoadingSites: isLoadingGscSites,
  } = useGscConnection(activeProject?.id);

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  const selectedOpportunity = useMemo(() => {
    if (!selectedOpportunityId) return null;
    return opportunities.find(o => o.id === selectedOpportunityId) ?? null;
  }, [selectedOpportunityId, opportunities]);

  const handleOpportunityClick = useCallback((id: string) => {
    setSelectedOpportunityId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedOpportunityId(null);
  }, []);

  const handleAnalyze = () => {
    analyzeOpportunities();
  };

  const handleDismiss = useCallback(
    (id: string) => {
      dismissOpportunity(id);
    },
    [dismissOpportunity]
  );

  const handleCreateArticle = useCallback(
    async (opportunityId: string) => {
      if (!activeProject?.id) return;
      try {
        const result = await createArticle(opportunityId, activeProject.id);
        // Navigate to the created campaign
        dashboardNavigate(`/dashboard/campaigns/${result.campaignId}`);
      } catch {
        // Error is handled by toast in the hook
      }
    },
    [activeProject?.id, createArticle]
  );

  const handleMarkComplete = useCallback(
    (opportunityId: string) => {
      markComplete(opportunityId);
    },
    [markComplete]
  );

  const handleConnectGsc = () => {
    if (activeProject?.id) {
      connectGsc(activeProject.id);
    }
  };

  const handleDisconnectGsc = () => {
    disconnectGsc();
  };

  const handleSelectGscSite = (siteUrl: string) => {
    selectGscSite(siteUrl);
  };

  return (
    <>
      <OpportunitiesView
        opportunities={opportunities}
        isLoading={isLoading}
        isAnalyzing={isAnalyzing}
        lastAnalyzedAt={lastAnalyzedAt}
        activeProject={activeProject ?? null}
        hasGscConnection={hasGscConnection}
        onAnalyze={handleAnalyze}
        onOpportunityClick={handleOpportunityClick}
        onDismiss={handleDismiss}
        onCreateArticle={handleCreateArticle}
        onConnectGsc={handleConnectGsc}
        gscConnection={gscConnection}
        isLoadingGsc={isLoadingGsc}
        onDisconnectGsc={handleDisconnectGsc}
        onSelectGscSite={handleSelectGscSite}
        gscSites={gscSites}
        isConnectingGsc={isConnectingGsc}
        isDisconnectingGsc={isDisconnectingGsc}
        isLoadingGscSites={isLoadingGscSites}
      />
      <OpportunityDetailPanel
        opportunity={selectedOpportunity}
        isOpen={selectedOpportunityId !== null}
        onClose={handleCloseDetail}
        onCreateArticle={handleCreateArticle}
        onDismiss={handleDismiss}
        onMarkComplete={handleMarkComplete}
        isCreatingArticle={isCreatingArticle}
      />
    </>
  );
}
