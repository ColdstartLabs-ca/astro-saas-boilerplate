import type { ICampaignArticleStats } from '@shared/types/campaign.types';

interface ICampaignProgressProps {
  campaignStatus: string;
  articleStats: ICampaignArticleStats | null | undefined;
  keywordsCount: number;
  t: (key: string) => string;
}

export function CampaignProgress({
  campaignStatus,
  articleStats,
  keywordsCount,
  t,
}: ICampaignProgressProps): JSX.Element | null {
  if (campaignStatus !== 'active' && campaignStatus !== 'paused') {
    return null;
  }

  const published = articleStats?.published ?? 0;
  const progressPercentage = keywordsCount > 0 ? (published / keywordsCount) * 100 : 0;

  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-secondary">{t('campaigns.detail.generationProgress')}</span>
        <span className="text-white font-mono">
          {published} / {keywordsCount} {t('campaigns.detail.articles')}
        </span>
      </div>
      <div className="w-full bg-main rounded-full h-2 overflow-hidden border border-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            campaignStatus === 'active'
              ? 'bg-accent animate-pulse'
              : campaignStatus === 'paused'
                ? 'bg-yellow-500'
                : 'bg-muted'
          }`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
