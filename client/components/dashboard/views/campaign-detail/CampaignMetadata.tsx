import { Settings, FileText, Hash, Image, Calendar, Clock, AlertCircle, Zap } from 'lucide-react';
import type { ICampaign, IKeyword } from '@shared/types/campaign.types';
import { SCHEDULE_FREQUENCIES, estimateCompletionDays } from '@shared/config/scheduling.config';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);

interface ICampaignMetadataProps {
  campaign: ICampaign;
  keywords: IKeyword[];
  t: (key: string) => string;
}

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

export function CampaignMetadata({ campaign, keywords, t }: ICampaignMetadataProps): JSX.Element {
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Tone */}
          <div className="bg-main/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {t('campaigns.detail.metadata.tone')}
              </span>
            </div>
            <div className="text-sm font-semibold text-white capitalize">{campaign.tone}</div>
          </div>

          {/* Target Word Count */}
          <div className="bg-main/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {t('campaigns.detail.metadata.wordCount')}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {campaign.target_word_count.toLocaleString()}
            </div>
          </div>

          {/* Image Preset */}
          <div className="bg-main/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Image className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {t('campaigns.detail.metadata.images')}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {campaign.image_preset
                ? t('campaigns.detail.metadata.enabled')
                : t('campaigns.detail.metadata.disabled')}
            </div>
          </div>

          {/* Created At */}
          <div className="bg-main/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {t('campaigns.detail.metadata.created')}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {dayjs(campaign.created_at).format('MMM D, YYYY')}
            </div>
          </div>

          {/* Updated At */}
          <div className="bg-main/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-accent-hover" />
              <span className="text-xs text-muted uppercase tracking-wider">
                {t('campaigns.detail.metadata.updated')}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {dayjs(campaign.updated_at).format('MMM D, YYYY')}
            </div>
          </div>
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
