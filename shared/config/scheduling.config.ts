/**
 * Campaign Scheduling Configuration
 *
 * Configuration for scheduled, drip-feed article generation.
 * Supports various frequencies from 3x daily to every 2 weeks.
 */

import type {
  ScheduleFrequency,
  SeoVelocityLevel,
  ISeoVelocityAdvisory,
  IScheduleConfig,
} from '@shared/types/campaign.types';

// =============================================================================
// Schedule Frequency Configuration
// =============================================================================

/**
 * Schedule frequency options with interval hours and display information
 */
export const SCHEDULE_FREQUENCIES = {
  '3x_daily': {
    label: '3x per day',
    intervalHours: 8,
    description: 'Every 8 hours',
  },
  '2x_daily': {
    label: '2x per day',
    intervalHours: 12,
    description: 'Every 12 hours',
  },
  daily: {
    label: 'Daily',
    intervalHours: 24,
    description: 'Once per day',
  },
  every_other_day: {
    label: 'Every other day',
    intervalHours: 48,
    description: 'Once every 2 days',
  },
  '3x_weekly': {
    label: '3x per week',
    intervalHours: 56,
    description: 'Mon / Wed / Fri',
  },
  '2x_weekly': {
    label: '2x per week',
    intervalHours: 84,
    description: 'Mon / Thu',
  },
  weekly: {
    label: 'Weekly',
    intervalHours: 168,
    description: 'Once per week',
  },
  every_2_weeks: {
    label: 'Every 2 weeks',
    intervalHours: 336,
    description: 'Once every 2 weeks',
  },
} as const;

export type ScheduleFrequencyConfig = (typeof SCHEDULE_FREQUENCIES)[ScheduleFrequency];

// =============================================================================
// Default Configuration Values
// =============================================================================

/** Default hour for scheduled runs (9 AM in user's timezone) */
export const DEFAULT_SCHEDULE_HOUR = 9;

/** Default timezone for scheduling */
export const DEFAULT_SCHEDULE_TIMEZONE = 'UTC';

/** Maximum campaigns to process per cron run */
export const MAX_CAMPAIGNS_PER_CRON_RUN = 10;

/** Maximum articles to publish per cron run */
export const MAX_PUBLISH_PER_RUN = 10;

/** Maximum delivery retry attempts before skipping article */
export const MAX_PUBLISH_RETRIES = 3;

/** Interval between cron runs in minutes */
export const CRON_INTERVAL_MINUTES = 5;

// =============================================================================
// SEO Velocity Advisory Thresholds
// =============================================================================

/**
 * SEO velocity advisory thresholds (soft warnings only)
 * These are informational guidelines, not hard blocks.
 */
export const SEO_VELOCITY_ADVISORIES = {
  /** > 3/day: show informational tip */
  MODERATE_THRESHOLD: 3,
  /** > 5/day: show yellow warning */
  HIGH_THRESHOLD: 5,
  /** > 10/day: show orange caution */
  AGGRESSIVE_THRESHOLD: 10,
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the next run time based on schedule frequency.
 *
 * For frequencies that run at specific times of day (daily, weekly, etc.),
 * this calculates the next occurrence at the specified hour in the given timezone.
 * For multi-daily frequencies, it calculates the next interval-based run.
 *
 * @param frequency - The schedule frequency
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param hour - Preferred hour (0-23) in the user's timezone
 * @param fromDate - Base date to calculate from (defaults to now)
 * @returns ISO 8601 timestamp string for the next run
 */
export function calculateNextRunAt(
  frequency: ScheduleFrequency,
  timezone: string = DEFAULT_SCHEDULE_TIMEZONE,
  hour: number = DEFAULT_SCHEDULE_HOUR,
  fromDate: Date = new Date()
): string {
  const config = SCHEDULE_FREQUENCIES[frequency];
  const intervalMs = config.intervalHours * 60 * 60 * 1000;

  // For multi-daily frequencies (3x_daily, 2x_daily), use interval-based calculation
  if (frequency === '3x_daily' || frequency === '2x_daily') {
    const nextRun = new Date(fromDate.getTime() + intervalMs);
    return nextRun.toISOString();
  }

  // For day-based frequencies, calculate next run at the specified hour in the user's timezone.
  // Strategy: get "today" in the target timezone, construct the wall-clock time, then convert to UTC.
  const now = new Date(fromDate);

  // Get the current date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;

  const currentYear = parseInt(getPart('year') || '0');
  const currentMonth = parseInt(getPart('month') || '0'); // 1-based from en-CA
  const currentDay = parseInt(getPart('day') || '0');

  // Build target date string as "YYYY-MM-DDThh:00:00" in the target timezone,
  // then find the UTC equivalent by computing the offset at that local time.
  let targetDate = localTimeToUtc(currentYear, currentMonth, currentDay, hour, timezone);

  // If the target time has already passed, move to next occurrence
  if (targetDate <= now) {
    const intervalDays = Math.ceil(config.intervalHours / 24);
    // Advance by intervalDays and recalculate (accounts for DST transitions)
    const nextLocal = new Date(targetDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const nextParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    }).formatToParts(nextLocal);
    const getNextPart = (type: string) => nextParts.find(p => p.type === type)?.value;
    targetDate = localTimeToUtc(
      parseInt(getNextPart('year') || '0'),
      parseInt(getNextPart('month') || '0'),
      parseInt(getNextPart('day') || '0'),
      hour,
      timezone
    );
  }

  return targetDate.toISOString();
}

