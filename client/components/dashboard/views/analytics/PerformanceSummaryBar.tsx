'use client';

import { useTranslations } from '@client/hooks/useTranslations';
import type { IPerformanceSummary } from '@shared/types/article-performance.types';

// =============================================================================
// Formatting Helpers
// =============================================================================

const formatNumber = (n: number): string => n.toLocaleString();
const formatCtr = (ctr: number): string => `${(ctr * 100).toFixed(2)}%`;
const formatPosition = (pos: number): string => pos.toFixed(1);

// =============================================================================
// Sub-Components
// =============================================================================

interface IMetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: IMetricCardProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-6 flex-1 min-w-0">
      <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
      <span className="text-xs text-muted mt-1 text-center">{label}</span>
    </div>
  );
}

// =============================================================================
// Props
// =============================================================================

interface IPerformanceSummaryBarProps {
  summary: IPerformanceSummary;
}

// =============================================================================
// Main Component
// =============================================================================

export function PerformanceSummaryBar({ summary }: IPerformanceSummaryBarProps): JSX.Element {
  const t = useTranslations('dashboard');

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Metrics row */}
      <div className="flex flex-wrap divide-x divide-border">
        <MetricCard
          label={t('analytics.summary.clicks')}
          value={formatNumber(summary.total_clicks)}
        />
        <MetricCard
          label={t('analytics.summary.impressions')}
          value={formatNumber(summary.total_impressions)}
        />
        <MetricCard label={t('analytics.summary.avgCtr')} value={formatCtr(summary.avg_ctr)} />
        <MetricCard
          label={t('analytics.summary.avgPosition')}
          value={formatPosition(summary.avg_position)}
        />
      </div>

      {/* Articles tracked footer */}
      <div className="border-t border-border px-6 py-2 bg-surface-light/30">
        <p className="text-xs text-muted text-center">
          {t('analytics.summary.articlesTracked')
            .replace('{tracked}', String(summary.articles_tracked))
            .replace('{published}', String(summary.articles_published))}
        </p>
      </div>
    </div>
  );
}
