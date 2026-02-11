'use client';

import { useState, useMemo } from 'react';
import {
  Lightbulb,
  FileText,
  TrendingUp,
  Layers,
  MousePointerClick,
  TrendingDown,
  FileWarning,
  GitBranch,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { GscConnectionCard } from './opportunities/GscConnectionCard';
import { OpportunityActions } from './opportunities/OpportunityActions';
import { useTranslations } from '@client/hooks/useTranslations';
import type {
  IOpportunity,
  OpportunityType,
  OpportunityCategory,
  OpportunityStatus,
  IGscConnectionSafe,
  IGscSite,
} from '@shared/types/opportunity.types';
import type { IProject } from '@shared/types/project.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// =============================================================================
// Constants
// =============================================================================

const TYPE_ICONS: Record<OpportunityType, typeof FileText> = {
  content_gap: FileText,
  low_hanging_fruit: TrendingUp,
  topic_cluster: Layers,
  low_ctr: MousePointerClick,
  declining_position: TrendingDown,
  thin_content: FileWarning,
  cannibalization: GitBranch,
};

// =============================================================================
// Props
// =============================================================================

interface IOpportunitiesViewProps {
  opportunities: IOpportunity[];
  isLoading: boolean;
  isAnalyzing: boolean;
  lastAnalyzedAt: string | null;
  activeProject: IProject | null;
  hasGscConnection: boolean;
  onAnalyze: () => void;
  onOpportunityClick: (id: string) => void;
  onDismiss: (id: string) => void;
  onCreateArticle: (id: string) => void;
  onConnectGsc: () => void;
  gscConnection?: IGscConnectionSafe | null;
  isLoadingGsc?: boolean;
  onDisconnectGsc?: () => void;
  onSelectGscSite?: (siteUrl: string) => void;
  gscSites?: IGscSite[];
  isConnectingGsc?: boolean;
  isDisconnectingGsc?: boolean;
  isLoadingGscSites?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

function PriorityBadge({ score }: { score: number }): JSX.Element {
  let colorClass = 'text-red-400';
  if (score >= 80) {
    colorClass = 'text-emerald-400';
  } else if (score >= 50) {
    colorClass = 'text-amber-400';
  }

  return <span className={`font-mono text-sm font-semibold ${colorClass}`}>{score}</span>;
}

function StatusBadge({
  status,
  t,
}: {
  status: OpportunityStatus;
  t: (key: string) => string;
}): JSX.Element {
  const styles: Record<OpportunityStatus, string> = {
    open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dismissed: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}
    >
      {t(`opportunities.status.${status}`)}
    </span>
  );
}

function TypeLabel({
  type,
  t,
}: {
  type: OpportunityType;
  t: (key: string) => string;
}): JSX.Element {
  const Icon = TYPE_ICONS[type] ?? Lightbulb;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
      <Icon className="w-3.5 h-3.5" />
      {t(`opportunities.type.${type}`)}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OpportunitiesView({
  opportunities,
  isLoading,
  isAnalyzing,
  lastAnalyzedAt,
  activeProject,
  hasGscConnection,
  onAnalyze,
  onOpportunityClick,
  onDismiss,
  onCreateArticle,
  onConnectGsc,
  gscConnection,
  isLoadingGsc = false,
  onDisconnectGsc,
  onSelectGscSite,
  gscSites = [],
  isConnectingGsc = false,
  isDisconnectingGsc = false,
  isLoadingGscSites = false,
}: IOpportunitiesViewProps): JSX.Element {
  const t = useTranslations('dashboard');

  // Local filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | OpportunityCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OpportunityStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(o => o.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.title.toLowerCase().includes(query) ||
          (o.query && o.query.toLowerCase().includes(query)) ||
          (o.page_url && o.page_url.toLowerCase().includes(query))
      );
    }

    // Sort by priority_score DESC
    filtered.sort((a, b) => b.priority_score - a.priority_score);

    return filtered;
  }, [opportunities, categoryFilter, statusFilter, searchQuery]);

  // ---- Empty state: No project selected ----
  if (!isLoading && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
          <Lightbulb className="w-10 h-10 text-muted" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {t('opportunities.empty.noProject')}
        </h3>
      </div>
    );
  }

  // ---- Loading skeleton ----
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-6 bg-surface rounded w-40 mb-2"></div>
            <div className="h-4 bg-surface rounded w-64"></div>
          </div>
          <div className="h-8 bg-surface rounded w-28"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  // ---- No GSC connection ----
  if (!hasGscConnection) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-white">{t('opportunities.title')}</h2>
          <p className="text-secondary text-sm">{t('opportunities.subtitle')}</p>
        </div>

        <GscConnectionCard
          connection={gscConnection ?? null}
          isLoading={isLoadingGsc}
          onConnect={onConnectGsc}
          onDisconnect={onDisconnectGsc ?? (() => {})}
          onSelectSite={onSelectGscSite ?? (() => {})}
          sites={gscSites}
          isConnecting={isConnectingGsc}
          isDisconnecting={isDisconnectingGsc}
          isLoadingSites={isLoadingGscSites}
        />
      </div>
    );
  }

  // ---- Connected but no opportunities ----
  if (opportunities.length === 0 && !isAnalyzing) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{t('opportunities.title')}</h2>
            <p className="text-secondary text-sm">{t('opportunities.subtitle')}</p>
          </div>
          <DashboardButton size="sm" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('opportunities.analyzing')}
              </>
            ) : (
              t('opportunities.analyzeNow')
            )}
          </DashboardButton>
        </div>

        <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl">
          <div className="w-20 h-20 rounded-full bg-main border border-border flex items-center justify-center mb-6">
            <Lightbulb className="w-10 h-10 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('opportunities.title')}</h3>
          <p className="text-secondary text-sm mb-6 text-center max-w-md">
            {t('opportunities.empty.noOpportunities')}
          </p>
        </div>
      </div>
    );
  }

  // ---- Main opportunity list view ----
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* GSC Connection Status (compact) */}
      {gscConnection && (
        <GscConnectionCard
          connection={gscConnection}
          isLoading={false}
          onConnect={onConnectGsc}
          onDisconnect={onDisconnectGsc ?? (() => {})}
          onSelectSite={onSelectGscSite ?? (() => {})}
          sites={gscSites}
          isConnecting={isConnectingGsc}
          isDisconnecting={isDisconnectingGsc}
          isLoadingSites={isLoadingGscSites}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{t('opportunities.title')}</h2>
          <p className="text-secondary text-sm">
            {t('opportunities.subtitle')}
            {lastAnalyzedAt && (
              <span className="ml-2 text-muted">
                {t('opportunities.lastAnalyzed')} {dayjs(lastAnalyzedAt).fromNow()}
              </span>
            )}
          </p>
        </div>
        <DashboardButton size="sm" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('opportunities.analyzing')}
            </>
          ) : (
            t('opportunities.analyzeNow')
          )}
        </DashboardButton>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as 'all' | OpportunityCategory)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="all">{t('opportunities.filter.all')}</option>
          <option value="content">{t('opportunities.filter.content')}</option>
          <option value="technical">{t('opportunities.filter.technical')}</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | OpportunityStatus)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="all">{t('opportunities.filter.all')}</option>
          <option value="open">{t('opportunities.status.open')}</option>
          <option value="in_progress">{t('opportunities.status.in_progress')}</option>
          <option value="completed">{t('opportunities.status.completed')}</option>
          <option value="dismissed">{t('opportunities.status.dismissed')}</option>
        </select>

        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Opportunities table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[60px_140px_1fr_140px_200px_100px_80px] gap-4 px-4 py-3 border-b border-border text-xs font-medium text-muted uppercase tracking-wider">
          <span>Score</span>
          <span>Type</span>
          <span>Title / Query</span>
          <span>Status</span>
          <span>Metrics</span>
          <span>Impact</span>
          <span></span>
        </div>

        {/* Table body */}
        {filteredOpportunities.length === 0 ? (
          <div className="px-4 py-12 text-center text-secondary text-sm">
            No opportunities match your filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOpportunities.map(opportunity => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                t={t}
                onClick={() => onOpportunityClick(opportunity.id)}
                onDismiss={onDismiss}
                onCreateArticle={onCreateArticle}
                onViewDetails={onOpportunityClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-muted text-right">
        {filteredOpportunities.length} of {opportunities.length} opportunities
      </div>
    </div>
  );
}

// =============================================================================
// Row Component
// =============================================================================

interface IOpportunityRowProps {
  opportunity: IOpportunity;
  t: (key: string) => string;
  onClick: () => void;
  onDismiss: (id: string) => void;
  onCreateArticle: (id: string) => void;
  onViewDetails: (id: string) => void;
}

function OpportunityRow({
  opportunity,
  t,
  onClick,
  onDismiss,
  onCreateArticle,
  onViewDetails,
}: IOpportunityRowProps): JSX.Element {
  const { metrics } = opportunity;

  const formatCtr = (ctr?: number): string => {
    if (ctr === undefined || ctr === null) return '-';
    return `${(ctr * 100).toFixed(1)}%`;
  };

  const formatPosition = (pos?: number): string => {
    if (pos === undefined || pos === null) return '-';
    return pos.toFixed(1);
  };

  const formatNumber = (num?: number): string => {
    if (num === undefined || num === null) return '-';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[60px_140px_1fr_140px_200px_100px_80px] gap-2 md:gap-4 px-4 py-3 hover:bg-surface-light/50 cursor-pointer transition-colors group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Priority Score */}
      <div className="flex items-center md:justify-center">
        <span className="md:hidden text-xs text-muted mr-2">Score:</span>
        <PriorityBadge score={opportunity.priority_score} />
      </div>

      {/* Type */}
      <div className="flex items-center">
        <TypeLabel type={opportunity.type} t={t} />
      </div>

      {/* Title / Query */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-sm text-white font-medium truncate group-hover:text-accent-hover transition-colors">
          {opportunity.title}
        </span>
        {opportunity.query && (
          <span className="text-xs text-muted truncate mt-0.5">{opportunity.query}</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        <StatusBadge status={opportunity.status} t={t} />
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-3 text-xs text-secondary">
        {metrics.position !== undefined && (
          <span title="Position">Pos: {formatPosition(metrics.position)}</span>
        )}
        {metrics.ctr !== undefined && <span title="CTR">CTR: {formatCtr(metrics.ctr)}</span>}
        {metrics.impressions !== undefined && (
          <span title="Impressions">Imp: {formatNumber(metrics.impressions)}</span>
        )}
      </div>

      {/* Impact */}
      <div className="flex items-center">
        <span className="text-xs text-secondary capitalize">
          {t(`opportunities.impact.${opportunity.estimated_impact}`)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <OpportunityActions
          opportunity={opportunity}
          onCreateArticle={onCreateArticle}
          onDismiss={onDismiss}
          onViewDetails={onViewDetails}
        />
      </div>
    </div>
  );
}