/**
 * Convert a local wall-clock time (year, month 1-based, day, hour) in a timezone to a UTC Date.
 * Uses Intl.DateTimeFormat.formatToParts to compute the offset without relying on
 * `new Date(string)` which parses in the system's local timezone and breaks on non-UTC systems.
 */
function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string
): Date {
  // Start with a rough UTC guess (assuming the local time IS UTC)
  const roughUtc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));

  // Get what this UTC instant renders as in the target timezone using formatToParts
  // (no `new Date(string)` which would parse in system local timezone)
  const renderedOffset = getTimezoneOffsetMs(roughUtc, timezone);

  // The correct UTC time = roughUtc - offset
  const corrected = new Date(roughUtc.getTime() - renderedOffset);

  // Verify the hour in the target timezone (handles DST edge cases)
  const verifyOffset = getTimezoneOffsetMs(corrected, timezone);
  if (verifyOffset !== renderedOffset) {
    // DST transition caused offset change - recalculate with verified offset
    return new Date(roughUtc.getTime() - verifyOffset);
  }

  return corrected;
}

/**
 * Get the UTC offset in milliseconds for a given UTC instant in a timezone.
 * Positive = timezone is ahead of UTC, negative = behind.
 * Uses only Intl.DateTimeFormat.formatToParts + Date.UTC to avoid system timezone dependency.
 */
function getTimezoneOffsetMs(utcDate: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(utcDate);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

  // Reconstruct the timezone-local time as a UTC timestamp for comparison
  const renderedAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  );

  return renderedAsUtc - utcDate.getTime();
}

/**
 * Estimate the number of days to complete a campaign based on schedule.
 *
 * @param frequency - The schedule frequency
 * @param batchSize - Number of articles per run
 * @param pendingKeywords - Number of keywords still pending generation
 * @returns Estimated days to complete (rounded up to nearest whole day)
 */
export function estimateCompletionDays(
  frequency: ScheduleFrequency,
  batchSize: number,
  pendingKeywords: number
): number {
  if (pendingKeywords <= 0) {
    return 0;
  }

  const articlesPerDay = getEffectiveArticlesPerDay(frequency, batchSize);
  const days = Math.ceil(pendingKeywords / articlesPerDay);

  return days;
}

/**
 * Calculate the effective number of articles generated per day.
 *
 * @param frequency - The schedule frequency
 * @param batchSize - Number of articles per run
 * @returns Articles per day (may be fractional)
 */
export function getEffectiveArticlesPerDay(
  frequency: ScheduleFrequency,
  batchSize: number
): number {
  const config = SCHEDULE_FREQUENCIES[frequency];
  const runsPerDay = 24 / config.intervalHours;
  return runsPerDay * batchSize;
}

/**
 * Get SEO velocity advisory level and message based on articles per day.
 *
 * @param articlesPerDay - Number of articles being published per day
 * @returns Advisory information with level, message, and whether it blocks
 */
export function getSeoVelocityAdvisory(articlesPerDay: number): ISeoVelocityAdvisory {
  if (articlesPerDay <= SEO_VELOCITY_ADVISORIES.MODERATE_THRESHOLD) {
    return {
      level: 'safe' as SeoVelocityLevel,
      message: 'This publication rate is within safe SEO guidelines.',
      blocksOperation: false,
    };
  }

  if (articlesPerDay <= SEO_VELOCITY_ADVISORIES.HIGH_THRESHOLD) {
    return {
      level: 'moderate' as SeoVelocityLevel,
      message:
        'Publishing more than 3 articles per day may trigger content quality reviews. Consider a slower pace for new sites.',
      blocksOperation: false,
    };
  }

  if (articlesPerDay <= SEO_VELOCITY_ADVISORIES.AGGRESSIVE_THRESHOLD) {
    return {
      level: 'high' as SeoVelocityLevel,
      message:
        'High publication velocity detected. Publishing more than 5 articles per day may appear unnatural to search engines.',
      blocksOperation: false,
    };
  }

  return {
    level: 'aggressive' as SeoVelocityLevel,
    message:
      'Very aggressive publication rate. Publishing more than 10 articles per day significantly increases risk of content quality penalties. Ensure your content quality remains high.',
    blocksOperation: false,
  };
}

/**
 * Validate a schedule configuration.
 *
 * @param config - Schedule configuration to validate
 * @returns True if valid, throws error if invalid
 */
