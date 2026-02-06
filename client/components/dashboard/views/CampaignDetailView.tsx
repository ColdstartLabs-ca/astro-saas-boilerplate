'use client';

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Clock,
  Loader2,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  Settings,
  Play,
  Pause,
  Cpu,
  Edit2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { useCampaignDetail } from '@client/hooks/useCampaignDetail';
import { useTranslations } from '@client/hooks/useTranslations';
import dayjs from 'dayjs';

interface ICampaignDetailViewProps {
  campaignId: string;
  onBackToList: () => void;
}

const STAT_CARDS = [
  { key: 'queued', label: 'Queued', icon: Clock, color: 'text-secondary', spin: false },
  { key: 'generating', label: 'Generating', icon: Loader2, color: 'text-accent-hover', spin: true },
  { key: 'draft', label: 'Draft/Review', icon: AlertCircle, color: 'text-yellow-400', spin: false },
  {
    key: 'published',
    label: 'Published',
    icon: CheckCircle2,
    color: 'text-green-400',
    spin: false,
  },
] as const;

export function CampaignDetailView({
  campaignId,
  onBackToList,
}: ICampaignDetailViewProps): JSX.Element {
  const t = useTranslations('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddKeywordsModalOpen, setIsAddKeywordsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');

  const {
    campaign,
    keywords,
    articles,
    articleStats,
    isLoading,
    addKeywords,
    startCampaign,
    updateCampaign,
  } = useCampaignDetail(campaignId);

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    return articles.filter(a =>
      a.primary_keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // Sort articles: generating first, then queued, then by status
  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((a, b) => {
      const statusOrder = {
        generating: 0,
        queued: 1,
        draft: 2,
        reviewed: 3,
        published: 4,
        failed: 5,
      };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
      return aOrder - bOrder;
    });
  }, [filteredArticles]);

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
  const pendingCount = keywords.filter(k => k.status === 'pending' || k.status === 'queued').length;

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

  // Handle add keywords
  const handleAddKeywords = async () => {
    const parsed = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    if (parsed.length === 0) return;

    try {
      await addKeywords(parsed);
      setNewKeywords('');
      setIsAddKeywordsModalOpen(false);
    } catch {
      // Error handled by hook
    }
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToList}
            className="text-secondary hover:text-white transition-colors flex items-center text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('campaigns.title')}
          </button>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {campaign.name}
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  campaign.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : campaign.status === 'completed'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : campaign.status === 'paused'
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        : 'bg-surface text-muted border-border'
                } capitalize`}
              >
                {t(`campaigns.status.${campaign.status}`)}
              </span>
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
              <span className="flex items-center">
                <Cpu className="w-3 h-3 mr-1.5" /> {t('campaigns.card.model')}: {campaign.ai_model}
              </span>
              <span className="flex items-center">
                <Layers className="w-3 h-3 mr-1.5" /> {stats.draft + stats.published} /{' '}
                {keywords.length} {t('campaigns.card.keywords')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {campaign.status === 'active' && (
              <DashboardButton variant="outline" size="sm" onClick={handleTogglePause}>
                <Pause className="w-4 h-4 mr-2" /> {t('campaigns.status.paused')}
              </DashboardButton>
            )}
            {campaign.status === 'paused' && (
              <DashboardButton variant="primary" size="sm" onClick={handleTogglePause}>
                <Play className="w-4 h-4 mr-2" /> {t('campaigns.status.resume')}
              </DashboardButton>
            )}
            {campaign.status !== 'active' && pendingCount > 0 && (
              <DashboardButton variant="primary" size="sm" onClick={handleStartGenerationClick}>
                <Play className="w-4 h-4 mr-2" /> {t('campaigns.detail.startGeneration')}
              </DashboardButton>
            )}
            <DashboardButton
              variant="outline"
              size="sm"
              onClick={() => setIsAddKeywordsModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> {t('campaigns.detail.addKeywords')}
            </DashboardButton>
            <DashboardButton variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </DashboardButton>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {(campaign.status === 'active' || campaign.status === 'paused') && (
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-secondary">{t('campaigns.detail.generationProgress')}</span>
            <span className="text-white font-mono">
              {articleStats?.published ?? 0} / {keywords.length} {t('campaigns.detail.articles')}
            </span>
          </div>
          <div className="w-full bg-main rounded-full h-2 overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                campaign.status === 'active'
                  ? 'bg-accent animate-pulse'
                  : campaign.status === 'paused'
                    ? 'bg-yellow-500'
                    : 'bg-muted'
              }`}
              style={{
                width: `${keywords.length > 0 ? ((articleStats?.published ?? 0) / keywords.length) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(stat => {
          const value = stats[stat.key] ?? 0;
          return (
            <div
              key={stat.key}
              className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between"
            >
              <div>
                <div className="text-muted text-xs font-medium uppercase tracking-wider mb-1">
                  {stat.label}
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
              </div>
              <div className={`p-2 rounded-lg bg-surface-light ${stat.color}`}>
                <stat.icon className={`w-5 h-5 ${stat.spin ? 'animate-spin' : ''}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Article Queue Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center bg-main/30">
          <h3 className="font-semibold text-white">{t('campaigns.detail.articleQueue')}</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                placeholder={t('campaigns.detail.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-main border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-secondary focus:border-accent outline-none w-48"
              />
            </div>
            <DashboardButton variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Filter className="w-4 h-4" />
            </DashboardButton>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-main/50 text-muted font-medium border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Keyword</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">{t('campaigns.detail.wordCount')}</th>
                <th className="px-6 py-3 text-right">{t('campaigns.detail.generated')}</th>
                <th className="px-6 py-3 text-right">{t('campaigns.detail.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedArticles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    {t('campaigns.detail.noArticles')}
                  </td>
                </tr>
              ) : (
                sortedArticles.map(article => (
                  <tr
                    key={article.id}
                    className="hover:bg-surface-light/30 transition-colors group"
                  >
                    <td className="px-6 py-3 font-medium text-secondary">
                      {article.primary_keyword}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${
                          article.status === 'published'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : article.status === 'draft'
                              ? 'bg-surface-light text-secondary border-border'
                              : article.status === 'reviewed'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : article.status === 'generating'
                                  ? 'bg-accent/10 text-accent-hover border-accent/20'
                                  : article.status === 'queued'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {article.status === 'generating' && (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted font-mono text-xs">
                      {article.word_count ? article.word_count.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-muted text-xs">
                      {article.generated_at ? dayjs(article.generated_at).format('MMM D') : '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(article.status === 'draft' || article.status === 'reviewed') && (
                          <button className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-white">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {article.status === 'published' && article.published_url && (
                          <a
                            href={article.published_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Keywords Modal */}
      {isAddKeywordsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-bold text-white">{t('campaigns.keywords.title')}</h3>
              <button
                onClick={() => setIsAddKeywordsModalOpen(false)}
                className="text-muted hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={newKeywords}
                onChange={e => setNewKeywords(e.target.value)}
                placeholder={t('campaigns.keywords.placeholder')}
                className="w-full h-32 bg-main border border-border rounded-lg p-4 text-white focus:ring-1 focus:ring-accent outline-none resize-none font-mono text-sm"
              />
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-2">
              <DashboardButton variant="ghost" onClick={() => setIsAddKeywordsModalOpen(false)}>
                {t('campaigns.keywords.cancel')}
              </DashboardButton>
              <DashboardButton onClick={handleAddKeywords}>
                {t('campaigns.keywords.add')}
              </DashboardButton>
            </div>
          </div>
        </div>
      )}

      {/* Start Generation Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-white">
                {t('campaigns.detail.startGeneration')}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-secondary">
                {t('campaigns.detail.startConfirm', {
                  count: pendingCount,
                  plural: pendingCount !== 1 ? 's' : '',
                })}
              </p>
              <p className="text-sm text-muted mt-2">{t('campaigns.detail.startConfirmDetail')}</p>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-2">
              <DashboardButton
                variant="ghost"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isGenerating}
              >
                {t('campaigns.detail.cancel')}
              </DashboardButton>
              <DashboardButton
                onClick={handleConfirmStartGeneration}
                disabled={isGenerating}
                className="min-w-[100px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                    {t('campaigns.detail.starting')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> {t('campaigns.detail.start')}
                  </>
                )}
              </DashboardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
