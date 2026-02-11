'use client';

import { useState, useCallback } from 'react';
import { Plug, X, Plus, ToggleLeft, ToggleRight, Loader2, Globe, Webhook } from 'lucide-react';
import type {
  IIntegrationWithCampaigns,
  ICampaignIntegrationWithDetails,
} from '@shared/types/integration.types';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { apiFetch } from '@client/utils/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ICampaignIntegrationsSectionProps {
  campaignId: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface ICampaignIntegrationsData {
  integrations: ICampaignIntegrationWithDetails[];
  autoPublish: boolean;
}

async function fetchCampaignIntegrations(campaignId: string): Promise<ICampaignIntegrationsData> {
  const data = await apiFetch<{ data: ICampaignIntegrationsData }>(
    `/api/campaigns/${campaignId}/integrations`,
    { method: 'GET' }
  );
  return data.data ?? { integrations: [], autoPublish: false };
}

async function fetchUserIntegrations(): Promise<IIntegrationWithCampaigns[]> {
  const data = await apiFetch<{ data: { integrations: IIntegrationWithCampaigns[] } }>(
    '/api/integrations',
    { method: 'GET' }
  );
  return data.data.integrations ?? [];
}

async function saveCampaignIntegrations(
  campaignId: string,
  integrationIds: string[],
  autoPublish: boolean
): Promise<ICampaignIntegrationsData> {
  const data = await apiFetch<{ data: ICampaignIntegrationsData }>(
    `/api/campaigns/${campaignId}/integrations`,
    {
      method: 'PUT',
      body: JSON.stringify({ integrationIds, autoPublish }),
    }
  );
  return data.data;
}

export function CampaignIntegrationsSection({
  campaignId,
  t,
}: ICampaignIntegrationsSectionProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: campaignIntegrations, isLoading } = useQuery({
    queryKey: ['campaign-integrations', campaignId],
    queryFn: () => fetchCampaignIntegrations(campaignId),
    staleTime: 1000 * 30,
  });

  const { data: allIntegrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchUserIntegrations,
    staleTime: 1000 * 60,
  });

  const assignedIds = new Set(
    campaignIntegrations?.integrations.map(ci => ci.integration_id) ?? []
  );
  const autoPublish = campaignIntegrations?.autoPublish ?? false;
  const unassignedIntegrations = allIntegrations.filter(i => !assignedIds.has(i.id));

  const saveMutation = useMutation({
    mutationFn: ({
      integrationIds,
      autoPublish,
    }: {
      integrationIds: string[];
      autoPublish: boolean;
    }) => saveCampaignIntegrations(campaignId, integrationIds, autoPublish),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-integrations', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const handleToggleAutoPublish = useCallback(() => {
    const currentIds = [...assignedIds];
    saveMutation.mutate({ integrationIds: currentIds, autoPublish: !autoPublish });
  }, [assignedIds, autoPublish, saveMutation]);

  const handleAddIntegration = useCallback(
    (integrationId: string) => {
      const newIds = [...assignedIds, integrationId];
      saveMutation.mutate({ integrationIds: newIds, autoPublish });
      setShowDropdown(false);
    },
    [assignedIds, autoPublish, saveMutation]
  );

  const handleRemoveIntegration = useCallback(
    (integrationId: string) => {
      const newIds = [...assignedIds].filter(id => id !== integrationId);
      saveMutation.mutate({ integrationIds: newIds, autoPublish });
    },
    [assignedIds, autoPublish, saveMutation]
  );

  const TypeIcon = ({ type }: { type: string }) =>
    type === 'wordpress' ? (
      <Globe className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <Webhook className="w-3.5 h-3.5 text-purple-400" />
    );

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted" />
          <span className="text-sm text-muted">Loading integrations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Plug className="w-4 h-4 text-accent-hover" />
          {t('integrations.campaignIntegrations')}
        </h3>

        {/* Auto-publish toggle */}
        <button
          onClick={handleToggleAutoPublish}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          {autoPublish ? (
            <ToggleRight className="w-5 h-5 text-green-400" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-muted" />
          )}
          <span>{t('integrations.autoPublish')}</span>
        </button>
      </div>

      {/* Auto-publish description */}
      {autoPublish && (
        <p className="text-xs text-muted mb-4 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
          {t('integrations.autoPublishDescription')}
        </p>
      )}

      {/* Assigned integrations as chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {campaignIntegrations?.integrations.map(ci => (
          <div
            key={ci.id}
            className="flex items-center gap-2 bg-main/50 border border-border rounded-lg px-3 py-1.5"
          >
            <TypeIcon type={ci.integration?.type ?? 'webhook'} />
            <span className="text-sm text-white">{ci.integration?.name ?? 'Unknown'}</span>
            <button
              onClick={() => handleRemoveIntegration(ci.integration_id)}
              disabled={saveMutation.isPending}
              className="text-muted hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {(!campaignIntegrations?.integrations ||
          campaignIntegrations.integrations.length === 0) && (
          <p className="text-sm text-muted">{t('integrations.noAssigned')}</p>
        )}
      </div>

      {/* Add integration dropdown */}
      <div className="relative">
        {unassignedIntegrations.length > 0 && (
          <>
            <DashboardButton
              variant="secondary"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={saveMutation.isPending}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('integrations.assignIntegrations')}
            </DashboardButton>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-lg min-w-[200px]">
                {unassignedIntegrations.map(integration => (
                  <button
                    key={integration.id}
                    onClick={() => handleAddIntegration(integration.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-main/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <TypeIcon type={integration.type} />
                    {integration.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
