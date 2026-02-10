import { Coins, TrendingUp, AlertTriangle, Layers } from 'lucide-react';
import type { ICampaignCreditStats, IKeyword } from '@shared/types/campaign.types';

interface ICampaignCreditUsageProps {
  creditStats: ICampaignCreditStats;
  keywords: IKeyword[];
  t: (key: string) => string;
}

export function CampaignCreditUsage({
  creditStats,
  keywords,
  t,
}: ICampaignCreditUsageProps): JSX.Element {
  const pendingCount = keywords.filter(
    k => k.status === 'pending' || k.status === 'queued'
  ).length;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-accent-hover" />
          {t('campaigns.detail.credits.title')}
        </h3>
        <div className="text-xs text-muted font-mono">
          {t('campaigns.detail.credits.costPerArticle')}: {creditStats.costPerArticle}{' '}
          {creditStats.costPerArticle === 1 ? 'credit' : 'credits'}
        </div>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Credits Used */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.credits.used')}
            </span>
            <Coins className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-bold text-white">{creditStats.creditsUsed}</div>
          <div className="text-xs text-secondary mt-1">
            {creditStats.successfulCount} {t('campaigns.detail.credits.successful')}
          </div>
        </div>

        {/* Credits Refunded */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.credits.refunded')}
            </span>
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-bold text-white">{creditStats.creditsRefunded}</div>
          <div className="text-xs text-secondary mt-1">
            {creditStats.failedCount} {t('campaigns.detail.credits.failed')}
          </div>
        </div>

        {/* Estimated Remaining */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.credits.estimatedRemaining')}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {creditStats.estimatedCreditsRemaining}
          </div>
          <div className="text-xs text-secondary mt-1">
            {pendingCount} {t('campaigns.detail.credits.status.remaining')}
          </div>
        </div>

        {/* Total Required */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.credits.totalRequired')}
            </span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{creditStats.totalCreditsRequired}</div>
          <div className="text-xs text-secondary mt-1">
            {keywords.length} {t('campaigns.card.keywords')}
          </div>
        </div>
      </div>

      {/* Credit Breakdown Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted">{t('campaigns.detail.credits.breakdown')}</span>
          <span className="text-secondary font-mono">
            {creditStats.creditsUsed} / {creditStats.totalCreditsRequired}{' '}
            {creditStats.totalCreditsRequired === 1 ? 'credit' : 'credits'}
          </span>
        </div>
        <div className="w-full bg-main rounded-full h-2 overflow-hidden border border-border">
          {/* Used credits segment (green) */}
          <div
            className="h-full bg-green-500/80 float-left"
            style={{
              width: `${creditStats.totalCreditsRequired > 0
                ? (creditStats.creditsUsed / creditStats.totalCreditsRequired) * 100
                : 0
              }%`,
            }}
          ></div>
          {/* Refunded credits segment (yellow) */}
          <div
            className="h-full bg-yellow-500/80 float-left"
            style={{
              width: `${creditStats.totalCreditsRequired > 0
                ? (creditStats.creditsRefunded / creditStats.totalCreditsRequired) * 100
                : 0
              }%`,
            }}
          ></div>
          {/* Remaining credits segment (blue) */}
          <div
            className="h-full bg-blue-500/80 float-left"
            style={{
              width: `${creditStats.totalCreditsRequired > 0
                ? (creditStats.estimatedCreditsRemaining / creditStats.totalCreditsRequired) * 100
                : 0
              }%`,
            }}
          ></div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
            <span>{t('campaigns.detail.credits.status.successful')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
            <span>{t('campaigns.detail.credits.status.failed')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500/80"></div>
            <span>{t('campaigns.detail.credits.status.remaining')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
