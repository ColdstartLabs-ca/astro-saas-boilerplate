'use client';

import { BarChart3, Loader2, Search, RefreshCw } from 'lucide-react';
import { useTranslations } from '@client/hooks/useTranslations';
import { DashboardButton } from '../ui/DashboardButton';
import { GscConnectionCard } from './opportunities/GscConnectionCard';
import { PerformanceSummaryBar } from './analytics/PerformanceSummaryBar';
import { ArticlePerformanceTable } from './analytics/ArticlePerformanceTable';
import type { IAnalyticsData } from '@shared/types/article-performance.types';

// =============================================================================
// Props
// =============================================================================

interface IAnalyticsViewProps {
  data: IAnalyticsData | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  onSync: () => void;
  dateRangeDays: 7 | 28 | 90;
  onDateRangeChange: (days: 7 | 28 | 90) => void;
  hasGscConnection: boolean;
  onConnectGsc: () => void;
  isLoadingGsc: boolean;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface IDateRangePillsProps {
  dateRangeDays: 7 | 28 | 90;
  onDateRangeChange: (days: 7 | 28 | 90) => void;
  t: (key: string) => string;
}

function DateRangePills({
  dateRangeDays,
  onDateRangeChange,
  t,
}: IDateRangePillsProps): JSX.Element {
  const ranges: (7 | 28 | 90)[] = [7, 28, 90];

  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
      {ranges.map(days => (
        <button
          key={days}
          type="button"
          onClick={() => onDateRangeChange(days)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
            dateRangeDays === days
              ? 'bg-accent text-white shadow-sm'
              : 'text-secondary hover:text-white hover:bg-surface-light'
          }`}
        >
          {t(`analytics.dateRange.${days}d`)}
        </button>
      ))}
    </div>
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-6 bg-surface rounded w-36 mb-2" />
          <div className="h-4 bg-surface rounded w-56" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-surface rounded w-32" />
          <div className="h-8 bg-surface rounded w-24" />
        </div>
      </div>
      <div className="h-24 bg-surface border border-border rounded-xl" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-surface border border-border rounded-xl h-14" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AnalyticsView({
  data,
  isLoading,
  isSyncing,
  onSync,
  dateRangeDays,
  onDateRangeChange,
  hasGscConnection,
  onConnectGsc,
  isLoadingGsc,
}: IAnalyticsViewProps): JSX.Element {
  const t = useTranslations('dashboard');

  // ---- Loading skeleton ----
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ---- No GSC connection ----
  if (!hasGscConnection) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-white">{t('analytics.title')}</h2>
          <p className="text-secondary text-sm">{t('analytics.subtitle')}</p>
        </div>

        <GscConnectionCard
          connection={null}
          isLoading={isLoadingGsc}
          onConnect={onConnectGsc}
          onDisconnect={() => {}}
          onSelectSite={() => {}}
          sites={[]}
          isConnecting={false}
          isDisconnecting={false}
          isLoadingSites={false}
        />
      </div>
    );
  }

  // ---- Has GSC but no data yet ----
  const hasArticles = (data?.articles.length ?? 0) > 0;

  if (!hasArticles && !isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{t('analytics.title')}</h2>
            <p className="text-secondary text-sm">{t('analytics.subtitle')}</p>
          </div>
          <DashboardButton size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('analytics.syncing')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('analytics.syncButton')}
              </>
            )}
          </DashboardButton>
        </div>

        <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl">
          <div className="w-20 h-20 rounded-full bg-main border border-border flex items-center justify-center mb-6">
            <BarChart3 className="w-10 h-10 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('analytics.noData')}</h3>
          <p className="text-secondary text-sm mb-6 text-center max-w-md">
            {t('analytics.noDataDescription')}
          </p>
          <DashboardButton size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('analytics.syncing')}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {t('analytics.syncButton')}
              </>
            )}
          </DashboardButton>
        </div>
      </div>
    );
  }

  // ---- Data loaded: full analytics view ----
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{t('analytics.title')}</h2>
          <p className="text-secondary text-sm">{t('analytics.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangePills
            dateRangeDays={dateRangeDays}
            onDateRangeChange={onDateRangeChange}
            t={t}
          />
          <DashboardButton size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('analytics.syncing')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('analytics.syncButton')}
              </>
            )}
          </DashboardButton>
        </div>
      </div>

      {/* Summary bar */}
      {data?.summary && <PerformanceSummaryBar summary={data.summary} />}

      {/* Article performance table */}
      {data?.articles && <ArticlePerformanceTable articles={data.articles} />}
    </div>
  );
}
