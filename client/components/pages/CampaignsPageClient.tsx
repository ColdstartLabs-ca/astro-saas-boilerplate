'use client';

import { useCampaigns } from '@client/hooks/useCampaigns';
import { useProjects } from '@client/hooks/useProjects';
import { CampaignsView } from '@client/components/dashboard/views/CampaignsView';
import { CampaignDetailView } from '@client/components/dashboard/views/CampaignDetailView';
import { NewCampaignModal } from '@client/components/dashboard/views/NewCampaignModal';
import { useState, useEffect } from 'react';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import type { CampaignTone } from '@shared/types/campaign.types';

interface ICampaignsPageClientProps {
  campaignId?: string;
}

export default function CampaignsPage({ campaignId }: ICampaignsPageClientProps): JSX.Element {
  const { activeProject } = useProjects();
  const { campaigns, isLoading, createCampaign, deleteCampaign } = useCampaigns(
    activeProject?.id ?? null
  );
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(campaignId ?? null);

  // Update selected campaign when URL param changes
  useEffect(() => {
    if (campaignId) {
      setSelectedCampaignId(campaignId);
    }
  }, [campaignId]);

  const isDetailView = !!selectedCampaignId;

  const handleNewCampaign = () => {
    setIsNewCampaignModalOpen(true);
  };

  const handleBackToList = () => {
    setSelectedCampaignId(null);
    dashboardNavigate('/dashboard/campaigns');
  };

  const handleCampaignClick = (id: string) => {
    setSelectedCampaignId(id);
    dashboardNavigate(`/dashboard/campaigns/${id}`);
  };

  const handleCreateCampaign = async (input: {
    name: string;
    projectId: string;
    keywords: string[];
    model?: string;
    tone?: CampaignTone;
    targetWordCount?: number;
  }) => {
    await createCampaign(input);
    setIsNewCampaignModalOpen(false);
  };

  const handleDeleteCampaign = async (campaignIdToDelete: string) => {
    await deleteCampaign(campaignIdToDelete);
  };

  return (
    <>
      {isDetailView ? (
        <CampaignDetailView campaignId={selectedCampaignId!} onBackToList={handleBackToList} />
      ) : (
        <CampaignsView
          campaigns={campaigns}
          isLoading={isLoading}
          onNewCampaign={handleNewCampaign}
          onCampaignClick={handleCampaignClick}
          onDeleteCampaign={handleDeleteCampaign}
          selectedCampaignId={selectedCampaignId}
          onBackToList={() => {}}
          projectId={activeProject?.id ?? null}
        />
      )}
      <NewCampaignModal
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        onSubmit={handleCreateCampaign}
        projectId={activeProject?.id ?? ''}
      />
    </>
  );
}
