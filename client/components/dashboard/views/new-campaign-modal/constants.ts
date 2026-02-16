/**
 * Constants for NewCampaignModal
 */

export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'witty', label: 'Witty' },
  { value: 'academic', label: 'Academic' },
] as const;

export const WORD_COUNT_OPTIONS = [
  { value: 800, label: '~800 words' },
  { value: 1500, label: '~1500 words' },
  { value: 2500, label: '~2500 words' },
] as const;

/** Common timezones for user selection */
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const;

/** Generate hour options (12h format with AM/PM) */
function generateHourOptions(): { value: number; label: string }[] {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hour12 = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    options.push({
      value: i,
      label: `${hour12}:00 ${ampm}`,
    });
  }
  return options;
}

export const HOUR_OPTIONS = generateHourOptions();

/**
 * Detect user's timezone from browser
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