export function isValidScheduleConfig(config: Partial<IScheduleConfig>): boolean {
  if (config.frequency && !SCHEDULE_FREQUENCIES[config.frequency]) {
    throw new Error(`Invalid schedule frequency: ${config.frequency}`);
  }

  if (config.batchSize !== undefined) {
    if (config.batchSize < 1 || config.batchSize > 50) {
      throw new Error('Batch size must be between 1 and 50');
    }
  }

  if (config.hour !== undefined) {
    if (config.hour < 0 || config.hour > 23) {
      throw new Error('Hour must be between 0 and 23');
    }
  }

  return true;
}

/**
 * Get all available schedule frequency options for UI dropdowns.
 *
 * @returns Array of frequency options with value, label, and description
 */
export function getScheduleFrequencyOptions(): Array<{
  value: ScheduleFrequency;
  label: string;
  description: string;
  articlesPerDayAtBatch1: number;
}> {
  return (Object.keys(SCHEDULE_FREQUENCIES) as ScheduleFrequency[]).map(key => ({
    value: key,
    label: SCHEDULE_FREQUENCIES[key].label,
    description: SCHEDULE_FREQUENCIES[key].description,
    articlesPerDayAtBatch1: getEffectiveArticlesPerDay(key, 1),
  }));
}

// =============================================================================
// UI Frequency Groups Configuration
// =============================================================================

/**
 * UI frequency options for grouped pill button selectors.
 * Grouped into Fast / Standard / Relaxed categories for better UX.
 */
export const SCHEDULE_FREQUENCY_UI_GROUPS = [
  {
    label: 'Fast',
    options: [
      { key: '3x_daily' as ScheduleFrequency, label: '3x / day', subtitle: 'Every 8h' },
      { key: '2x_daily' as ScheduleFrequency, label: '2x / day', subtitle: 'Every 12h' },
    ],
  },
  {
    label: 'Standard',
    default: true,
    options: [
      { key: 'daily' as ScheduleFrequency, label: 'Daily', subtitle: 'Once per day' },
      {
        key: 'every_other_day' as ScheduleFrequency,
        label: 'Every 2 days',
        subtitle: 'Once every 48h',
      },
    ],
  },
  {
    label: 'Relaxed',
    options: [
      { key: '3x_weekly' as ScheduleFrequency, label: '3x / week', subtitle: 'Mon/Wed/Fri' },
      { key: '2x_weekly' as ScheduleFrequency, label: '2x / week', subtitle: 'Mon/Thu' },
      { key: 'weekly' as ScheduleFrequency, label: 'Weekly', subtitle: 'Once per week' },
      {
        key: 'every_2_weeks' as ScheduleFrequency,
        label: 'Biweekly',
        subtitle: 'Every 2 weeks',
      },
    ],
  },
] as const;

export type ScheduleFrequencyUiGroup = (typeof SCHEDULE_FREQUENCY_UI_GROUPS)[number];
export type ScheduleFrequencyUiOption = ScheduleFrequencyUiGroup['options'][number];

// =============================================================================
// Rate Formatting Utilities
// =============================================================================

/**
 * Returns human-readable rate like "~6 articles/day" or "~2 articles/week".
 *
 * @param frequency - The schedule frequency
 * @param batchSize - Number of articles per run
 * @returns Human-readable rate string
 */
export function getEffectiveRate(frequency: ScheduleFrequency, batchSize: number): string {
  const articlesPerDay = getEffectiveArticlesPerDay(frequency, batchSize);

  // For frequencies that run multiple times per day
  if (articlesPerDay >= 1) {
    const rounded = Math.round(articlesPerDay * 10) / 10;
    return `~${rounded} articles/day`;
  }

  // For frequencies that run less than once per day
  const daysPerArticle = 1 / articlesPerDay;

  if (daysPerArticle <= 7) {
    const articlesPerWeek = 7 / daysPerArticle;
    const rounded = Math.round(articlesPerWeek * 10) / 10;
    return `~${rounded} articles/week`;
  }

  // For very slow frequencies (every 2 weeks)
  const articlesPerMonth = 30 / daysPerArticle;
  const rounded = Math.round(articlesPerMonth * 10) / 10;
  return `~${rounded} articles/month`;
}

// =============================================================================
// Timezone Validation
// =============================================================================

/**
 * Cache of validated timezones to avoid repeated Intl lookups.
 */
const timezoneCache = new Map<string, boolean>();

/**
 * Validate an IANA timezone string.
 * Uses Intl.DateTimeFormat to check if the timezone is recognized.
 * Results are cached for performance.
 *
 * @param timezone - The timezone string to validate
 * @returns True if valid IANA timezone, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  // Check cache first
  const cached = timezoneCache.get(timezone);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // Attempt to format a date in the given timezone
    // This will throw RangeError for invalid timezones
    Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
    timezoneCache.set(timezone, true);
    return true;
  } catch {
    timezoneCache.set(timezone, false);
    return false;
  }
}
