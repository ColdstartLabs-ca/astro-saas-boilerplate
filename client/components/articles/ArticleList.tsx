/**
 * ArticleList Component
 *
 * Displays a list of articles with campaign info, status, and image thumbnails.
 * Includes filtering by campaign, status, search, and date range + pagination.
 */
'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText,
  Loader2,
  Filter,
  X,
  ChevronDown,
  Check,
  XCircle,
  CheckSquare,
  Square,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useArticles } from '@client/hooks/useArticles';
import { useProjects } from '@client/hooks/useProjects';
import { useCampaigns } from '@client/hooks/useCampaigns';
import { getTranslations } from '@src/i18n/utils';
import type { IArticleWithCampaign, ArticleStatus } from '@shared/types/article.types';
import { ArticleDetailModal } from './ArticleDetailModal';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import {
  useArticleFilters,
  useArticleBulkActions,
  ArticleTableRow,
  ARTICLE_STATUSES,
  parseDateFromInput,
  getStatusBadge,
} from './article-list';

const ITEMS_PER_PAGE = 20;

interface IArticleListProps {
  statusFilter?: string;
}

export function ArticleList({ statusFilter: propStatusFilter }: IArticleListProps): JSX.Element {
  const _t = useMemo(() => getTranslations('dashboard'), []);
  const { activeProject } = useProjects();
  const { campaigns } = useCampaigns(activeProject?.id ?? null);

  // Filter management
  const {
    filters,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
    isFilterOpen,
    setIsFilterOpen,
  } = useArticleFilters({ propStatusFilter });

  // Pagination
  const [page, setPage] = useState(1);

  // Reset page when filters change
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.campaignId !== filters.campaignId ||
      prev.status !== filters.status ||
      prev.search !== filters.search ||
      prev.dateFrom !== filters.dateFrom ||
      prev.dateTo !== filters.dateTo
    ) {
      setPage(1);
    }
    prevFiltersRef.current = filters;
  }, [filters]);

  // Search debounce
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        handleFilterChange('search', value);
      }, 300);
    },
    [handleFilterChange]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Article selection state
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<IArticleWithCampaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Articles query
  const { articles, total, totalPages, isLoading, error, refetch } = useArticles({
    projectId: activeProject?.id,
    campaignId: filters.campaignId || undefined,
    status:
      filters.status && filters.status !== 'all' ? (filters.status as ArticleStatus) : undefined,
    search: filters.search || undefined,
    dateFrom: filters.dateFrom ? parseDateFromInput(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? parseDateFromInput(filters.dateTo) : undefined,
    limit: ITEMS_PER_PAGE,
    page,
    enabled: !!activeProject,
  });

  // Selection handlers
  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedArticleIds.size === articles.length) {
      setSelectedArticleIds(new Set());
    } else {
      setSelectedArticleIds(new Set(articles.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedArticleIds(new Set());
  };

  const allSelected = articles.length > 0 && selectedArticleIds.size === articles.length;
  const someSelected = selectedArticleIds.size > 0;

  // Bulk actions
  const bulkActions = useArticleBulkActions({
    onRefetch: refetch,
    onClearSelection: clearSelection,
    translations: {
      bulkApprovePartial: _t('articles.approval.error.bulkApprovePartial'),
      bulkApproveFailed: _t('articles.approval.error.bulkApproveFailed'),
      bulkRejectPartial: _t('articles.approval.error.bulkRejectPartial'),
      bulkRejectFailed: _t('articles.approval.error.bulkRejectFailed'),
    },
  });

  // Pagination helpers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSelectedArticleIds(new Set());
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Loading articles...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div data-testid="articles-error-state" className="bg-surface border border-border rounded-xl p-12 text-center">
        <p className="text-error text-sm">Failed to load articles</p>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="space-y-0">
        {/* Search + Filters header even on empty */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">{_t('articles.recent')}</h2>
              <div className="flex-1 max-w-xs">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full bg-main border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-muted/60 focus:ring-1 focus:ring-accent outline-none"
                  />
                  {searchInput && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
                {hasActiveFilters && <span className="w-1.5 h-1.5 bg-accent rounded-full" />}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Filter Panel */}
            {isFilterOpen && (
              <FilterPanel
                filters={filters}
                campaigns={campaigns}
                handleFilterChange={handleFilterChange}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                _t={_t}
              />
            )}
          </div>

          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-light mb-4">
              <FileText className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">No articles yet</h3>
            <p className="text-muted text-sm max-w-xs mx-auto">
              {hasActiveFilters || searchInput
                ? 'No articles match your current filters'
                : 'Generate your first article to see it here'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="articles-list" className="space-y-0">
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
              onClick={() => bulkActions.handleBulkApprove(selectedArticleIds)}
              disabled={bulkActions.isBulkApproving || bulkActions.isBulkRejecting}
              className="text-green-400 border-green-500/30 hover:bg-green-500/10"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {bulkActions.isBulkApproving ? 'Approving...' : 'Approve'}
            </DashboardButton>
            <DashboardButton
              variant="outline"
              size="sm"
              onClick={bulkActions.openBulkRejectDialog}
              disabled={bulkActions.isBulkApproving || bulkActions.isBulkRejecting}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject
            </DashboardButton>
          </div>
        </div>
      )}

      {/* Header with Search + Filters */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary">{_t('articles.recent')}</h2>
            <span className="text-xs text-muted font-mono bg-surface-light px-2 py-0.5 rounded">
              {total}
            </span>
            <div className="flex-1 max-w-xs ml-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full bg-main border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-muted/60 focus:ring-1 focus:ring-accent outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                hasActiveFilters
                  ? 'text-accent border-accent/30 bg-accent/5'
                  : 'text-muted border-border bg-surface-light/50 hover:text-white hover:border-accent/30'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 bg-accent rounded-full" />}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <FilterPanel
              filters={filters}
              campaigns={campaigns}
              handleFilterChange={handleFilterChange}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              _t={_t}
            />
          )}

          {/* Active Filters Tags */}
          {hasActiveFilters && !isFilterOpen && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {filters.campaignId && campaigns.find(c => c.id === filters.campaignId) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  {campaigns.find(c => c.id === filters.campaignId)?.name}
                  <button
                    onClick={() => handleFilterChange('campaignId', '')}
                    className="hover:text-white ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.status && filters.status !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  {_t(`articles.status.${filters.status}`)}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="hover:text-white ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/8 text-accent rounded text-[10px] font-medium border border-accent/15">
                  Search: {filters.search}
                  <button
                    onClick={() => {
                      handleSearchChange('');
                      handleFilterChange('search', '');
                    }}
                    className="hover:text-white ml-0.5"
                  >
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

        {/* Bulk Operation Result Message */}
        {(bulkActions.bulkError ||
          (bulkActions.bulkSuccessCount !== null && bulkActions.bulkFailureCount !== null)) && (
          <div
            className={`mx-3 mt-3 p-3 rounded-lg text-sm flex items-center justify-between ${
              bulkActions.bulkFailureCount === 0
                ? 'bg-green-500/8 border border-green-500/20 text-green-400'
                : 'bg-red-500/8 border border-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {bulkActions.bulkFailureCount === 0 ? (
                <Check className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>
                {bulkActions.bulkSuccessCount !== null && bulkActions.bulkFailureCount !== null
                  ? `${bulkActions.bulkSuccessCount} succeeded, ${bulkActions.bulkFailureCount} failed`
                  : bulkActions.bulkError}
              </span>
            </div>
            <button
              onClick={bulkActions.clearBulkResult}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
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
          {articles.map(article => (
            <ArticleTableRow
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of{' '}
              {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {generatePageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                      page === p
                        ? 'bg-accent text-white'
                        : 'text-muted hover:text-white hover:bg-surface-light'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedArticle(null);
        }}
        onUpdate={updatedArticle => {
          setSelectedArticle(updatedArticle);
          refetch();
        }}
      />

      {/* Bulk Rejection Dialog Modal */}
      {bulkActions.showBulkRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {_t('articles.approval.bulkReject')}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {_t('articles.approval.bulkRejecting')
                  .replace('{count}', String(selectedArticleIds.size))
                  .replace('{plural}', selectedArticleIds.size > 1 ? 's' : '')}
              </p>
              <textarea
                value={bulkRejectReason}
                onChange={e => setBulkRejectReason(e.target.value)}
                placeholder={_t('articles.approval.rejectReasonPlaceholder')}
                className="w-full px-3 py-2 bg-surface-light border border-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <DashboardButton
                variant="ghost"
                onClick={() => {
                  bulkActions.closeBulkRejectDialog();
                  setBulkRejectReason('');
                }}
                disabled={bulkActions.isBulkRejecting}
              >
                {_t('articles.detailModal.cancel')}
              </DashboardButton>
              <DashboardButton
                variant="primary"
                onClick={() => bulkActions.handleBulkReject(selectedArticleIds, bulkRejectReason)}
                disabled={bulkActions.isBulkRejecting}
                className="bg-red-500 hover:bg-red-600"
              >
                {bulkActions.isBulkRejecting ? (
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

// =============================================================================
// Sub-components
// =============================================================================

interface IFilterPanelProps {
  filters: { campaignId: string; status: string; dateFrom: string; dateTo: string };
  campaigns: { id: string; name: string }[];
  handleFilterChange: (key: keyof import('./article-list').IArticleFilters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  _t: (key: string) => string;
}

function FilterPanel({
  filters,
  campaigns,
  handleFilterChange,
  clearFilters,
  hasActiveFilters,
  _t,
}: IFilterPanelProps): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-border animate-fadeIn">
      <div>
        <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Campaign
        </label>
        <select
          value={filters.campaignId}
          onChange={e => handleFilterChange('campaignId', e.target.value)}
          className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(campaign => (
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
          onChange={e => handleFilterChange('status', e.target.value)}
          className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-accent outline-none"
        >
          {ARTICLE_STATUSES.map(status => (
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
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            className="w-full bg-main border border-border rounded-lg px-2 py-2 text-white text-xs focus:ring-1 focus:ring-accent outline-none"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
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
  );
}

/**
 * Generate page number array with ellipsis for pagination
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}
