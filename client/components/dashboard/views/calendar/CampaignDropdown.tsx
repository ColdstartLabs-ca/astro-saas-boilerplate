'use client';

import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCampaignColorPalette } from '@client/utils/calendarHelpers';
import { useClickOutside } from '@client/hooks/useClickOutside';

interface ICampaign {
  id: string;
  name: string;
}

interface ICampaignDropdownProps {
  campaigns: ICampaign[];
  selectedCampaignId: string | null;
  onSelect: (campaignId: string | null) => void;
}

export function CampaignDropdown({ campaigns, selectedCampaignId, onSelect }: ICampaignDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  if (campaigns.length === 0) return <></>;

  const selectedCampaign = selectedCampaignId ? campaigns.find(c => c.id === selectedCampaignId) : null;
  const selectedColors = selectedCampaignId ? getCampaignColorPalette(selectedCampaignId) : null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted font-medium">Campaign:</span>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(p => !p)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
            selectedCampaignId
              ? 'bg-accent/20 border-accent text-accent'
              : 'border-border text-secondary hover:text-white hover:border-secondary'
          }`}
          data-testid="campaign-dropdown-trigger"
        >
          {selectedColors && (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedColors.dot}`} />
          )}
          <span>{selectedCampaign?.name ?? 'All campaigns'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            className="absolute left-0 top-full mt-1 z-30 min-w-[200px] bg-surface border border-border rounded-lg shadow-xl py-1"
            data-testid="campaign-dropdown-menu"
          >
            <button
              onClick={() => { onSelect(null); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                !selectedCampaignId ? 'text-white bg-surface-light' : 'text-secondary hover:text-white hover:bg-surface-light'
              }`}
            >
              All campaigns
            </button>
            {campaigns.map(campaign => {
              const colors = getCampaignColorPalette(campaign.id);
              const isSelected = campaign.id === selectedCampaignId;
              return (
                <button
                  key={campaign.id}
                  onClick={() => { onSelect(campaign.id); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                    isSelected ? 'text-white bg-surface-light' : 'text-secondary hover:text-white hover:bg-surface-light'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className="truncate">{campaign.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
