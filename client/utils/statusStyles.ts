/**
 * Status styling utilities for badges and indicators
 * Provides consistent styling across campaign, article, and project status displays
 */

/**
 * Get CSS classes for campaign status badges
 * @param status - The campaign status
 * @returns CSS class string for the status badge
 */
export function getCampaignStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return styles[status] ?? 'bg-surface text-muted border-border';
}

/**
 * Get CSS classes for article status badges
 * @param status - The article status
 * @returns CSS class string for the status badge
 */
export function getArticleStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    published: 'bg-green-500/10 text-green-400 border-green-500/20',
    draft: 'bg-surface-light text-secondary border-border',
    reviewed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    generating: 'bg-accent/10 text-accent-hover border-accent/20',
    queued: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return styles[status] ?? 'bg-surface text-muted border-border';
}

/**
 * Get CSS classes for project status badges
 * @param status - The project status
 * @returns CSS class string for the status badge
 */
export function getProjectStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  return styles[status] ?? 'bg-secondary/10 text-secondary border-secondary/20';
}

/**
 * Get CSS classes for integration status badges
 * @param status - The integration status
 * @returns CSS class string for the status badge
 */
export function getIntegrationStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    disabled: 'bg-surface-light text-secondary border-border',
  };

  return styles[status] ?? 'bg-surface text-muted border-border';
}
