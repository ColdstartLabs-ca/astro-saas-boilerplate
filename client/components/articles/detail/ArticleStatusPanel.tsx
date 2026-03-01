/**
 * ArticleStatusPanel Component
 *
 * Displays article status information including SEO score, AI detection score,
 * QA results, and delivery status.
 */

'use client';

import { memo } from 'react';
import { AlertCircle, Wrench, Loader2 } from 'lucide-react';
import type { IArticleWithCampaign, IQAResult } from '@shared/types/article.types';
import type { IIntegrationDeliveryWithDetails } from '@shared/types/integration.types';
import { SEOScoreDisplay } from '@client/components/articles/SEOScoreDisplay';
import { AIDetectionScore } from '@client/components/articles/AIDetectionScore';
import { DeliveryStatusCard } from '@client/components/dashboard/views/articles/DeliveryStatusCard';

// =============================================================================
// QAFailureBanner Props
// =============================================================================

interface IQAFailureBannerProps {
  qaResults: IQAResult;
  onFixIssues: () => void;
  isFixing: boolean;
}

// =============================================================================
// QAFailureBanner Component
// =============================================================================

const QAFailureBanner = memo(function QAFailureBanner({
  qaResults,
  onFixIssues,
  isFixing,
}: IQAFailureBannerProps): JSX.Element {
  const { results } = qaResults;

  const checks = [
    {
      label: 'Plagiarism',
      passed: results.plagiarism.passed,
      detail: `${Math.round(results.plagiarism.similarityScore * 100)}% similarity`,
    },
    {
      label: 'Fact Consistency',
      passed: results.factConsistency.passed,
      detail: `${Math.round(results.factConsistency.score * 100)}% score`,
    },
    {
      label: 'Readability',
      passed: results.readability.passed,
      detail: `Grade ${results.readability.fleschKincaidGrade.toFixed(1)}`,
    },
    {
      label: 'AI Detection',
      passed: results.aiLikelihood.passed,
      detail: `${Math.round(results.aiLikelihood.aiScore * 100)}% AI score`,
    },
  ];

  return (
    <div className="not-prose mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-2">
            <p className="text-sm font-medium text-orange-400">
              QA checks failed — fix automatically or review and approve manually
            </p>
            <button
              type="button"
              onClick={onFixIssues}
              disabled={isFixing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFixing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wrench className="w-3 h-3" />
              )}
              {isFixing ? 'Fixing…' : 'Fix Issues'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {checks.map(({ label, passed, detail }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  passed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {passed ? '\u2713' : '\u2717'} {label}: {detail}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// ArticleStatusPanel Props
// =============================================================================

export interface IArticleStatusPanelProps {
  /** The article to display status for */
  article: IArticleWithCampaign;
  /** Whether the panel is in edit mode (hides scores/status) */
  isEditing: boolean;
  /** Article deliveries for delivery status card */
  deliveries: IIntegrationDeliveryWithDetails[];
  /** Whether deliveries are loading */
  deliveriesLoading: boolean;
  /** Currently retrying delivery ID */
  retryingId: string | null;
  /** Callback to retry delivery */
  onRetryDelivery: (deliveryId: string) => void;
  /** Callback to fix QA issues */
  onFixQAIssues: () => void;
  /** Whether QA fix is in progress */
  isFixingQA: boolean;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

// =============================================================================
// ArticleStatusPanel Component
// =============================================================================

export const ArticleStatusPanel = memo(function ArticleStatusPanel({
  article,
  isEditing,
  deliveries,
  deliveriesLoading,
  retryingId,
  onRetryDelivery,
  onFixQAIssues,
  isFixingQA,
  t,
}: IArticleStatusPanelProps): JSX.Element | null {
  // Don't render scores/status while editing
  if (isEditing) {
    return null;
  }

  const hasContent = Boolean(article.content);
  const showDeliveryStatus = deliveries.length > 0 || deliveriesLoading;

  return (
    <div className="space-y-6">
      {/* SEO Score Display - show when content exists */}
      {hasContent && (
        <div>
          <SEOScoreDisplay article={article} />
        </div>
      )}

      {/* AI Detection Score Display - show when content exists */}
      {hasContent && (
        <div>
          <AIDetectionScore score={article.ai_detection_score ?? null} />
        </div>
      )}

      {/* QA failure banner — shown for qa_failed status */}
      {article.status === 'qa_failed' && article.qa_results && (
        <QAFailureBanner
          qaResults={article.qa_results}
          onFixIssues={onFixQAIssues}
          isFixing={isFixingQA}
        />
      )}

      {/* Delivery Status section */}
      {showDeliveryStatus && (
        <div className="pt-6 border-t border-border">
          <DeliveryStatusCard
            deliveries={deliveries}
            isLoading={deliveriesLoading}
            retryingId={retryingId}
            onRetry={onRetryDelivery}
            t={t}
          />
        </div>
      )}
    </div>
  );
});
