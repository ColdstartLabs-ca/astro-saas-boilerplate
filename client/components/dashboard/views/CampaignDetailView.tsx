'use client';

import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { useCampaignDetail } from '@client/hooks/useCampaignDetail';
import { useTranslations } from '@client/hooks/useTranslations';
import { useAvailableModels } from '@client/hooks/useAvailableModels';
import { ArticleDetailModal } from '@client/components/articles/ArticleDetailModal';
import { AddKeywordsModal } from './campaign-detail/AddKeywordsModal';
import { CampaignSettingsModal, type ICampaignSettings } from './campaign-detail/CampaignSettingsModal';
import {
  CampaignDetailHeader,
  CampaignStatsGrid,
  CampaignProgress,
  CampaignMetadata,
  CampaignCreditUsage,
  ArticleQueueTable,
} from './campaign-detail';
import type { IArticle, IArticleWithCampaign } from '@shared/types/article.types';

interface ICampaignDetailViewProps {
  campaignId: string;
  onBackToList: () => void;
}

export function CampaignDetailView({
  campaignId,
  onBackToList,
}: ICampaignDetailViewProps): JSX.Element {
  const t = useTranslations('dashboard');
  const { writerModels, imagePresets } = useAvailableModels();
  const [isAddKeywordsModalOpen, setIsAddKeywordsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);

  const {
    campaign,
    keywords,
    articles,
    articleStats,
    creditStats,
    isLoading,
    addKeywords,
    startCampaign,
    updateCampaign,
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

  // Show confirmation modal
  const handleStartGenerationClick = () => {
    setIsConfirmModalOpen(true);
  };

  // Handle confirmed start generation
  const handleConfirmStartGeneration = async () => {
    setIsGenerating(true);
    try {
      await startCampaign();
      setIsConfirmModalOpen(false);
    } catch {
      // Error handled by hook
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle add keywords - called by AddKeywordsModal
  const handleAddKeywords = async (keywords: string[]): Promise<void> => {
    await addKeywords(keywords);
  };

  // Handle pause/resume campaign
  const handleTogglePause = async () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await updateCampaign({ status: newStatus });
    } catch {
      // Error handled by hook
    }
  };

  // Handle opening settings modal - modal will initialize its own state
  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
  };

  // Handle saving campaign settings - called by CampaignSettingsModal
  const handleSaveSettings = async (settings: ICampaignSettings): Promise<void> => {
    await updateCampaign({
      name: settings.name,
      tone: settings.tone || undefined,
      targetWordCount: settings.targetWordCount,
      model: settings.model,
      imagePreset: settings.imagePreset || undefined,
    });
  };

  // Handle clicking on an article row
  const handleArticleClick = (article: IArticle) => {
    setSelectedArticle(article);
  };

  // Handle closing article detail modal
  const handleCloseArticleModal = () => {
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
        onTogglePause={handleTogglePause}
        onStartGeneration={handleStartGenerationClick}
        onAddKeywords={() => setIsAddKeywordsModalOpen(true)}
        onOpenSettings={handleOpenSettings}
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

      {/* Campaign Metadata Section */}
      <CampaignMetadata campaign={campaign} t={t} />

      {/* Credit Usage Section */}
      {creditStats && <CampaignCreditUsage creditStats={creditStats} keywords={keywords} t={t} />}

      {/* Article Queue Table */}
      <ArticleQueueTable articles={articles} onArticleClick={handleArticleClick} t={t} />

      {/* Add Keywords Modal */}
      <AddKeywordsModal
        isOpen={isAddKeywordsModalOpen}
        onClose={() => setIsAddKeywordsModalOpen(false)}
        onAdd={handleAddKeywords}
      />

      {/* Start Generation Confirmation Modal */}
      <ConfirmDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmStartGeneration}
        title={t('campaigns.detail.startGeneration')}
        message={t('campaigns.detail.startConfirm', {
          count: pendingCount,
          plural: pendingCount !== 1 ? 's' : '',
        })}
        items={[t('campaigns.detail.startConfirmDetail')]}
        variant="info"
        labels={{
          confirm: t('campaigns.detail.start'),
          confirming: t('campaigns.detail.starting'),
          cancel: t('campaigns.detail.cancel'),
        }}
        isConfirming={isGenerating}
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
        }}
        writerModels={writerModels}
        imagePresets={imagePresets}
        isSaving={isGenerating}
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
      />
    </div>
  );
}
