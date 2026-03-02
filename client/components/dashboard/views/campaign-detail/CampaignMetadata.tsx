import { Settings, FileText, Hash, Image, Calendar, Clock, AlertCircle, Zap, Cpu, Pencil } from 'lucide-react';
import type { ICampaign, IKeyword } from '@shared/types/campaign.types';
import type { ModelTier } from '@shared/types/models.types';
import { SCHEDULE_FREQUENCIES, estimateCompletionDays } from '@shared/config/scheduling.config';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);

interface ICampaignMetadataProps {
  campaign: ICampaign;
  keywords: IKeyword[];
  onOpenSettings?: () => void;
  t: (key: string) => string;
}

const TIER_STYLE: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  budget: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  balanced: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  pro: { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  ultra: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
};

const WRITER_INFO: Record<string, { displayName: string; tier: ModelTier }> = {
  budget: { displayName: 'Budget', tier: 'budget' },
  balanced: { displayName: 'Balanced', tier: 'balanced' },
  pro: { displayName: 'Pro', tier: 'pro' },
  ultra: { displayName: 'Ultra', tier: 'ultra' },
};

const IMAGE_INFO: Record<string, { displayName: string; tier: ModelTier }> = {
  budget: { displayName: 'Budget', tier: 'budget' },
  balanced: { displayName: 'Balanced', tier: 'balanced' },
  pro: { displayName: 'Pro', tier: 'pro' },
  ultra: { displayName: 'Ultra', tier: 'ultra' },
};

/**
 * Check if campaign has schedule configuration.
 */
function hasScheduleConfig(campaign: ICampaign): boolean {
  return campaign.schedule_frequency !== null;
}

/**
 * Format a date for display.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('MMM D, YYYY h:mm A');
}

/**
 * Format relative time for display.
 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = dayjs(dateStr);
  const now = dayjs();

  if (date.isBefore(now)) {
    return `${date.fromNow()} (${formatDate(dateStr)})`;
  }

  return `${date.fromNow()} (${formatDate(dateStr)})`;
}

/**
 * Get pause reason display text.
 */
function getPauseReasonText(reason: string | undefined): string {
  switch (reason) {
    case 'insufficient_credits':
      return 'Paused due to insufficient credits';
    case 'no_pending_keywords':
      return 'All keywords processed';
    case 'generation_failed':
      return 'Paused due to generation errors';
    case 'user_paused':
      return 'Paused by user';
    default:
      return 'Paused';
  }
}

