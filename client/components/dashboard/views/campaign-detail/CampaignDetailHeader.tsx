import {
  ArrowLeft,
  Pause,
  Play,
  Plus,
  Settings,
  Cpu,
  Layers,
} from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';
import { getCampaignStatusStyles } from '@client/utils/statusStyles';
import type { ICampaign } from '@shared/types/campaign.types';

interface ICampaignDetailHeaderProps {
  campaign: ICampaign;
  keywordsCount: number;
  stats: {
    queued: number;
    generating: number;
    draft: number;
    published: number;
  };
  pendingCount: number;
  onBackToList: () => void;
  onTogglePause: () => void;
  onStartGeneration: () => void;
  onAddKeywords: () => void;
  onOpenSettings: () => void;
  t: (key: string) => string;
}

export function CampaignDetailHeader({
  campaign,
  keywordsCount,
  stats,
  pendingCount,
  onBackToList,
  onTogglePause,
  onStartGeneration,
  onAddKeywords,
  onOpenSettings,
  t,
}: ICampaignDetailHeaderProps): JSX.Element {
  return (
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
              className={`text-xs px-2 py-1 rounded-full border ${getCampaignStatusStyles(campaign.status)} capitalize`}
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
              {keywordsCount} {t('campaigns.card.keywords')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'active' && (
            <DashboardButton variant="outline" size="sm" onClick={onTogglePause}>
              <Pause className="w-4 h-4 mr-2" /> {t('campaigns.status.paused')}
            </DashboardButton>
          )}
          {campaign.status === 'paused' && (
            <DashboardButton variant="primary" size="sm" onClick={onTogglePause}>
              <Play className="w-4 h-4 mr-2" /> {t('campaigns.status.resume')}
            </DashboardButton>
          )}
          {campaign.status !== 'active' && pendingCount > 0 && (
            <DashboardButton variant="primary" size="sm" onClick={onStartGeneration}>
              <Play className="w-4 h-4 mr-2" /> {t('campaigns.detail.startGeneration')}
            </DashboardButton>
          )}
          <DashboardButton variant="outline" size="sm" onClick={onAddKeywords}>
            <Plus className="w-4 h-4 mr-2" /> {t('campaigns.detail.addKeywords')}
          </DashboardButton>
          <DashboardButton variant="ghost" size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4" />
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}
