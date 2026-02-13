/**
 * IntegrationsView Component
 *
 * Main list view for integrations.
 *
 * Features:
 * - Empty state with "Add your first integration" CTA
 * - List of integration cards (name, type icon, status badge, last tested, connected campaigns count)
 * - Each card has: "Test" button, "Edit" button, "Delete" button
 */

'use client';

import { useState } from 'react';
import {
  Plus,
  Plug,
  Globe,
  Webhook,
  MoreHorizontal,
  Trash2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import type { IIntegrationWithCampaigns } from '@shared/types/integration.types';
import { useTranslations } from '@client/hooks/useTranslations';
import { getIntegrationStatusStyles } from '@client/utils/statusStyles';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface IIntegrationsViewProps {
  integrations: IIntegrationWithCampaigns[];
  isLoading: boolean;
  onNewIntegration: () => void;
  onEditIntegration: (integration: IIntegrationWithCampaigns) => void;
  onDeleteIntegration: (integrationId: string) => Promise<void>;
  onTestIntegration: (integrationId: string) => Promise<{ success: boolean; error?: string }>;
}

export function IntegrationsView({
  integrations,
  isLoading,
  onNewIntegration,
  onEditIntegration,
  onDeleteIntegration,
  onTestIntegration,
}: IIntegrationsViewProps): JSX.Element {
  const t = useTranslations('dashboard');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [integrationToDelete, setIntegrationToDelete] = useState<IIntegrationWithCampaigns | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  const handleDeleteClick = (integration: IIntegrationWithCampaigns) => {
    setOpenMenuId(null);
    setIntegrationToDelete(integration);
  };

  const handleConfirmDelete = async () => {
    if (!integrationToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteIntegration(integrationToDelete.id);
      setIntegrationToDelete(null);
    } catch (error) {
      console.error('Failed to delete integration:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async (integrationId: string) => {
    setOpenMenuId(null);
    setTestingIds(prev => new Set(prev).add(integrationId));
    try {
      await onTestIntegration(integrationId);
    } catch (error) {
      console.error('Failed to test integration:', error);
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  };

  const handleEdit = (integration: IIntegrationWithCampaigns) => {
    setOpenMenuId(null);
    onEditIntegration(integration);
  };

  const getTypeIcon = (type: string) => {
    return type === 'wordpress' ? Globe : Webhook;
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 bg-surface rounded w-32 mb-2"></div>
            <div className="h-4 bg-surface rounded w-48"></div>
          </div>
          <div className="h-8 bg-surface rounded w-40"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state when no integrations exist
  if (!isLoading && integrations.length === 0) {
    return (
      <div data-testid="integrations-empty-state" className="flex flex-col items-center justify-center h-full py-20 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
          <Plug className="w-10 h-10 text-muted" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{t('integrations.emptyTitle')}</h3>
        <p className="text-secondary text-sm mb-6 text-center max-w-md">
          {t('integrations.empty')}
        </p>
        <DashboardButton size="sm" onClick={onNewIntegration}>
          <Plus className="w-4 h-4 mr-2" /> {t('integrations.addFirst')}
        </DashboardButton>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">{t('integrations.title')}</h2>
          <p className="text-secondary text-sm">{t('integrations.subtitle')}</p>
        </div>
        <DashboardButton size="sm" onClick={onNewIntegration}>
          <Plus className="w-4 h-4 mr-2" /> {t('integrations.addIntegration')}
        </DashboardButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(integration => {
          const TypeIcon = getTypeIcon(integration.type);
          const isTesting = testingIds.has(integration.id);

          return (
            <div
              key={integration.id}
              data-testid="integration-card"
              className="bg-surface border border-border rounded-xl p-6 hover:border-border transition-all text-left w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-main border border-border rounded-lg text-secondary">
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      {t(`integrations.type.${integration.type}`)}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <button
                    className="text-muted hover:text-white p-1 rounded hover:bg-surface-light transition-colors"
                    onClick={() =>
                      setOpenMenuId(openMenuId === integration.id ? null : integration.id)
                    }
                    aria-label={`Actions for ${integration.name}`}
                    aria-expanded={openMenuId === integration.id}
                    aria-haspopup="true"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {openMenuId === integration.id && (
                    <div className="absolute right-0 top-8 z-10 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-secondary hover:text-white hover:bg-surface-light transition-colors flex items-center gap-2"
                        onClick={() => handleTest(integration.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {t('integrations.test')}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-secondary hover:text-white hover:bg-surface-light transition-colors flex items-center gap-2"
                        onClick={() => handleEdit(integration)}
                      >
                        Edit
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-secondary hover:text-red-400 hover:bg-surface-light transition-colors flex items-center gap-2"
                        onClick={() => handleDeleteClick(integration)}
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('integrations.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">{t('integrations.status.active')}</span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getIntegrationStatusStyles(integration.status)}`}
                  >
                    {t(`integrations.status.${integration.status}`)}
                  </span>
                </div>

                {/* Last Tested */}
                {integration.last_tested_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary">{t('integrations.lastTested')}</span>
                    <span className="text-xs text-muted">
                      {dayjs(integration.last_tested_at).fromNow()}
                    </span>
                  </div>
                )}

                {/* Connected Campaigns */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">
                    {t('integrations.connectedCampaigns')}
                  </span>
                  <span className="text-xs text-muted">{integration.campaign_count || 0}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Card */}
        <button
          onClick={onNewIntegration}
          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted hover:border-accent/50 hover:text-accent-hover hover:bg-surface/50 transition-all gap-3 group h-full min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">{t('integrations.addIntegration')}</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={integrationToDelete !== null}
        onClose={() => setIntegrationToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('integrations.delete')}
        message={t('integrations.deleteConfirm', { name: integrationToDelete?.name ?? '' })}
        variant="danger"
        labels={{
          confirm: isDeleting ? 'Deleting...' : 'Delete',
          cancel: 'Cancel',
        }}
        isConfirming={isDeleting}
      />
    </div>
  );
}
