/**
 * Schedule Configuration Step (Step 3 of NewCampaignModal)
 * Handles frequency/batch/time settings for scheduled campaigns.
 * All campaigns are schedule-only — no immediate mode toggle.
 */
'use client';

import { useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, Info, X } from 'lucide-react';
import {
  SCHEDULE_FREQUENCY_UI_GROUPS,
  estimateCompletionDays,
  getEffectiveArticlesPerDay,
  getSeoVelocityAdvisory,
} from '@shared/config/scheduling.config';
import type { ScheduleFrequency } from '@shared/types/campaign.types';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import type { CampaignFormData } from './validationSchema';
import { COMMON_TIMEZONES, HOUR_OPTIONS } from './constants';

interface IScheduleConfigStepProps {
  register: UseFormRegister<CampaignFormData>;
  watch: UseFormWatch<CampaignFormData>;
  seoAdvisoryDismissed: boolean;
  setSeoAdvisoryDismissed: (dismissed: boolean) => void;
  keywordCount: number;
  creditCost: number;
}

/**
 * Format rate for display
 */
function formatEffectiveRate(frequency: ScheduleFrequency, batchSize: number): string {
  const articlesPerDay = getEffectiveArticlesPerDay(frequency, batchSize);

  if (articlesPerDay >= 1) {
    const rounded = Math.round(articlesPerDay * 10) / 10;
    return `~${rounded} articles/day`;
  }

  const daysPerArticle = 1 / articlesPerDay;
  if (daysPerArticle <= 7) {
    const articlesPerWeek = 7 / daysPerArticle;
    const rounded = Math.round(articlesPerWeek * 10) / 10;
    return `~${rounded} articles/week`;
  }

  const articlesPerMonth = 30 / daysPerArticle;
  const rounded = Math.round(articlesPerMonth * 10) / 10;
  return `~${rounded} articles/month`;
}

export function ScheduleConfigStep({
  register,
  watch,
  seoAdvisoryDismissed,
  setSeoAdvisoryDismissed,
  keywordCount,
}: IScheduleConfigStepProps): JSX.Element {
  const watchedScheduleFrequency = watch('scheduleFrequency');
  const watchedScheduleBatchSize = watch('scheduleBatchSize');

  // Schedule-related calculations
  const scheduleFrequency = watchedScheduleFrequency as ScheduleFrequency | undefined;
  const scheduleBatchSize = watchedScheduleBatchSize ?? 1;

  const effectiveArticlesPerDay = useMemo(() => {
    if (!scheduleFrequency) return 0;
    return getEffectiveArticlesPerDay(scheduleFrequency, scheduleBatchSize);
  }, [scheduleFrequency, scheduleBatchSize]);

  const seoAdvisory = useMemo(() => {
    return getSeoVelocityAdvisory(effectiveArticlesPerDay);
  }, [effectiveArticlesPerDay]);

  const estimatedDaysToComplete = useMemo(() => {
    if (!scheduleFrequency || keywordCount === 0) return 0;
    return estimateCompletionDays(scheduleFrequency, scheduleBatchSize, keywordCount);
  }, [scheduleFrequency, scheduleBatchSize, keywordCount]);

  const effectiveRateDisplay = useMemo(() => {
    if (!scheduleFrequency) return '';
    return formatEffectiveRate(scheduleFrequency, scheduleBatchSize);
  }, [scheduleFrequency, scheduleBatchSize]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-main/30 border border-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Schedule Configuration</h4>
            <p className="text-xs text-muted mt-0.5">
              Articles will be drip-fed to your site on autopilot
            </p>
          </div>
        </div>
      </div>

      {/* Frequency Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-white uppercase tracking-wider">
          Generation Frequency
        </label>
        <div className="space-y-4">
          {SCHEDULE_FREQUENCY_UI_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider flex items-center gap-2">
                {group.label}
                {'default' in group && group.default && (
                  <span className="text-accent text-[10px] bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                    Recommended
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.options.map(option => (
                  <label
                    key={option.key}
                    className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${
                      watchedScheduleFrequency === option.key
                        ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent/20'
                        : 'border-border bg-main/40 hover:border-accent/30 hover:bg-surface/60'
                    }`}
                  >
                    <input
                      {...register('scheduleFrequency')}
                      type="radio"
                      value={option.key}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-white">{option.label}</span>
                    <span className="text-xs text-muted mt-0.5">{option.subtitle}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Size */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white uppercase tracking-wider">
          Articles per Run
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            {...register('scheduleBatchSize', { valueAsNumber: true })}
            min={1}
            max={50}
            className="w-24 bg-main border border-border rounded-lg px-3 py-2 text-white text-center focus:ring-1 focus:ring-accent outline-none"
          />
          <span className="text-sm text-secondary">articles per scheduled run</span>
        </div>
        <p className="text-xs text-muted">
          How many articles to generate each time the schedule runs (1-50)
        </p>
      </div>

      {/* Time Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preferred Hour */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" /> Preferred Time
          </label>
          <select
            {...register('scheduleHour', { valueAsNumber: true })}
            className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
            }}
          >
            {HOUR_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white uppercase tracking-wider">
            Timezone
          </label>
          <select
            {...register('scheduleTimezone')}
            className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
            }}
          >
            {COMMON_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Auto-detected from your browser</p>
        </div>
      </div>

      {/* Schedule Summary */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Schedule Summary</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                {effectiveRateDisplay}
              </span>
            </div>
            <p className="text-sm text-secondary">
              <span className="text-white font-medium">{keywordCount} keywords</span> will be
              processed at
              <span className="text-white font-medium"> {scheduleBatchSize} articles per run</span>,
              taking approximately{' '}
              <span className="text-white font-medium">{estimatedDaysToComplete} days</span> to
              complete.
            </p>
          </div>
        </div>
      </div>

      {/* SEO Velocity Advisory */}
      {seoAdvisory.level !== 'safe' && !seoAdvisoryDismissed && (
        <div
          className={`p-4 rounded-xl border ${
            seoAdvisory.level === 'moderate'
              ? 'bg-blue-500/5 border-blue-500/20'
              : seoAdvisory.level === 'high'
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-orange-500/5 border-orange-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {seoAdvisory.level === 'moderate' ? (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            ) : seoAdvisory.level === 'high' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  seoAdvisory.level === 'moderate'
                    ? 'text-blue-200'
                    : seoAdvisory.level === 'high'
                      ? 'text-amber-200'
                      : 'text-orange-200'
                }`}
              >
                {seoAdvisory.level === 'moderate' &&
                  'Tip: For newer sites, consider starting slower and ramping up over 2-4 weeks.'}
                {seoAdvisory.level === 'high' &&
                  'High volume: Make sure your site has established authority before publishing at this pace.'}
                {seoAdvisory.level === 'aggressive' &&
                  "Very high volume: Sudden spikes in content velocity can trigger Google's spam detection. Consider ramping up gradually."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSeoAdvisoryDismissed(true)}
              className="text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
