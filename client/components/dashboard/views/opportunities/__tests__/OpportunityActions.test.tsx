/**
 * OpportunityActions Component Tests
 * Tests for inline action buttons and dropdown menu
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { OpportunityActions } from '../OpportunityActions';
import type { IOpportunity } from '@shared/types/opportunity.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );
  return {
    MoreHorizontal: icon,
    FileText: icon,
    Eye: icon,
    XCircle: icon,
  };
});

// Mock translations
const mockTranslations: Record<string, string> = {
  'opportunities.createArticle': 'Create Article',
  'opportunities.viewDetails': 'View Details',
  'opportunities.dismiss': 'Dismiss',
};

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

describe('OpportunityActions', () => {
  const contentOpportunity: IOpportunity = {
    id: 'opp-1',
    project_id: 'proj-1',
    user_id: 'user-1',
    snapshot_id: 'snap-1',
    type: 'content_gap',
    category: 'content',
    title: 'Test Content Gap',
    description: 'A content gap opportunity.',
    query: 'test keyword',
    page_url: null,
    metrics: { position: 15, ctr: 0.02, impressions: 500, clicks: 10 },
    priority_score: 75,
    estimated_impact: 'medium',
    status: 'open',
    action_type: null,
    action_ref_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const technicalOpportunity: IOpportunity = {
    ...contentOpportunity,
    id: 'opp-2',
    type: 'low_ctr',
    category: 'technical',
  };

  const dismissedOpportunity: IOpportunity = {
    ...contentOpportunity,
    id: 'opp-3',
    status: 'dismissed',
  };

  const defaultProps = {
    opportunity: contentOpportunity,
    onCreateArticle: vi.fn(),
    onDismiss: vi.fn(),
    onViewDetails: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Opportunities', () => {
    it('should show Create Article button for open content opportunities', () => {
      const { container } = render(<OpportunityActions {...defaultProps} />);

      expect(container.textContent).toContain('Create Article');
    });

    it('should call onCreateArticle when Create Article button is clicked', () => {
      const onCreateArticle = vi.fn();
      const { container } = render(
        <OpportunityActions {...defaultProps} onCreateArticle={onCreateArticle} />
      );

      const createButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Create Article')
      );
      expect(createButton).toBeTruthy();
      fireEvent.click(createButton!);
      expect(onCreateArticle).toHaveBeenCalledWith('opp-1');
    });
  });

  describe('Technical Opportunities', () => {
    it('should not show Create Article button for technical opportunities', () => {
      const { container } = render(
        <OpportunityActions {...defaultProps} opportunity={technicalOpportunity} />
      );

      const createButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Create Article')
      );
      expect(createButtons.length).toBe(0);
    });
  });

  describe('Dropdown Menu', () => {
    it('should show dropdown when more button is clicked', () => {
      const { container } = render(<OpportunityActions {...defaultProps} />);

      // Find the more button (has aria-label="More actions")
      const moreButton = container.querySelector('[aria-label="More actions"]');
      expect(moreButton).toBeTruthy();
      fireEvent.click(moreButton!);

      // Dropdown should appear with View Details and Dismiss
      expect(container.textContent).toContain('View Details');
      expect(container.textContent).toContain('Dismiss');
    });

    it('should call onViewDetails when View Details is clicked', () => {
      const onViewDetails = vi.fn();
      const { container } = render(
        <OpportunityActions {...defaultProps} onViewDetails={onViewDetails} />
      );

      // Open dropdown
      const moreButton = container.querySelector('[aria-label="More actions"]');
      fireEvent.click(moreButton!);

      // Click View Details
      const viewButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('View Details')
      );
      expect(viewButton).toBeTruthy();
      fireEvent.click(viewButton!);
      expect(onViewDetails).toHaveBeenCalledWith('opp-1');
    });

    it('should call onDismiss when Dismiss is clicked in dropdown', () => {
      const onDismiss = vi.fn();
      const { container } = render(<OpportunityActions {...defaultProps} onDismiss={onDismiss} />);

      // Open dropdown
      const moreButton = container.querySelector('[aria-label="More actions"]');
      fireEvent.click(moreButton!);

      // Click Dismiss
      const dismissButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Dismiss')
      );
      expect(dismissButton).toBeTruthy();
      fireEvent.click(dismissButton!);
      expect(onDismiss).toHaveBeenCalledWith('opp-1');
    });

    it('should not show Dismiss in dropdown for non-open statuses', () => {
      const { container } = render(
        <OpportunityActions {...defaultProps} opportunity={dismissedOpportunity} />
      );

      // Open dropdown
      const moreButton = container.querySelector('[aria-label="More actions"]');
      fireEvent.click(moreButton!);

      // Dismiss should not appear
      const dismissButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Dismiss')
      );
      expect(dismissButtons.length).toBe(0);
    });

    it('should close dropdown after clicking an action', () => {
      const { container } = render(<OpportunityActions {...defaultProps} />);

      // Open dropdown
      const moreButton = container.querySelector('[aria-label="More actions"]');
      fireEvent.click(moreButton!);

      // Click View Details
      const viewButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('View Details')
      );
      fireEvent.click(viewButton!);

      // Dropdown should be closed (View Details text should no longer be in a dropdown menu item)
      // After closing, the View Details button in the dropdown should no longer exist
      const dropdownItems = container.querySelectorAll('[class*="absolute"]');
      expect(dropdownItems.length).toBe(0);
    });
  });

  describe('Dismissed Opportunities', () => {
    it('should not show Create Article button for dismissed content opportunities', () => {
      const { container } = render(
        <OpportunityActions {...defaultProps} opportunity={dismissedOpportunity} />
      );

      const createButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Create Article')
      );
      expect(createButtons.length).toBe(0);
    });
  });
});
