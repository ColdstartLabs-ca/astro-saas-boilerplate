'use client';

import React from 'react';
import type { ICalendarArticle } from '@shared/types/calendar.types';
import { getCampaignColorPalette } from '@client/utils/calendarHelpers';

interface ICampaignInfo {
  id: string;
  name: string | null;
}

interface ICampaignLegendProps {
  articles: ICalendarArticle[];
  hiddenCampaignIds: Set<string>;
  onToggleCampaign: (campaignId: string) => void;
  onShowAll: () => void;
}

export function CampaignLegend({ articles, hiddenCampaignIds, onToggleCampaign, onShowAll }: ICampaignLegendProps): JSX.Element {
  const campaigns = React.useMemo<ICampaignInfo[]>(() => {
    const seen = new Map<string, string | null>();
    for (const a of articles) {
      if (a.campaignId && !seen.has(a.campaignId)) {
        seen.set(a.campaignId, a.campaignName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [articles]);

  if (campaigns.length === 0) return <></>;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-muted font-medium">Campaigns:</span>
      {campaigns.map(({ id, name }) => {
        const isHidden = hiddenCampaignIds.has(id);
        const colors = getCampaignColorPalette(id);
        return (
          <button
            key={id}
            onClick={() => onToggleCampaign(id)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
            title={isHidden ? 'Click to show' : 'Click to hide'}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
            <span className="text-secondary hover:text-white transition-colors">{name ?? id}</span>
          </button>
        );
      })}
      {hiddenCampaignIds.size > 0 && (
        <button
          onClick={onShowAll}
          className="text-xs text-accent hover:text-accent/80 transition-colors"
        >
          Show All
        </button>
      )}
    </div>
  );
}