export function CampaignMetadata({ campaign, keywords, onOpenSettings, t }: ICampaignMetadataProps): JSX.Element {
  const hasSchedule = hasScheduleConfig(campaign);

  // Calculate schedule progress
  const processedCount = keywords.filter(
    k => k.status === 'generated' || k.status === 'generating'
  ).length;
  const pendingCount = keywords.filter(k => k.status === 'pending').length;
  const totalCount = keywords.length;

  // Estimate remaining days if schedule is active
  let estimatedDaysRemaining = 0;
  if (hasSchedule && campaign.schedule_frequency && pendingCount > 0) {
    estimatedDaysRemaining = estimateCompletionDays(
      campaign.schedule_frequency,
      campaign.schedule_batch_size || 3,
      pendingCount
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-accent-hover" />
          {t('campaigns.detail.metadata.title')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Tone */}
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted uppercase tracking-wider">
                  {t('campaigns.detail.metadata.tone')}
                </span>
              </div>
              <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-white capitalize">{campaign.tone}</div>
          </button>

          {/* Target Word Count */}
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted uppercase tracking-wider">
                  {t('campaigns.detail.metadata.wordCount')}
                </span>
              </div>
              <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-semibold text-white">
              {campaign.target_word_count.toLocaleString()}
            </div>
          </button>

          {/* Writer Preset */}
          {(() => {
            const writerKey = campaign.ai_model;
            const info = WRITER_INFO[writerKey];
            const tier = info?.tier ?? 'balanced';
            const style = TIER_STYLE[tier] ?? TIER_STYLE.balanced;
            return (
              <button
                type="button"
                onClick={onOpenSettings}
                disabled={!onOpenSettings}
                className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent-hover" />
                    <span className="text-xs text-muted uppercase tracking-wider">Writer</span>
                  </div>
                  <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <div className="text-sm font-semibold text-white">
                    {info?.displayName ?? writerKey}
                  </div>
                </div>
              </button>
            );
          })()}

          {/* Image Preset */}
          {(() => {
            const imageKey = campaign.image_preset;
            const info = imageKey ? IMAGE_INFO[imageKey] : null;
            const tier = info?.tier;
            const style = tier ? (TIER_STYLE[tier] ?? TIER_STYLE.balanced) : null;
            return (
              <button
                type="button"
                onClick={onOpenSettings}
                disabled={!onOpenSettings}
                className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted uppercase tracking-wider">
                      {t('campaigns.detail.metadata.images')}
                    </span>
                  </div>
                  <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {info && style ? (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <div className="text-sm font-semibold text-white">{info.displayName}</div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-muted">
                    {t('campaigns.detail.metadata.disabled')}
                  </div>
                )}
              </button>
            );
          })()}

          {/* Created At */}
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-muted uppercase tracking-wider">
                  {t('campaigns.detail.metadata.created')}
                </span>
              </div>
            </div>
            <div className="text-sm font-semibold text-white">
              {dayjs(campaign.created_at).format('MMM D, YYYY')}
            </div>
          </button>

          {/* Updated At */}
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            className="group bg-main/30 rounded-lg p-3 border border-border text-left transition-colors hover:border-border-light hover:bg-main/50 disabled:cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-hover" />
                <span className="text-xs text-muted uppercase tracking-wider">
                  {t('campaigns.detail.metadata.updated')}
                </span>
              </div>
            </div>
            <div className="text-sm font-semibold text-white">
              {dayjs(campaign.updated_at).format('MMM D, YYYY')}
            </div>
          </button>
        </div>
      </div>

      {/* Schedule Information */}
      {hasSchedule && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-accent-hover" />
            Schedule Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Frequency */}
            <div className="bg-main/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-muted uppercase tracking-wider">Frequency</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {campaign.schedule_frequency
                  ? SCHEDULE_FREQUENCIES[campaign.schedule_frequency]?.label ||
                    campaign.schedule_frequency
                  : '-'}
              </div>
            </div>

            {/* Batch Size */}
            <div className="bg-main/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-muted uppercase tracking-wider">Batch Size</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {campaign.schedule_batch_size} articles/run
              </div>
            </div>

            {/* Next Run */}
            <div className="bg-main/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted uppercase tracking-wider">Next Run</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {campaign.next_run_at
                  ? formatRelativeTime(campaign.next_run_at)
                  : campaign.status === 'paused'
                    ? 'Paused'
                    : '-'}
              </div>
            </div>

            {/* Last Run */}
            <div className="bg-main/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-muted uppercase tracking-wider">Last Run</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {campaign.last_run_at ? formatRelativeTime(campaign.last_run_at) : 'Never'}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-4 p-4 bg-main/20 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Schedule Progress</span>
              <span className="text-xs text-muted">
                {processedCount}/{totalCount} keywords processed
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-surface-light rounded-full h-2.5 mb-2">
              <div
                className="bg-accent h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (processedCount / totalCount) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">{pendingCount} keywords remaining</span>
              {estimatedDaysRemaining > 0 && (
                <span className="text-accent">~{estimatedDaysRemaining} days to complete</span>
              )}
            </div>
          </div>

          {/* Pause Reason (if applicable) */}
          {campaign.status === 'paused' && hasSchedule && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-200">
                  {getPauseReasonText(
                    // Note: pause_reason would come from campaign settings or a dedicated field
                    // For now, we'll show a generic message
                    campaign.status === 'paused' ? 'user_paused' : undefined
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
