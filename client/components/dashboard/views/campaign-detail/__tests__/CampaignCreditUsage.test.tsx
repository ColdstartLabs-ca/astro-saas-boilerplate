/**
 * CampaignCreditUsage Component Tests
 * Tests for the credit usage display component showing campaign credit statistics
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CampaignCreditUsage } from '@client/components/dashboard/views/campaign-detail/CampaignCreditUsage';
import type { ICampaignCreditStats, IKeyword } from '@shared/types/campaign.types';

// Mock lucide-react icons - return empty spans so they don't affect text matching
vi.mock('lucide-react', () => ({
  Coins: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Coins" />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <span className={className} data-icon="TrendingUp" />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span className={className} data-icon="AlertTriangle" />
  ),
  Layers: ({ className }: { className?: string }) => (
    <span className={className} data-icon="Layers" />
  ),
}));

// Helper function to check if text content contains the expected string
const findCardWithText = (container: HTMLElement, text: string): HTMLElement | null => {
  const cards = container.querySelectorAll('.bg-main\\/30');
  for (const card of cards) {
    if (card.textContent?.includes(text)) {
      return card as HTMLElement;
    }
  }
  return null;
};

// Helper function to check if element exists with text
const hasTextContent = (element: HTMLElement | null, text: string): boolean => {
  return element?.textContent?.includes(text) ?? false;
};

// Mock translations
const mockTranslations = {
  'campaigns.detail.credits.title': 'Credit Usage',
  'campaigns.detail.credits.costPerArticle': 'Cost per article',
  'campaigns.detail.credits.used': 'Used',
  'campaigns.detail.credits.refunded': 'Refunded',
  'campaigns.detail.credits.estimatedRemaining': 'Estimated Remaining',
  'campaigns.detail.credits.totalRequired': 'Total Required',
  'campaigns.detail.credits.successful': 'successful',
  'campaigns.detail.credits.failed': 'failed',
  'campaigns.detail.credits.status.remaining': 'Remaining',
  'campaigns.card.keywords': 'keywords',
  'campaigns.detail.credits.breakdown': 'Credit Breakdown',
  'campaigns.detail.credits.status.successful': 'Successful',
  'campaigns.detail.credits.status.failed': 'Failed',
};

const mockT = (key: string) => mockTranslations[key] || key;

describe('CampaignCreditUsage', () => {
  const defaultCreditStats: ICampaignCreditStats = {
    creditsUsed: 50,
    creditsRefunded: 5,
    successfulCount: 50,
    failedCount: 5,
    costPerArticle: 1,
    estimatedCreditsRemaining: 45,
    totalCreditsRequired: 100,
  };

  const defaultKeywords: IKeyword[] = [
    {
      id: '1',
      campaign_id: 'campaign-1',
      keyword: 'test keyword 1',
      search_volume: 1000,
      difficulty: 'medium',
      status: 'generated',
      priority: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      campaign_id: 'campaign-1',
      keyword: 'test keyword 2',
      search_volume: 500,
      difficulty: 'low',
      status: 'pending',
      priority: 2,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '3',
      campaign_id: 'campaign-1',
      keyword: 'test keyword 3',
      search_volume: 2000,
      difficulty: 'high',
      status: 'queued',
      priority: 3,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ];

  describe('Rendering', () => {
    it('should render component with all credit stats', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      // The title is in a separate header element, not in a card
      expect(container.textContent).toContain('Credit Usage');
      expect(container.textContent).toContain('Cost per article');
      expect(container.textContent).toContain('1 credit');
    });

    it('should render credits used card with correct values', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      const usedCard = findCardWithText(container, 'Used');
      expect(hasTextContent(usedCard, 'Used')).toBe(true);
      expect(hasTextContent(usedCard, '50')).toBe(true);
      expect(hasTextContent(usedCard, '50 successful')).toBe(true);
    });

    it('should render credits refunded card with correct values', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      const refundedCard = findCardWithText(container, 'Refunded');
      expect(hasTextContent(refundedCard, 'Refunded')).toBe(true);
      expect(hasTextContent(refundedCard, '5')).toBe(true);
      expect(hasTextContent(refundedCard, '5 failed')).toBe(true);
    });

    it('should render estimated remaining card with correct values', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, 'Estimated Remaining')).toBe(true);
      expect(hasTextContent(remainingCard, '45')).toBe(true);
      expect(hasTextContent(remainingCard, '2 Remaining')).toBe(true);
    });

    it('should render total required card with correct values', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      const totalCard = findCardWithText(container, 'Total Required');
      expect(hasTextContent(totalCard, 'Total Required')).toBe(true);
      expect(hasTextContent(totalCard, '100')).toBe(true);
      expect(hasTextContent(totalCard, '3 keywords')).toBe(true);
    });

    it('should render credit breakdown bar', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('Credit Breakdown');
      expect(container.textContent).toContain('50 / 100 credits');
    });

    it('should render legend with all status indicators', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('Successful');
      expect(container.textContent).toContain('Failed');
      expect(container.textContent).toContain('Remaining');
    });
  });

  describe('Pending Keywords Calculation', () => {
    it('should count pending keywords correctly', () => {
      const keywordsWithPending: IKeyword[] = [
        ...defaultKeywords,
        {
          id: '4',
          campaign_id: 'campaign-1',
          keyword: 'pending keyword',
          search_volume: 100,
          difficulty: 'low',
          status: 'pending',
          priority: 4,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={keywordsWithPending}
          t={mockT}
        />
      );

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '3 Remaining')).toBe(true);
    });

    it('should count queued keywords correctly', () => {
      const keywordsWithQueued: IKeyword[] = [
        ...defaultKeywords,
        {
          id: '5',
          campaign_id: 'campaign-1',
          keyword: 'queued keyword',
          search_volume: 100,
          difficulty: 'low',
          status: 'queued',
          priority: 5,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={keywordsWithQueued}
          t={mockT}
        />
      );

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '3 Remaining')).toBe(true);
    });

    it('should show zero when no pending or queued keywords', () => {
      const completedKeywords: IKeyword[] = [
        {
          id: '1',
          campaign_id: 'campaign-1',
          keyword: 'completed keyword',
          search_volume: 1000,
          difficulty: 'medium',
          status: 'generated',
          priority: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={completedKeywords}
          t={mockT}
        />
      );

      const totalCard = findCardWithText(container, 'Total Required');
      expect(hasTextContent(totalCard, '1 keywords')).toBe(true);

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '0')).toBe(true);
      expect(hasTextContent(remainingCard, 'Remaining')).toBe(true);
    });
  });

  describe('Credit Display Formatting', () => {
    it('should display singular "credit" when cost per article is 1', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={{ ...defaultCreditStats, costPerArticle: 1 }}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('1 credit');
    });

    it('should display plural "credits" when cost per article is greater than 1', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={{ ...defaultCreditStats, costPerArticle: 2 }}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('2 credits');
    });

    it('should display singular "credit" when total required is 1', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={{
            ...defaultCreditStats,
            totalCreditsRequired: 1,
            creditsUsed: 1,
          }}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('1 / 1 credit');
    });

    it('should display plural "credits" when total required is greater than 1', () => {
      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={mockT}
        />
      );

      expect(container.textContent).toContain('50 / 100 credits');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total credits required without errors', () => {
      const zeroCreditStats: ICampaignCreditStats = {
        creditsUsed: 0,
        creditsRefunded: 0,
        successfulCount: 0,
        failedCount: 0,
        costPerArticle: 1,
        estimatedCreditsRemaining: 0,
        totalCreditsRequired: 0,
      };

      const { container } = render(
        <CampaignCreditUsage creditStats={zeroCreditStats} keywords={[]} t={mockT} />
      );

      // Check that zeros are present in the component
      const allZeros = container.querySelectorAll('.text-xl.font-bold');
      expect(allZeros.length).toBeGreaterThan(0);
      allZeros.forEach(el => {
        expect(el.textContent).toBe('0');
      });

      const totalCard = findCardWithText(container, 'Total Required');
      expect(hasTextContent(totalCard, '0 keywords')).toBe(true);

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '0')).toBe(true);
      expect(hasTextContent(remainingCard, 'Remaining')).toBe(true);
    });

    it('should handle empty keywords array', () => {
      const { container } = render(
        <CampaignCreditUsage creditStats={defaultCreditStats} keywords={[]} t={mockT} />
      );

      const totalCard = findCardWithText(container, 'Total Required');
      expect(hasTextContent(totalCard, '0 keywords')).toBe(true);

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '0')).toBe(true);
      expect(hasTextContent(remainingCard, 'Remaining')).toBe(true);
    });

    it('should handle all keywords with generated status', () => {
      const allGeneratedKeywords: IKeyword[] = [
        {
          id: '1',
          campaign_id: 'campaign-1',
          keyword: 'generated keyword 1',
          search_volume: 1000,
          difficulty: 'medium',
          status: 'generated',
          priority: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          campaign_id: 'campaign-1',
          keyword: 'generated keyword 2',
          search_volume: 500,
          difficulty: 'low',
          status: 'generated',
          priority: 2,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={allGeneratedKeywords}
          t={mockT}
        />
      );

      const totalCard = findCardWithText(container, 'Total Required');
      expect(hasTextContent(totalCard, '2 keywords')).toBe(true);

      const remainingCard = findCardWithText(container, 'Estimated Remaining');
      expect(hasTextContent(remainingCard, '0')).toBe(true);
      expect(hasTextContent(remainingCard, 'Remaining')).toBe(true);
    });
  });

  describe('Props Handling', () => {
    it('should use provided translation function', () => {
      const customT = (key: string) => `CUSTOM_${key}`;

      const { container } = render(
        <CampaignCreditUsage
          creditStats={defaultCreditStats}
          keywords={defaultKeywords}
          t={customT}
        />
      );

      expect(container.textContent).toContain('CUSTOM_campaigns.detail.credits.title');
    });

    it('should accept credit stats with different values', () => {
      const differentStats: ICampaignCreditStats = {
        creditsUsed: 100,
        creditsRefunded: 10,
        successfulCount: 100,
        failedCount: 10,
        costPerArticle: 2,
        estimatedCreditsRemaining: 50,
        totalCreditsRequired: 160,
      };

      const { container } = render(
        <CampaignCreditUsage creditStats={differentStats} keywords={defaultKeywords} t={mockT} />
      );

      expect(container.textContent).toContain('100'); // credits used
      expect(container.textContent).toContain('10'); // credits refunded
      expect(container.textContent).toContain('50'); // estimated remaining
      expect(container.textContent).toContain('160'); // total required
    });
  });
});
