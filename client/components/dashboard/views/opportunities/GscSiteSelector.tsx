/**
 * GscSiteSelector Component
 * Dropdown selector for choosing a verified GSC site to monitor.
 * Auto-selects if only one site is available.
 */

'use client';

import { type ChangeEvent, useEffect } from 'react';
import { ChevronDown, Globe, Loader2 } from 'lucide-react';
import { useTranslations } from '@client/hooks/useTranslations';
import type { IGscSite } from '@shared/types/opportunity.types';

// =============================================================================
// Props
// =============================================================================

interface IGscSiteSelectorProps {
  sites: IGscSite[];
  selectedSiteUrl: string | null;
  onSelectSite: (siteUrl: string) => void;
  isLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function GscSiteSelector({
  sites,
  selectedSiteUrl,
  onSelectSite,
  isLoading = false,
}: IGscSiteSelectorProps): JSX.Element {
  const t = useTranslations('dashboard');

  // Auto-select if only one site available
  useEffect(() => {
    if (sites.length === 1 && !selectedSiteUrl) {
      onSelectSite(sites[0].siteUrl);
    }
  }, [sites, selectedSiteUrl, onSelectSite]);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onSelectSite(value);
    }
  };

  // No verified sites
  if (sites.length === 0 && !isLoading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-sm text-secondary">{t('opportunities.gsc.noSites')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <label className="block text-sm font-medium text-white">
        {t('opportunities.gsc.selectSite')}
      </label>

      <div className="relative">
        <select
          value={selectedSiteUrl ?? ''}
          onChange={handleChange}
          disabled={isLoading}
          className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{t('opportunities.gsc.selectSite')}</option>
          {sites.map(site => (
            <option key={site.siteUrl} value={site.siteUrl}>
              {site.siteUrl} ({site.permissionLevel})
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-muted animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </div>

      {/* Selected site preview */}
      {selectedSiteUrl && (
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Globe className="w-3.5 h-3.5" />
          <span className="truncate">{selectedSiteUrl}</span>
        </div>
      )}
    </div>
  );
}
