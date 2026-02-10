import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface IStatCard {
  key: 'queued' | 'generating' | 'draft' | 'published';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  spin: boolean;
}

const STAT_CARDS: Readonly<IStatCard[]> = [
  { key: 'queued', label: 'Queued', icon: Clock, color: 'text-secondary', spin: false },
  { key: 'generating', label: 'Generating', icon: Loader2, color: 'text-accent-hover', spin: true },
  { key: 'draft', label: 'Draft/Review', icon: AlertCircle, color: 'text-yellow-400', spin: false },
  {
    key: 'published',
    label: 'Published',
    icon: CheckCircle2,
    color: 'text-green-400',
    spin: false,
  },
] as const;

interface ICampaignStatsGridProps {
  stats: {
    queued: number;
    generating: number;
    draft: number;
    published: number;
  };
}

export function CampaignStatsGrid({
  stats,
}: ICampaignStatsGridProps): JSX.Element {
  // Filter out generating card when count is 0
  const visibleCards = STAT_CARDS.filter(stat => {
    if (stat.key === 'generating') {
      return (stats[stat.key] ?? 0) > 0;
    }
    return true;
  });

  // Adjust grid columns based on visible cards
  const gridCols = visibleCards.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-4 mb-8`}>
      {visibleCards.map(stat => {
        const value = stats[stat.key] ?? 0;
        // Only animate spin for generating card when actively generating
        const shouldSpin = stat.spin && value > 0;
        return (
          <div
            key={stat.key}
            className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between"
          >
            <div>
              <div className="text-muted text-xs font-medium uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>
            <div className={`p-2 rounded-lg bg-surface-light ${stat.color}`}>
              <stat.icon className={`w-5 h-5 ${shouldSpin ? 'animate-spin' : ''}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
