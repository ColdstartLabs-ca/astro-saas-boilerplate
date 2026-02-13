/**
 * OpportunityDetailPanel Component
 *
 * Slide-over panel showing full opportunity details.
 * Slides in from the right with a backdrop overlay.
 */

'use client';

import { useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  TrendingUp,
  Layers,
  MousePointerClick,
  TrendingDown,
  FileWarning,
  GitBranch,
  Lightbulb,
  Loader2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';
import type {
  IOpportunity,
  OpportunityType,
  OpportunityCategory,
} from '@shared/types/opportunity.types';

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

const CONTENT_OPPORTUNITY_TYPES: OpportunityType[] = [
  'content_gap',
  'low_hanging_fruit',
  'topic_cluster',
];

// =============================================================================
// Props
// =============================================================================

interface IOpportunityDetailPanelProps {
  opportunity: IOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateArticle: (opportunityId: string) => void;
  onDismiss: (opportunityId: string) => void;
  onMarkComplete: (opportunityId: string) => void;
  isCreatingArticle?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

function CategoryBadge({
  category,
  t,
}: {
  category: OpportunityCategory;
  t: (key: string) => string;
}): JSX.Element {
  const styles: Record<OpportunityCategory, string> = {
    content: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    technical: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <span
      data-testid="opportunity-category-badge"
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${styles[category]}`}
    >
      {t(`opportunities.filter.${category}`)}
    </span>
  );
}

function ImpactBadge({ impact, t }: { impact: string; t: (key: string) => string }): JSX.Element {
  const styles: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${styles[impact] ?? styles.low}`}
    >
      {t(`opportunities.impact.${impact}`)}
    </span>
  );
}

function PriorityIndicator({ score }: { score: number }): JSX.Element {
  let colorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
  if (score >= 80) {
    colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (score >= 50) {
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass}`}>
      <span className="font-mono text-lg font-bold">{score}</span>
      <span className="text-xs opacity-75">/ 100</span>
    </div>
  );
}

function StatusTimeline({
  status,
  t,
}: {
  status: string;
  t: (key: string) => string;
}): JSX.Element {
  const steps = ['open', 'in_progress', 'completed'];
  const currentIndex = steps.indexOf(status);
  const isDismissed = status === 'dismissed';

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = !isDismissed && i <= currentIndex;
        const isCurrent = !isDismissed && step === status;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                isActive ? 'border-accent bg-accent' : 'border-border bg-transparent'
              } ${isCurrent ? 'ring-2 ring-accent/30' : ''}`}
            />
            <span className={`text-xs ${isActive ? 'text-secondary' : 'text-muted'}`}>
              {t(`opportunities.status.${step}`)}
            </span>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted" />}
          </div>
        );
      })}
      {isDismissed && (
        <span className="text-xs text-muted ml-2">({t('opportunities.status.dismissed')})</span>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OpportunityDetailPanel({
  opportunity,
  isOpen,
  onClose,
  onCreateArticle,
  onDismiss,
  onMarkComplete,
  isCreatingArticle = false,
}: IOpportunityDetailPanelProps): JSX.Element | null {
  const t = useTranslations('dashboard');

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !opportunity) return null;

  const { metrics } = opportunity;
  const TypeIcon = TYPE_ICONS[opportunity.type] ?? Lightbulb;
  const isContentOpportunity = CONTENT_OPPORTUNITY_TYPES.includes(opportunity.type);

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div data-testid="opportunity-detail-panel" className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-semibold text-white truncate">
              {t('opportunities.detail.title')}
            </h2>
            <p className="text-sm text-secondary mt-1 truncate">{opportunity.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-white hover:bg-surface-light transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={opportunity.category} t={t} />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border text-secondary bg-surface-light">
              <TypeIcon className="w-3.5 h-3.5" />
              {t(`opportunities.type.${opportunity.type}`)}
            </span>
            <ImpactBadge impact={opportunity.estimated_impact} t={t} />
          </div>

          {/* Priority score */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-secondary">Priority:</span>
            <PriorityIndicator score={opportunity.priority_score} />
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-secondary leading-relaxed">{opportunity.description}</p>
          </div>

          {/* Query */}
          {opportunity.query && (
            <div className="bg-main rounded-lg p-3 border border-border">
              <span className="text-xs text-muted block mb-1">Query</span>
              <span className="text-sm text-white font-medium">{opportunity.query}</span>
            </div>
          )}

          {/* Page URL */}
          {opportunity.page_url && (
            <div className="bg-main rounded-lg p-3 border border-border">
              <span className="text-xs text-muted block mb-1">Page URL</span>
              <span className="text-sm text-accent break-all">{opportunity.page_url}</span>
            </div>
          )}

          {/* Metrics Card */}
          <div data-testid="opportunity-metrics" className="bg-main rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-white mb-3">
              {t('opportunities.detail.metrics')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted block">
                  {t('opportunities.detail.position')}
                </span>
                <span className="text-lg font-semibold text-white">
                  {formatPosition(metrics.position)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted block">{t('opportunities.detail.ctr')}</span>
                <span className="text-lg font-semibold text-white">{formatCtr(metrics.ctr)}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">
                  {t('opportunities.detail.impressions')}
                </span>
                <span className="text-lg font-semibold text-white">
                  {formatNumber(metrics.impressions)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted block">{t('opportunities.detail.clicks')}</span>
                <span className="text-lg font-semibold text-white">
                  {formatNumber(metrics.clicks)}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations (for technical opportunities) */}
          {!isContentOpportunity && (
            <div className="bg-main rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                {t('opportunities.detail.recommendations')}
              </h3>
              <p className="text-sm text-secondary leading-relaxed">{opportunity.description}</p>
            </div>
          )}

          {/* Content opportunity CTA */}
          {isContentOpportunity && opportunity.status === 'open' && (
            <DashboardButton
              size="md"
              className="w-full"
              onClick={() => onCreateArticle(opportunity.id)}
              disabled={isCreatingArticle}
            >
              {isCreatingArticle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('opportunities.createArticle')}
                </>
              )}
            </DashboardButton>
          )}

          {/* Status timeline */}
          <div>
            <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Status</h3>
            <StatusTimeline status={opportunity.status} t={t} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-border">
          {opportunity.status === 'open' && (
            <DashboardButton variant="ghost" size="sm" onClick={() => onDismiss(opportunity.id)}>
              {t('opportunities.dismiss')}
            </DashboardButton>
          )}
          {(opportunity.status === 'open' || opportunity.status === 'in_progress') && (
            <DashboardButton
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(opportunity.id)}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {t('opportunities.markComplete')}
            </DashboardButton>
          )}
        </div>
      </div>
    </>
  );
}
