'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Clock,
  Layers,
  MoreHorizontal,
  Play,
  Pause,
  Cpu,
  Trash2,
} from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { FirstCampaignPrompt } from '../prompts';
import { usePendingActions } from '@client/hooks/usePendingActions';
import type { ICampaignWithStats } from '@shared/types/campaign.types';
import type { IProject } from '@shared/types/project.types';
import { useTranslations } from '@client/hooks/useTranslations';
import { getCampaignStatusStyles } from '@client/utils/statusStyles';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';

dayjs.extend(relativeTime);

interface ICampaignsViewProps {
  campaigns: ICampaignWithStats[];
  isLoading: boolean;
  onNewCampaign: () => void;
  onCampaignClick: (campaignId: string) => void;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  selectedCampaignId: string | null;
  onBackToList: () => void;
  activeProject: IProject | null;
}

export function CampaignsView({
  campaigns,
  isLoading,
  onNewCampaign,
  onCampaignClick,
  onDeleteCampaign,
  selectedCampaignId,
  onBackToList,
  activeProject,
}: ICampaignsViewProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { hasCampaigns, isOnboardingComplete } = usePendingActions();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<ICampaignWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get selected campaign from campaigns list
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) ?? null;

  // Show FirstCampaignPrompt when onboarding is complete but no campaigns yet
  const shouldShowCampaignPrompt = isOnboardingComplete && !hasCampaigns && !isLoading;

  const handleDeleteClick = (campaign: ICampaignWithStats) => {
    setOpenMenuId(null);
    setCampaignToDelete(campaign);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteCampaign(campaignToDelete.id);
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Show empty state when no project is selected
  if (!isLoading && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-muted" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Project Selected</h3>
        <p className="text-secondary text-sm mb-6 text-center max-w-md">
          Please create or select a project before creating campaigns.
        </p>
        <div className="flex gap-3">
          <DashboardButton size="sm" onClick={() => dashboardNavigate('/dashboard')}>
            <span>Select Project</span>
          </DashboardButton>
          <DashboardButton
            size="sm"
            variant="ghost"
            onClick={() => dashboardNavigate('/dashboard')}
          >
            <span>Create Project</span>
          </DashboardButton>
        </div>
      </div>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 bg-surface rounded w-32 mb-2"></div>
            <div className="h-4 bg-surface rounded w-48"></div>
          </div>
          <div className="h-8 bg-surface rounded w-28"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state when no campaigns exist
  if (!isLoading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 animate-fadeIn">
        {/* Show FirstCampaignPrompt if onboarding is complete */}
        {shouldShowCampaignPrompt && <FirstCampaignPrompt onCreateCampaign={onNewCampaign} />}

        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-muted" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{t('campaigns.title')}</h3>
        <p className="text-secondary text-sm mb-6">{t('campaigns.empty')}</p>
        <DashboardButton size="sm" onClick={onNewCampaign}>
          <Plus className="w-4 h-4 mr-2" /> {t('campaigns.createFirst')}
        </DashboardButton>
      </div>
    );
  }

  // Detail view (not fully implemented - will be separate component in Phase 6)
  if (viewMode === 'detail' && selectedCampaign) {
    return (
      <div className="h-full flex flex-col animate-fadeIn">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('list');
                onBackToList();
              }}
              className="text-secondary hover:text-white transition-colors flex items-center text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Campaigns
            </button>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {selectedCampaign.name}
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${getCampaignStatusStyles(selectedCampaign.status)} capitalize`}
                >
                  {selectedCampaign.status}
                </span>
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
                <span className="flex items-center">
                  <Cpu className="w-3 h-3 mr-1.5" /> Model: {selectedCampaign.ai_model}
                </span>
                <span className="flex items-center">
                  <Layers className="w-3 h-3 mr-1.5" /> {selectedCampaign.completed_count} /{' '}
                  {selectedCampaign.keyword_count} Keywords
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">{t('campaigns.title')}</h2>
          <p className="text-secondary text-sm">{t('campaigns.subtitle')}</p>
        </div>
        <DashboardButton size="sm" onClick={onNewCampaign}>
          <Plus className="w-4 h-4 mr-2" /> {t('campaigns.newCampaignButton')}
        </DashboardButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
          <div
            key={campaign.id}
            onClick={() => {
              setViewMode('detail');
              onCampaignClick(campaign.id);
              setOpenMenuId(null);
            }}
            className="bg-surface border border-border rounded-xl p-6 hover:border-border transition-all cursor-pointer group hover:shadow-xl hover:shadow-black/20 text-left w-full"
            role="button"
            tabIndex={0}
            onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setViewMode('detail');
                onCampaignClick(campaign.id);
                setOpenMenuId(null);
              }
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-main border border-border rounded-lg text-secondary group-hover:text-accent-hover group-hover:border-accent/30 transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-accent-hover transition-colors">
                    {campaign.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                    <Clock className="w-3 h-3" /> {dayjs(campaign.updated_at).fromNow()}
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  className="text-muted hover:text-white p-1 rounded hover:bg-surface-light transition-colors"
                  onClick={e => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === campaign.id ? null : campaign.id);
                  }}
                  aria-label={`Actions for ${campaign.name}`}
                  aria-expanded={openMenuId === campaign.id}
                  aria-haspopup="true"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {openMenuId === campaign.id && (
                  <div className="absolute right-0 top-8 z-10 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-secondary hover:text-red-400 hover:bg-surface-light transition-colors flex items-center gap-2"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteClick(campaign);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />{' '}
                      {t('campaigns.delete.button') || 'Delete Campaign'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-secondary">{t('campaigns.card.progress')}</span>
                <span className="text-white font-mono">
                  {campaign.completed_count} / {campaign.keyword_count}
                </span>
              </div>
              <div className="w-full bg-main rounded-full h-2 overflow-hidden border border-border">
                <div
                  className={`h-full rounded-full ${
                    campaign.status === 'active'
                      ? 'bg-accent'
                      : campaign.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-muted'
                  }`}
                  style={{
                    width: `${campaign.keyword_count > 0 ? (campaign.completed_count / campaign.keyword_count) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCampaignStatusStyles(campaign.status)}`}
              >
                {campaign.status === 'active' && <Play className="w-3 h-3 mr-1.5 fill-current" />}
                {campaign.status === 'paused' && <Pause className="w-3 h-3 mr-1.5 fill-current" />}
                {t(`campaigns.status.${campaign.status}`)}
              </span>

              <div className="flex items-center text-xs text-muted">
                <Cpu className="w-3 h-3 mr-1" /> {campaign.ai_model}
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={onNewCampaign}
          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted hover:border-accent/50 hover:text-accent-hover hover:bg-surface/50 transition-all gap-3 group h-full min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">{t('campaigns.newCampaignButton')}</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={campaignToDelete !== null}
        onClose={() => setCampaignToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Campaign?"
        message={`Are you sure you want to delete "${campaignToDelete?.name || 'this campaign'}"? This action cannot be undone.`}
        variant="danger"
        labels={{
          confirm: isDeleting ? 'Deleting...' : 'Delete Campaign',
          cancel: 'Cancel',
        }}
        isConfirming={isDeleting}
      />
    </div>
  );
}
