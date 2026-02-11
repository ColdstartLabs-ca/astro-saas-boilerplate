/**
 * OpportunityDetailPanel Component Tests
 * Tests for the slide-over detail panel: rendering, actions, keyboard handling
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { OpportunityDetailPanel } from '../OpportunityDetailPanel';
import type { IOpportunity } from '@shared/types/opportunity.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );
  return {
    X: icon,
    FileText: icon,
    TrendingUp: icon,
    Layers: icon,
    MousePointerClick: icon,
    TrendingDown: icon,
    FileWarning: icon,
    GitBranch: icon,
    Lightbulb: icon,
    Loader2: icon,
    CheckCircle: icon,
    ArrowRight: icon,
  };
});

// Mock translations
const mockTranslations: Record<string, string> = {
  'opportunities.detail.title': 'Opportunity Details',
  'opportunities.detail.metrics': 'Metrics',
  'opportunities.detail.position': 'Avg. Position',
  'opportunities.detail.ctr': 'CTR',
  'opportunities.detail.impressions': 'Impressions',
  'opportunities.detail.clicks': 'Clicks',
  'opportunities.detail.recommendations': 'Recommendations',
  'opportunities.createArticle': 'Create Article',
  'opportunities.dismiss': 'Dismiss',
  'opportunities.markComplete': 'Mark Complete',
  'opportunities.filter.content': 'Content',
  'opportunities.filter.technical': 'Technical',
  'opportunities.type.content_gap': 'Content Gap',
  'opportunities.type.low_ctr': 'Low CTR',
  'opportunities.impact.high': 'High Impact',
  'opportunities.impact.medium': 'Medium Impact',
  'opportunities.status.open': 'Open',
  'opportunities.status.in_progress': 'In Progress',
  'opportunities.status.completed': 'Completed',
  'opportunities.status.dismissed': 'Dismissed',
};

vi.mock('@client/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

describe('OpportunityDetailPanel', () => {
  const contentOpportunity: IOpportunity = {
    id: 'opp-1',
    project_id: 'proj-1',
    user_id: 'user-1',
    snapshot_id: 'snap-1',
    type: 'content_gap',
    category: 'content',
    title: 'Best Coffee Machines 2026',
    description: 'There is a content gap for this keyword.',
    query: 'best coffee machines 2026',
    page_url: null,
    metrics: { position: 12.5, ctr: 0.032, impressions: 1500, clicks: 48 },
    priority_score: 85,
    estimated_impact: 'high',
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
    title: 'Low CTR on Homepage',
    description: 'Your homepage has a CTR below average for its position.',
    query: 'autopilotrank',
    page_url: 'https://example.com/',
  };

  const defaultProps = {
    opportunity: contentOpportunity,
    isOpen: true,
    onClose: vi.fn(),
    onCreateArticle: vi.fn(),
    onDismiss: vi.fn(),
    onMarkComplete: vi.fn(),
    isCreatingArticle: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should return null when not open', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('should return null when opportunity is null', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} opportunity={null} />);
      expect(container.innerHTML).toBe('');
    });

    it('should render the panel when open with an opportunity', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('Opportunity Details');
      expect(container.textContent).toContain('Best Coffee Machines 2026');
    });

    it('should display category and type badges', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('Content');
      expect(container.textContent).toContain('Content Gap');
    });

    it('should display priority score', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('85');
    });

    it('should display impact badge', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('High Impact');
    });

    it('should display metrics', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('Avg. Position');
      expect(container.textContent).toContain('12.5');
      expect(container.textContent).toContain('CTR');
      expect(container.textContent).toContain('3.2%');
      expect(container.textContent).toContain('Impressions');
      expect(container.textContent).toContain('1.5k');
      expect(container.textContent).toContain('Clicks');
      expect(container.textContent).toContain('48');
    });

    it('should display query for opportunities with a query', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('best coffee machines 2026');
    });
  });

  describe('Content Opportunities', () => {
    it('should show Create Article button for content opportunities', () => {
      const { container } = render(<OpportunityDetailPanel {...defaultProps} />);

      expect(container.textContent).toContain('Create Article');
    });

    it('should call onCreateArticle when Create Article is clicked', () => {
      const onCreateArticle = vi.fn();
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} onCreateArticle={onCreateArticle} />
      );

      const createButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Create Article')
      );
      expect(createButton).toBeTruthy();
      fireEvent.click(createButton!);
      expect(onCreateArticle).toHaveBeenCalledWith('opp-1');
    });

    it('should disable Create Article button when creating', () => {
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} isCreatingArticle={true} />
      );

      const createButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Creating')
      );
      expect(createButton).toBeTruthy();
      expect(createButton!.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Technical Opportunities', () => {
    it('should show recommendations for technical opportunities', () => {
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} opportunity={technicalOpportunity} />
      );

      expect(container.textContent).toContain('Recommendations');
    });

    it('should not show Create Article button for technical opportunities', () => {
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} opportunity={technicalOpportunity} />
      );

      const createButtons = Array.from(container.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Create Article')
      );
      expect(createButtons.length).toBe(0);
    });
  });

  describe('Actions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<OpportunityDetailPanel {...defaultProps} onClose={onClose} />);

      // Close button has aria-label="Close"
      const closeButton = container.querySelector('[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
      fireEvent.click(closeButton!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<OpportunityDetailPanel {...defaultProps} onClose={onClose} />);

      // Backdrop has aria-hidden="true"
      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<OpportunityDetailPanel {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when Dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Dismiss')
      );
      expect(dismissButton).toBeTruthy();
      fireEvent.click(dismissButton!);
      expect(onDismiss).toHaveBeenCalledWith('opp-1');
    });

    it('should call onMarkComplete when Mark Complete is clicked', () => {
      const onMarkComplete = vi.fn();
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} onMarkComplete={onMarkComplete} />
      );

      const completeButton = Array.from(container.querySelectorAll('button')).find(btn =>
        btn.textContent?.includes('Mark Complete')
      );
      expect(completeButton).toBeTruthy();
      fireEvent.click(completeButton!);
      expect(onMarkComplete).toHaveBeenCalledWith('opp-1');
    });

    it('should hide Dismiss button for non-open statuses', () => {
      const completedOpp = { ...contentOpportunity, status: 'completed' as const };
      const { container } = render(
        <OpportunityDetailPanel {...defaultProps} opportunity={completedOpp} />
      );

      const dismissButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent?.trim() === 'Dismiss'
      );
      expect(dismissButton).toBeUndefined();
    });
  });
});
