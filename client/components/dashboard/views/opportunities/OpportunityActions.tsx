/**
 * OpportunityActions Component
 *
 * Inline action buttons for the opportunities table/list rows.
 * Provides Create Article, View, and Dismiss actions via a dropdown menu.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, FileText, Eye, XCircle } from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';
import type { IOpportunity, OpportunityType } from '@shared/types/opportunity.types';

// =============================================================================
// Constants
// =============================================================================

const CONTENT_OPPORTUNITY_TYPES: OpportunityType[] = [
  'content_gap',
  'low_hanging_fruit',
  'topic_cluster',
];

// =============================================================================
// Props
// =============================================================================

interface IOpportunityActionsProps {
  opportunity: IOpportunity;
  onCreateArticle: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewDetails: (id: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function OpportunityActions({
  opportunity,
  onCreateArticle,
  onDismiss,
  onViewDetails,
}: IOpportunityActionsProps): JSX.Element {
  const t = useTranslations('dashboard');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isContentOpportunity = CONTENT_OPPORTUNITY_TYPES.includes(opportunity.type);
  const isOpen = opportunity.status === 'open';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      {/* Primary CTA for content opportunities */}
      {isContentOpportunity && isOpen && (
        <DashboardButton
          size="sm"
          className="text-xs px-2.5 py-1"
          onClick={() => onCreateArticle(opportunity.id)}
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          {t('opportunities.createArticle')}
        </DashboardButton>
      )}

      {/* Dropdown menu for secondary actions */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-1.5 rounded-lg text-muted hover:text-secondary hover:bg-surface-light transition-colors"
          aria-label="More actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-xl z-10 py-1">
            {/* View Details */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onViewDetails(opportunity.id);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-secondary hover:text-white hover:bg-surface-light transition-colors"
            >
              <Eye className="w-4 h-4" />
              {t('opportunities.viewDetails')}
            </button>

            {/* Dismiss (only for open status) */}
            {isOpen && (
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onDismiss(opportunity.id);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-secondary hover:text-white hover:bg-surface-light transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {t('opportunities.dismiss')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
