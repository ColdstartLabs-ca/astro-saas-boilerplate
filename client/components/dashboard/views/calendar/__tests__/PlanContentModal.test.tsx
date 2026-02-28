/**
 * PlanContentModal Component Tests
 * Focused on the skippedAsCovered banner shown in the success state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanContentModal } from '@client/components/dashboard/views/calendar/PlanContentModal';
import type { IPlanContentResponse } from '@shared/types/calendar.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ onClick }: { onClick?: () => void }) => (
    <button onClick={onClick} data-icon="X" aria-label="Close">
      x
    </button>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CheckCircle" />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Loader2" />
  ),
  CalendarDays: ({ className }: { className?: string }) => (
    <span className={className} data-icon="CalendarDays" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertTriangle" />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <span className={className} data-icon="ExternalLink" />
  ),
}));

// Mock DashboardButton component
vi.mock('../../ui/DashboardButton', () => ({
  DashboardButton: ({
    children,
    onClick,
    'data-testid': dataTestId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} data-testid={dataTestId ?? 'dashboard-button'}>
      {children}
    </button>
  ),
}));

// Mock useContentPlanning hook
const mockPlanContent = vi.fn();
const mockReset = vi.fn();
let mockIsPlanning = false;
let mockResult: IPlanContentResponse | null = null;
let mockError: string | null = null;

vi.mock('@client/hooks/useContentPlanning', () => ({
  useContentPlanning: () => ({
    planContent: mockPlanContent,
    isPlanning: mockIsPlanning,
    result: mockResult,
    error: mockError,
    reset: mockReset,
  }),
}));

vi.mock('@client/utils/logger', () => ({
  ClientLogger: { error: vi.fn(), warn: vi.fn() },
}));

function renderModal(props: Partial<{ onClose: () => void; campaignName: string }> = {}) {
  const onClose = props.onClose ?? vi.fn();
  return render(
    <PlanContentModal
      isOpen
      onClose={onClose}
      campaignId="campaign-123"
      campaignName={props.campaignName ?? 'Test Campaign'}
    />
  );
}

describe('PlanContentModal — skippedAsCovered banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlanning = false;
    mockResult = null;
    mockError = null;
  });

  it('should show success state without banner when no keywords are skipped', () => {
    mockResult = { planned: 3, startDate: '2026-03-01', endDate: '2026-03-07' };

    renderModal();

    expect(screen.getByTestId('success-state')).toBeInTheDocument();
    expect(screen.queryByTestId('skipped-as-covered-banner')).not.toBeInTheDocument();
  });

  it('should show skippedAsCovered banner in success state', () => {
    mockResult = {
      planned: 2,
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      skippedAsCovered: [
        {
          keyword: 'best coffee makers',
          coveredByUrl: 'https://example.com/coffee',
          coveredByTitle: 'Top Coffee Makers Guide',
          reason: 'Same search intent',
        },
      ],
    };

    renderModal();

    expect(screen.getByTestId('success-state')).toBeInTheDocument();
    expect(screen.getByTestId('skipped-as-covered-banner')).toBeInTheDocument();
    expect(screen.getByText(/1 keyword skipped/)).toBeInTheDocument();
    expect(screen.getByText('best coffee makers')).toBeInTheDocument();
    expect(screen.getByText('Top Coffee Makers Guide')).toBeInTheDocument();
  });

  it('should show correct plural form for multiple skipped keywords', () => {
    mockResult = {
      planned: 1,
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      skippedAsCovered: [
        {
          keyword: 'best coffee makers',
          coveredByUrl: 'https://example.com/coffee',
          coveredByTitle: 'Coffee Guide',
          reason: 'Covered',
        },
        {
          keyword: 'top coffee brewers',
          coveredByUrl: 'https://example.com/brewers',
          coveredByTitle: 'Brewer Guide',
          reason: 'Covered',
        },
      ],
    };

    renderModal();

    expect(screen.getByText(/2 keywords skipped/)).toBeInTheDocument();
  });

  it('should fall back to URL when coveredByTitle is null', () => {
    mockResult = {
      planned: 1,
      startDate: '2026-03-01',
      endDate: '2026-03-07',
      skippedAsCovered: [
        {
          keyword: 'no title keyword',
          coveredByUrl: 'https://example.com/no-title',
          coveredByTitle: null,
          reason: 'URL match',
        },
      ],
    };

    renderModal();

    expect(screen.getByTestId('skipped-as-covered-banner')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/no-title')).toBeInTheDocument();
  });

  it('should not show banner when skippedAsCovered is undefined', () => {
    mockResult = { planned: 2, startDate: '2026-03-01', endDate: '2026-03-07' };

    renderModal();

    expect(screen.queryByTestId('skipped-as-covered-banner')).not.toBeInTheDocument();
  });

  it('should not show banner in empty state even with skippedAsCovered', () => {
    // planned=0 → isEmpty state, not isSuccess state
    mockResult = {
      planned: 0,
      startDate: null,
      endDate: null,
      skippedAsCovered: [
        {
          keyword: 'test keyword',
          coveredByUrl: 'https://example.com',
          coveredByTitle: 'Test Page',
          reason: 'Covered',
        },
      ],
    };

    renderModal();

    // Empty state is shown, not success state
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('success-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skipped-as-covered-banner')).not.toBeInTheDocument();
  });

  it('should call onClose when Close button is clicked in success state', () => {
    const onClose = vi.fn();
    mockResult = { planned: 2, startDate: '2026-03-01', endDate: '2026-03-07' };

    renderModal({ onClose });

    fireEvent.click(screen.getByText('Close'));

    expect(mockReset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
