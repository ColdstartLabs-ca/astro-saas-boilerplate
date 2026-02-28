'use client';

import { useEffect } from 'react';
import { X, CheckCircle, Loader2, CalendarDays } from 'lucide-react';
import type { IPlanContentResponse } from '@shared/types/calendar.types';
import { useContentPlanning } from '@client/hooks/useContentPlanning';
import { DashboardButton } from '../../ui/DashboardButton';

interface IPlanContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName?: string;
  onSuccess?: (result: IPlanContentResponse) => void;
  autoTrigger?: boolean;
}

/**
 * Shared modal for planning content for a campaign.
 * Shows 4 states: idle, planning (spinner), success, empty, and error.
 *
 * @example
 * ```tsx
 * <PlanContentModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   campaignId={campaign.id}
 *   campaignName={campaign.name}
 *   onSuccess={(result) => console.log(result.planned)}
 *   autoTrigger
 * />
 * ```
 */
export function PlanContentModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  onSuccess,
  autoTrigger = false,
}: IPlanContentModalProps): JSX.Element | null {
  const { planContent, isPlanning, result, error, reset } = useContentPlanning();

  // Auto-trigger planning on mount when requested
  useEffect(() => {
    if (isOpen && autoTrigger) {
      planContent(campaignId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoTrigger, campaignId]);

  const handleClose = () => {
    if (result) onSuccess?.(result);
    reset();
    onClose();
  };

  const handleViewCalendar = () => {
    if (result) onSuccess?.(result);
    window.location.href = '/dashboard/calendar';
  };

  const handleRetry = () => {
    planContent(campaignId);
  };

  if (!isOpen) return null;

  const hasSuccess = result !== null;
  const isEmpty = hasSuccess && result.planned === 0;
  const isSuccess = hasSuccess && result.planned > 0;

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4"
      data-testid="plan-content-modal"
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Plan Content Calendar</h3>
          </div>
          {campaignName && <p className="text-sm text-muted ml-7">{campaignName}</p>}
        </div>

        {/* State: Planning */}
        {isPlanning && (
          <div
            className="flex flex-col items-center justify-center py-8 gap-4"
            data-testid="planning-state"
          >
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-secondary text-sm text-center">Planning your content calendar...</p>
            <p className="text-muted text-xs text-center">
              This may take a moment while we schedule your articles.
            </p>
          </div>
        )}

        {/* State: Success */}
        {isSuccess && (
          <div className="flex flex-col items-center gap-4 py-4" data-testid="success-state">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg" data-testid="planned-count">
                {result.planned} {result.planned === 1 ? 'article' : 'articles'} planned
              </p>
              {result.startDate && result.endDate && (
                <p className="text-muted text-sm mt-1">
                  {formatDate(result.startDate)} — {formatDate(result.endDate)}
                </p>
              )}
              {result.message && <p className="text-secondary text-sm mt-2">{result.message}</p>}
            </div>
            <div className="flex gap-3 w-full mt-2">
              <DashboardButton variant="outline" onClick={handleClose} className="flex-1">
                Close
              </DashboardButton>
              <DashboardButton
                onClick={handleViewCalendar}
                className="flex-1"
                data-testid="view-calendar-button"
              >
                View Calendar
              </DashboardButton>
            </div>
          </div>
        )}

        {/* State: Empty (no pending keywords) */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-4 py-4" data-testid="empty-state">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-light border border-border">
              <CalendarDays className="w-7 h-7 text-muted" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">No pending keywords found</p>
              <p className="text-muted text-sm mt-1">
                Add keywords to your campaign first, then plan your content calendar.
              </p>
            </div>
            <DashboardButton variant="outline" onClick={handleClose} className="w-full">
              Close
            </DashboardButton>
          </div>
        )}

        {/* State: Error */}
        {error && (
          <div className="flex flex-col gap-4" data-testid="error-state">
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error font-medium">Failed to plan content</p>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <div className="flex gap-3">
              <DashboardButton variant="outline" onClick={handleClose} className="flex-1">
                Close
              </DashboardButton>
              <DashboardButton onClick={handleRetry} className="flex-1" data-testid="retry-button">
                Try Again
              </DashboardButton>
            </div>
          </div>
        )}

        {/* State: Idle (no request yet, autoTrigger=false) */}
        {!isPlanning && !hasSuccess && !error && (
          <div className="flex flex-col items-center gap-4 py-4" data-testid="idle-state">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20">
              <CalendarDays className="w-7 h-7 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Ready to plan your content calendar</p>
              <p className="text-muted text-sm mt-1">
                We&apos;ll schedule your pending keywords across upcoming dates.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <DashboardButton variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </DashboardButton>
              <DashboardButton
                onClick={() => planContent(campaignId)}
                className="flex-1"
                data-testid="start-planning-button"
              >
                Start Planning
              </DashboardButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
