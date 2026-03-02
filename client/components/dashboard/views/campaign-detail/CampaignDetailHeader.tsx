import {
  ArrowLeft,
  Pause,
  Play,
  Plus,
  Settings,
  Cpu,
  Layers,
  Calendar,
  Clock,
  Loader2,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import type { ModelTier } from '@shared/types/models.types';

const WRITER_DISPLAY: Record<string, { name: string; tier: ModelTier }> = {
  budget: { name: 'Budget', tier: 'budget' },
  balanced: { name: 'Balanced', tier: 'balanced' },
  pro: { name: 'Pro', tier: 'pro' },
  ultra: { name: 'Ultra', tier: 'ultra' },
};

const TIER_DOT: Record<string, string> = {
  budget: 'bg-green-400',
  balanced: 'bg-blue-400',
  pro: 'bg-purple-400',
  ultra: 'bg-amber-400',
};
import { DashboardButton } from '../../ui/DashboardButton';
import { getCampaignStatusStyles } from '@client/utils/statusStyles';
import type { ICampaign } from '@shared/types/campaign.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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
  onStartSchedule?: () => void;
  onResumeSchedule?: () => void;
  onPauseSchedule?: () => void;
  t: (key: string) => string;
}

/**
 * Check if campaign has an active schedule configuration.
 */
function hasScheduleConfig(campaign: ICampaign): boolean {
  return campaign.schedule_frequency !== null;
}

/**
 * Format the next run time for display.
 */
function formatNextRun(nextRunAt: string | null): string {
  if (!nextRunAt) return '';
  const date = dayjs(nextRunAt);
  const now = dayjs();

  if (date.isBefore(now)) {
    return 'Overdue';
  }

  // If within 24 hours, show relative time
  if (date.diff(now, 'hour') < 24) {
    return date.fromNow();
  }

  // Otherwise show date and time
  return date.format('MMM D, h:mm A');
}

/**
 * Get pause reason from campaign settings.
 */
function getPauseReason(campaign: ICampaign): string | null {
  if (!campaign.settings || typeof campaign.settings !== 'object') {
    return null;
  }
  const settings = campaign.settings as Record<string, unknown>;
  return (settings.pause_reason as string) || null;
}

/**
 * Warning banner for insufficient credits.
 */
function InsufficientCreditsWarning({ t }: { t: (key: string) => string }): JSX.Element {
  return (
    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-amber-200 font-medium mb-1">
          {t('campaigns.schedule.pausedInsufficientCredits')}
        </h3>
        <p className="text-amber-300/80 text-sm mb-3">
          {t('campaigns.schedule.pausedInsufficientCreditsDescription')}
        </p>
        <a
          href="/dashboard/credits"
          className="inline-flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          {t('campaigns.schedule.buyCredits')}
        </a>
      </div>
    </div>
  );
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
  onStartSchedule,
  onResumeSchedule,
  onPauseSchedule,
  t,
}: ICampaignDetailHeaderProps): JSX.Element {
  const hasSchedule = hasScheduleConfig(campaign);
  const nextRunDisplay = formatNextRun(campaign.next_run_at);
  const pauseReason = getPauseReason(campaign);

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

      {/* Warning banner for insufficient credits */}
      {pauseReason === 'insufficient_credits' && <InsufficientCreditsWarning t={t} />}

      <div className="flex justify-between items-start">
        <div>
          <h2
            className="text-2xl font-bold text-white flex items-center gap-3"
            data-testid="campaign-name"
          >
            {campaign.name}
            <span
              className={`text-xs px-2 py-1 rounded-full border ${getCampaignStatusStyles(campaign.status)} capitalize`}
            >
              {t(`campaigns.status.${campaign.status}`)}
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3" />
              {t('campaigns.card.model')}:{' '}
              {WRITER_DISPLAY[campaign.ai_model]?.name ?? campaign.ai_model}
              {WRITER_DISPLAY[campaign.ai_model] && (
                <span
                  className={`w-2 h-2 rounded-full ${TIER_DOT[WRITER_DISPLAY[campaign.ai_model].tier] ?? 'bg-blue-400'}`}
                />
              )}
            </span>
            <span className="flex items-center">
              <Layers className="w-3 h-3 mr-1.5" /> {stats.draft + stats.published} /{' '}
              {keywordsCount} {t('campaigns.card.keywords')}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Status-based Actions */}
          {campaign.status === 'active' && !hasSchedule && (
            <DashboardButton variant="outline" size="sm" onClick={onTogglePause}>
              <Pause className="w-4 h-4 mr-2" /> {t('campaigns.status.paused')}
            </DashboardButton>
          )}

          {/* Scheduled Campaign Actions */}
          {campaign.status === 'scheduled' && (
            <>
              {campaign.next_run_at && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-sm">
                  <Clock className="w-4 h-4 text-accent" />
                  <span className="text-accent-hover">Next batch: {nextRunDisplay}</span>
                </div>
              )}
              {onPauseSchedule && (
                <DashboardButton variant="outline" size="sm" onClick={onPauseSchedule}>
                  <Pause className="w-4 h-4 mr-2" /> Pause Schedule
                </DashboardButton>
              )}
            </>
          )}

          {/* Paused Campaign with Schedule */}
          {campaign.status === 'paused' && hasSchedule && onResumeSchedule && (
            <DashboardButton variant="primary" size="sm" onClick={onResumeSchedule}>
              <Play className="w-4 h-4 mr-2" /> Resume Schedule
            </DashboardButton>
          )}

          {/* Paused Campaign without Schedule (legacy) */}
          {campaign.status === 'paused' && !hasSchedule && (
            <DashboardButton variant="primary" size="sm" onClick={onTogglePause}>
              <Play className="w-4 h-4 mr-2" /> {t('campaigns.status.resume')}
            </DashboardButton>
          )}

          {/* Draft Campaign with Schedule */}
          {campaign.status === 'draft' && hasSchedule && onStartSchedule && (
            <DashboardButton variant="primary" size="sm" onClick={onStartSchedule}>
              <Calendar className="w-4 h-4 mr-2" /> Start Schedule
            </DashboardButton>
          )}

          {/* Active Campaign - Processing indicator */}
          {campaign.status === 'active' && hasSchedule && stats.generating > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-amber-200">Processing batch...</span>
            </div>
          )}

          {/* Standard Start Generation (for non-scheduled drafts) */}
          {campaign.status === 'draft' && !hasSchedule && pendingCount > 0 && (
            <DashboardButton variant="primary" size="sm" onClick={onStartGeneration}>
              <Play className="w-4 h-4 mr-2" /> {t('campaigns.detail.startGeneration')}
            </DashboardButton>
          )}

          {/* Add Keywords */}
          <DashboardButton variant="outline" size="sm" onClick={onAddKeywords}>
            <Plus className="w-4 h-4 mr-2" /> {t('campaigns.detail.addKeywords')}
          </DashboardButton>

          {/* Settings */}
          <DashboardButton variant="ghost" size="sm" onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-1.5" /> Settings
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}
