/**
 * ArticleList Component
 *
 * Displays a list of articles with campaign info, status, and image thumbnails.
 * Includes filtering by campaign, status, and date range.
 */

'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ExternalLink,
  Loader2,
  Filter,
  X,
  ChevronDown,
  Check,
  XCircle,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ImageOff,
} from 'lucide-react';
import { useArticles } from '@client/hooks/useArticles';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { getTranslations } from '@src/i18n/utils';
import { createClient } from '@shared/utils/supabase/client';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { ArticleDetailModal } from './ArticleDetailModal';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { getSEOScoreColor, getSEOScoreBorderColor } from '@shared/utils/seo';
import type { IArticleWithCampaign, ArticleStatus } from '@shared/types/article.types';

// Helper to get access token
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface IArticleListProps {
  statusFilter?: string;
}

interface IArticleFilters {
  campaignId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const ARTICLE_STATUSES: readonly (ArticleStatus | 'approved' | 'rejected' | 'all')[] = [
  'all',
  'queued',
  'generating',
  'draft',
  'approved',
  'rejected',
  'reviewed',
  'published',
  'failed',
] as const;

function parseDateFromInput(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toISOString();
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400' },
  generating: { bg: 'bg-amber-500/8', text: 'text-amber-400', dot: 'bg-amber-400' },
  queued: { bg: 'bg-surface-light', text: 'text-muted', dot: 'bg-muted' },
  reviewed: { bg: 'bg-purple-500/8', text: 'text-purple-400', dot: 'bg-purple-400' },
  approved: { bg: 'bg-green-500/8', text: 'text-green-400', dot: 'bg-green-400' },
  rejected: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
  published: { bg: 'bg-brand-500/8', text: 'text-brand-400', dot: 'bg-brand-400' },
  failed: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
};

export function ArticleList({ statusFilter: propStatusFilter }: IArticleListProps): JSX.Element {
  const _t = useMemo(() => getTranslations('dashboard'), []);
  const { activeProject } = useProjects();
  const { campaigns } = useCampaigns(activeProject?.id ?? null);

  // Parse URL query params for filters
  const getUrlFilters = useCallback((): IArticleFilters => {
    if (typeof window === 'undefined') {
      return { campaignId: '', status: propStatusFilter || '', dateFrom: '', dateTo: '' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      campaignId: params.get('campaignId') || '',
      status: params.get('status') || propStatusFilter || '',
      dateFrom: params.get('dateFrom') || '',
      dateTo: params.get('dateTo') || '',
    };
  }, [propStatusFilter]);

  const [filters, setFilters] = useState<IArticleFilters>(getUrlFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<IArticleWithCampaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Update URL when filters change
  const updateUrlFilters = useCallback((newFilters: IArticleFilters) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (newFilters.campaignId) params.set('campaignId', newFilters.campaignId);
    if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, []);

  const handleFilterChange = useCallback((key: keyof IArticleFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateUrlFilters(newFilters);
  }, [filters, updateUrlFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters: IArticleFilters = {
      campaignId: '',
      status: propStatusFilter || '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    updateUrlFilters(clearedFilters);
  }, [propStatusFilter, updateUrlFilters]);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.campaignId || filters.status || filters.dateFrom || filters.dateTo);
  }, [filters]);

  const toggleArticleSelection = useCallback((articleId: string) => {
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  }, []);

  const { articles, isLoading, error, refetch } = useArticles({
    projectId: activeProject?.id,
    campaignId: filters.campaignId || undefined,
    status: filters.status && filters.status !== 'all' ? (filters.status as ArticleStatus) : undefined,
    dateFrom: filters.dateFrom ? parseDateFromInput(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? parseDateFromInput(filters.dateTo) : undefined,
    enabled: !!activeProject,
  });

  useEffect(() => {
    const handlePopState = () => {
      setFilters(getUrlFilters());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getUrlFilters]);

  const toggleSelectAll = useCallback(() => {
    if (selectedArticleIds.size === articles.length) {
      setSelectedArticleIds(new Set());
    } else {
      setSelectedArticleIds(new Set(articles.map(a => a.id)));
    }
  }, [articles, selectedArticleIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedArticleIds(new Set());
  }, []);

  const allSelected = articles.length > 0 && selectedArticleIds.size === articles.length;
  const someSelected = selectedArticleIds.size > 0;

  // Bulk approve handler
  const handleBulkApprove = useCallback(async () => {
    if (selectedArticleIds.size === 0) return;
    setIsBulkApproving(true);
    setBulkError(null);

    try {
      const accessToken = await getAccessToken();
      const promises = Array.from(selectedArticleIds).map(articleId =>
        fetch(`/api/articles/${articleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: 'approved' }),
        })
      );

      const results = await Promise.allSettled(promises);
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount > 0) {
        setBulkError(_t('articles.approval.error.bulkApproveFailed'));
      }

      setSelectedArticleIds(new Set());
      refetch();
    } catch (_err) {
      setBulkError(_t('articles.approval.error.bulkApproveFailed'));
    } finally {
      setIsBulkApproving(false);
    }
  }, [selectedArticleIds, refetch, _t]);

  const openBulkRejectDialog = useCallback(() => {
    setShowBulkRejectDialog(true);
  }, []);

  const closeBulkRejectDialog = useCallback(() => {
    setShowBulkRejectDialog(false);
    setBulkRejectReason('');
  }, []);

  const handleBulkReject = useCallback(async () => {
    if (selectedArticleIds.size === 0) return;
    setIsBulkRejecting(true);
    setBulkError(null);

    try {
      const accessToken = await getAccessToken();
      const promises = Array.from(selectedArticleIds).map(articleId =>
        fetch(`/api/articles/${articleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            status: 'rejected',
            rejection_reason: bulkRejectReason || null
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount > 0) {
        setBulkError(_t('articles.approval.error.bulkRejectFailed'));
      }

      setShowBulkRejectDialog(false);
      setBulkRejectReason('');
      setSelectedArticleIds(new Set());
      refetch();
    } catch (_err) {
      setBulkError(_t('articles.approval.error.bulkRejectFailed'));
    } finally {
      setIsBulkRejecting(false);
    }
  }, [selectedArticleIds, bulkRejectReason, refetch, _t]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'generating' ? 'animate-pulse' : ''}`} />
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <p className="text-error text-sm">Failed to load articles</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-light mb-4">
          <FileText className="w-7 h-7 text-muted" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">No articles yet</h3>
        <p className="text-muted text-sm max-w-xs mx-auto">
          {hasActiveFilters
            ? 'No articles match your current filters'
            : 'Generate your first article to see it here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="mb-3 px-4 py-2.5 bg-accent/8 border border-accent/20 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {selectedArticleIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-muted hover:text-white transition-colors underline underline-offset-2"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DashboardButton
              variant="outline"
              size="sm"
              onClick={handleBulkApprove}
              disabled={isBulkApproving || isBulkRejecting}
              className="text-green-400 border-green-500/30 hover:bg-green-500/10"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {isBulkApproving ? 'Approving...' : 'Approve'}
            </DashboardButton>
            <DashboardButton
              variant="outline"
              size="sm"
              onClick={openBulkRejectDialog}
              disabled={isBulkApproving || isBulkRejecting}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject
            </DashboardButton>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">
                {_t('articles.recent')}
              </h2>
              <span className="text-xs text-muted font-mono bg-surface-light px-2 py-0.5 rounded">
                {articles.length}
              </span>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                hasActiveFilters
                  ? 'text-accent border-accent/30 bg-accent/5'
                  : 'text-muted border-border bg-surface-light/50 hover:text-white hover:border-accent/30'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-border animate-fadeIn">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Campaign
                </label>
                <select
                  value={filters.campaignId}
                  onChange={(e) => handleFilterChange('campaignId', e.target.value)}
                  className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none"
                >
                  {ARTICLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {_t(`articles.status.${status}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full bg-main border border-border rounded-lg px-2 py-2 text-white text-xs focus:ring-1 focus:ring-accent outline-none"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full bg-main border border-border rounded-lg px-2 py-2 text-white text-xs focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="col-span-3">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Filters Tags */}
          {hasActiveFilters && !isFilterOpen && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {filters.campaignId && campaigns.find(c => c.id === filters.campaignId) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  {campaigns.find(c => c.id === filters.campaignId)?.name}
                  <button onClick={() => handleFilterChange('campaignId', '')} className="hover:text-white ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.status && filters.status !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  {_t(`articles.status.${filters.status}`)}
                  <button onClick={() => handleFilterChange('status', '')} className="hover:text-white ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  {filters.dateFrom && !filters.dateTo && `From ${filters.dateFrom}`}
                  {!filters.dateFrom && filters.dateTo && `To ${filters.dateTo}`}
                  {filters.dateFrom && filters.dateTo && `${filters.dateFrom} - ${filters.dateTo}`}
                  <button
                    onClick={() => {
                      handleFilterChange('dateFrom', '');
                      handleFilterChange('dateTo', '');
                    }}
                    className="hover:text-white ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Select All */}
        {articles.length > 0 && (
          <div className="px-3 py-2 bg-main/30 border-b border-border flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="text-muted hover:text-white transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </div>
        )}

        {/* Error Message */}
        {bulkError && (
          <div className="mx-3 mt-3 p-3 bg-red-500/8 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {bulkError}
          </div>
        )}

        {/* Table Header */}
        {articles.length > 0 && (
          <div className="px-3 py-2 bg-surface-light/30 border-b border-border grid grid-cols-12 gap-3 text-[10px] text-muted uppercase tracking-wider font-medium">
            <div className="col-span-4 pl-6">Article</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">SEO</div>
            <div className="col-span-2">Campaign</div>
            <div className="col-span-1 text-right">Words</div>
            <div className="col-span-1 text-center">Images</div>
            <div className="col-span-1 text-right">Date</div>
            <div className="col-span-1"></div>
          </div>
        )}

        {/* Article Items */}
        <div className="divide-y divide-border">
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              isSelected={selectedArticleIds.has(article.id)}
              onToggleSelect={() => toggleArticleSelection(article.id)}
              onOpenDetail={() => {
                setSelectedArticle(article);
                setIsDetailModalOpen(true);
              }}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedArticle(null);
        }}
        onUpdate={(updatedArticle) => {
          setSelectedArticle(updatedArticle);
          refetch();
        }}
      />

      {/* Bulk Rejection Dialog Modal */}
      {showBulkRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {_t('articles.approval.bulkReject')}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {_t('articles.approval.bulkRejecting').replace('{count}', String(selectedArticleIds.size)).replace('{plural}', selectedArticleIds.size > 1 ? 's' : '')}
              </p>
              <textarea
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                placeholder={_t('articles.approval.rejectReasonPlaceholder')}
                className="w-full px-3 py-2 bg-surface-light border border-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <DashboardButton
                variant="ghost"
                onClick={closeBulkRejectDialog}
                disabled={isBulkRejecting}
              >
                {_t('articles.detailModal.cancel')}
              </DashboardButton>
              <DashboardButton
                variant="primary"
                onClick={handleBulkReject}
                disabled={isBulkRejecting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isBulkRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  _t('articles.approval.bulkReject')
                )}
              </DashboardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbnailImage({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageOff className="w-4 h-4 text-muted/50" />
      </div>
    );
  }
  return <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setBroken(true)} />;
}

// =============================================================================
// ArticleRow - Individual article list item
// =============================================================================

interface IArticleRowProps {
  article: IArticleWithCampaign;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function ArticleRow({ article, isSelected, onToggleSelect, onOpenDetail, getStatusBadge }: IArticleRowProps) {
  // Extract first image from markdown content (if embedded)
  const thumbnailUrl = useMemo(() => {
    if (!article.content) return null;
    const imgMatch = article.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    return imgMatch ? imgMatch[1] : null;
  }, [article.content]);

  return (
    <div className="group px-3 py-3 hover:bg-surface-light/30 transition-colors grid grid-cols-12 gap-3 items-center">
      {/* Checkbox + Title Column */}
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="text-muted hover:text-white transition-colors flex-shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-accent" />
          ) : (
            <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Thumbnail */}
        <button
          type="button"
          className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-border bg-surface-light cursor-pointer p-0"
          onClick={onOpenDetail}
          aria-label={`View article: ${article.title || article.primary_keyword}`}
        >
          {thumbnailUrl ? (
            <ThumbnailImage src={thumbnailUrl} />
          ) : article.image_count && article.image_count > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted/50" />
            </div>
          )}
        </button>

        {/* Title */}
        <button
          type="button"
          className="flex-1 min-w-0 cursor-pointer text-left"
          onClick={onOpenDetail}
          aria-label={`View article: ${article.title || article.primary_keyword}`}
        >
          <h3 className="text-sm font-medium text-text-primary truncate" title={article.title || article.primary_keyword}>
            {article.title || article.primary_keyword}
          </h3>
          {article.title && article.title !== article.primary_keyword && (
            <p className="text-[11px] text-muted truncate" title={article.primary_keyword}>
              {article.primary_keyword}
            </p>
          )}
        </button>
      </div>

      {/* Status Column */}
      <div className="col-span-1">
        {getStatusBadge(article.status)}
      </div>

      {/* SEO Score Column */}
      <div className="col-span-1">
        {article.seo_score != null ? (
          <span
            className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${getSEOScoreBorderColor(article.seo_score)} ${getSEOScoreColor(article.seo_score)}`}
          >
            {article.seo_score}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Campaign Column */}
      <div className="col-span-2 min-w-0">
        {article.campaigns && article.campaigns.name !== 'Quick Generate' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dashboardNavigate(`/dashboard/campaigns/${article.campaigns!.id}`);
            }}
            className="text-xs text-muted hover:text-accent transition-colors truncate block"
            title={article.campaigns.name}
          >
            {article.campaigns.name}
          </button>
        ) : (
          <span className="text-xs text-muted italic">Uncategorized</span>
        )}
      </div>

      {/* Word Count Column */}
      <div className="col-span-1 text-right">
        {article.word_count ? (
          <span className="text-xs text-muted font-mono">{article.word_count.toLocaleString()}</span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Images Column */}
      <div className="col-span-1 text-center">
        {article.image_count != null && article.image_count > 0 ? (
          <span className="text-xs text-muted flex items-center justify-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {article.image_count}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>

      {/* Date Column */}
      <div className="col-span-1 text-right">
        <span className="text-xs text-muted">
          {new Date(article.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Actions Column */}
      <div className="col-span-1 flex justify-end">
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            title="View published article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
