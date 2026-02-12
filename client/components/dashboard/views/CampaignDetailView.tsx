'use client';

import { useState, useMemo } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
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
  const { writerPresets, imagePresets } = useAvailableModels();
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

  // Calculate credit cost per article based on campaign settings
  const { creditsPerArticle, writerCost, imageCost } = useMemo(() => {
    if (!campaign) return { creditsPerArticle: 1, writerCost: 1, imageCost: 0 };

    const writerPreset = writerPresets.find(p => p.key === campaign.ai_model);
    const imagePreset = imagePresets.find(p => p.key === campaign.image_preset);

    const writerCost = writerPreset?.creditCost ?? 1;
    const imageCost = imagePreset?.creditCost ?? 0;

    return {
      creditsPerArticle: writerCost + imageCost,
      writerCost,
      imageCost,
    };
  }, [campaign, writerPresets, imagePresets]);

  // Calculate total credits needed for all pending keywords
  const totalCreditsNeeded = pendingCount * creditsPerArticle;

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

      {/* Integrations Section */}
      <CampaignIntegrationsSection campaignId={campaignId} t={t} />

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
        message={t(`campaigns.detail.startConfirm_${pendingCount === 1 ? 'one' : 'other'}`, {
          count: pendingCount,
          credits: totalCreditsNeeded,
        })}
        details={
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-200">Credit cost per article:</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-100/80">
                  Writer ({campaign?.ai_model || 'budget'})
                </span>
                <span className="font-semibold text-white">{writerCost} credit</span>
              </div>
              {imageCost > 0 ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-100/80">
                    Images ({campaign?.image_preset || 'balanced'})
                  </span>
                  <span className="font-semibold text-white">+{imageCost} credit{imageCost > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Images</span>
                  <span className="text-muted">none (text-only)</span>
                </div>
              )}
              <div className="h-px bg-blue-500/20 my-1"></div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-200 font-medium">Total per article</span>
                <span className="font-bold text-white">{creditsPerArticle} credit{creditsPerArticle > 1 ? 's' : ''}</span>
              </div>
              <div className="h-px bg-blue-500/20 my-1"></div>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-blue-200">
                  <strong className="text-white">{totalCreditsNeeded} credit{totalCreditsNeeded > 1 ? 's' : ''}</strong> for{' '}
                  {pendingCount} keyword{pendingCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        }
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
        writerPresets={writerPresets}
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
