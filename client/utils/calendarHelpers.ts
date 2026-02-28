import type { ArticleStatus } from '@shared/types/article.types';
import type { ICalendarStatusConfig } from '@shared/types/calendar.types';

/**
 * Campaign color palette for deterministic color assignment.
 * Uses Tailwind semantic tokens only — no hardcoded colors.
 */
const CAMPAIGN_COLOR_PALETTE = [
  {
    dot: 'bg-purple-500',
    bg: 'bg-purple-900/20',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    hex: '#a855f7',
  },
  {
    dot: 'bg-blue-500',
    bg: 'bg-blue-900/20',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
    hex: '#3b82f6',
  },
  {
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-900/20',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
    hex: '#06b6d4',
  },
  {
    dot: 'bg-orange-500',
    bg: 'bg-orange-900/20',
    text: 'text-orange-300',
    border: 'border-orange-500/30',
    hex: '#f97316',
  },
  {
    dot: 'bg-pink-500',
    bg: 'bg-pink-900/20',
    text: 'text-pink-300',
    border: 'border-pink-500/30',
    hex: '#ec4899',
  },
  {
    dot: 'bg-teal-500',
    bg: 'bg-teal-900/20',
    text: 'text-teal-300',
    border: 'border-teal-500/30',
    hex: '#14b8a6',
  },
  {
    dot: 'bg-yellow-500',
    bg: 'bg-yellow-900/20',
    text: 'text-yellow-300',
    border: 'border-yellow-500/30',
    hex: '#eab308',
  },
  {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-900/20',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
    hex: '#6366f1',
  },
] as const;

type ICampaignColorEntry = (typeof CAMPAIGN_COLOR_PALETTE)[number];

/**
 * Get a deterministic campaign color based on campaign ID.
 * Same campaign ID always returns the same color object.
 */
export function getCampaignColorPalette(campaignId: string | null): ICampaignColorEntry {
  if (!campaignId) return CAMPAIGN_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < campaignId.length; i++) {
    hash = (hash << 5) - hash + campaignId.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  const index = Math.abs(hash) % CAMPAIGN_COLOR_PALETTE.length;
  return CAMPAIGN_COLOR_PALETTE[index];
}

/**
 * Get the color hex string for a campaign (for CSS usage where needed)
 */
export function getCampaignColor(campaignId: string | null): string {
  return getCampaignColorPalette(campaignId).hex;
}

/**
 * Map an ArticleStatus to display config for the calendar.
 * Returns label, dot color, bg/text/border Tailwind classes.
 */
export function getCalendarStatusConfig(status: ArticleStatus): ICalendarStatusConfig {
  switch (status) {
    case 'planned':
      return {
        label: 'Planned',
        dotColor: 'bg-amber-500',
        bgClass: 'bg-amber-900/20',
        textClass: 'text-amber-300',
        borderClass: 'border-amber-500/20 border-dashed',
      };
    case 'queued':
      return {
        label: 'Queued',
        dotColor: 'bg-muted',
        bgClass: 'bg-surface-light',
        textClass: 'text-secondary',
        borderClass: 'border-border',
      };
    case 'generating':
      return {
        label: 'Generating',
        dotColor: 'bg-blue-500',
        bgClass: 'bg-blue-900/20',
        textClass: 'text-blue-300',
        borderClass: 'border-blue-500/20',
      };
    case 'draft':
    case 'qa_passed':
    case 'approved':
    case 'reviewed':
    case 'qa_checking':
      return {
        label: 'Ready',
        dotColor: 'bg-purple-500',
        bgClass: 'bg-purple-900/20',
        textClass: 'text-purple-300',
        borderClass: 'border-purple-500/20',
      };
    case 'published':
      return {
        label: 'Published',
        dotColor: 'bg-green-500',
        bgClass: 'bg-green-900/20',
        textClass: 'text-green-300',
        borderClass: 'border-green-500/20',
      };
    case 'failed':
    case 'failed_quality':
    case 'failed_timeout':
    case 'qa_failed':
    case 'rejected':
      return {
        label: 'Failed',
        dotColor: 'bg-red-500',
        bgClass: 'bg-red-900/20',
        textClass: 'text-red-300',
        borderClass: 'border-red-500/20',
      };
    default:
      return {
        label: status,
        dotColor: 'bg-muted',
        bgClass: 'bg-surface-light',
        textClass: 'text-secondary',
        borderClass: 'border-border',
      };
  }
}
