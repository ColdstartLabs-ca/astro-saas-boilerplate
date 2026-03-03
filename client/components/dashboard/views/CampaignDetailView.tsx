'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useCampaignDetail } from '@client/hooks/useCampaignDetail';
import { useTranslations } from '@client/hooks/useTranslations';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { ArticleDetailModal } from '@client/components/articles/ArticleDetailModal';
import { AddKeywordsModal } from './campaign-detail/AddKeywordsModal';
import {
  CampaignSettingsModal,
  type ICampaignSettings,
} from './campaign-detail/CampaignSettingsModal';
import {
  CampaignDetailHeader,
  CampaignStatsGrid,
  CampaignProgress,
  CampaignMetadata,
  CampaignCreditUsage,
  ArticleQueueTable,
  CampaignIntegrationsSection,
} from './campaign-detail';
import type { IArticleWithCampaign } from '@shared/types/article.types';
import type { IAddKeywordsResponse } from '@shared/types/campaign.types';

type CampaignTab = 'overview' | 'articles' | 'integrations';

interface ICampaignDetailViewProps {
  campaignId: string;
  onBackToList: () => void;
}

export function CampaignDetailView({
  campaignId,
  onBackToList,
}: ICampaignDetailViewProps): JSX.Element {
  const t = useTranslations('dashboard');
  const queryClient = useQueryClient();
  const { writerPresets, imagePresets } = useAvailableModels();
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');
  const [isAddKeywordsModalOpen, setIsAddKeywordsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<IArticleWithCampaign | null>(null);

  const {
    campaign,
    keywords,
    articleStats,
    creditStats,
    isLoading,
    addKeywords,
    deliverArticle,
    updateCampaign,
    pauseSchedule,
    resumeSchedule,
  } = useCampaignDetail(campaignId);

  // Calculate stats from articles
  const stats = useMemo(
    () => ({
      queued: articleStats?.queued ?? 0,
      generating: articleStats?.generating ?? 0,
      draft: articleStats?.draft ?? 0,
      published: articleStats?.published ?? 0,
    }),
    [articleStats]
  );

  // Get pending keywords count (pending + queued = not yet started generation)
  const pendingCount = useMemo(
    () => keywords.filter(k => k.status === 'pending' || k.status === 'queued').length,
    [keywords]
  );

  // Handle add keywords - called by AddKeywordsModal; returns full result for UI display
  const handleAddKeywords = async (keywords: string[]): Promise<IAddKeywordsResponse> => {
    return addKeywords(keywords);
  };

  // Handle opening settings modal - modal will initialize its own state
  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
  };

  // Handle saving campaign settings - called by CampaignSettingsModal
  const handleSaveSettings = async (settings: ICampaignSettings): Promise<void> => {
    setIsSavingSettings(true);
    try {
      await updateCampaign({
        name: settings.name,
        tone: settings.tone || undefined,
        targetWordCount: settings.targetWordCount,
        model: settings.model,
        imagePreset: settings.imagePreset || undefined,
        scheduleFrequency: settings.scheduleFrequency ?? undefined,
        scheduleBatchSize: settings.scheduleBatchSize,
        scheduleHour: settings.scheduleHour,
        scheduleTimezone: settings.scheduleTimezone,
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle clicking on an article row
  const handleArticleClick = (article: IArticleWithCampaign) => {
    setSelectedArticle(article);
  };

  // Handle closing article detail modal
  const handleCloseArticleModal = () => {
    setSelectedArticle(null);
  };

  // Handle article updates from the modal — refresh campaign data
  const handleArticleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['campaign-articles', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaignId] });
    // Also invalidate the useArticles query used by ArticleQueueTable
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    setSelectedArticle(null);
  };

  if (isLoading || !campaign) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-hover animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* Header */}
      <CampaignDetailHeader
        campaign={campaign}
        keywordsCount={keywords.length}
        stats={stats}
        pendingCount={pendingCount}
        onBackToList={onBackToList}
        onAddKeywords={() => setIsAddKeywordsModalOpen(true)}
        onOpenSettings={handleOpenSettings}
        onPauseSchedule={pauseSchedule}
        onResumeSchedule={resumeSchedule}
        t={t}
      />

      {/* Progress Bar */}
      <CampaignProgress
        campaignStatus={campaign.status}
        articleStats={articleStats}
        keywordsCount={keywords.length}
        t={t}
      />

      {/* Stats Grid */}
      <CampaignStatsGrid stats={stats} />

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border mb-4">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'articles', label: 'Articles', badge: articleStats?.total || undefined },
            { id: 'integrations', label: 'Integrations' },
          ] as Array<{ id: CampaignTab; label: string; badge?: number }>
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-white'
                : 'border-transparent text-secondary hover:text-white'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="text-xs bg-surface-light text-muted px-1.5 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 pb-8">
          <CampaignMetadata
            campaign={campaign}
            keywords={keywords}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            t={t}
          />
          {creditStats && (
            <CampaignCreditUsage creditStats={creditStats} keywords={keywords} t={t} />
          )}
        </div>
      )}

      {activeTab === 'articles' && (
        <ArticleQueueTable
          campaignId={campaignId}
          onArticleClick={handleArticleClick}
          onDeliver={deliverArticle}
          t={t}
        />
      )}

      {activeTab === 'integrations' && (
        <CampaignIntegrationsSection campaignId={campaignId} t={t} />
      )}

      {/* Add Keywords Modal */}
      <AddKeywordsModal
        isOpen={isAddKeywordsModalOpen}
        onClose={() => setIsAddKeywordsModalOpen(false)}
        onAdd={handleAddKeywords}
      />

      {/* Settings Modal */}
      <CampaignSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        initialSettings={{
          name: campaign.name,
          tone: campaign.tone || '',
          targetWordCount: campaign.target_word_count,
          model: campaign.ai_model,
          imagePreset: campaign.image_preset || '',
          scheduleFrequency: campaign.schedule_frequency,
          scheduleBatchSize: campaign.schedule_batch_size ?? undefined,
          scheduleHour: campaign.schedule_hour ?? undefined,
          scheduleTimezone: campaign.schedule_timezone ?? undefined,
        }}
        writerPresets={writerPresets}
        imagePresets={imagePresets}
        isSaving={isSavingSettings}
        campaignStatus={campaign.status}
      />

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={
          selectedArticle
            ? ({
                ...selectedArticle,
                campaigns: campaign ? { id: campaign.id, name: campaign.name } : null,
              } satisfies IArticleWithCampaign)
            : null
        }
        isOpen={!!selectedArticle}
        onClose={handleCloseArticleModal}
        onUpdate={handleArticleUpdate}
      />
    </div>
  );
}
